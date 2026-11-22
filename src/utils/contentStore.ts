// Content persistence cache and deleted items registry
// Central DB (via /api/sync/bootstrap & WebSocket) is the single source of truth.
// localStorage here serves ONLY as a read-only hydration cache and per-student download history.

import { Book, Summary, Video, Article, DownloadedBookItem } from '../types';
import { syncBookDownloadProgress } from './gamificationStore';

export interface DeletedStore {
  books: number[];
  summaries: number[];
  videos: number[];
  articles: number[];
  users: string[];
}

export interface BootstrapCache {
  version?: number;
  ts: number;
  books: Book[];
  summaries: Summary[];
  videos: Video[];
  articles: Article[];
  deletedIds: DeletedStore;
}

const DELETED_KEY = 'arm_deleted_content_ids_v2';
const BOOTSTRAP_CACHE_KEY = 'arm_bootstrap_cache_v1';
const DOWNLOADED_BOOKS_KEY = 'arm_downloaded_books_v2';

export const getDeletedStore = (): DeletedStore => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        books: Array.isArray(parsed.books) ? parsed.books.map(Number) : [],
        summaries: Array.isArray(parsed.summaries) ? parsed.summaries.map(Number) : [],
        videos: Array.isArray(parsed.videos) ? parsed.videos.map(Number) : [],
        articles: Array.isArray(parsed.articles) ? parsed.articles.map(Number) : [],
        users: Array.isArray(parsed.users) ? parsed.users.map(String) : [],
      };
    }
  } catch {
    // ignore
  }
  return { books: [], summaries: [], videos: [], articles: [], users: [] };
};

export const filterOutDeleted = <T extends { id: number | string }>(
  type: 'book' | 'summary' | 'video' | 'article' | 'user',
  items: T[]
): T[] => {
  const store = getDeletedStore();
  if (type === 'book') return items.filter(i => !store.books.includes(Number(i.id)));
  if (type === 'summary') return items.filter(i => !store.summaries.includes(Number(i.id)));
  if (type === 'video') return items.filter(i => !store.videos.includes(Number(i.id)));
  if (type === 'article') return items.filter(i => !store.articles.includes(Number(i.id)));
  if (type === 'user') return items.filter(i => !store.users.includes(String(i.id)));
  return items;
};

export const syncDeletedStoreFromServer = (serverDeleted?: Partial<DeletedStore> | null) => {
  if (!serverDeleted) return;
  try {
    const next: DeletedStore = {
      books: Array.isArray(serverDeleted.books)
        ? Array.from(new Set(serverDeleted.books.map(Number).filter(n => !Number.isNaN(n))))
        : [],
      summaries: Array.isArray(serverDeleted.summaries)
        ? Array.from(new Set(serverDeleted.summaries.map(Number).filter(n => !Number.isNaN(n))))
        : [],
      videos: Array.isArray(serverDeleted.videos)
        ? Array.from(new Set(serverDeleted.videos.map(Number).filter(n => !Number.isNaN(n))))
        : [],
      articles: Array.isArray(serverDeleted.articles)
        ? Array.from(new Set(serverDeleted.articles.map(Number).filter(n => !Number.isNaN(n))))
        : [],
      users: Array.isArray(serverDeleted.users)
        ? Array.from(new Set(serverDeleted.users.map(String)))
        : [],
    };
    localStorage.setItem(DELETED_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Error syncing deleted store from server', e);
  }
};

export const saveBootstrapCache = (cache: Partial<BootstrapCache>) => {
  try {
    const existing = getBootstrapCache();
    const merged: BootstrapCache = {
      version: typeof cache.version === 'number' ? cache.version : existing?.version,
      ts: cache.ts || Date.now(),
      books: Array.isArray(cache.books) ? cache.books : (existing?.books || []),
      summaries: Array.isArray(cache.summaries) ? cache.summaries : (existing?.summaries || []),
      videos: Array.isArray(cache.videos) ? cache.videos : (existing?.videos || []),
      articles: Array.isArray(cache.articles) ? cache.articles : (existing?.articles || []),
      deletedIds: cache.deletedIds || existing?.deletedIds || getDeletedStore(),
    };
    localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage quota errors on optional read cache
  }
};

export const getBootstrapCache = (): BootstrapCache | null => {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as BootstrapCache;
  } catch {
    // ignore
  }
  return null;
};

