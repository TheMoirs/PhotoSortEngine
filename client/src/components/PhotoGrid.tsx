
import { motion, AnimatePresence } from "framer-motion";
import { FileItem } from "@/lib/mockData";
import { LayoutGrid, SortAsc, Folder, FolderOpen, Check, Home, ChevronRight, Play, ArrowLeft, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SubfolderInfo {
  id: string;
  name: string;
}

interface PhotoGridProps {
  files: FileItem[];
  onSort: () => void;
  onCancelSort?: () => void;
  isSorting: boolean;
  hasSortedFiles: boolean;
  onViewFolders: () => void;
  onStartOver: () => void;
  onBack?: () => void;
  subfolders?: SubfolderInfo[];
  onNavigateToSubfolder?: (folderId: string, folderName: string) => void;
}

export function PhotoGrid({ files, onSort, onCancelSort, isSorting, hasSortedFiles, onViewFolders, onStartOver, onBack, subfolders = [], onNavigateToSubfolder }: PhotoGridProps) {
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Back to folder browser"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 bg-white rounded-lg border border-border shadow-sm">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Camera Roll</h2>
            <p className="text-muted-foreground text-sm">
              {files.length > 0 ? `${files.length} items selected` : "Folder is empty"}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {hasSortedFiles && !isSorting && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onViewFolders}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-primary rounded-full font-medium hover:bg-secondary/80 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              View Folders
            </motion.button>
          )}

          {isSorting && onCancelSort && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onCancelSort}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-destructive rounded-full font-medium hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: files.length > 0 && !isSorting ? 1.05 : 1 }}
            whileTap={{ scale: files.length > 0 && !isSorting ? 0.95 : 1 }}
            onClick={onSort}
            disabled={isSorting || files.length === 0}
            style={isSorting
              ? { backgroundColor: '#e5e7eb', color: '#6b7280' }
              : files.length === 0
              ? { backgroundColor: '#e5e7eb', color: '#6b7280' }
              : { backgroundColor: '#3b82f6', color: '#ffffff' }
            }
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg transition-all"
          >
            {isSorting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Organising…
              </>
            ) : files.length === 0 ? (
              <>
                <Check className="w-4 h-4" />
                All Sorted
              </>
            ) : (
              <>
                <SortAsc className="w-4 h-4" />
                Folder Sort
              </>
            )}
          </motion.button>
        </div>
      </div>

      {files.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-8 text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">All media sorted!</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Your photos and videos have been moved to their respective year folders.
          </p>
          
          <button 
            onClick={onStartOver}
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg mb-8"
          >
            <Home className="w-4 h-4" />
            Start Over
          </button>

          {subfolders.length > 0 && (
            <div className="w-full max-w-2xl">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                Year Folders in This Directory
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {subfolders.map((folder) => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigateToSubfolder?.(folder.id, folder.name)}
                    className="flex items-center gap-2 p-3 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Folder className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="font-medium text-sm truncate">{folder.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                layoutId={file.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-secondary cursor-pointer"
              >
                {file.url ? (
                  <img 
                    src={file.url} 
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '';
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                  <p className="text-white text-xs font-medium truncate">{file.name}</p>
                  <p className="text-white/70 text-[10px]">{format(file.date, "MMM d, yyyy")}</p>
                </div>
                
                {file.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
                
                <div className="absolute top-3 right-3 p-1.5 bg-black/20 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                  <Folder className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
