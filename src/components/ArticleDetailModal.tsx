import React, { useState } from 'react';
import { Article, User } from '../types';
import { 
  X, 
  Bookmark, 
  Share2, 
  Eye, 
  Calendar, 
  User as UserIcon, 
  MessageSquare, 
  Send,
  ThumbsUp,
  Clock
} from 'lucide-react';
import { RatingStars } from './RatingStars';
import { CommentsSection } from './CommentsSection';

interface ArticleDetailModalProps {
  article: Article | null;
  onClose: () => void;
  onToggleFavorite: (id: string, type: 'article', title: string, path: string) => void;
  isBookmarked: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onRate?: (stars: number) => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article,
  onClose,
  onToggleFavorite,
  isBookmarked,
  user,
  onOpenAuth,
  onRate,
}) => {
  const [likes, setLikes] = useState(14);
  const [hasLiked, setHasLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(likes + 1);
      setHasLiked(true);
    } else {
      setLikes(likes - 1);
      setHasLiked(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmark = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleFavorite(String(article.id), 'article', article.title, `/article/${article.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Article Header */}
        <div className="space-y-4 border-b border-zinc-800 pb-6 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              مقال إرشادي
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-amber-500" />
              الكاتب: <strong className="text-zinc-200">{article.author}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              وقت القراءة: {article.readTime}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              {article.views || 0} مشاهدة
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-100 leading-snug">
            {article.title}
          </h1>

          {article.imagepath && (
            <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-xl">
              <img src={article.imagepath} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed space-y-4 whitespace-pre-line border-b border-zinc-800 pb-8">
          {article.content}
        </div>

        {/* Rating Bar */}
        <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl my-4">
          <div>
            <span className="text-xs font-bold text-amber-300 block mb-1">⭐ قيّم هذه المقالة:</span>
            <RatingStars
              rating={article.rating || 4.9}
              ratingCount={article.ratingCount || 187}
              size="md"
              interactive={true}
              onRate={onRate}
            />
          </div>
          <span className="text-[11px] text-zinc-500">اضغط على النجوم لتقييم المقال</span>
        </div>

        {/* Reaction Bar */}
        <div className="flex items-center justify-between py-4 border-b border-zinc-800 my-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                hasLiked 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>إعجاب ({likes})</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                isBookmarked 
                  ? 'bg-amber-500 text-zinc-950 border-amber-400' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isBookmarked ? 'محفوظ في مفضلتك' : 'حفظ في المفضلة'}</span>
            </button>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'تم نسخ الرابط!' : 'مشاركة'}</span>
          </button>
        </div>

        {/* Unified Interactive Student & Teacher Comments System */}
        <CommentsSection
          itemId={article.id}
          itemType="article"
          user={user}
          onOpenAuth={onOpenAuth}
          title="نقاشات وملاحظات الطلاب حول المقال"
        />

      </div>
    </div>
  );
};
