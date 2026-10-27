import { useEffect, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { PhotoGrid } from "@/components/PhotoGrid";
import { FolderView } from "@/components/FolderView";
import { FolderBrowser } from "@/components/FolderBrowser";
import { ReconnectScreen } from "@/components/ReconnectScreen";
import { FileItem } from "@/lib/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { 
  fetchGoogleDrivePhotos, 
  fetchOneDrivePhotos, 
  organizeGoogleDrivePhotos,
  organizeOneDrivePhotos,
  AuthError,
  type CloudFile 
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type AppState = 'picking' | 'loading' | 'folder-browsing' | 'browsing' | 'sorting' | 'sorted' | 'auth-error';

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function Home() {
  const [state, setState] = useState<AppState>('picking');
  const [source, setSource] = useState<string | null>(null);
  const { toast } = useToast();
  
  // State to track files
  const [unsortedFiles, setUnsortedFiles] = useState<FileItem[]>([]);
  const [sortedFiles, setSortedFiles] = useState<FileItem[]>([]);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [allCloudFiles, setAllCloudFiles] = useState<CloudFile[]>([]);
  
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [isBrowsingLoading, setIsBrowsingLoading] = useState(false);

  const loadCloudFolder = async (src: string, folderId: string) => {
    setIsBrowsingLoading(true);
    try {
      let files: CloudFile[];
      if (src === 'gdrive') {
        files = await fetchGoogleDrivePhotos(folderId);
      } else {
        files = await fetchOneDrivePhotos(folderId);
      }
      setAllCloudFiles(files);
      setIsBrowsingLoading(false);
    } catch (error: any) {
      setIsBrowsingLoading(false);
      if (error instanceof AuthError) {
        setState('auth-error');
        return;
      }
      console.error('Error loading folder:', error);
      toast({
        title: "Error loading folder",
        description: error.message || "Failed to load folder contents",
        variant: "destructive",
      });
    }
  };

  const handleSelectSource = async (src: string, files?: FileItem[]) => {
    setSource(src);
    setSortedFiles([]);
    
    try {
      if (files && files.length > 0) {
        // Local files - go directly to browsing
        setUnsortedFiles(files);
        setCloudFiles([]);
        setState('browsing');
      } else if (src === 'gdrive' || src === 'onedrive') {
        // Cloud storage - show folder browser
        setState('loading');
        setCurrentFolderId('root');
        setFolderPath([]);
        await loadCloudFolder(src, 'root');
        // loadCloudFolder will set state to 'auth-error' if needed
        setState(prev => prev === 'auth-error' ? 'auth-error' : 'folder-browsing');
      }
    } catch (error: any) {
      if (error instanceof AuthError) {
        setState('auth-error');
        return;
      }
      console.error('Error loading files:', error);
      toast({
        title: "Error loading files",
        description: error.message || "Failed to load files from cloud storage",
        variant: "destructive",
      });
      setState('picking');
    }
  };

  // After signing in, Google/Microsoft send the user back to /?connected=gdrive|onedrive.
  // Open that source straight away and tidy the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    if (connected === 'gdrive' || connected === 'onedrive') {
      window.history.replaceState(null, '', window.location.pathname);
      handleSelectSource(connected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigateFolder = async (folderId: string, folderName: string) => {
    if (!source) return;
    setCurrentFolderId(folderId);
    setFolderPath([...folderPath, { id: folderId, name: folderName }]);
    await loadCloudFolder(source, folderId);
  };

  const handleBackFolder = () => {
    if (folderPath.length === 0) {
      // Go back to source picker
      setState('picking');
      setSource(null);
      return;
    }
    
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : 'root';
    setCurrentFolderId(parentId);
    if (source) {
      loadCloudFolder(source, parentId);
    }
  };

  const handleSelectCloudFolder = () => {
    const isMediaFile = (f: CloudFile): boolean => {
      const mimeType = f.mimeType || '';
      if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) return true;
      const name = (f.name || '').toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg'];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg'];
      return imageExtensions.some(ext => name.endsWith(ext)) || videoExtensions.some(ext => name.endsWith(ext));
    };
    const isFolderFile = (f: CloudFile): boolean => {
      const mimeType = f.mimeType || '';
      return mimeType === 'application/vnd.google-apps.folder' || 
             mimeType === 'application/vnd.folder' ||
             mimeType.includes('folder');
    };
    const mediaFiles = allCloudFiles.filter(f => !isFolderFile(f) && isMediaFile(f));
    setCloudFiles(mediaFiles);
    
    // Convert to FileItem format for display with proxied thumbnails
    const displayFiles: FileItem[] = mediaFiles.map(f => {
      const mimeType = f.mimeType || '';
      const isVideo = mimeType.startsWith('video/') || 
        ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg']
          .some(ext => (f.name || '').toLowerCase().endsWith(ext));
      return {
        id: f.id,
        url: source === 'gdrive' 
          ? `/api/gdrive/thumbnail/${f.id}` 
          : `/api/onedrive/thumbnail/${f.id}`,
        name: f.name,
        date: new Date(f.modifiedTime || f.createdTime || Date.now()),
        type: isVideo ? 'video' : 'image',
        size: f.size ? formatBytes(f.size) : '0 B'
      };
    });
    setUnsortedFiles(displayFiles);
    setState('browsing');
  };

  const handleSort = async () => {
    if (unsortedFiles.length === 0) return;

    setState('sorting');
    
    try {
      if (source === 'gdrive' && cloudFiles.length > 0) {
        const result = await organizeGoogleDrivePhotos(cloudFiles, currentFolderId);
        const moved = result.moved || cloudFiles.length;
        const skipped = result.skipped || 0;
        toast({
          title: "Media organized!",
          description: skipped > 0 
            ? `Moved ${moved} files to year folders. ${skipped} already in correct folders.`
            : `Successfully moved ${moved} photos/videos into year folders in Google Drive.`,
        });
      } else if (source === 'onedrive' && cloudFiles.length > 0) {
        const result = await organizeOneDrivePhotos(cloudFiles, currentFolderId);
        const moved = result.moved || 0;
        const skipped = result.skipped || 0;
        toast({
          title: "Media organized!",
          description: skipped > 0 
            ? `Moved ${moved} files to year folders. ${skipped} already in correct folders.`
            : `Successfully moved ${moved} photos/videos into year folders in OneDrive.`,
        });
      } else {
        toast({
          title: "Media organized!",
          description: "Photos have been sorted by year (local preview only).",
        });
      }

      setSortedFiles([...sortedFiles, ...unsortedFiles]);
      setUnsortedFiles([]);
      setCloudFiles([]);
      
      // Reload folder contents to get updated subfolder list
      if (source) {
        await loadCloudFolder(source, currentFolderId);
      }
      
      setState('browsing');
    } catch (error: any) {
      console.error('Error organizing files:', error);
      toast({
        title: "Error organizing files",
        description: error.message || "Failed to organize photos",
        variant: "destructive",
      });
      setState('browsing');
    }
  };

  const handleBackToBrowsing = () => {
    // Go back from photo grid to folder browser, reloading current folder
    setState('folder-browsing');
    if (source) {
      loadCloudFolder(source, currentFolderId);
    }
  };

  const handleCancelSort = () => {
    // Stop the sorting UI immediately; the server may still be running but the user
    // can navigate away. State goes back to browsing with whatever files remain.
    setState('browsing');
  };

  const handleBackToRoot = () => {
    setState('browsing');
  };

  const handleBackToPicker = () => {
    setState('picking');
    setSource(null);
    setUnsortedFiles([]);
    setSortedFiles([]);
    setCloudFiles([]);
    setAllCloudFiles([]);
    setFolderPath([]);
    setCurrentFolderId('root');
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/10 selection:text-primary">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={handleBackToPicker}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-display font-bold text-lg">
              C
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Curator</span>
          </button>
          
          {source && (
            <div className="text-sm font-medium px-3 py-1 bg-secondary rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected: <span className="capitalize">{source === 'gdrive' ? 'Google Drive' : source === 'onedrive' ? 'OneDrive' : source}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <AnimatePresence mode="wait">
          
          {state === 'picking' && (
            <motion.div 
              key="picker"
              exit={{ opacity: 0, y: -20 }}
            >
              <FilePicker onSelectSource={handleSelectSource} />
            </motion.div>
          )}

          {state === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Connecting to cloud storage...</p>
            </motion.div>
          )}

          {state === 'auth-error' && source && (
            <motion.div
              key="auth-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ReconnectScreen
                provider={source as 'gdrive' | 'onedrive'}
                onBack={handleBackToPicker}
              />
            </motion.div>
          )}

          {state === 'folder-browsing' && source && (
            <motion.div
              key="folder-browser"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <FolderBrowser
                files={allCloudFiles}
                currentPath={folderPath}
                onNavigate={handleNavigateFolder}
                onBack={handleBackFolder}
                onSelectFolder={handleSelectCloudFolder}
                isLoading={isBrowsingLoading}
                source={source}
              />
            </motion.div>
          )}

          {(state === 'browsing' || state === 'sorting') && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <PhotoGrid 
                files={unsortedFiles} 
                onSort={handleSort}
                onCancelSort={handleCancelSort}
                isSorting={state === 'sorting'}
                hasSortedFiles={sortedFiles.length > 0}
                onViewFolders={() => setState('sorted')}
                onStartOver={handleBackToPicker}
                onBack={(source === 'gdrive' || source === 'onedrive') ? handleBackToBrowsing : undefined}
                subfolders={allCloudFiles
                  .filter(f => f.mimeType === 'application/vnd.google-apps.folder' || f.mimeType === 'application/vnd.folder')
                  .filter(f => /^\d{4}$/.test(f.name))
                  .sort((a, b) => b.name.localeCompare(a.name))
                  .map(f => ({ id: f.id, name: f.name }))}
                onNavigateToSubfolder={(folderId, folderName) => {
                  setFolderPath([...folderPath, { id: folderId, name: folderName }]);
                  setCurrentFolderId(folderId);
                  if (source) loadCloudFolder(source, folderId);
                  setState('folder-browsing');
                }}
              />
            </motion.div>
          )}

          {state === 'sorted' && (
            <motion.div
              key="folders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <FolderView 
                files={sortedFiles} 
                onReset={handleBackToRoot}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
