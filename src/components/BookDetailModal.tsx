import React, { useState } from 'react';
import { Book, User } from '../types';
import { 
  X, 
  Download, 
  ExternalLink, 
  Bookmark, 
  Eye, 
  GraduationCap, 
  CheckCircle2, 
  Share2,
  BookOpen
} from 'lucide-react';
import { RatingStars } from './RatingStars';
import { recordBookDownload } from '../utils/contentStore';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onToggleFavorite: (id: string, type: 'book', title: string, path: string) => void;
  isBookmarked: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onRate?: (stars: number) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onToggleFavorite,
  isBookmarked,
  user,
  onOpenAuth,
  onRate,
}) => {
  const [downloadCount, setDownloadCount] = useState<number>(book?.downloads || 0);
  const [downloading, setDownloading] = useState(false);
  const [showReader, setShowReader] = useState(false);

  if (!book) return null;

  const handleDownload = async () => {
    setDownloading(true);
    // Record download for Student Dashboard tracking
    recordBookDownload(book);
    try {
      const res = await fetch(`/api/books/${book.id}/download`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDownloadCount(data.downloads);
      }
    } catch (e) {
      // ignore
    } finally {
      setDownloading(false);
      // Trigger download in new window/tab
      window.open(book.filepath, '_blank');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Book Cover */}
          <div className="w-full sm:w-48 h-64 rounded-2xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0 shadow-xl relative group">
            <img src={book.coverpath} alt={book.title} className="w-full h-full object-cover" />
            <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
              book.is_student ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-black/70 text-amber-300'
            }`}>
              {book.is_student ? '🎓 منهج دراسي' : book.category}
            </span>
          </div>

          {/* Book Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {book.category}
              </span>
              {book.grade && (
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-lg">
                  {book.grade}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-zinc-100 leading-snug">
              {book.title}
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {book.description || 'كتاب قيم متاح للقراءة والتحميل المباشر ضمن مكتبتنا الرقمية التعليمية.'}
            </p>

            {/* Ratings Bar */}
            <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-amber-300 block mb-1">⭐ تقييم الكتاب:</span>
                <RatingStars
                  rating={book.rating || 4.9}
                  ratingCount={book.ratingCount || 154}
                  size="md"
                  interactive={true}
                  onRate={onRate}
                />
              </div>
              <span className="text-[11px] text-zinc-500">اضغط لتقييم المحتوى</span>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 py-2 border-y border-zinc-800 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <strong className="text-zinc-200">{downloadCount}</strong> تحميل
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <strong className="text-zinc-200">{book.views || 0}</strong> مشاهدة
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
                onClick={() => setShowReader(!showReader)}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>{showReader ? 'إخفاء المعاينة' : 'معاينة مباشرة'}</span>
              </button>

              <button
                onClick={handleBookmarkClick}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
                  isBookmarked
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
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
          <div className="mt-6 pt-6 border-t border-zinc-800 animate-in fade-in">
            <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
              <span>📖 قارئ المستندات المدمج:</span>
            </h4>
            <div className="w-full h-96 rounded-2xl overflow-hidden bg-black border border-zinc-800">
              <iframe
                src={book.filepath}
                title={book.title}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
