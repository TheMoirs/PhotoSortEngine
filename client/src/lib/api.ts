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
    throw new Error('Failed to fetch Google Drive photos');
  }
  const data = await response.json();
  return data.files;
}

export async function fetchOneDrivePhotos(folderId: string = 'root'): Promise<CloudFile[]> {
  const response = await fetch(`/api/onedrive/photos?folderId=${folderId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch OneDrive photos');
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to organize Google Drive photos');
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to organize OneDrive photos');
  }
  
  return response.json();
}
