
import { motion } from "framer-motion";
import { FolderOpen, HardDrive, Cloud, CloudLightning, ArrowRight, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { FileItem } from "@/lib/mockData";

interface FilePickerProps {
  onSelectSource: (source: string, files?: FileItem[]) => void;
}

export function FilePicker({ onSelectSource }: FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleLocalClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsReading(true);
      
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg'];
      
      const isMediaFile = (file: File): boolean => {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) return true;
        const name = file.name.toLowerCase();
        return videoExtensions.some(ext => name.endsWith(ext));
      };
      
      // Convert FileList to our FileItem format (photos and videos)
      const fileItems: FileItem[] = Array.from(files)
        .filter(isMediaFile)
        .map((file, index) => {
          const isVideo = file.type.startsWith('video/') || 
            videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
          return {
            id: `local-${index}-${Date.now()}`,
            url: URL.createObjectURL(file),
            name: file.name,
            date: new Date(file.lastModified),
            type: isVideo ? 'video' : 'image',
            size: formatBytes(file.size)
          };
        });

      // Simulate a small delay for UX
      setTimeout(() => {
        onSelectSource("local", fileItems);
        setIsReading(false);
      }, 1000);
    }
  };

  const handleCloudConnect = (provider: string) => {
    // Directly connect to cloud - integrations are already set up on backend
    setIsReading(true);
    onSelectSource(provider);
  };

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 sm:p-8 relative">
      {/* Hidden Input for Directory Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-10 space-y-2 sm:space-y-3"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/5 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary tracking-tight">
          Sort Your Media
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto">
          Choose a source to organize your photos and videos by year
        </p>
      </motion.div>

      {isReading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Reading files...</p>
        </motion.div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md sm:max-w-2xl px-2"
        >
          <SourceCard 
            icon={HardDrive} 
            label="Local" 
            desc="Device"
            onClick={handleLocalClick}
            variants={item}
          />
          <SourceCard 
            icon={Cloud} 
            label="Google" 
            desc="Drive"
            onClick={() => handleCloudConnect('gdrive')}
            variants={item}
          />
          <SourceCard 
            icon={CloudLightning} 
            label="OneDrive" 
            desc="Microsoft"
            onClick={() => handleCloudConnect('onedrive')}
            variants={item}
          />
        </motion.div>
      )}

    </div>
  );
}

function SourceCard({ icon: Icon, label, desc, onClick, variants }: any) {
  return (
    <motion.button
      variants={variants}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative p-3 sm:p-5 rounded-xl bg-white border border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 text-center flex flex-col items-center h-full"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold">{label}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </motion.button>
  );
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
