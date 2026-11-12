import React, { useState, useEffect } from 'react';
import { Book, User } from '../types';
import { 
  X, 
  Download, 
  Bookmark, 
  Eye, 
  BookOpen,
} from 'lucide-react';
import { RatingStars } from './RatingStars';
import { 
  recordBookDownload, 
  getRealDownloads, 
  incrementRealDownload, 
  incrementRealView 
} from '../utils/contentStore';
import { getItemRatingStats } from '../utils/reviewsStore';
import { isEducationalFeatureLocked } from '../utils/subscriptionStore';
import { resolveBookPdfUrl, triggerPdfDownload } from '../utils/pdfStorage';
import { CommentsSection } from './CommentsSection';
import { ReviewsSection } from './ReviewsSection';
import { ShareMenuButton } from './ShareMenuButton';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onToggleFavorite: (id: string, type: 'book', title: string, path: string) => void;
  isBookmarked: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onRate?: (stars: number) => void;
  onOpenSubscriptions?: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onToggleFavorite,
  isBookmarked,
  user,
  onOpenAuth,
  onRate,
  onOpenSubscriptions,
}) => {
  const [downloadCount, setDownloadCount] = useState<number>(0);
  const [viewCount, setViewCount] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [resolvedReaderUrl, setResolvedReaderUrl] = useState<string>('');
  const [readerError, setReaderError] = useState<string | null>(null);

  useEffect(() => {
    if (book?.id) {
      const views = incrementRealView('book', book.id);
      setViewCount(views);
      setDownloadCount(getRealDownloads(book.id, 0));
      setShowReader(false);
      setResolvedReaderUrl('');
      setReaderError(null);
      fetch(`/api/items/book/${book.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [book?.id]);

  // Resolve PDF URL for inline reader when opened and clean up created blob URLs
  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    if (showReader && book?.filepath) {
      setReaderError(null);
      resolveBookPdfUrl(book.filepath)
        .then(({ url, isObjectUrl }) => {
          if (!active) {
            if (isObjectUrl && url) URL.revokeObjectURL(url);
            return;
          }
          if (isObjectUrl && url) {
            objectUrlToRevoke = url;
          }
          setResolvedReaderUrl(url);
        })
        .catch(() => {
          if (active) {
            setReaderError('تعذر فتح معاينة هذا الملف مباشرة، يمكنك الضغط على "تحميل الكتاب الآن (PDF)".');
          }
        });
    }

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [showReader, book?.filepath]);

  if (!book) return null;

  const realRating = getItemRatingStats(book.id, 'book');
  const isLocked = isEducationalFeatureLocked(user);

  const handleDownload = async () => {
    if (isLocked) {
      if (onOpenSubscriptions) {
        onClose();
        onOpenSubscriptions();
      }
      return;
    }

    setDownloading(true);
    recordBookDownload(book);
    const newCount = incrementRealDownload(book.id);
    setDownloadCount(newCount);
    void fetch(`/api/books/${book.id}/download`, { method: 'POST' }).catch(() => {});
    try {
      await triggerPdfDownload(book.filepath, `${book.title || 'book'}.pdf`);
    } catch {
      // fallback already handled cleanly
    } finally {
      setDownloading(false);
    }
  };

  const handleBookmarkClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(String(book.id), 'book', book.title, book.filepath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Book Cover */}
          <div className="w-full sm:w-48 h-64 rounded-2xl overflow-hidden bg-slate-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 flex-shrink-0 shadow-lg relative group">
            <img src={book.coverpath} alt={book.title} className="w-full h-full object-cover" />
            <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
              book.is_student ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-black/75 text-amber-300'
            }`}>
              {book.is_student ? '🎓 منهج دراسي' : book.category}
            </span>
          </div>

          {/* Book Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {book.category}
              </span>
              {book.grade && (
                <span className="text-xs text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                  {book.grade}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {book.title}
            </h2>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {book.description || 'كتاب قيم متاح للقراءة والتحميل المباشر ضمن مكتبتنا الرقمية التعليمية.'}
            </p>

            {/* Ratings Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block mb-1">
                  ⭐ تقييم الكتاب: {realRating.totalReviews > 0 ? `(${realRating.averageRating} من 5)` : '(لم يُقيّم بعد)'}
                </span>
                <RatingStars
                  rating={realRating.averageRating}
                  ratingCount={realRating.totalReviews}
                  size="md"
                  interactive={true}
                  onRate={onRate}
                />
              </div>
              <span className="text-[11px] text-zinc-500">
                {realRating.totalReviews > 0 ? `${realRating.totalReviews} تقييم حقيقي` : 'كن أول طالب يقيّم هذا الكتاب'}
              </span>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 py-2 border-y border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                <strong className="text-zinc-900 dark:text-zinc-200">{downloadCount}</strong> تحميل
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                <strong className="text-zinc-900 dark:text-zinc-200">{viewCount}</strong> مشاهدة
              </span>
              <span className="text-zinc-500 text-[11px]">
                أُضيف في: {new Date(book.created_at).toLocaleDateString('ar-EG')}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'جاري التحميل...' : 'تحميل الكتاب الآن (PDF)'}</span>
              </button>

              <button
                onClick={() => {
                  if (isLocked) {
                    if (onOpenSubscriptions) {
                      onClose();
                      onOpenSubscriptions();
                    }
                    return;
                  }
                  setShowReader(!showReader);
                }}
                className="py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 transition flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>{showReader ? 'إخفاء المعاينة' : 'معاينة مباشرة'}</span>
              </button>

              <ShareMenuButton
                itemType="book"
                itemId={book.id}
                title={book.title}
                subtitle={book.description || `كتاب ${book.category} - ${book.grade || ''}`}
              />

              <button
                onClick={handleBookmarkClick}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
                  isBookmarked
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
                title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>

        {/* Inline PDF Preview Iframe */}
        {showReader && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 animate-in fade-in">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <span>📖 قارئ المستندات المدمج:</span>
            </h4>
            {readerError ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
                {readerError}
              </div>
            ) : (
              <div className="w-full h-96 rounded-2xl overflow-hidden bg-slate-100 dark:bg-black border border-zinc-200 dark:border-zinc-800">
                {resolvedReaderUrl ? (
                  <iframe
                    src={resolvedReaderUrl}
                    title={book.title}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    جاري تجهيز قارئ الكتاب...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interactive Student Reviews and Text Ratings */}
        <ReviewsSection
          itemId={book.id}
          itemType="book"
          user={user}
          onOpenAuth={onOpenAuth}
          title={`مراجعات وتقييمات الطلاب لكتاب: ${book.title}`}
          onRatingChanged={(newRating) => {
            if (onRate) onRate(newRating);
          }}
        />

        {/* Interactive Student Comments & Questions Section */}
        <CommentsSection
          itemId={book.id}
          itemType="book"
          user={user}
          onOpenAuth={onOpenAuth}
          title={`مناقشات وأسئلة الطلاب حول: ${book.title}`}
        />
      </div>
    </div>
  );
};
