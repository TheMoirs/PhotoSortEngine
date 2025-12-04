import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

let googleConnectionSettings: any;
let onedriveConnectionSettings: any;

async function getGoogleAccessToken() {
  if (googleConnectionSettings && googleConnectionSettings.settings.expires_at && new Date(googleConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return googleConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  googleConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = googleConnectionSettings?.settings?.access_token || googleConnectionSettings.settings?.oauth?.credentials?.access_token;

  if (!googleConnectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getOneDriveAccessToken() {
  if (onedriveConnectionSettings && onedriveConnectionSettings.settings.expires_at && new Date(onedriveConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return onedriveConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  onedriveConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=onedrive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = onedriveConnectionSettings?.settings?.access_token || onedriveConnectionSettings.settings?.oauth?.credentials?.access_token;

  if (!onedriveConnectionSettings || !accessToken) {
    throw new Error('OneDrive not connected');
  }
  return accessToken;
}

export async function getGoogleDriveClient() {
  const accessToken = await getGoogleAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function getOneDriveClient() {
  const accessToken = await getOneDriveAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: number;
  thumbnailLink?: string;
  webViewLink?: string;
}

export async function listGoogleDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`,
    fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, thumbnailLink, webViewLink)',
    pageSize: 1000,
  });

  return response.data.files?.map(file => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    createdTime: file.createdTime || undefined,
    modifiedTime: file.modifiedTime || undefined,
    size: file.size ? parseInt(file.size) : undefined,
    thumbnailLink: file.thumbnailLink || undefined,
    webViewLink: file.webViewLink || undefined,
  })) || [];
}

export async function moveGoogleDriveFile(fileId: string, targetFolderId: string): Promise<{ moved: boolean; skipped: boolean; reason?: string }> {
  const drive = await getGoogleDriveClient();
  
  try {
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    // Check if already in target folder
    if (file.data.parents?.includes(targetFolderId)) {
      return { moved: false, skipped: true, reason: 'File already in target folder' };
    }

    const previousParents = file.data.parents?.join(',');

    await drive.files.update({
      fileId: fileId,
      addParents: targetFolderId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
    
    return { moved: true, skipped: false };
  } catch (error: any) {
    // Handle duplicate name errors
    if (error.code === 409 || error.message?.includes('already exists')) {
      return { moved: false, skipped: true, reason: 'File with same name already exists in target folder' };
    }
    throw error;
  }
}

export async function createGoogleDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  const drive = await getGoogleDriveClient();
  
  // First, check if folder already exists
  const existingFolders = await drive.files.list({
    q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  
  if (existingFolders.data.files && existingFolders.data.files.length > 0) {
    return existingFolders.data.files[0].id!;
  }
  
  // Create new folder if it doesn't exist
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id'
  });

  return response.data.id!;
}

export async function listOneDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const client = await getOneDriveClient();
  
  const path = folderId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${folderId}/children`;
  const response = await client.api(path).get();

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.tif'];
  
  const isImage = (item: any): boolean => {
    // Check mimeType first
    if (item.file?.mimeType?.startsWith('image/')) return true;
    // Fall back to extension check
    const name = item.name?.toLowerCase() || '';
    return imageExtensions.some(ext => name.endsWith(ext));
  };

  return response.value
    .filter((item: any) => isImage(item) || item.folder)
    .map((item: any) => {
      const name = item.name?.toLowerCase() || '';
      let mimeType = item.file?.mimeType;
      
      // Infer mimeType from extension if not provided
      if (!mimeType && !item.folder) {
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        else if (name.endsWith('.gif')) mimeType = 'image/gif';
        else if (name.endsWith('.webp')) mimeType = 'image/webp';
        else if (name.endsWith('.heic') || name.endsWith('.heif')) mimeType = 'image/heic';
        else mimeType = 'image/jpeg'; // default for images
      }
      
      return {
        id: item.id,
        name: item.name,
        mimeType: mimeType || 'application/vnd.folder',
        createdTime: item.createdDateTime,
        modifiedTime: item.lastModifiedDateTime,
        size: item.size,
        thumbnailLink: item.thumbnails?.[0]?.large?.url,
        webViewLink: item.webUrl,
      };
    });
}

export async function moveOneDriveFile(fileId: string, targetFolderId: string): Promise<{ moved: boolean; skipped: boolean; reason?: string }> {
  const client = await getOneDriveClient();
  
  try {
    // First check if file is already in the target folder
    const file = await client.api(`/me/drive/items/${fileId}`).get();
    if (file.parentReference?.id === targetFolderId) {
      return { moved: false, skipped: true, reason: 'File already in target folder' };
    }
    
    // Try to move the file
    await client.api(`/me/drive/items/${fileId}`).patch({
      parentReference: {
        id: targetFolderId
      }
    });
    return { moved: true, skipped: false };
  } catch (error: any) {
    // If name already exists, skip this file (duplicate in target)
    if (error.code === 'nameAlreadyExists' || error.statusCode === 409) {
      return { moved: false, skipped: true, reason: 'File with same name already exists in target folder' };
    }
    throw error;
  }
}

export async function createOneDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  const client = await getOneDriveClient();
  
  // First, try to get the folder by path (most reliable method)
  try {
    const pathQuery = parentId === 'root' 
      ? `/me/drive/root:/${folderName}` 
      : `/me/drive/items/${parentId}:/${folderName}`;
    
    const existing = await client.api(pathQuery).get();
    if (existing && existing.id && existing.folder) {
      return existing.id;
    }
  } catch (pathError: any) {
    // Item doesn't exist by path, continue to create
    if (pathError.statusCode !== 404) {
      console.log('Path lookup error:', pathError.message);
    }
  }
  
  // Try to create the folder
  const createPath = parentId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${parentId}/children`;
  
  try {
    const response = await client.api(createPath).post({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail'
    });
    return response.id;
  } catch (createError: any) {
    // If creation fails because name exists, try path lookup again
    if (createError.code === 'nameAlreadyExists' || createError.statusCode === 409) {
      try {
        const pathQuery = parentId === 'root' 
          ? `/me/drive/root:/${folderName}` 
          : `/me/drive/items/${parentId}:/${folderName}`;
        
        const existing = await client.api(pathQuery).get();
        if (existing && existing.id) {
          return existing.id;
        }
      } catch (retryError) {
        console.log('Retry path lookup failed:', retryError);
      }
    }
    throw createError;
  }
}
