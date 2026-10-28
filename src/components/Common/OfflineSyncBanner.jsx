import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { startOfflineSync, syncOfflineQueue } from "../../services/offlineSync";
import useOfflineQueueCount from "../../hooks/useOfflineQueueCount";
import { queueBadgeText } from "../../utils/offlineQueue";

// "2 waiting to sync" under the header while Quick Add saves made offline are queued (F10)
const OfflineSyncBanner = () => {
  const count = useOfflineQueueCount();
  const [isSyncing, setIsSyncing] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);

  useEffect(() => {
    startOfflineSync();
    // Also on every sign-in (this mounts with the signed-in layout)
    syncOfflineQueue();
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (count === 0) return null;

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/[0.07]" role="status" aria-live="polite">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-10 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 min-w-0 text-amber-200">
          <CloudOff size={14} className="shrink-0" aria-hidden="true" />
          <span className="font-semibold shrink-0">{queueBadgeText(count)}</span>
          <span className="truncate text-amber-200/70">
            {online ? "Quick Add saves made offline" : "You're offline; they send when you're back"}
          </span>
        </span>
        {online && (
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="shrink-0 min-h-10 -my-1 px-3 inline-flex items-center gap-1.5 rounded-lg font-semibold text-amber-100 hover:bg-amber-500/10 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} aria-hidden="true" />
            {isSyncing ? "Syncing" : "Sync now"}
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineSyncBanner;
