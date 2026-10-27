import { motion } from "framer-motion";
import { WifiOff, LogIn, Cloud, CloudLightning } from "lucide-react";

interface ReconnectScreenProps {
  provider: 'gdrive' | 'onedrive';
  onBack: () => void;
}

export function ReconnectScreen({ provider, onBack }: ReconnectScreenProps) {
  const isGDrive = provider === 'gdrive';
  const Icon = isGDrive ? Cloud : CloudLightning;
  const name = isGDrive ? 'Google Drive' : 'OneDrive';
  const signInUrl = isGDrive ? '/auth/google' : '/auth/microsoft';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
          <Icon className="w-9 h-9 text-orange-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-4 h-4 text-red-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Sign in to {name}</h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        You're not signed in to {name}, or your sign-in has expired. Sign in to let PhotoSortEngine
        browse your photos and sort them into year folders.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border hover:bg-secondary transition-colors font-medium text-sm"
        >
          ← Back
        </button>
        <a
          href={signInUrl}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Sign in with {isGDrive ? 'Google' : 'Microsoft'}
        </a>
      </div>
    </motion.div>
  );
}
