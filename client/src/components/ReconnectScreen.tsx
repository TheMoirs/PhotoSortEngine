import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Cloud, CloudLightning } from "lucide-react";

interface ReconnectScreenProps {
  provider: 'gdrive' | 'onedrive';
  onBack: () => void;
}

export function ReconnectScreen({ provider, onBack }: ReconnectScreenProps) {
  const isGDrive = provider === 'gdrive';
  const Icon = isGDrive ? Cloud : CloudLightning;
  const name = isGDrive ? 'Google Drive' : 'OneDrive';

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

      <h2 className="text-2xl font-bold mb-2">{name} Disconnected</h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Your {name} connection has expired or been revoked. To reconnect, follow these steps:
      </p>

      <ol className="text-left space-y-3 mb-8 w-full">
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center">1</span>
          <span className="text-sm text-muted-foreground pt-0.5">
            Click the <strong className="text-foreground">Integrations</strong> button in the Replit toolbar (puzzle-piece icon), or ask me to reconnect it for you.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
          <span className="text-sm text-muted-foreground pt-0.5">
            Find <strong className="text-foreground">{name}</strong> and click <strong className="text-foreground">Connect</strong> to sign in again.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center">3</span>
          <span className="text-sm text-muted-foreground pt-0.5">
            Return here and try <strong className="text-foreground">{name}</strong> again.
          </span>
        </li>
      </ol>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border hover:bg-secondary transition-colors font-medium text-sm"
        >
          ← Back
        </button>
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </motion.div>
  );
}
