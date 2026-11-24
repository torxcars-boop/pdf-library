import { useCallback, useEffect, useState } from 'react';
import {
  clearReadingProgress,
  getReadingProgress,
  ReadingProgress,
  saveReadingProgress,
} from '../utils/readingProgress';

export function useBookReadingProgress(bookId: number | undefined) {
  const [savedProgress, setSavedProgress] = useState<ReadingProgress | null>(() =>
    bookId ? getReadingProgress(bookId) : null
  );

  useEffect(() => {
    if (!bookId) {
      setSavedProgress(null);
      return;
    }
    setSavedProgress(getReadingProgress(bookId));
  }, [bookId]);

  const savePageProgress = useCallback(
    (pageNumber: number, numPages: number) => {
      if (!bookId || pageNumber < 1) return;
      saveReadingProgress(bookId, pageNumber, numPages);
      setSavedProgress({
        pageNumber,
        numPages,
        updatedAt: new Date().toISOString(),
      });
    },
    [bookId]
  );

  const resetProgress = useCallback(() => {
    if (!bookId) return;
    clearReadingProgress(bookId);
    setSavedProgress(null);
  }, [bookId]);

  return {
    lastReadPage: savedProgress?.pageNumber ?? 1,
    savedProgress,
    savePageProgress,
    resetProgress,
  };
}
