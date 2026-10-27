import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  listGoogleDrivePhotos, 
  moveGoogleDriveFile, 
  createGoogleDriveFolder,
  getGoogleDriveFileResponse,
  listOneDrivePhotos,
  moveOneDriveFile,
  createOneDriveFolder,
  oneDriveRequest,
  type CloudFile
} from "./cloud-storage";
import { getAccessToken } from "./oauth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  function isAuthError(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('invalid_grant') ||
           msg.includes('Not signed in') ||
           error?.statusCode === 401 ||
           error?.statusCode === 403;
  }

  // List photos from Google Drive
  app.get("/api/gdrive/photos", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'google');
      const folderId = (req.query.folderId as string) || 'root';
      const files = await listGoogleDrivePhotos(token, folderId);
      res.json({ files });
    } catch (error: any) {
      console.error('Error listing Google Drive photos:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ 
        error: error.message || 'Failed to list photos',
        authError: isAuthError(error)
      });
    }
  });

  // List photos from OneDrive
  app.get("/api/onedrive/photos", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'microsoft');
      const folderId = (req.query.folderId as string) || 'root';
      const files = await listOneDrivePhotos(token, folderId);
      res.json({ files });
    } catch (error: any) {
      console.error('Error listing OneDrive photos:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ 
        error: error.message || 'Failed to list photos',
        authError: isAuthError(error)
      });
    }
  });

  // Organize photos by year (Google Drive) - parallel batched for speed
  app.post("/api/gdrive/organize", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'google');
      const { files, parentFolderId } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // First, get existing folders in the parent directory
      const existingFiles = await listGoogleDrivePhotos(token, parentFolderId || 'root');
      const existingFolders = existingFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      
      // Build a map of existing year folders
      const folderMap = new Map<string, string>();
      for (const folder of existingFolders) {
        if (/^\d{4}$/.test(folder.name)) {
          folderMap.set(folder.name, folder.id);
        }
      }

      // Pre-create all needed year folders first (sequentially to avoid conflicts)
      const yearsNeeded = new Set<string>();
      for (const file of files) {
        const date = new Date(file.modifiedTime || file.createdTime);
        yearsNeeded.add(date.getFullYear().toString());
      }
      const yearsArray = Array.from(yearsNeeded);
      for (const year of yearsArray) {
        if (!folderMap.has(year)) {
          const folderId = await createGoogleDriveFolder(token, year, parentFolderId || 'root');
          folderMap.set(year, folderId);
        }
      }

      // Process files in parallel batches of 5 for speed
      const BATCH_SIZE = 5;
      const results: any[] = [];
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (file: any) => {
          const date = new Date(file.modifiedTime || file.createdTime);
          const year = date.getFullYear().toString();
          const yearFolderId = folderMap.get(year)!;
          const moveResult = await moveGoogleDriveFile(token, file.id, yearFolderId);
          return { fileId: file.id, year, folderId: yearFolderId, ...moveResult };
        });
        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({ error: result.reason?.message || 'Unknown error' });
          }
        }
      }

      const moved = results.filter(r => r.moved).length;
      const skipped = results.filter(r => r.skipped).length;
      res.json({ success: true, results, folders: Array.from(folderMap.entries()), moved, skipped });
    } catch (error: any) {
      console.error('Error organizing Google Drive photos:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ error: error.message || 'Failed to organize photos', authError: isAuthError(error) });
    }
  });

  // Organize photos by year (OneDrive) - parallel batched for speed
  app.post("/api/onedrive/organize", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'microsoft');
      const { files, parentFolderId } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // First, get existing folders in the parent directory
      const existingFiles = await listOneDrivePhotos(token, parentFolderId || 'root');
      const existingFolders = existingFiles.filter(f => f.mimeType === 'application/vnd.folder');
      
      // Build a map of existing year folders
      const folderMap = new Map<string, string>();
      for (const folder of existingFolders) {
        if (/^\d{4}$/.test(folder.name)) {
          folderMap.set(folder.name, folder.id);
        }
      }

      // Pre-create all needed year folders first (sequentially to avoid conflicts)
      const yearsNeeded = new Set<string>();
      for (const file of files) {
        const date = new Date(file.modifiedTime || file.createdTime);
        yearsNeeded.add(date.getFullYear().toString());
      }
      const yearsArray = Array.from(yearsNeeded);
      for (const year of yearsArray) {
        if (!folderMap.has(year)) {
          const folderId = await createOneDriveFolder(token, year, parentFolderId || 'root');
          folderMap.set(year, folderId);
        }
      }

      // Process files in parallel batches of 4 for speed (OneDrive has lower rate limits)
      const BATCH_SIZE = 4;
      const results: any[] = [];
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (file: any) => {
          const date = new Date(file.modifiedTime || file.createdTime);
          const year = date.getFullYear().toString();
          const yearFolderId = folderMap.get(year)!;
          const moveResult = await moveOneDriveFile(token, file.id, yearFolderId);
          return { fileId: file.id, year, folderId: yearFolderId, ...moveResult };
        });
        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({ error: result.reason?.message || 'Unknown error' });
          }
        }
      }

      const moved = results.filter(r => r.moved).length;
      const skipped = results.filter(r => r.skipped).length;
      res.json({ success: true, results, folders: Array.from(folderMap.entries()), moved, skipped });
    } catch (error: any) {
      console.error('Error organizing OneDrive photos:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ error: error.message || 'Failed to organize photos', authError: isAuthError(error) });
    }
  });

  // Proxy Google Drive thumbnails (they require auth)
  app.get("/api/gdrive/thumbnail/:fileId", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'google');
      const { fileId } = req.params;

      const response = await getGoogleDriveFileResponse(token, `/drive/v3/files/${fileId}?alt=media`);

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch file' });
      }

      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const reader = response.body?.getReader();
      if (!reader) return res.status(500).json({ error: 'No response body' });
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(value);
        await pump();
      };
      await pump();
    } catch (error: any) {
      console.error('Error fetching thumbnail:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ error: 'Failed to fetch thumbnail' });
    }
  });

  // Proxy OneDrive thumbnails
  app.get("/api/onedrive/thumbnail/:fileId", async (req, res) => {
    try {
      const token = await getAccessToken(req, 'microsoft');
      const fileId = decodeURIComponent(req.params.fileId);

      // Fetch the item with thumbnails expanded in one request
      const data = await oneDriveRequest(token, `/me/drive/items/${encodeURIComponent(fileId)}?expand=thumbnails`);

      const thumbSet = data?.thumbnails?.[0];
      const thumbnailUrl = thumbSet?.large?.url || thumbSet?.medium?.url || thumbSet?.small?.url;

      if (thumbnailUrl) {
        // Thumbnail URLs from Graph are public CDN links — redirect directly
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.redirect(thumbnailUrl);
      }

      res.status(404).json({ error: 'No thumbnail available' });
    } catch (error: any) {
      console.error('Error fetching OneDrive thumbnail:', error);
      res.status(isAuthError(error) ? 401 : 500).json({ error: 'Failed to fetch thumbnail' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
