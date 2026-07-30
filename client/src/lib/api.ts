export class AuthError extends Error {
  constructor(public provider: string) {
    super(`${provider} connection expired`);
    this.name = 'AuthError';
  }
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

export async function fetchGoogleDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const response = await fetch(`/api/gdrive/photos?folderId=${folderId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data.authError || response.status === 401) throw new AuthError('gdrive');
    throw new Error(data.error || 'Failed to fetch Google Drive photos');
  }
  const data = await response.json();
  return data.files;
}

export async function fetchOneDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const response = await fetch(`/api/onedrive/photos?folderId=${folderId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data.authError || response.status === 401) throw new AuthError('onedrive');
    throw new Error(data.error || 'Failed to fetch OneDrive photos');
  }
  const data = await response.json();
  return data.files;
}

export async function organizeGoogleDrivePhotos(files: CloudFile[], parentFolderId: string = 'root') {
  const imageFiles = files.map(f => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime
  }));
  
  const response = await fetch('/api/gdrive/organize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: imageFiles, parentFolderId }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Server error ${response.status}: Failed to organize Google Drive photos`);
  }
  
  return response.json();
}

export async function organizeOneDrivePhotos(files: CloudFile[], parentFolderId: string = 'root') {
  const imageFiles = files.map(f => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime
  }));
  
  const response = await fetch('/api/onedrive/organize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: imageFiles, parentFolderId }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Server error ${response.status}: Failed to organize OneDrive photos`);
  }
  
  return response.json();
}
