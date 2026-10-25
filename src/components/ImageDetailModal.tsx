import React from 'react';
import { Summary, User } from '../types';
import { X, Download, Bookmark, ExternalLink } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { CommentsSection } from './CommentsSection';
import { ReviewsSection } from './ReviewsSection';

interface ImageDetailModalProps {
  summary: Summary | null;
  onClose: () => void;
  onToggleFavorite: (id: string, type: 'summary', title: string, path: string) => void;
  isBookmarked: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onRate?: (stars: number) => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  summary,
  onClose,
  onToggleFavorite,
  isBookmarked,
  user,
  onOpenAuth,
  onRate,
}) => {
  if (!summary) return null;

  const handleBookmark = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(String(summary.id), 'summary', summary.title, summary.imagepath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-right max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-zinc-800 mb-4 gap-4 pr-2">
          <div>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              {summary.category || 'ملخص بصري'}
            </span>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">{summary.title}</h2>
            
            <div className="flex items-center gap-2 mt-2">
              <RatingStars
                rating={summary.rating || 5.0}
                ratingCount={summary.ratingCount || 245}
                size="md"
                interactive={true}
                onRate={onRate}
              />
              <span className="text-[10px] text-zinc-500">اضغط لتقييم الملخص</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-xl border transition ${
                isBookmarked 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400' 
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              }`}
              title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            <a
              href={summary.imagepath}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 text-xs font-bold rounded-xl shadow hover:brightness-110 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل الصورة بدقة كاملة</span>
            </a>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2 mb-4">
          <img
            src={summary.imagepath}
            alt={summary.title}
            className="max-h-[60vh] w-auto object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Interactive Student Reviews and Text Ratings */}
        <ReviewsSection
          itemId={summary.id}
          itemType="summary"
          user={user}
          onOpenAuth={onOpenAuth}
          title={`مراجعات وتقييمات الطلاب للملخص: ${summary.title}`}
          onRatingChanged={(newRating) => {
            if (onRate) onRate(newRating);
          }}
        />

        {/* Interactive Student Comments & Questions Section */}
        <CommentsSection
          itemId={summary.id}
          itemType="summary"
          user={user}
          onOpenAuth={onOpenAuth}
          title="ملاحظات واستفسارات الطلاب حول الخريطة الذهنية"
        />
      </div>
    </div>
  );
};
