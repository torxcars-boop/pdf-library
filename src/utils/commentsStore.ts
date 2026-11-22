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
export const COMMENTS_UPDATED_EVENT = 'arm_comments_updated';

export interface CommentActionResult {
  ok: boolean;
  comment?: CommentItem;
  likesCount?: number;
  hasLiked?: boolean;
  isAdminLiked?: boolean;
  error?: string;
  unauthorized?: boolean;
  forbidden?: boolean;
}

export function getAllComments(): CommentItem[] {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c: CommentItem) => !String(c.id).startsWith('c_seed_'));
  } catch {
    return [];
  }
}

export function getCommentsForItem(itemId: string | number, itemType: string): CommentItem[] {
  const all = getAllComments();
  return all.filter(c => String(c.itemId) === String(itemId) && c.itemType === itemType);
}

function dispatchCommentsUpdated(detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMENTS_UPDATED_EVENT, { detail }));
  }
}

export function setCommentsCacheFromServer(serverComments: CommentItem[] | undefined | null) {
  if (!Array.isArray(serverComments)) return;
  try {
    const dedupMap = new Map<string, CommentItem>();
    serverComments.forEach(c => {
      if (c && c.id && !dedupMap.has(String(c.id))) {
        dedupMap.set(String(c.id), c);
      }
    });
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(Array.from(dedupMap.values())));
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
    // offline read cache only
  }
  return itemId !== undefined && itemType ? getCommentsForItem(itemId, itemType) : getAllComments();
}

export async function addComment(
  comment: Omit<CommentItem, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>,
  clientRequestId?: string
): Promise<CommentActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت — تعذر نشر التعليق على الخادم' };
  }

  const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || '') : '';
  const userToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_user_token') || '') : '';
  const token = userToken || adminToken;

  if (!token) {
    return { ok: false, unauthorized: true, error: 'يرجى تسجيل الدخول أولاً لإضافة تعليق' };
  }

  const requestId = clientRequestId || ('cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: requestId,
        itemId: comment.itemId,
        itemType: comment.itemType,
        content: comment.content,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.comment) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر حفظ التعليق في قاعدة البيانات',
      };
    }

    const savedComment = data.comment as CommentItem;
    const all = getAllComments().filter(c => String(c.id) !== String(savedComment.id));
    all.unshift(savedComment);
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore storage quota errors
    }
    dispatchCommentsUpdated(savedComment);
    return { ok: true, comment: savedComment };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لحفظ التعليق. حاول مرة أخرى.' };
  }
}

export async function toggleLikeComment(commentId: string, userId: string): Promise<CommentActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت' };
  }
  const userToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_user_token') || '') : '';
  const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || '') : '';
  const token = userToken || adminToken;

  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ actorId: userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, forbidden: res.status === 403, error: data.error || 'تعذر تحديث الإعجاب' };
    }
    if (data.comment) {
      const all = getAllComments();
      const idx = all.findIndex(c => c.id === commentId);
      if (idx >= 0) all[idx] = data.comment;
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
      dispatchCommentsUpdated();
    }
    return {
      ok: true,
      comment: data.comment,
      likesCount: data.comment?.likesCount ?? data.likesCount,
      hasLiked: data.hasLiked,
    };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function toggleAdminLikeComment(commentId: string, adminTokenOverride?: string): Promise<CommentActionResult> {
  const adminToken = adminTokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('arm_admin_token') || '' : '');
  if (!adminToken) {
    return { ok: false, unauthorized: true, error: 'مطلوب صلاحية الأدمن أو المشرف' };
  }
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/admin-like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.comment) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر تنفيذ الإعجاب الإداري',
      };
    }
    const all = getAllComments();
    const idx = all.findIndex(c => c.id === commentId);
    if (idx >= 0) all[idx] = data.comment;
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
    dispatchCommentsUpdated();
    return { ok: true, comment: data.comment, isAdminLiked: !!data.comment.isAdminLiked };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function deleteComment(commentId: string, authTokenOverride?: string): Promise<CommentActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت — تعذر حذف التعليق' };
  }
  const token = authTokenOverride || (typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || localStorage.getItem('arm_user_token') || '') : '');
  if (!token) {
    return { ok: false, unauthorized: true, error: 'غير مصرح بحذف هذا التعليق' };
  }
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر حذف التعليق من قاعدة البيانات',
      };
    }
    const filtered = getAllComments().filter(c => c.id !== commentId);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(filtered));
    dispatchCommentsUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لحذف التعليق' };
  }
}
