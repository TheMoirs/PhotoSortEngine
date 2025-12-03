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

export function FolderBrowser({ 
  files, 
  currentPath, 
  onNavigate, 
  onBack, 
  onSelectFolder,
  isLoading,
  source
}: FolderBrowserProps) {
  const folders = files.filter(f => 
    f.mimeType === 'application/vnd.google-apps.folder' || 
    f.mimeType === 'application/vnd.folder'
  );
  const images = files.filter(f => f.mimeType.startsWith('image/'));

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium text-muted-foreground">
            {source === 'gdrive' ? 'Google Drive' : 'OneDrive'}
          </span>
          {currentPath.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className={index === currentPath.length - 1 ? 'font-semibold' : 'text-muted-foreground'}>
                {item.name}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Browse Folders</h2>
          <p className="text-muted-foreground text-sm">
            {folders.length} folders, {images.length} photos
          </p>
        </div>

        {images.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSelectFolder}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium shadow-lg shadow-primary/20"
            data-testid="button-select-folder"
          >
            <Image className="w-4 h-4" />
            Select This Folder ({images.length} photos)
          </motion.button>
        )}
      </div>

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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate(folder.id, folder.name)}
                    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
                    data-testid={`folder-${folder.id}`}
                  >
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Folder className="w-5 h-5 fill-current" />
                    </div>
                    <span className="font-medium truncate">{folder.name}</span>
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
