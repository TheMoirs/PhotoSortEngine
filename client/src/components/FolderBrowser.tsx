import { motion } from "framer-motion";
import { Folder, ChevronRight, ArrowLeft, Image, Loader2 } from "lucide-react";
import { CloudFile } from "@/lib/api";

interface FolderBrowserProps {
  files: CloudFile[];
  currentPath: { id: string; name: string }[];
  onNavigate: (folderId: string, folderName: string) => void;
  onBack: () => void;
  onSelectFolder: () => void;
  isLoading: boolean;
  source: string;
}

const isImageFile = (file: CloudFile): boolean => {
  // Check mimeType first (handle both string and undefined)
  const mimeType = file.mimeType || '';
  if (mimeType.startsWith('image/')) return true;
  
  // Fall back to extension check
  const name = (file.name || '').toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg'];
  return imageExtensions.some(ext => name.endsWith(ext));
};

const isFolderFile = (file: CloudFile): boolean => {
  const mimeType = file.mimeType || '';
  return mimeType === 'application/vnd.google-apps.folder' || 
         mimeType === 'application/vnd.folder' ||
         mimeType.includes('folder');
};

export function FolderBrowser({ 
  files, 
  currentPath, 
  onNavigate, 
  onBack, 
  onSelectFolder,
  isLoading,
  source
}: FolderBrowserProps) {
  const folders = files.filter(isFolderFile);
  const images = files.filter(f => !isFolderFile(f) && isImageFile(f));

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1 text-xs sm:text-sm overflow-x-auto">
          <span className="font-medium text-muted-foreground whitespace-nowrap">
            {source === 'gdrive' ? 'Drive' : 'OneDrive'}
          </span>
          {currentPath.slice(-2).map((item, index) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <span className={`whitespace-nowrap truncate max-w-[60px] sm:max-w-[120px] ${index === currentPath.slice(-2).length - 1 ? 'font-semibold' : 'text-muted-foreground'}`}>
                {item.name}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Browse Folders</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {folders.length} folders, {images.length} photos
          </p>
        </div>

        <motion.button
          whileHover={images.length > 0 ? { scale: 1.05 } : {}}
          whileTap={images.length > 0 ? { scale: 0.95 } : {}}
          onClick={images.length > 0 ? onSelectFolder : undefined}
          disabled={images.length === 0}
          style={images.length > 0 
            ? { backgroundColor: '#3b82f6', color: '#ffffff' }
            : { backgroundColor: '#e5e7eb', color: '#6b7280' }
          }
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg text-base"
          data-testid="button-select-folder"
        >
          <Image className="w-5 h-5" />
          {images.length > 0 
            ? `Select This Folder (${images.length} photos)` 
            : 'No photos in this folder'}
        </motion.button>
      </div>

      {/* Mobile sticky footer button - always visible when there are images */}
      {images.length > 0 && (
        <>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-2xl sm:hidden" style={{ zIndex: 9999 }}>
            <button
              onClick={onSelectFolder}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-semibold text-base shadow-lg"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              data-testid="button-select-folder-mobile"
            >
              <Image className="w-5 h-5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Select This Folder ({images.length} photos)</span>
            </button>
          </div>
          {/* Spacer to prevent content from being hidden behind sticky button */}
          <div className="h-24 sm:hidden" />
        </>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground mt-4">Loading folder contents...</p>
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Folders</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {folders.map((folder) => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate(folder.id, folder.name)}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 bg-white rounded-lg sm:rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
                    data-testid={`folder-${folder.id}`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Folder className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{folder.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Images Preview */}
          {images.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Photos in this folder</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.slice(0, 12).map((image) => {
                  const thumbnailUrl = source === 'gdrive' 
                    ? `/api/gdrive/thumbnail/${image.id}` 
                    : `/api/onedrive/thumbnail/${image.id}`;
                  return (
                    <div
                      key={image.id}
                      className="aspect-square rounded-lg overflow-hidden bg-secondary"
                    >
                      <img 
                        src={thumbnailUrl} 
                        alt={image.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  );
                })}
                {images.length > 12 && (
                  <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-muted-foreground font-medium">+{images.length - 12} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {folders.length === 0 && images.length === 0 && (
            <div className="text-center py-20">
              <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Empty Folder</h3>
              <p className="text-muted-foreground">This folder doesn't contain any photos or subfolders.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
