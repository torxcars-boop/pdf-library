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

export const COMMENTS_UPDATED_EVENT = 'arm_comments_updated';

function dispatchCommentsUpdated(detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMENTS_UPDATED_EVENT, { detail }));
  }
}

export function setCommentsCacheFromServer(serverComments: CommentItem[] | undefined | null) {
  if (!Array.isArray(serverComments)) return;
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(serverComments));
    dispatchCommentsUpdated();
  } catch (e) {
    console.error('Error updating comments cache from server:', e);
  }
}

export async function syncCommentsFromServer(itemId?: string | number, itemType?: string): Promise<CommentItem[]> {
  try {
    const res = await fetch('/api/comments', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        setCommentsCacheFromServer(data.comments);
        if (itemId !== undefined && itemType) {
          return data.comments.filter((c: CommentItem) => String(c.itemId) === String(itemId) && c.itemType === itemType);
        }
        return data.comments;
      }
    }
  } catch {
    // offline fallback
  }
  return itemId !== undefined && itemType ? getCommentsForItem(itemId, itemType) : getAllComments();
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

  dispatchCommentsUpdated(newComment);

  if (typeof window !== 'undefined') {
    const userToken = localStorage.getItem('arm_user_token') || '';
    fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
      body: JSON.stringify(newComment),
    }).catch(() => {});
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

  dispatchCommentsUpdated();

  if (typeof window !== 'undefined') {
    fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: userId }),
    }).catch(() => {});
  }

  return { likesCount: c.likesCount, hasLiked };
}

export function toggleAdminLikeComment(commentId: string, adminTokenOverride?: string): boolean {
  const all = getAllComments();
  const c = all.find(item => item.id === commentId);
  if (!c) return false;

  c.isAdminLiked = !c.isAdminLiked;
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error updating admin like:', e);
  }

  dispatchCommentsUpdated();

  if (typeof window !== 'undefined') {
    const adminToken = adminTokenOverride || localStorage.getItem('arm_admin_token') || '';
    if (adminToken) {
      fetch(`/api/comments/${encodeURIComponent(commentId)}/admin-like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  }

  return !!c.isAdminLiked;
}

export function deleteComment(commentId: string, authTokenOverride?: string): boolean {
  const all = getAllComments();
  const filtered = all.filter(c => c.id !== commentId);
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting comment:', e);
  }

  dispatchCommentsUpdated();

  if (typeof window !== 'undefined') {
    const token = authTokenOverride || localStorage.getItem('arm_admin_token') || localStorage.getItem('arm_user_token') || '';
    if (token) {
      fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  return true;
}
