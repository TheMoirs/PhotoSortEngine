
import { motion, AnimatePresence } from "framer-motion";
import { FileItem } from "@/lib/mockData";
import { LayoutGrid, SortAsc, Folder } from "lucide-react";
import { format } from "date-fns";

interface PhotoGridProps {
  files: FileItem[];
  onSort: () => void;
  isSorting: boolean;
}

export function PhotoGrid({ files, onSort, isSorting }: PhotoGridProps) {
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-lg border border-border shadow-sm">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Camera Roll</h2>
            <p className="text-muted-foreground text-sm">{files.length} items selected</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSort}
          disabled={isSorting}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          {isSorting ? (
            "Organizing..."
          ) : (
            <>
              <SortAsc className="w-4 h-4" />
              Folder Sort
            </>
          )}
        </motion.button>
      </div>

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
              <img 
                src={file.url} 
                alt={file.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
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
    </div>
  );
}
