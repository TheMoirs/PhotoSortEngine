
import { useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { PhotoGrid } from "@/components/PhotoGrid";
import { FolderView } from "@/components/FolderView";
import { MOCK_FILES } from "@/lib/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type AppState = 'picking' | 'loading' | 'browsing' | 'sorting' | 'sorted';

export default function Home() {
  const [state, setState] = useState<AppState>('picking');
  const [source, setSource] = useState<string | null>(null);

  const handleSelectSource = (src: string) => {
    setSource(src);
    setState('loading');
    // Simulate scanning/loading delay
    setTimeout(() => {
      setState('browsing');
    }, 1500);
  };

  const handleSort = () => {
    setState('sorting');
    // Simulate sorting animation delay
    setTimeout(() => {
      setState('sorted');
    }, 800);
  };

  const handleReset = () => {
    setState('browsing');
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/10 selection:text-primary">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-display font-bold text-lg">
              C
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Curator</span>
          </div>
          
          {source && (
            <div className="text-sm font-medium px-3 py-1 bg-secondary rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected: <span className="capitalize">{source === 'gdrive' ? 'Google Drive' : source}</span>
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
              <p className="text-muted-foreground font-medium">Scanning directory...</p>
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
                files={MOCK_FILES} 
                onSort={handleSort} 
                isSorting={state === 'sorting'}
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
                files={MOCK_FILES} 
                onReset={handleReset}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
