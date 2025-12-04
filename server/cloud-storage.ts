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

export async function moveGoogleDriveFile(fileId: string, targetFolderId: string): Promise<void> {
  const drive = await getGoogleDriveClient();
  
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'parents'
  });

  const previousParents = file.data.parents?.join(',');

  await drive.files.update({
    fileId: fileId,
    addParents: targetFolderId,
    removeParents: previousParents,
    fields: 'id, parents'
  });
}

export async function createGoogleDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  const drive = await getGoogleDriveClient();
  
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

export async function moveOneDriveFile(fileId: string, targetFolderId: string): Promise<void> {
  const client = await getOneDriveClient();
  
  await client.api(`/me/drive/items/${fileId}`).patch({
    parentReference: {
      id: targetFolderId
    }
  });
}

export async function createOneDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  const client = await getOneDriveClient();
  
  const path = parentId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${parentId}/children`;
  const response = await client.api(path).post({
    name: folderName,
    folder: {},
    '@microsoft.graph.conflictBehavior': 'rename'
  });

  return response.id;
}
