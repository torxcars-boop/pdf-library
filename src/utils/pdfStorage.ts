// IndexedDB helper for large PDF files when server storage is unavailable (e.g., serverless limits)
// Also safely resolves idb:// and data:application/pdf URLs into ObjectURLs for iframe/download compatibility

const DB_NAME = 'arm_pdf_blobs_v1';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;

function openPdfDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open PDF IndexedDB'));
  });
}

export function isPdfIdbKey(filepath?: string): boolean {
  return Boolean(filepath && filepath.startsWith('idb://'));
}

export async function savePdfToIdb(key: string, fileOrBlob: Blob): Promise<string> {
  const normalizedKey = key.startsWith('idb://') ? key : `idb://${key}`;
  const db = await openPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(fileOrBlob, normalizedKey);
    req.onsuccess = () => resolve(normalizedKey);
    req.onerror = () => reject(req.error || new Error('Failed to save PDF to IndexedDB'));
    tx.oncomplete = () => db.close();
  });
}

export async function getPdfBlobFromIdb(key: string): Promise<Blob | null> {
  try {
    const db = await openPdfDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function deletePdfFromIdb(filepath?: string): Promise<void> {
  if (!isPdfIdbKey(filepath) || !filepath) return;
  try {
    const db = await openPdfDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(filepath);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore cleanup error
  }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

export async function resolveBookPdfUrl(filepath: string): Promise<{ url: string; isObjectUrl: boolean }> {
  if (!filepath) return { url: '', isObjectUrl: false };

  if (filepath.startsWith('idb://')) {
    const blob = await getPdfBlobFromIdb(filepath);
    if (blob) {
      return { url: URL.createObjectURL(blob), isObjectUrl: true };
    }
    return { url: '', isObjectUrl: false };
  }

  if (filepath.startsWith('data:application/pdf')) {
    const blob = dataUrlToBlob(filepath);
    if (blob) {
      return { url: URL.createObjectURL(blob), isObjectUrl: true };
    }
  }

  return { url: filepath, isObjectUrl: false };
}

export async function triggerPdfDownload(filepath: string, title: string): Promise<boolean> {
  const { url, isObjectUrl } = await resolveBookPdfUrl(filepath);
  if (!url) return false;

  const safeFilename = `${(title || 'book').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)}.pdf`;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (isObjectUrl) {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
    return true;
  } catch {
    if (isObjectUrl) {
      URL.revokeObjectURL(url);
    }
    return false;
  }
}
