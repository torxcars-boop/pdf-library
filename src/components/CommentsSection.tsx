import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  CommentItem, 
  getCommentsForItem, 
  addComment, 
  toggleLikeComment, 
  toggleAdminLikeComment, 
  deleteComment 
} from '../utils/commentsStore';
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Star, 
  Trash2, 
  ShieldCheck, 
  GraduationCap, 
  Lock,
  Sparkles,
  Heart
} from 'lucide-react';

interface CommentsSectionProps {
  itemId: string | number;
  itemType: 'book' | 'video' | 'article' | 'summary';
  user: User | null;
  onOpenAuth: () => void;
  title?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  itemId,
  itemType,
  user,
  onOpenAuth,
  title = 'مناقشات وملاحظات الطلاب',
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newText, setNewText] = useState('');
  const [filter, setFilter] = useState<'all' | 'endorsed'>('all');
  const [submitting, setSubmitting] = useState(false);

  // Check if current user is admin / teacher
  const isAdmin = user?.role === 'moderator' || user?.role === 'admin' || !!localStorage.getItem('arm_admin_token');

  const refreshComments = () => {
    setComments(getCommentsForItem(itemId, itemType));
  };

  useEffect(() => {
    refreshComments();
  }, [itemId, itemType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    setSubmitting(true);
    addComment({
      itemId: String(itemId),
      itemType,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      authorRole: (user.role as any) || 'user',
      academicStage: user.academicStage || 'طالب',
      content: newText.trim(),
    });

    setNewText('');
    setSubmitting(false);
    refreshComments();
  };

  const handleLike = (commentId: string) => {
    const currentUserId = user?.id || 'guest_' + (localStorage.getItem('arm_guest_id') || 'guest');
    if (!localStorage.getItem('arm_guest_id')) {
      localStorage.setItem('arm_guest_id', Math.random().toString(36).substring(2, 9));
    }
    toggleLikeComment(commentId, currentUserId);
    refreshComments();
  };

  const handleAdminLike = (commentId: string) => {
    if (!isAdmin) return;
    toggleAdminLikeComment(commentId);
    refreshComments();
  };

  const handleDelete = (commentId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
      deleteComment(commentId);
      refreshComments();
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      return `منذ ${diffDays} يوم`;
    } catch {
      return 'مؤخراً';
    }
  };

  const filteredComments = filter === 'endorsed' 
    ? comments.filter(c => c.isAdminLiked) 
    : comments;

  return (
    <div className="mt-8 pt-6 border-t border-zinc-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700">
                {comments.length}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">اطرح استفساراتك وشارك ملاحظاتك المنهجية مع زملائك والمعلمين</p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 text-xs bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            الكل ({comments.length})
          </button>
          <button
            onClick={() => setFilter('endorsed')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              filter === 'endorsed'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-amber-300'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>معتمد ومميز ({comments.filter(c => c.isAdminLiked).length})</span>
          </button>
        </div>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={
              user 
                ? `اكتب سؤالك أو ملاحظتك يا ${user.name}...` 
                : 'سجّل الدخول لطرح سؤال أو مشاركة ملاحظتك مع زملائك والمعلمين...'
            }
            rows={3}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 pl-24 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition resize-none leading-relaxed"
          />

          <div className="absolute left-3 bottom-3 flex items-center gap-2">
            {user ? (
              <button
                type="submit"
                disabled={submitting || !newText.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-300 font-bold text-xs flex items-center gap-1 border border-zinc-700 transition"
              >
                <Lock className="w-3 h-3" />
                <span>دخول للتعليق</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800 text-zinc-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto text-zinc-600 mb-2 stroke-[1.5]" />
            <p>لا توجد تعليقات هنا حتى الآن.</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">كن أول من يطرح سؤالاً أو يشارك ملاحظة قيّمة لزملائه!</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const currentUserId = user?.id || '';
            const isLikedByMe = comment.likedBy.includes(currentUserId);
            const canDelete = isAdmin || (user && user.id === comment.authorId);

            return (
              <div
                key={comment.id}
                className={`p-3.5 rounded-2xl transition border ${
                  comment.isAdminLiked
                    ? 'bg-gradient-to-r from-amber-950/20 via-zinc-900/90 to-zinc-950 border-amber-500/40 shadow-sm shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-zinc-800">
                      <img
                        src={comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={comment.authorName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-zinc-200">
                          {comment.authorName}
                        </span>

                        {comment.authorRole === 'admin' || comment.authorRole === 'moderator' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            مشرف تعليمي
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">
                            🎓 {comment.academicStage || 'طالب'}
                          </span>
                        )}

                        {comment.isAdminLiked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/30 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>إعجاب المعلم ⭐</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Delete, Admin Endorse) */}
                  <div className="flex items-center gap-1">
                    {/* Admin Endorsement Toggle */}
                    {isAdmin && (
                      <button
                        onClick={() => handleAdminLike(comment.id)}
                        className={`p-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                          comment.isAdminLiked
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-900 text-amber-400 border-zinc-700 hover:bg-amber-500/20'
                        }`}
                        title={comment.isAdminLiked ? 'إلغاء اعتماد المعلم' : 'منح إعجاب واعتماد المعلم ⭐'}
                      >
                        <Star className={`w-3 h-3 ${comment.isAdminLiked ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline">
                          {comment.isAdminLiked ? 'معتمد' : 'اعتماد المعلم'}
                        </span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="حذف التعليق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-zinc-300 leading-relaxed pr-10 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Bottom Bar: Like counter */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/60 pr-10 text-[11px]">
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                      isLikedByMe
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${isLikedByMe ? 'fill-rose-400 text-rose-400' : ''}`} />
                    <span>{comment.likesCount > 0 ? comment.likesCount : 'إعجاب'}</span>
                  </button>

                  {comment.isAdminLiked && (
                    <span className="text-[10px] text-amber-400/80 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      إجابة / ملاحظة موثوقة من قِبل إدارة المناهج
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
