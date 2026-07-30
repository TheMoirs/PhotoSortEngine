import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  listGoogleDrivePhotos, 
  moveGoogleDriveFile, 
  createGoogleDriveFolder,
  listOneDrivePhotos,
  moveOneDriveFile,
  createOneDriveFolder,
  type CloudFile
} from "./cloud-storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // List photos from Google Drive
  app.get("/api/gdrive/photos", async (req, res) => {
    try {
      const folderId = (req.query.folderId as string) || 'root';
      const files = await listGoogleDrivePhotos(folderId);
      res.json({ files });
    } catch (error: any) {
      console.error('Error listing Google Drive photos:', error);
      res.status(500).json({ error: error.message || 'Failed to list photos' });
    }
  });

  // List photos from OneDrive
  app.get("/api/onedrive/photos", async (req, res) => {
    try {
      const folderId = (req.query.folderId as string) || 'root';
      const files = await listOneDrivePhotos(folderId);
      res.json({ files });
    } catch (error: any) {
      console.error('Error listing OneDrive photos:', error);
      res.status(500).json({ error: error.message || 'Failed to list photos' });
    }
  });

  // Organize photos by year (Google Drive) - parallel batched for speed
  app.post("/api/gdrive/organize", async (req, res) => {
    try {
      const { files, parentFolderId } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // First, get existing folders in the parent directory
      const existingFiles = await listGoogleDrivePhotos(parentFolderId || 'root');
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
          const folderId = await createGoogleDriveFolder(year, parentFolderId || 'root');
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
          const moveResult = await moveGoogleDriveFile(file.id, yearFolderId);
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
      res.status(500).json({ error: error.message || 'Failed to organize photos' });
    }
  });

  // Organize photos by year (OneDrive) - parallel batched for speed
  app.post("/api/onedrive/organize", async (req, res) => {
    try {
      const { files, parentFolderId } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // First, get existing folders in the parent directory
      const existingFiles = await listOneDrivePhotos(parentFolderId || 'root');
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
          const folderId = await createOneDriveFolder(year, parentFolderId || 'root');
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
          const moveResult = await moveOneDriveFile(file.id, yearFolderId);
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
      res.status(500).json({ error: error.message || 'Failed to organize photos' });
    }
  });

  // Proxy Google Drive thumbnails (they require auth)
  app.get("/api/gdrive/thumbnail/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const size = req.query.size || 's220';
      
      const { getGoogleDriveClient } = await import("./cloud-storage");
      const drive = await getGoogleDriveClient();
      
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      (response.data as any).pipe(res);
    } catch (error: any) {
      console.error('Error fetching thumbnail:', error);
      res.status(500).json({ error: 'Failed to fetch thumbnail' });
    }
  });

  // Proxy OneDrive thumbnails - use actual thumbnails API for speed
  app.get("/api/onedrive/thumbnail/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      const { ReplitConnectors } = await import("@replit/connectors-sdk");
      const connectors = new ReplitConnectors();
      
      // Get thumbnail URL from OneDrive
      const response = await connectors.proxy("onedrive", `/me/drive/items/${fileId}/thumbnails`, { method: "GET" });
      const thumbnails = await response.json();
      
      if (thumbnails.value && thumbnails.value.length > 0) {
        const thumb = thumbnails.value[0];
        const thumbnailUrl = thumb.large?.url || thumb.medium?.url || thumb.small?.url;
        
        if (thumbnailUrl) {
          // Redirect to the thumbnail URL
          return res.redirect(thumbnailUrl);
        }
      }
      
      // Fallback: return a placeholder response
      res.status(404).json({ error: 'No thumbnail available' });
    } catch (error: any) {
      console.error('Error fetching OneDrive thumbnail:', error);
      res.status(500).json({ error: 'Failed to fetch thumbnail' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
