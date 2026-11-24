export interface ReadingProgress {
  pageNumber: number;
  numPages: number;
  updatedAt: string;
}

const STORAGE_PREFIX = 'luxury_library_pdf_progress_v1:';

export function getReadingProgress(bookId: number): ReadingProgress | null {
  if (typeof window === 'undefined' || !bookId) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${bookId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReadingProgress>;
    if (
      typeof parsed.pageNumber === 'number' &&
      Number.isInteger(parsed.pageNumber) &&
      parsed.pageNumber >= 1
    ) {
      return {
        pageNumber: parsed.pageNumber,
        numPages: typeof parsed.numPages === 'number' ? parsed.numPages : 0,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveReadingProgress(
  bookId: number,
  pageNumber: number,
  numPages: number
): void {
  if (typeof window === 'undefined' || !bookId || pageNumber < 1) return;
  try {
    const payload: ReadingProgress = {
      pageNumber,
      numPages,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${bookId}`,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function clearReadingProgress(bookId: number): void {
  if (typeof window === 'undefined' || !bookId) return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${bookId}`);
  } catch {
    // Ignore storage errors
  }
}