// Clear any legacy local-override keys left from older builds so central DB always wins
export const clearLegacyLocalOverrides = () => {
  try {
    const legacyKeys = [
      'arm_custom_books_v2',
      'arm_custom_summaries_v2',
      'arm_custom_videos_v2',
      'arm_custom_articles_v2',
      'arm_edited_items_v2',
      'arm_real_downloads_map_v1',
      'arm_real_views_map_v1',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// PERSONAL DOWNLOADED BOOKS TRACKER (Per-Student History for Dashboard)
// ---------------------------------------------------------------------------
export const recordBookDownload = (
  book: {
    id: number | string;
    title: string;
    category?: string;
    filepath: string;
    coverpath?: string;
    grade?: string;
    fileSize?: string;
  },
  userId?: string
) => {
  try {
    const raw = localStorage.getItem(DOWNLOADED_BOOKS_KEY);
    let list: DownloadedBookItem[] = raw ? JSON.parse(raw) : [];

    list = list.filter(item => String(item.id) !== String(book.id));

    const newItem: DownloadedBookItem = {
      id: book.id,
      title: book.title,
      category: book.category || 'كتب الطلاب',
      filepath: book.filepath,
      coverpath: book.coverpath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      grade: book.grade || 'مناهج دراسية',
      downloadedAt: new Date().toISOString(),
      fileSize: book.fileSize || 'PDF - نسخة رسمية',
    };

    list.unshift(newItem);
    localStorage.setItem(DOWNLOADED_BOOKS_KEY, JSON.stringify(list));

    syncBookDownloadProgress(list.length, list, userId);

    dispatchContentChanged();
  } catch (e) {
    console.error('Error recording book download', e);
  }
};

export const getDownloadedBooks = (): DownloadedBookItem[] => {
  try {
    const raw = localStorage.getItem(DOWNLOADED_BOOKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
};

export const getDownloadedBooksCount = (): number => {
  return getDownloadedBooks().length;
};

// ---------------------------------------------------------------------------
// AUTHORITATIVE SERVER METRICS (Zero Local Divergence)
// ---------------------------------------------------------------------------
export const getRealDownloads = (_bookId: number | string, baseCount = 0): number => {
  return Math.max(0, Number(baseCount) || 0);
};

export const getRealViews = (_type: string, _id: number | string, baseCount = 0): number => {
  return Math.max(0, Number(baseCount) || 0);
};

export const getTotalRealDownloads = (books: { id: number | string; downloads?: number }[]): number => {
  return books.reduce((acc, b) => acc + Math.max(0, Number(b.downloads) || 0), 0);
};

export const getTotalRealViews = (
  books: { id: number | string; views?: number }[],
  summaries: { id: number | string; views?: number }[],
  videos: { id: number | string; views?: number }[],
  articles: { id: number | string; views?: number }[]
): number => {
  let total = 0;
  books.forEach(b => { total += Math.max(0, Number(b.views) || 0); });
  summaries.forEach(s => { total += Math.max(0, Number(s.views) || 0); });
  videos.forEach(v => { total += Math.max(0, Number(v.views) || 0); });
  articles.forEach(a => { total += Math.max(0, Number(a.views) || 0); });
  return total;
};

// ---------------------------------------------------------------------------
// EVENT BUS FOR INSTANT REAL-TIME SYNC
// ---------------------------------------------------------------------------
export const dispatchContentChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arm_content_sync', { detail: { timestamp: Date.now() } }));
  }
};

export const listenToContentChanged = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('arm_content_sync', handler);
  return () => {
    window.removeEventListener('arm_content_sync', handler);
  };
};
