import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Download,
  Eye,
  FileText,
  HardDrive,
  Layers,
  User,
} from 'lucide-react';
import { BookDTO } from '../types/library';
import { formatBytesAr, formatDateAr, formatNumberAr } from '../utils/formatters';
import { useBookReadingProgress } from '../hooks/useBookReadingProgress';
import { Bookshelf3D } from './Bookshelf3D';
import { PdfReaderModal } from './PdfReaderModal';

interface BookDetailsPageProps {
  slugOrId: string;
  onBackHome: () => void;
  onSelectBook: (book: BookDTO) => void;
  onSelectCategory: (slug: string) => void;
  onBookUpdated?: () => void;
}

export const BookDetailsPage: React.FC<BookDetailsPageProps> = ({
  slugOrId,
  onBackHome,
  onSelectBook,
  onSelectCategory,
  onBookUpdated,
}) => {
  const [book, setBook] = useState<BookDTO | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<BookDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);

  const { lastReadPage, savedProgress, savePageProgress } = useBookReadingProgress(
    book?.id
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/books/${encodeURIComponent(slugOrId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'تعذر العثور على الكتاب المطلوب');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBook(data.book);
        setRelatedBooks(data.relatedBooks || []);
        setLoading(false);

        // Dynamic SEO Metadata Update
        if (data.book) {
          document.title = `${data.book.titleAr} – المكتبة الرقمية الفاخرة`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute(
              'content',
              data.book.descriptionAr.slice(0, 158)
            );
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  const handleDownload = (targetBook: BookDTO) => {
    const link = document.createElement('a');
    link.href = `/api/books/${targetBook.id}/pdf?download=1`;
    link.download = `${targetBook.slug}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (book && targetBook.id === book.id) {
      setBook((prev) =>
        prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : prev
      );
    }
    onBookUpdated?.();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 h-96 animate-pulse rounded-2xl bg-[#10274A]/60" />
          <div className="lg:col-span-8 space-y-4">
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-[#10274A]/60" />
            <div className="h-32 animate-pulse rounded-lg bg-[#10274A]/40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#E8B94F]" />
        <h1 className="font-display text-2xl font-bold text-white">
          {error || 'الكتاب غير متوفر'}
        </h1>
        <button
          type="button"
          onClick={onBackHome}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E8B94F] px-6 py-2.5 text-sm font-bold text-[#06152F]"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة إلى المكتبة</span>
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-[#FFD778] hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          <span>الرئيسية</span>
        </button>
        <span aria-hidden="true">/</span>
        {book.categoryNameAr && book.categorySlug && (
          <>
            <button
              type="button"
              onClick={() => onSelectCategory(book.categorySlug!)}
              className="hover:text-[#FFD778] transition-colors"
            >
              {book.categoryNameAr}
            </button>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="text-white font-medium truncate">{book.titleAr}</span>
      </nav>

      {/* Main Details Card */}
      <div className="rounded-2xl border border-[#E8B94F]/30 bg-[#10274A]/50 p-6 sm:p-8 lg:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* 3D Cover Display */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="book-stage w-64 sm:w-72">
              <div
                className="book-3d relative h-96 w-full rounded-r-lg rounded-l-sm shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
                style={{ backgroundColor: book.spineColor || '#0E3A6E' }}
              >
                <div className="book-pages absolute top-1.5 bottom-1.5 left-0 w-5 rounded-l-xs" />
                <div
                  className="book-spine absolute top-0 bottom-0 right-0 w-7 rounded-r-sm border-l border-[#E8B94F]/40"
                  style={{
                    background: `linear-gradient(90deg, ${book.spineColor || '#0E3A6E'} 0%, #050d1c 100%)`,
                  }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-r-lg rounded-l-sm border-2 border-[#E8B94F]/55">
                  <img
                    src={book.coverUrl}
                    alt={book.titleAr}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                  <div className="absolute inset-3 rounded border border-[#E8B94F]/40" />
                  <div className="absolute inset-x-4 top-6 text-center">
                    <h2 className="font-display text-xl font-bold text-white drop-shadow">
                      {book.titleAr}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Book Info & Actions */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#FFD778]">
                <span>{book.categoryNameAr || 'قسم عام'}</span>
                {book.titleEn && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span dir="ltr" className="text-slate-300">
                      {book.titleEn}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                {book.titleAr}
              </h1>

              {book.author && (
                <div className="flex items-center gap-2 text-sm sm:text-base text-slate-200 pt-1">
                  <User className="h-4 w-4 text-[#E8B94F]" />
                  <span>المؤلف: {book.author}</span>
                </div>
              )}
            </div>

            <p className="text-base leading-relaxed text-slate-200">
              {book.descriptionAr}
            </p>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#E8B94F]/20 bg-[#06152F]/70 p-4 sm:grid-cols-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <HardDrive className="h-3.5 w-3.5 text-[#E8B94F]" />
                  <span>حجم الملف</span>
                </div>
                <div className="font-mono-num text-sm font-bold text-white">
                  {formatBytesAr(book.fileSizeBytes)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Layers className="h-3.5 w-3.5 text-[#E8B94F]" />
                  <span>عدد الصفحات</span>
                </div>
                <div className="font-mono-num text-sm font-bold text-white">
                  {formatNumberAr(book.pageCount)} صفحة
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Download className="h-3.5 w-3.5 text-[#E8B94F]" />
                  <span>مرات التحميل</span>
                </div>
                <div className="font-mono-num text-sm font-bold text-[#FFD778]">
                  {formatNumberAr(book.downloadCount)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-[#E8B94F]" />
                  <span>تاريخ النشر</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {formatDateAr(book.publishedAt || book.createdAt)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleDownload(book)}
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-l from-[#E8B94F] to-[#FFD778] px-7 py-3.5 text-base font-bold text-[#06152F] shadow-[0_10px_28px_rgba(232,185,79,0.3)] hover:brightness-105 transition-all"
              >
                <Download className="h-5 w-5" />
                <span>تحميل الكتاب (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setReaderOpen(true)}
                className="inline-flex items-center gap-2.5 rounded-full border border-[#E8B94F]/55 bg-[#06152F] px-7 py-3.5 text-base font-bold text-[#FFD778] hover:bg-[#E8B94F] hover:text-[#06152F] transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span>
                  {savedProgress && savedProgress.pageNumber > 1
                    ? `استئناف القراءة (صفحة ${formatNumberAr(savedProgress.pageNumber)})`
                    : 'قراءة الكتاب مباشرة'}
                </span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Eye className="h-4 w-4 text-[#E8B94F]" />
                <span className="font-mono-num">{formatNumberAr(book.viewCount)} مشاهدة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Books 3D Shelf */}
      {relatedBooks.length > 0 && (
        <div className="mt-12">
          <Bookshelf3D
            title="كتب ذات صلة"
            subtitle="إصدارات مقترحة من نفس التصنيف المعرفي"
            books={relatedBooks}
            onSelectBook={onSelectBook}
            onDownloadBook={handleDownload}
          />
        </div>
      )}

      {/* Built-in PDF Viewer Modal */}
      {readerOpen && (
        <PdfReaderModal
          book={book}
          initialPage={lastReadPage}
          onPageChange={savePageProgress}
          onClose={() => setReaderOpen(false)}
          onDownload={() => handleDownload(book)}
        />
      )}
    </main>
  );
};
