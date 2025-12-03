
import { motion, AnimatePresence } from "framer-motion";
import { FileItem } from "@/lib/mockData";
import { LayoutGrid, SortAsc, Folder, FolderOpen, Check } from "lucide-react";
import { format } from "date-fns";

interface PhotoGridProps {
  files: FileItem[];
  onSort: () => void;
  isSorting: boolean;
  hasSortedFiles: boolean;
  onViewFolders: () => void;
}

export function PhotoGrid({ files, onSort, isSorting, hasSortedFiles, onViewFolders }: PhotoGridProps) {
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
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
          {hasSortedFiles && (
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
          
          <motion.button
            whileHover={{ scale: files.length > 0 ? 1.05 : 1 }}
            whileTap={{ scale: files.length > 0 ? 0.95 : 1 }}
            onClick={onSort}
            disabled={isSorting || files.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg transition-all ${
              files.length === 0 
                ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed" 
                : "bg-primary text-white shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            }`}
          >
            {isSorting ? (
              "Organizing..."
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
          className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/5"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
            <Folder className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No unsorted photos</h3>
          <p className="text-muted-foreground max-w-md">
            All your photos have been moved to their respective year folders.
          </p>
          {hasSortedFiles && (
             <button 
               onClick={onViewFolders}
               className="mt-6 text-primary font-medium hover:underline"
             >
               Go to Organized Library &rarr;
             </button>
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
