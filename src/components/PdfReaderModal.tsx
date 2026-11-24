import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BookDTO } from '../types/library';
import { getReadingProgress, saveReadingProgress } from '../utils/readingProgress';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderModalProps {
  book: BookDTO;
  initialPage?: number;
  onPageChange?: (pageNumber: number, numPages: number) => void;
  onClose: () => void;
  onDownload: () => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  book,
  initialPage,
  onPageChange,
  onClose,
  onDownload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportAreaRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const initialPageRef = useRef<number | undefined>(initialPage);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    initialPageRef.current = initialPage;
  }, [initialPage]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [resumedFromPage, setResumedFromPage] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1.15);
  const [autoFitted, setAutoFitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const pdfUrl = `/api/books/${book.id}/pdf`;

  useEffect(() => {
    setPageInput(String(pageNumber));
    if (!loading && numPages > 0) {
      if (onPageChangeRef.current) {
        onPageChangeRef.current(pageNumber, numPages);
      } else {
        saveReadingProgress(book.id, pageNumber, numPages);
      }
    }
  }, [book.id, pageNumber, numPages, loading]);

  // Fit PDF page cleanly to desktop/mobile viewport width
  const computeFitScale = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy, targetPage: number) => {
    try {
      const page = await pdfDoc.getPage(targetPage);
      const baseViewport = page.getViewport({ scale: 1 });
      const areaWidth = viewportAreaRef.current?.clientWidth || window.innerWidth;
      const padding = window.innerWidth < 640 ? 24 : 64;
      const availableWidth = Math.max(260, Math.min(920, areaWidth - padding));
      const computed = Math.max(0.55, Math.min(1.6, +(availableWidth / baseViewport.width).toFixed(2)));
      setScale(computed);
    } catch {
      // Fallback scale
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAutoFitted(false);
    setResumedFromPage(null);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false,
    });

    loadingTask.promise
      .then(async (pdfDoc) => {
        if (cancelled) {
          loadingTask.destroy();
          return;
        }
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);

        const saved = getReadingProgress(book.id);
        const requestedStart =
          typeof initialPageRef.current === 'number' && initialPageRef.current >= 1
            ? initialPageRef.current
            : saved?.pageNumber ?? 1;
        const startPage = Math.min(Math.max(1, requestedStart), pdfDoc.numPages);

        setPageNumber(startPage);
        setPageInput(String(startPage));
        if (startPage > 1) {
          setResumedFromPage(startPage);
        }

        await computeFitScale(pdfDoc, startPage);
        if (!cancelled) {
          setAutoFitted(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError('تعذر فتح ملف PDF في القارئ المدمج. يمكنك إعادة المحاولة أو تحميل الملف مباشرة.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
      pdfDocRef.current = null;
    };
  }, [book.id, pdfUrl, reloadKey, computeFitScale]);

  useEffect(() => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas || loading || !autoFitted) return;

    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;
    setRendering(true);

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        return renderTask.promise;
      })
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((err) => {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
          setRendering(false);
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, scale, loading, autoFitted, numPages]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(pageInput);
    if (Number.isInteger(target) && target >= 1 && target <= numPages) {
      setPageNumber(target);
    } else {
      setPageInput(String(pageNumber));
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`قراءة كتاب ${book.titleAr}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#040E21]/97 backdrop-blur-md"
    >
      {/* Responsive Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E8B94F]/30 bg-[#06152F] px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-xs">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القارئ"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8B94F]/35 bg-[#10274A] text-[#FFD778] hover:bg-[#E8B94F] hover:text-[#06152F] transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-lg font-bold text-white truncate">
              {book.titleAr}
            </h2>
            {book.author && (
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">{book.author}</p>
            )}
          </div>
        </div>

        {/* Page Navigation & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <form
            onSubmit={handlePageJump}
            className="flex items-center gap-1 rounded-lg border border-[#E8B94F]/25 bg-[#10274A] px-1.5 py-1"
          >
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              aria-label="الصفحة السابقة"
              className="rounded p-1.5 text-[#FFD778] disabled:opacity-35 hover:bg-[#06152F]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              aria-label="رقم الصفحة"
              className="font-mono-num w-9 rounded bg-[#06152F] py-0.5 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#E8B94F]"
            />
            <span className="font-mono-num px-1 text-xs text-slate-300 whitespace-nowrap">
              / {numPages > 0 ? numPages : '...'}
            </span>
            <button
              type="button"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              aria-label="الصفحة التالية"
              className="rounded p-1.5 text-[#FFD778] disabled:opacity-35 hover:bg-[#06152F]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center gap-0.5 rounded-lg border border-[#E8B94F]/25 bg-[#10274A] px-1.5 py-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
              aria-label="تصغير"
              className="rounded p-1.5 text-[#FFD778] hover:bg-[#06152F]"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono-num px-1.5 text-xs text-white min-w-[44px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))}
              aria-label="تكبير"
              className="rounded p-1.5 text-[#FFD778] hover:bg-[#06152F]"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="ملء الشاشة"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8B94F]/30 bg-[#10274A] text-[#FFD778] hover:bg-[#10274A]/80"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8B94F] px-3 py-2 text-xs font-bold text-[#06152F] hover:bg-[#FFD778] transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تحميل PDF</span>
          </button>
        </div>
      </div>

      {/* Resume Reading Indicator Bar */}
      {!loading && !error && resumedFromPage && resumedFromPage > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[#E8B94F]/20 bg-[#10274A]/85 px-4 py-1.5 text-xs text-[#FFD778]">
          <span className="inline-flex items-center gap-1.5">
            <BookmarkCheck className="h-3.5 w-3.5 text-[#E8B94F]" />
            <span>
              تم استئناف القراءة من آخر صفحة توقفت عندها (صفحة{' '}
              <span className="font-mono-num font-bold">{resumedFromPage}</span>)
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setPageNumber(1);
              setResumedFromPage(null);
            }}
            className="rounded border border-[#E8B94F]/40 bg-[#06152F] px-2.5 py-0.5 text-[11px] font-semibold text-white hover:border-[#E8B94F] hover:text-[#FFD778] transition-colors"
          >
            البدء من الصفحة 1
          </button>
        </div>
      )}

      {/* PDF Canvas Viewport */}
      <div
        ref={viewportAreaRef}
        className="flex-1 overflow-auto p-3 sm:p-8 flex justify-center items-start"
      >
        {loading ? (
          <div className="my-auto flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E8B94F]/25 border-t-[#E8B94F]" />
            <p className="text-sm text-slate-300">جاري تحميل صفحات الكتاب...</p>
          </div>
        ) : error ? (
          <div className="my-auto max-w-md rounded-2xl border border-[#E8B94F]/30 bg-[#10274A] p-6 text-center space-y-4">
            <p className="text-sm text-rose-200">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex items-center gap-2 rounded-full border border-[#E8B94F]/45 bg-[#06152F] px-5 py-2.5 text-sm font-semibold text-[#FFD778]"
              >
                <RotateCw className="h-4 w-4" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-full bg-[#E8B94F] px-6 py-2.5 text-sm font-bold text-[#06152F]"
              >
                <Download className="h-4 w-4" />
                <span>تحميل الكتاب الآن</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg border border-[#E8B94F]/30 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#06152F]/25 backdrop-blur-[1px]">
                <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#E8B94F]/30 border-t-[#E8B94F]" />
              </div>
            )}
            <canvas ref={canvasRef} className="block max-w-full rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};
