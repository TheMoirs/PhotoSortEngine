
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, HardDrive, Cloud, CloudLightning, ArrowRight, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { FileItem } from "@/lib/mockData";

interface FilePickerProps {
  onSelectSource: (source: string, files?: FileItem[]) => void;
}

export function FilePicker({ onSelectSource }: FilePickerProps) {
  const [showLogin, setShowLogin] = useState<string | null>(null);
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
      
      // Convert FileList to our FileItem format
      const fileItems: FileItem[] = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map((file, index) => ({
          id: `local-${index}-${Date.now()}`,
          url: URL.createObjectURL(file),
          name: file.name,
          date: new Date(file.lastModified),
          type: 'image',
          size: formatBytes(file.size)
        }));

      // Simulate a small delay for UX
      setTimeout(() => {
        onSelectSource("local", fileItems);
        setIsReading(false);
      }, 1000);
    }
  };

  const handleLogin = (provider: string) => {
    // Simulate auth flow
    setIsReading(true);
    setTimeout(() => {
      setIsReading(false);
      setShowLogin(null);
      onSelectSource(provider);
    }, 2000);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 relative">
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
        className="text-center mb-12 space-y-4"
      >
        <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Import your memories
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Select a source to begin organizing your photo library. We'll automatically detect dates and metadata.
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
        >
          <SourceCard 
            icon={HardDrive} 
            label="Local Folder" 
            desc="Browse your computer"
            onClick={handleLocalClick}
            variants={item}
          />
          <SourceCard 
            icon={Cloud} 
            label="Google Drive" 
            desc="Connect cloud storage"
            onClick={() => setShowLogin('gdrive')}
            variants={item}
          />
          <SourceCard 
            icon={CloudLightning} 
            label="OneDrive" 
            desc="Sync from Microsoft"
            onClick={() => setShowLogin('onedrive')}
            variants={item}
          />
        </motion.div>
      )}

      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowLogin(null)}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  {showLogin === 'gdrive' ? (
                    <Cloud className="w-8 h-8 text-primary" />
                  ) : (
                    <CloudLightning className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Login to {showLogin === 'gdrive' ? 'Google Drive' : 'OneDrive'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Connect your account to access and organize your cloud photos.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handleLogin(showLogin)}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Continue with {showLogin === 'gdrive' ? 'Google' : 'Microsoft'}
                </button>
                <p className="text-xs text-center text-muted-foreground px-4">
                  By connecting, you allow PhotoCurator to read your file metadata. No photos are uploaded to our servers.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceCard({ icon: Icon, label, desc, onClick, variants }: any) {
  return (
    <motion.button
      variants={variants}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative p-8 rounded-2xl bg-white border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 text-left flex flex-col h-full"
    >
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{label}</h3>
      <p className="text-sm text-muted-foreground mb-8">{desc}</p>
      
      <div className="mt-auto flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
        Select Source <ArrowRight className="w-4 h-4 ml-2" />
      </div>
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
