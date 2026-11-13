// Real-Time WebSocket & Bootstrap Sync Engine
// Connects every browser tab and device to /ws for instant platform-wide updates.

export const PRESENCE_UPDATE_EVENT = 'arm_presence_update';
export const REALTIME_SYNC_EVENT = 'arm_realtime_sync';

export interface RealtimeBootstrapPayload {
  ts: number;
  onlineCount?: number;
  books?: any[];
  summaries?: any[];
  videos?: any[];
  articles?: any[];
  deletedIds?: {
    books?: number[];
    summaries?: number[];
    videos?: number[];
    articles?: number[];
    users?: string[];
  };
  customExams?: any[];
  deletedExamIds?: string[];
  reviews?: any[];
  comments?: any[];
  supportConfig?: Record<string, boolean>;
  studentSubscriptions?: Record<string, any>;
}

let socketInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let retryDelayMs = 1000;
let isInitialized = false;
let lastPresenceState = { onlineCount: 0, connected: false };
let inFlightBootstrap: Promise<RealtimeBootstrapPayload | null> | null = null;

export function getLastPresenceState() {
  return lastPresenceState;
}

function dispatchPresence(onlineCount: number, connected: boolean) {
  lastPresenceState = { onlineCount, connected };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PRESENCE_UPDATE_EVENT, {
        detail: { onlineCount, connected },
      })
    );
  }
}

function dispatchSyncEvent(scope: string, ts?: number, onlineCount?: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(REALTIME_SYNC_EVENT, {
        detail: {
          scope: scope || 'all',
          ts: ts || Date.now(),
          onlineCount: typeof onlineCount === 'number' ? onlineCount : lastPresenceState.onlineCount,
        },
      })
    );
  }
}

let bootstrapVersion = 0;

export function invalidateBootstrapCache() {
  bootstrapVersion += 1;
  inFlightBootstrap = null;
}

export async function syncBootstrapFromServer(force = false): Promise<RealtimeBootstrapPayload | null> {
  if (typeof window === 'undefined') return null;
  if (!force && inFlightBootstrap) return inFlightBootstrap;

  const requestVersion = ++bootstrapVersion;
  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/sync/bootstrap', {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = (await res.json()) as RealtimeBootstrapPayload;
      if (requestVersion !== bootstrapVersion) {
        return null;
      }
      if (typeof data.onlineCount === 'number') {
        dispatchPresence(data.onlineCount, lastPresenceState.connected);
      }
      return data;
    } catch {
      return null;
    } finally {
      if (requestVersion === bootstrapVersion) {
        inFlightBootstrap = null;
      }
    }
  })();

  inFlightBootstrap = promise;
  return promise;
}

function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function connectSocket() {
  if (typeof window === 'undefined') return;
  if (socketInstance && (socketInstance.readyState === WebSocket.OPEN || socketInstance.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    socketInstance = ws;

    ws.onopen = () => {
      const wasReconnect = retryDelayMs > 1000;
      retryDelayMs = 1000;
      clearTimers();

      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          } catch {
            // ignore
          }
        }
      }, 25000);

      if (wasReconnect) {
        dispatchSyncEvent('all', Date.now());
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'connected' || msg?.type === 'presence') {
          if (typeof msg.onlineCount === 'number') {
            dispatchPresence(msg.onlineCount, true);
          }
        } else if (msg?.type === 'pong') {
          if (typeof msg.onlineCount === 'number') {
            dispatchPresence(msg.onlineCount, true);
          }
        } else if (msg?.type === 'sync') {
          if (typeof msg.onlineCount === 'number') {
            dispatchPresence(msg.onlineCount, true);
          }
          dispatchSyncEvent(msg.scope || 'all', msg.ts, msg.onlineCount);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      clearTimers();
      socketInstance = null;
      dispatchPresence(lastPresenceState.onlineCount, false);

      reconnectTimer = setTimeout(() => {
        retryDelayMs = Math.min(15000, Math.round(retryDelayMs * 1.6));
        connectSocket();
      }, retryDelayMs);
    };

    ws.onerror = () => {
      // handled gracefully by onclose
    };
  } catch {
    // WebSocket might be unavailable on serverless deployments; gracefully skip
  }
}

export function initRealtimeSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  connectSocket();

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
        connectSocket();
      }
      dispatchSyncEvent('all', Date.now());
    }
  };

  const handleOnline = () => {
    connectSocket();
    dispatchSyncEvent('all', Date.now());
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('online', handleOnline);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('online', handleOnline);
    clearTimers();
    if (socketInstance) {
      socketInstance.close();
      socketInstance = null;
    }
    isInitialized = false;
  };
}
