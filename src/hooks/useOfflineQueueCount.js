import { useSyncExternalStore } from "react";
import { getQueueCount, subscribeQueueCount } from "../services/offlineSync";

// How many Quick Add saves made offline are waiting to be sent (F10)
const useOfflineQueueCount = () => useSyncExternalStore(subscribeQueueCount, getQueueCount, getQueueCount);

export default useOfflineQueueCount;
