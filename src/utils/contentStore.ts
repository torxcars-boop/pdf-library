// Content persistence, synchronization, and deleted items tracker
// Ensures admin additions, edits, deletions, and student downloads are immediately synchronized across all views

import { Book, Summary, Video, Article, DownloadedBookItem } from '../types';

interface DeletedStore {
  books: number[];
  summaries: number[];
  videos: number[];
  articles: number[];
  users: string[];
}

const DELETED_KEY = 'arm_deleted_content_ids_v2';
const CUSTOM_BOOKS_KEY = 'arm_custom_books_v2';
const CUSTOM_SUMMARIES_KEY = 'arm_custom_summaries_v2';
const CUSTOM_VIDEOS_KEY = 'arm_custom_videos_v2';
const CUSTOM_ARTICLES_KEY = 'arm_custom_articles_v2';
const EDITED_ITEMS_KEY = 'arm_edited_items_v2';
const DOWNLOADED_BOOKS_KEY = 'arm_downloaded_books_v2';

export const getDeletedStore = (): DeletedStore => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return { books: [], summaries: [], videos: [], articles: [], users: [] };
};

export const markItemAsDeleted = (type: 'book' | 'summary' | 'video' | 'article' | 'user', id: number | string) => {
  try {
    const current = getDeletedStore();
    if (type === 'book') {
      const numId = Number(id);
      if (!current.books.includes(numId)) current.books.push(numId);
      // Also remove from custom books if present
      removeCustomItem('book', numId);
    } else if (type === 'summary') {
      const numId = Number(id);
      if (!current.summaries.includes(numId)) current.summaries.push(numId);
      removeCustomItem('summary', numId);
    } else if (type === 'video') {
      const numId = Number(id);
      if (!current.videos.includes(numId)) current.videos.push(numId);
      removeCustomItem('video', numId);
    } else if (type === 'article') {
      const numId = Number(id);
      if (!current.articles.includes(numId)) current.articles.push(numId);
      removeCustomItem('article', numId);
    } else if (type === 'user') {
      const strId = String(id);
      if (!current.users.includes(strId)) current.users.push(strId);
    }
    localStorage.setItem(DELETED_KEY, JSON.stringify(current));
    dispatchContentChanged();

    // Sync with serverless backend so server also permanently drops these IDs
    fetch('/api/deleted-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current)
    }).catch(() => {});
  } catch (e) {
    console.error('Error marking item as deleted', e);
  }
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

// ---------------------------------------------------------------------------
// CUSTOM ITEMS ADDED BY ADMIN (Local Persistence & Realtime Sharing)
// ---------------------------------------------------------------------------
export const getCustomItems = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
};

export const saveCustomItem = <T extends { id: number | string }>(type: 'book' | 'summary' | 'video' | 'article', item: T) => {
  try {
    const key = type === 'book' ? CUSTOM_BOOKS_KEY :
                type === 'summary' ? CUSTOM_SUMMARIES_KEY :
                type === 'video' ? CUSTOM_VIDEOS_KEY : CUSTOM_ARTICLES_KEY;
    const current = getCustomItems<T>(key);
    const existingIndex = current.findIndex(i => String(i.id) === String(item.id));
    if (existingIndex >= 0) {
      current[existingIndex] = item;
    } else {
      current.unshift(item);
    }
    localStorage.setItem(key, JSON.stringify(current));
    dispatchContentChanged();
  } catch (e) {
    console.error('Error saving custom item', e);
  }
};

export const removeCustomItem = (type: 'book' | 'summary' | 'video' | 'article', id: number | string) => {
  try {
    const key = type === 'book' ? CUSTOM_BOOKS_KEY :
                type === 'summary' ? CUSTOM_SUMMARIES_KEY :
                type === 'video' ? CUSTOM_VIDEOS_KEY : CUSTOM_ARTICLES_KEY;
    const current = getCustomItems<{ id: number | string }>(key);
    const updated = current.filter(i => String(i.id) !== String(id));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// EDITED ITEMS (Overrides original fields)
// ---------------------------------------------------------------------------
export const saveEditedItem = (type: string, id: number | string, updatedFields: Record<string, any>) => {
  try {
    const raw = localStorage.getItem(EDITED_ITEMS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = `${type}_${id}`;
    map[key] = { ...(map[key] || {}), ...updatedFields };
    localStorage.setItem(EDITED_ITEMS_KEY, JSON.stringify(map));
    dispatchContentChanged();
  } catch (e) {
    console.error('Error saving edited item', e);
  }
};

export const applyEditedOverrides = <T extends { id: number | string }>(type: string, items: T[]): T[] => {
  try {
    const raw = localStorage.getItem(EDITED_ITEMS_KEY);
    if (!raw) return items;
    const map = JSON.parse(raw);
    return items.map(item => {
      const key = `${type}_${item.id}`;
      if (map[key]) {
        return { ...item, ...map[key] };
      }
      return item;
    });
  } catch (e) {
    return items;
  }
};

// ---------------------------------------------------------------------------
// DOWNLOADED BOOKS TRACKER (For Student Dashboard)
// ---------------------------------------------------------------------------
export const recordBookDownload = (book: {
  id: number | string;
  title: string;
  category?: string;
  filepath: string;
  coverpath?: string;
  grade?: string;
  fileSize?: string;
}) => {
  try {
    const raw = localStorage.getItem(DOWNLOADED_BOOKS_KEY);
    let list: DownloadedBookItem[] = raw ? JSON.parse(raw) : [];

    // Filter out if already in list to put it at the very top
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

    // Also update student stats booksReadCount / downloadedBooksCount
    dispatchContentChanged();
  } catch (e) {
    console.error('Error recording book download', e);
  }
};

export const getDownloadedBooks = (): DownloadedBookItem[] => {
  try {
    const raw = localStorage.getItem(DOWNLOADED_BOOKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
};

export const getDownloadedBooksCount = (): number => {
  return getDownloadedBooks().length;
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
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('arm_content_sync', handler);
    window.removeEventListener('storage', handler);
  };
};
