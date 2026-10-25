import React, { useState, useEffect } from 'react';
import { User, ItemReview } from '../types';
import { 
  getReviewsForItem, 
  addReview, 
  toggleApproveReview, 
  deleteReview,
  getItemRatingStats
} from '../utils/reviewsStore';
import { 
  Star, 
  Send, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  MessageSquare, 
  Lock,
  Sparkles,
  ThumbsUp,
  Award
} from 'lucide-react';

interface ReviewsSectionProps {
  itemId: string | number;
  itemType: 'book' | 'video' | 'article' | 'summary';
  user: User | null;
  onOpenAuth: () => void;
  title?: string;
  onRatingChanged?: (newRating: number, count: number) => void;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  itemId,
  itemType,
  user,
  onOpenAuth,
  title = 'تقييمات ومراجعات الطلاب المعتمدة',
  onRatingChanged,
}) => {
  const [reviews, setReviews] = useState<ItemReview[]>([]);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'approved'>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isAdmin = user?.role === 'moderator' || user?.role === 'admin' || !!localStorage.getItem('arm_admin_token');

  const refreshReviews = () => {
    const list = getReviewsForItem(itemId, itemType);
    setReviews(list);
    const stats = getItemRatingStats(itemId, itemType);
    if (onRatingChanged) {
      onRatingChanged(stats.averageRating, stats.totalReviews);
    }
  };

  useEffect(() => {
    refreshReviews();

    const handleSync = () => refreshReviews();
    window.addEventListener('arm_reviews_updated', handleSync);
    return () => window.removeEventListener('arm_reviews_updated', handleSync);
  }, [itemId, itemType]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!reviewComment.trim()) {
      alert('يرجى كتابة نص المراجعة أو الملاحظة للمادة.');
      return;
    }

    setIsSubmitting(true);
    addReview({
      itemId,
      itemType,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      academicStage: user.academicStage || 'طالب',
      rating: userRating,
      comment: reviewComment.trim(),
    });

    setReviewComment('');
    setIsSubmitting(false);
    refreshReviews();
    setSuccessToast('تم نشر مراجعتك وتقييمك بنجاح! شكراً لمشاركتك القيّمة ✨');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleToggleApprove = (reviewId: string) => {
    if (!isAdmin) return;
    toggleApproveReview(reviewId);
    refreshReviews();
  };

  const handleDelete = (reviewId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المراجعة؟')) {
      deleteReview(reviewId);
      refreshReviews();
    }
  };

  const stats = getItemRatingStats(itemId, itemType);
  const filteredReviews = filter === 'approved' 
    ? reviews.filter(r => r.isApproved) 
    : reviews;

  return (
    <div className="mt-8 pt-6 border-t border-zinc-800">
      {/* Toast */}
      {successToast && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Overall Rating Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 rounded-3xl bg-zinc-950/80 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            تجارب وتقييمات حقيقية من طلاب ومعلمي الثانوية العامة
          </p>
        </div>

        {/* Big Rating Badge */}
        <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-2xl border border-amber-500/30">
          <div className="text-center">
            <span className="text-2xl font-black text-amber-300 font-mono">{stats.averageRating}</span>
            <span className="text-[10px] text-zinc-500 block">من 5.0</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-zinc-400 block font-mono">
              ({stats.totalReviews} مراجعة مسجلة)
            </span>
          </div>
        </div>
      </div>

      {/* Add Review Form */}
      <form onSubmit={handleSubmitReview} className="mb-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold text-zinc-200">
            {user ? `أضف تقييمك ورأيك يا ${user.name}:` : 'سجّل تقييمك ومراجعتك للمادة:'}
          </span>

          {/* Interactive Star Picker */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-amber-400 font-bold ml-2 font-mono">
              ({hoverRating || userRating} / 5)
            </span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setUserRating(star)}
                className="p-1 text-amber-400 hover:scale-110 transition active:scale-95"
                title={`${star} نجوم`}
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= (hoverRating || userRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={
              user
                ? 'اكتب مراجعة نصية قصيرة (مثال: الشرح ممتاز والمسائل شاملة لجميع نواتج التعلم الوزارية...)'
                : 'سجّل الدخول لتتمكن من كتابة مراجعة وتقييم بالنجوم...'
            }
            rows={2}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition resize-none"
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60">
            <span className="text-[10px] text-zinc-500">
              مراجعتك تساعد زملاءك في اختيار أفضل المناهج والشروحات.
            </span>

            {user ? (
              <button
                type="submit"
                disabled={isSubmitting || !reviewComment.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-40"
              >
                <span>نشر التقييم</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 transition flex items-center gap-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>دخول لكتابة مراجعة</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold transition border ${
              filter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            كل المراجعات ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded-xl font-bold transition border flex items-center gap-1 ${
              filter === 'approved'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>المعتمدة من الإدارة ({reviews.filter(r => r.isApproved).length})</span>
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
            لا توجد مراجعات مسجلة في هذا القسم بعد.
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const canDelete = isAdmin || (user && user.id === rev.userId);

            return (
              <div
                key={rev.id}
                className={`p-3.5 rounded-2xl border transition ${
                  rev.isApproved
                    ? 'bg-zinc-950/80 border-amber-500/30'
                    : 'bg-zinc-950/50 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-zinc-800">
                      <img
                        src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={rev.userName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-100">{rev.userName}</span>
                        <span className="text-[10px] text-zinc-400">🎓 {rev.academicStage || 'طالب'}</span>
                        {rev.isApproved && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            مراجعة معتمدة ⭐
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Admin / Author */}
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        onClick={() => handleToggleApprove(rev.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          rev.isApproved
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-amber-500/20'
                        }`}
                        title={rev.isApproved ? 'إلغاء الاعتماد' : 'اعتماد المراجعة'}
                      >
                        {rev.isApproved ? 'معتمد ✓' : 'اعتماد'}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="حذف المراجعة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed pr-10 whitespace-pre-wrap">
                  {rev.comment}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
