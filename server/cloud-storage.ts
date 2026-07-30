import { ReplitConnectors } from '@replit/connectors-sdk';

async function googleDriveProxy(path: string, options?: { method?: string; body?: any; params?: Record<string, string> }): Promise<any> {
  const connectors = new ReplitConnectors();
  const method = options?.method || 'GET';
  const fetchOptions: any = { method };
  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
    fetchOptions.headers = { 'Content-Type': 'application/json' };
  }
  // Append query params if provided
  let fullPath = path;
  if (options?.params) {
    const qs = new URLSearchParams(options.params).toString();
    fullPath = `${path}?${qs}`;
  }
  const response = await connectors.proxy('google-drive', fullPath, fetchOptions);
  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(`Google Drive API error ${response.status}: ${text}`), { statusCode: response.status, code: response.status });
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return null;
  return response.json();
}

export async function getGoogleDriveProxyResponse(path: string): Promise<Response> {
  const connectors = new ReplitConnectors();
  return connectors.proxy('google-drive', path, { method: 'GET' });
}

export async function oneDriveProxy(path: string, options?: { method?: string; body?: any }): Promise<any> {
  const connectors = new ReplitConnectors();
  const method = options?.method || 'GET';
  const fetchOptions: any = { method };
  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
    fetchOptions.headers = { 'Content-Type': 'application/json' };
  }
  // Microsoft Graph requires /v1.0/ version prefix
  const versionedPath = path.startsWith('/v1.0') ? path : `/v1.0${path}`;
  const response = await connectors.proxy('onedrive', versionedPath, fetchOptions);
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw Object.assign(new Error(`OneDrive API error ${response.status}: ${text}`), { statusCode: response.status });
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return null;
  return response.json();
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
  const allFiles: CloudFile[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, thumbnailLink, webViewLink)',
      pageSize: '1000',
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await googleDriveProxy('/drive/v3/files', { params });

    const files = (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size ? parseInt(file.size) : undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      webViewLink: file.webViewLink || undefined,
    }));

    allFiles.push(...files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

export async function moveGoogleDriveFile(fileId: string, targetFolderId: string): Promise<{ moved: boolean; skipped: boolean; reason?: string }> {
  try {
    const file = await googleDriveProxy(`/drive/v3/files/${fileId}`, { params: { fields: 'parents' } });

    if (file.parents?.includes(targetFolderId)) {
      return { moved: false, skipped: true, reason: 'File already in target folder' };
    }

    const previousParents = (file.parents || []).join(',');
    await googleDriveProxy(`/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      params: { addParents: targetFolderId, removeParents: previousParents, fields: 'id,parents' },
    });

    return { moved: true, skipped: false };
  } catch (error: any) {
    if (error.statusCode === 409 || error.message?.includes('already exists')) {
      return { moved: false, skipped: true, reason: 'File with same name already exists in target folder' };
    }
    throw error;
  }
}

export async function createGoogleDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  // Check if folder already exists
  const existing = await googleDriveProxy('/drive/v3/files', {
    params: {
      q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id,name)',
    },
  });

  if (existing.files && existing.files.length > 0) {
    return existing.files[0].id;
  }

  const created = await googleDriveProxy('/drive/v3/files', {
    method: 'POST',
    params: { fields: 'id' },
    body: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
  });

  return created.id;
}

export async function listOneDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const apiPath = folderId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${folderId}/children`;
  
  const allItems: any[] = [];
  let nextPath: string | null = apiPath;
  
  // Paginate through all results
  while (nextPath) {
    const response = await oneDriveProxy(nextPath);
    allItems.push(...(response.value || []));
    // nextLink from Graph API is a full URL like https://graph.microsoft.com/v1.0/me/...
    // Extract just the path+query so the proxy can handle it
    const nextLink: string | undefined = response['@odata.nextLink'];
    if (nextLink) {
      const url = new URL(nextLink);
      nextPath = url.pathname + url.search; // already includes /v1.0/...
    } else {
      nextPath = null;
    }
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.tif'];
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg'];
  
  const isMediaFile = (item: any): boolean => {
    const mimeType = item.file?.mimeType || '';
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) return true;
    const name = item.name?.toLowerCase() || '';
    return imageExtensions.some(ext => name.endsWith(ext)) || videoExtensions.some(ext => name.endsWith(ext));
  };

  return allItems
    .filter((item: any) => isMediaFile(item) || item.folder)
    .map((item: any) => {
      const name = item.name?.toLowerCase() || '';
      let mimeType = item.file?.mimeType;
      
      if (!mimeType && !item.folder) {
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        else if (name.endsWith('.gif')) mimeType = 'image/gif';
        else if (name.endsWith('.webp')) mimeType = 'image/webp';
        else if (name.endsWith('.heic') || name.endsWith('.heif')) mimeType = 'image/heic';
        else if (name.endsWith('.mp4')) mimeType = 'video/mp4';
        else if (name.endsWith('.mov')) mimeType = 'video/quicktime';
        else if (name.endsWith('.avi')) mimeType = 'video/x-msvideo';
        else if (name.endsWith('.mkv')) mimeType = 'video/x-matroska';
        else if (name.endsWith('.webm')) mimeType = 'video/webm';
        else if (name.endsWith('.m4v')) mimeType = 'video/x-m4v';
        else mimeType = 'image/jpeg';
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
  try {
    // First check if file is already in the target folder
    const file = await oneDriveProxy(`/me/drive/items/${fileId}`);
    if (file.parentReference?.id === targetFolderId) {
      return { moved: false, skipped: true, reason: 'File already in target folder' };
    }
    
    // Try to move the file with replace behavior for conflicts
    await oneDriveProxy(`/me/drive/items/${fileId}`, {
      method: 'PATCH',
      body: {
        parentReference: { id: targetFolderId },
        '@microsoft.graph.conflictBehavior': 'replace'
      }
    });
    return { moved: true, skipped: false };
  } catch (error: any) {
    if (error.statusCode === 409) {
      try {
        const file = await oneDriveProxy(`/me/drive/items/${fileId}`);
        const fileName = file.name;
        const existingFile = await oneDriveProxy(`/me/drive/items/${targetFolderId}:/${fileName}`);
        if (existingFile && existingFile.id) {
          await oneDriveProxy(`/me/drive/items/${existingFile.id}`, { method: 'DELETE' });
        }
        await oneDriveProxy(`/me/drive/items/${fileId}`, {
          method: 'PATCH',
          body: { parentReference: { id: targetFolderId } }
        });
        return { moved: true, skipped: false };
      } catch (retryError) {
        console.log('Failed to overwrite existing file:', retryError);
        return { moved: false, skipped: true, reason: 'Could not overwrite existing file' };
      }
    }
    throw error;
  }
}

export async function createOneDriveFolder(folderName: string, parentId: string = 'root'): Promise<string> {
  // First, try to get the folder by path
  try {
    const pathQuery = parentId === 'root'
      ? `/me/drive/root:/${folderName}`
      : `/me/drive/items/${parentId}:/${folderName}`;
    const existing = await oneDriveProxy(pathQuery);
    if (existing && existing.id && existing.folder) {
      return existing.id;
    }
  } catch (pathError: any) {
    if (pathError.statusCode !== 404) {
      console.log('Path lookup error:', pathError.message);
    }
  }
  
  const createPath = parentId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${parentId}/children`;
  
  try {
    const response = await oneDriveProxy(createPath, {
      method: 'POST',
      body: { name: folderName, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }
    });
    return response.id;
  } catch (createError: any) {
    if (createError.statusCode === 409) {
      try {
        const pathQuery = parentId === 'root'
          ? `/me/drive/root:/${folderName}`
          : `/me/drive/items/${parentId}:/${folderName}`;
        const existing = await oneDriveProxy(pathQuery);
        if (existing && existing.id) return existing.id;
      } catch (retryError) {
        console.log('Retry path lookup failed:', retryError);
      }
    }
    throw createError;
  }
}
