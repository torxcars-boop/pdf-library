// Real-Time WebSocket & Bootstrap Sync Engine
// Connects every browser tab and device to /ws with automatic version reconciliation & polling fallback.

export const PRESENCE_UPDATE_EVENT = 'arm_presence_update';
export const REALTIME_SYNC_EVENT = 'arm_realtime_sync';
export const SYNC_STATUS_EVENT = 'arm_sync_status_update';

export type SyncConnectionState = 'live' | 'reconnecting' | 'offline';

export interface SyncStatusSnapshot {
  status: SyncConnectionState;
  online: boolean;
  connected: boolean;
  version: number;
  lastSyncAt: number | null;
  error: string | null;
}

export interface RealtimeBootstrapPayload {
  version?: number;
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
let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;
let retryDelayMs = 1000;
let isInitialized = false;
let currentServerVersion = 0;
let lastPresenceState = { onlineCount: 0, connected: false };
let syncStatusState: SyncStatusSnapshot = {
  status: 'reconnecting',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connected: false,
  version: 0,
  lastSyncAt: null,
  error: null,
};
let inFlightBootstrap: Promise<RealtimeBootstrapPayload | null> | null = null;

export function getLastPresenceState() {
  return lastPresenceState;
}

export function getSyncStatusState(): SyncStatusSnapshot {
  return syncStatusState;
}

export function getCurrentSyncVersion(): number {
  return currentServerVersion;
}

function emitSyncStatus(partial: Partial<SyncStatusSnapshot>) {
  syncStatusState = { ...syncStatusState, ...partial };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: syncStatusState }));
  }
}

function dispatchPresence(onlineCount: number, connected: boolean) {
  lastPresenceState = { onlineCount, connected };
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  emitSyncStatus({
    connected,
    online,
    status: !online ? 'offline' : connected ? 'live' : 'reconnecting',
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PRESENCE_UPDATE_EVENT, {
        detail: { onlineCount, connected },
      })
    );
  }
}

function dispatchSyncEvent(
  scope: string,
  ts?: number,
  onlineCount?: number,
  extra?: { version?: number; action?: string; itemId?: string | number }
) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(REALTIME_SYNC_EVENT, {
        detail: {
          scope: scope || 'all',
          ts: ts || Date.now(),
          onlineCount: typeof onlineCount === 'number' ? onlineCount : lastPresenceState.onlineCount,
          ...(extra || {}),
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
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/sync/bootstrap', {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        emitSyncStatus({
          status: navigator.onLine ? 'reconnecting' : 'offline',
          online: navigator.onLine,
          error: `تعذر مزامنة البيانات (${res.status})`,
        });
        return null;
      }
      const data = (await res.json()) as RealtimeBootstrapPayload;
      if (requestVersion !== bootstrapVersion) {
        return null;
      }
      if (typeof data.version === 'number') {
        currentServerVersion = Math.max(currentServerVersion, data.version);
      }
      if (typeof data.onlineCount === 'number') {
        dispatchPresence(data.onlineCount, lastPresenceState.connected);
      }
      emitSyncStatus({
        status: navigator.onLine ? (lastPresenceState.connected ? 'live' : 'reconnecting') : 'offline',
        online: navigator.onLine,
        version: currentServerVersion,
        lastSyncAt: Date.now(),
        error: null,
      });
      return data;
    } catch {
      emitSyncStatus({
        status: navigator.onLine ? 'reconnecting' : 'offline',
        online: navigator.onLine,
        error: navigator.onLine ? 'انقطع الاتصال بالخادم، جارٍ إعادة المحاولة...' : 'أنت غير متصل بالإنترنت حالياً',
      });
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

async function checkServerVersionFallback() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const res = await fetch('/api/sync/version', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.version === 'number' && data.version > currentServerVersion) {
      dispatchSyncEvent('all', data.ts, data.onlineCount, { version: data.version });
    }
    if (!lastPresenceState.connected) {
      emitSyncStatus({
        status: 'live',
        online: true,
        lastSyncAt: Date.now(),
        error: null,
      });
    }
  } catch {
    emitSyncStatus({
      status: navigator.onLine ? 'reconnecting' : 'offline',
      online: navigator.onLine,
      error: navigator.onLine ? 'تعذر الاتصال بخادم المزامنة' : 'أنت غير متصل بالإنترنت',
    });
  }
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
  if (!navigator.onLine) {
    emitSyncStatus({ status: 'offline', online: false, connected: false, error: 'أنت غير متصل بالإنترنت' });
    return;
  }
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
      emitSyncStatus({ status: 'live', online: true, connected: true, error: null });

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
        invalidateBootstrapCache();
        dispatchSyncEvent('all', Date.now());
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'connected' || msg?.type === 'presence' || msg?.type === 'pong') {
          if (typeof msg.onlineCount === 'number') {
            dispatchPresence(msg.onlineCount, true);
          }
          if (typeof msg.version === 'number' && msg.version > currentServerVersion) {
            invalidateBootstrapCache();
            dispatchSyncEvent('all', msg.ts, msg.onlineCount, { version: msg.version });
          }
        } else if (msg?.type === 'sync') {
          if (typeof msg.onlineCount === 'number') {
            dispatchPresence(msg.onlineCount, true);
          }
          invalidateBootstrapCache();
          dispatchSyncEvent(msg.scope || 'all', msg.ts, msg.onlineCount, {
            version: msg.version,
            action: msg.action,
            itemId: msg.itemId,
          });
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
        retryDelayMs = Math.min(12000, Math.round(retryDelayMs * 1.5));
        connectSocket();
      }, retryDelayMs);
    };

    ws.onerror = () => {
      // handled gracefully by onclose
    };
  } catch {
    // WebSocket might be unavailable on serverless deployments; polling fallback covers it
  }
}

export function initRealtimeSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  connectSocket();

  // Resilient version polling fallback whenever WS is disconnected (e.g. proxies/serverless)
  fallbackPollTimer = setInterval(() => {
    if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
      void checkServerVersionFallback();
    }
  }, 8000);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
        connectSocket();
      }
      invalidateBootstrapCache();
      dispatchSyncEvent('all', Date.now());
    }
  };

  const handleOnline = () => {
    emitSyncStatus({ online: true, status: 'reconnecting', error: null });
    connectSocket();
    invalidateBootstrapCache();
    dispatchSyncEvent('all', Date.now());
  };

  const handleOffline = () => {
    emitSyncStatus({
      online: false,
      connected: false,
      status: 'offline',
      error: 'انقطع الاتصال بالإنترنت — لن يتم حفظ التعديلات إلا عند عودة الاتصال',
    });
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearTimers();
    if (fallbackPollTimer) {
      clearInterval(fallbackPollTimer);
      fallbackPollTimer = null;
    }
    if (socketInstance) {
      socketInstance.close();
      socketInstance = null;
    }
    isInitialized = false;
  };
}
