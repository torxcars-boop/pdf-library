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

const SEED_COMMENTS: CommentItem[] = [];

export function getAllComments(): CommentItem[] {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const realOnly = parsed.filter((c: CommentItem) => !String(c.id).startsWith('c_seed_'));
    if (realOnly.length !== parsed.length) {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(realOnly));
    }
    return realOnly;
  } catch (e) {
    return [];
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
