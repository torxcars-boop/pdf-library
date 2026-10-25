export interface CommentItem {
  id: string;
  itemId: string;
  itemType: 'book' | 'video' | 'article' | 'summary';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'admin' | 'moderator' | 'user';
  academicStage?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  likedBy: string[];
  isAdminLiked?: boolean;
}

const COMMENTS_STORAGE_KEY = 'arm_comments_store_v2';

const SEED_COMMENTS: CommentItem[] = [
  // Book 1 (Physics)
  {
    id: 'c_seed_1',
    itemId: '1',
    itemType: 'book',
    authorId: 'usr_seed_1',
    authorName: 'أحمد محمود',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    academicStage: '3 ثانوي - علمي علوم',
    content: 'هل الكتاب يغطي مسائل كيرشوف المركبة وأجهزة القياس بنظام البابل شيت الحديث؟',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likesCount: 8,
    likedBy: [],
    isAdminLiked: true,
  },
  {
    id: 'c_seed_2',
    itemId: '1',
    itemType: 'book',
    authorId: 'admin_seed',
    authorName: 'المشرف التعليمي (أ. طارق)',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
    authorRole: 'admin',
    academicStage: 'معلم أول فيزياء',
    content: 'نعم يا أحمد، الكتاب يحتوي على أكثر من 350 مسألة بابل شيت متدرجة الصعوبة تبدأ من قانون أوم وصولاً للدوائر المهتزة والليزر مع نماذج الإجابة النموذجية.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    likesCount: 15,
    likedBy: ['usr_seed_1'],
    isAdminLiked: true,
  },
  // Book 2 (Chemistry)
  {
    id: 'c_seed_3',
    itemId: '2',
    itemType: 'book',
    authorId: 'usr_seed_2',
    authorName: 'سارة خالد',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
    academicStage: '3 ثانوي - علمي',
    content: 'تجميعة معادلات الحديد في الباب الأول ممتازة جداً ومفيدة للمراجعة السريعة قبل الامتحانات.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    likesCount: 11,
    likedBy: [],
    isAdminLiked: true,
  },
  // Video 1
  {
    id: 'c_seed_4',
    itemId: '1',
    itemType: 'video',
    authorId: 'usr_seed_3',
    authorName: 'يوسف عبد الرحمن',
    authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
    academicStage: '3 ثانوي',
    content: 'طريقة مستر محمد عبد المعبود في شرح المقاومات وتوزيع الجهد تسهل الفهم كثيراً. أنصح بالتركيز من الدقيقة 14.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    likesCount: 19,
    likedBy: [],
    isAdminLiked: true,
  },
  // Article 1
  {
    id: 'c_seed_5',
    itemId: '1',
    itemType: 'article',
    authorId: 'usr_seed_4',
    authorName: 'مريم حسن',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
    academicStage: '3 ثانوي - أدبي',
    content: 'نصيحة حل امتحانات البابل شيت بضبط المؤقت لـ 3 ساعات غيرت مستواي تماماً وقللت التوتر.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    likesCount: 14,
    likedBy: [],
    isAdminLiked: true,
  }
];

export function getAllComments(): CommentItem[] {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(SEED_COMMENTS));
      return SEED_COMMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return SEED_COMMENTS;
  }
}

export function getCommentsForItem(itemId: string | number, itemType: string): CommentItem[] {
  const all = getAllComments();
  return all.filter(c => String(c.itemId) === String(itemId) && c.itemType === itemType);
}

export function addComment(comment: Omit<CommentItem, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>): CommentItem {
  const all = getAllComments();
  const newComment: CommentItem = {
    ...comment,
    id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    likesCount: 0,
    likedBy: [],
    isAdminLiked: comment.authorRole === 'admin' || comment.authorRole === 'moderator',
  };
  all.unshift(newComment);
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving comment:', e);
  }
  return newComment;
}

export function toggleLikeComment(commentId: string, userId: string): { likesCount: number; hasLiked: boolean } {
  const all = getAllComments();
  const c = all.find(item => item.id === commentId);
  if (!c) return { likesCount: 0, hasLiked: false };

  const index = c.likedBy.indexOf(userId);
  let hasLiked = false;
  if (index >= 0) {
    c.likedBy.splice(index, 1);
    c.likesCount = Math.max(0, c.likesCount - 1);
    hasLiked = false;
  } else {
    c.likedBy.push(userId);
    c.likesCount += 1;
    hasLiked = true;
  }

  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error updating comment like:', e);
  }
  return { likesCount: c.likesCount, hasLiked };
}

export function toggleAdminLikeComment(commentId: string): boolean {
  const all = getAllComments();
  const c = all.find(item => item.id === commentId);
  if (!c) return false;

  c.isAdminLiked = !c.isAdminLiked;
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error updating admin like:', e);
  }
  return !!c.isAdminLiked;
}

export function deleteComment(commentId: string): boolean {
  const all = getAllComments();
  const filtered = all.filter(c => c.id !== commentId);
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting comment:', e);
  }
  return true;
}
