
import { motion } from "framer-motion";
import { FileItem } from "@/lib/mockData";
import { Folder, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface FolderViewProps {
  files: FileItem[];
  onReset: () => void;
}

export function FolderView({ files, onReset }: FolderViewProps) {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Group files by year
  const groupedFiles = files.reduce((acc, file) => {
    const year = file.date.getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(file);
    return acc;
  }, {} as Record<string, FileItem[]>);

  const years = Object.keys(groupedFiles).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={onReset}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h2 className="text-2xl font-bold">Organized Library</h2>
          <p className="text-muted-foreground text-sm">Sorted by Year</p>
        </div>
      </div>

      <div className="space-y-6">
        {years.map((year, i) => (
          <motion.div
            key={year}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="border border-border rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm"
          >
            <div 
              onClick={() => setExpandedYear(expandedYear === year ? null : year)}
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Folder className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{year}</h3>
                  <p className="text-sm text-muted-foreground">{groupedFiles[year].length} items</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedYear === year ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </div>

            <motion.div
              initial={false}
              animate={{ 
                height: expandedYear === year ? "auto" : 0,
                opacity: expandedYear === year ? 1 : 0
              }}
              className="overflow-hidden bg-secondary/10"
            >
              <div className="p-6 pt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupedFiles[year].map((file) => (
                  <motion.div
                    key={file.id}
                    layoutId={file.id} // Shared layout ID for magic move
                    className="aspect-square rounded-lg overflow-hidden relative group"
                  >
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
