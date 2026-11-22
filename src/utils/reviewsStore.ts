import { ItemReview } from '../types';

const REVIEWS_STORAGE_KEY = 'arm_item_reviews_v2';
export const REVIEWS_UPDATED_EVENT = 'arm_reviews_updated';

export interface ReviewActionResult {
  ok: boolean;
  review?: ItemReview;
  isApproved?: boolean;
  error?: string;
  unauthorized?: boolean;
  forbidden?: boolean;
}

export function getAllReviews(): ItemReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getReviewsForItem(itemId: string | number, itemType: string): ItemReview[] {
  const all = getAllReviews();
  return all.filter(r => String(r.itemId) === String(itemId) && r.itemType === itemType);
}

export function getItemRatingStats(itemId: string | number, itemType: string): { averageRating: number; totalReviews: number } {
  const reviews = getReviewsForItem(itemId, itemType);
  if (reviews.length === 0) {
    return { averageRating: 0, totalReviews: 0 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { averageRating: avg, totalReviews: reviews.length };
}

function dispatchReviewsUpdated(detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT, { detail }));
  }
}

export function setReviewsCacheFromServer(serverReviews: ItemReview[] | undefined | null) {
  if (!Array.isArray(serverReviews)) return;
  try {
    const dedupMap = new Map<string, ItemReview>();
    serverReviews.forEach(r => {
      if (r && r.id && !dedupMap.has(String(r.id))) {
        dedupMap.set(String(r.id), r);
      }
    });
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(Array.from(dedupMap.values())));
    dispatchReviewsUpdated();
  } catch (e) {
    console.error('Error updating reviews cache from server:', e);
  }
}

export async function syncReviewsFromServer(itemId?: string | number, itemType?: string): Promise<ItemReview[]> {
  try {
    const res = await fetch('/api/reviews', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reviews)) {
        setReviewsCacheFromServer(data.reviews);
        if (itemId !== undefined && itemType) {
          return data.reviews.filter((r: ItemReview) => String(r.itemId) === String(itemId) && r.itemType === itemType);
        }
        return data.reviews;
      }
    }
  } catch {
    // read-only fallback
  }
  return itemId !== undefined && itemType ? getReviewsForItem(itemId, itemType) : getAllReviews();
}

export async function addReview(
  newRev: Omit<ItemReview, 'id' | 'createdAt' | 'isApproved'>,
  clientRequestId?: string
): Promise<ReviewActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت — تعذر نشر المراجعة' };
  }
  const userToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_user_token') || '') : '';
  const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || '') : '';
  const token = userToken || adminToken;

  if (!token) {
    return { ok: false, unauthorized: true, error: 'يرجى تسجيل الدخول أولاً لإضافة مراجعة' };
  }

  const requestId = clientRequestId || ('rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: requestId,
        itemId: newRev.itemId,
        itemType: newRev.itemType,
        rating: newRev.rating,
        comment: newRev.comment,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.review) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر حفظ المراجعة في قاعدة البيانات',
      };
    }

    const saved = data.review as ItemReview;
    const all = getAllReviews().filter(r => String(r.id) !== String(saved.id));
    all.unshift(saved);
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore storage quota errors
    }
    dispatchReviewsUpdated(saved);
    return { ok: true, review: saved };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لنشر المراجعة. حاول مرة أخرى.' };
  }
}

export async function toggleApproveReview(reviewId: string, adminTokenOverride?: string): Promise<ReviewActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت' };
  }
  const token = adminTokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('arm_admin_token') || '' : '');
  if (!token) {
    return { ok: false, unauthorized: true, error: 'مطلوب صلاحية الأدمن أو المشرف' };
  }

  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/toggle`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.review) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر تحديث حالة اعتماد المراجعة',
      };
    }
    const all = getAllReviews();
    const idx = all.findIndex(r => r.id === reviewId);
    if (idx >= 0) all[idx] = data.review;
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
    dispatchReviewsUpdated();
    return { ok: true, review: data.review, isApproved: Boolean(data.review.isApproved) };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function deleteReview(reviewId: string, authTokenOverride?: string): Promise<ReviewActionResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت — تعذر حذف المراجعة' };
  }
  const token = authTokenOverride || (typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || localStorage.getItem('arm_user_token') || '') : '');
  if (!token) {
    return { ok: false, unauthorized: true, error: 'غير مصرح بحذف هذه المراجعة' };
  }

  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        unauthorized: res.status === 401,
        forbidden: res.status === 403,
        error: data.error || 'تعذر حذف المراجعة من قاعدة البيانات',
      };
    }
    const filtered = getAllReviews().filter(r => r.id !== reviewId);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
    dispatchReviewsUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لحذف المراجعة' };
  }
}

export const toggleReviewApproval = toggleApproveReview;
