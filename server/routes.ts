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

  // Organize photos by year (Google Drive)
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
        // Check if folder name is a year (4 digits)
        if (/^\d{4}$/.test(folder.name)) {
          folderMap.set(folder.name, folder.id);
        }
      }

      const results = [];

      for (const file of files) {
        const date = new Date(file.modifiedTime || file.createdTime);
        const year = date.getFullYear().toString();
        
        let yearFolderId = folderMap.get(year);
        if (!yearFolderId) {
          // Only create folder if it doesn't exist
          yearFolderId = await createGoogleDriveFolder(year, parentFolderId || 'root');
          folderMap.set(year, yearFolderId);
        }

        const moveResult = await moveGoogleDriveFile(file.id, yearFolderId);
        results.push({ fileId: file.id, year, folderId: yearFolderId, ...moveResult });
      }

      const moved = results.filter(r => r.moved).length;
      const skipped = results.filter(r => r.skipped).length;
      res.json({ success: true, results, folders: Array.from(folderMap.entries()), moved, skipped });
    } catch (error: any) {
      console.error('Error organizing Google Drive photos:', error);
      res.status(500).json({ error: error.message || 'Failed to organize photos' });
    }
  });

  // Organize photos by year (OneDrive)
  app.post("/api/onedrive/organize", async (req, res) => {
    try {
      const { files, parentFolderId } = req.body;
      
      console.log('Organize request - parentFolderId:', parentFolderId);
      console.log('Organize request - files count:', files?.length);
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // First, get existing folders in the parent directory
      const existingFiles = await listOneDrivePhotos(parentFolderId || 'root');
      const existingFolders = existingFiles.filter(f => f.mimeType === 'application/vnd.folder');
      
      console.log('Found existing folders:', existingFolders.length);
      
      // Build a map of existing year folders
      const folderMap = new Map<string, string>();
      for (const folder of existingFolders) {
        // Check if folder name is a year (4 digits)
        if (/^\d{4}$/.test(folder.name)) {
          folderMap.set(folder.name, folder.id);
          console.log('Added year folder to map:', folder.name, '->', folder.id);
        }
      }
      
      console.log('Year folders in map:', Array.from(folderMap.keys()));

      const results = [];

      for (const file of files) {
        const date = new Date(file.modifiedTime || file.createdTime);
        const year = date.getFullYear().toString();
        
        console.log('Processing file:', file.name, 'year:', year, 'exists in map:', folderMap.has(year));
        
        let yearFolderId = folderMap.get(year);
        if (!yearFolderId) {
          console.log('Creating folder for year:', year);
          // Only create folder if it doesn't exist
          yearFolderId = await createOneDriveFolder(year, parentFolderId || 'root');
          folderMap.set(year, yearFolderId);
        }

        console.log('Moving file to folder:', yearFolderId);
        const moveResult = await moveOneDriveFile(file.id, yearFolderId);
        console.log('Move result:', file.name, moveResult);
        results.push({ fileId: file.id, year, folderId: yearFolderId, ...moveResult });
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
      
      const { getOneDriveClient } = await import("./cloud-storage");
      const client = await getOneDriveClient();
      
      // Get thumbnail URL from OneDrive
      const thumbnails = await client.api(`/me/drive/items/${fileId}/thumbnails`).get();
      
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
