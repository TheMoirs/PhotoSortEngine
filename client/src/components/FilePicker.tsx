
import { motion } from "framer-motion";
import { FolderOpen, HardDrive, Cloud, CloudLightning, ArrowRight } from "lucide-react";

interface FilePickerProps {
  onSelectSource: (source: string) => void;
}

export function FilePicker({ onSelectSource }: FilePickerProps) {
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

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
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
          onClick={() => onSelectSource("local")}
          variants={item}
        />
        <SourceCard 
          icon={Cloud} 
          label="Google Drive" 
          desc="Connect cloud storage"
          onClick={() => onSelectSource("gdrive")}
          variants={item}
        />
        <SourceCard 
          icon={CloudLightning} 
          label="OneDrive" 
          desc="Sync from Microsoft"
          onClick={() => onSelectSource("onedrive")}
          variants={item}
        />
      </motion.div>
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
