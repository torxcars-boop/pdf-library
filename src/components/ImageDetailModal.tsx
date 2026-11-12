import React, { useState, useEffect } from 'react';
import { Summary, User } from '../types';
import { X, Download, Bookmark, ExternalLink, Eye } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { CommentsSection } from './CommentsSection';
import { ReviewsSection } from './ReviewsSection';
import { getRealViews, incrementRealView } from '../utils/contentStore';
import { getItemRatingStats } from '../utils/reviewsStore';

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
  const [viewCount, setViewCount] = useState<number>(0);

  useEffect(() => {
    if (summary?.id) {
      const views = incrementRealView('summary', summary.id);
      setViewCount(views);
      fetch(`/api/items/summary/${summary.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [summary?.id]);

  if (!summary) return null;

  const realRating = getItemRatingStats(summary.id, 'summary');

  const handleBookmark = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(String(summary.id), 'summary', summary.title, summary.imagepath);
  };

  const handleDownloadImage = async () => {
    const filename = `${(summary.title || 'summary').replace(/[\\/:*?"<>|]/g, '_')}.png`;
    try {
      if (summary.imagepath.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = summary.imagepath;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(summary.imagepath);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = summary.imagepath;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-right max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4 gap-4 pr-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-500/15 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {summary.category || 'ملخص بصري'}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1 font-mono">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                {viewCount} مشاهدة
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">{summary.title}</h2>
            
            <div className="flex items-center gap-2 mt-2">
              <RatingStars
                rating={realRating.averageRating}
                ratingCount={realRating.totalReviews}
                size="md"
                interactive={true}
                onRate={onRate}
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {realRating.totalReviews > 0 ? `(${realRating.averageRating} من 5 - ${realRating.totalReviews} تقييم)` : 'لم يُقيّم بعد'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-xl border transition ${
                isBookmarked 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
              title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 text-xs font-bold rounded-xl shadow hover:brightness-110 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل الصورة بدقة كاملة</span>
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2 mb-4">
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
