import { ItemReview } from '../types';

const REVIEWS_STORAGE_KEY = 'arm_item_reviews_v2';

const SEED_REVIEWS: ItemReview[] = [];

export function getAllReviews(): ItemReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(SEED_REVIEWS));
      return SEED_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_REVIEWS;
  } catch (e) {
    return SEED_REVIEWS;
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

export const REVIEWS_UPDATED_EVENT = 'arm_reviews_updated';

function dispatchReviewsUpdated(detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT, { detail }));
  }
}

export function setReviewsCacheFromServer(serverReviews: ItemReview[] | undefined | null) {
  if (!Array.isArray(serverReviews)) return;
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(serverReviews));
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
    // offline fallback
  }
  return itemId !== undefined && itemType ? getReviewsForItem(itemId, itemType) : getAllReviews();
}

export function addReview(newRev: Omit<ItemReview, 'id' | 'createdAt' | 'isApproved'>): ItemReview {
  const all = getAllReviews();
  const created: ItemReview = {
    ...newRev,
    id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    isApproved: true, // Published immediately
    likesCount: 0,
  };
  all.unshift(created);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving review:', e);
  }

  dispatchReviewsUpdated(created);

  if (typeof window !== 'undefined') {
    const userToken = localStorage.getItem('arm_user_token') || '';
    fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
      body: JSON.stringify(created),
    }).catch(() => {});
  }

  return created;
}

export function toggleApproveReview(reviewId: string, adminTokenOverride?: string): boolean {
  const all = getAllReviews();
  const item = all.find(r => r.id === reviewId);
  if (!item) return false;
  item.isApproved = !item.isApproved;
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error updating review:', e);
  }
  dispatchReviewsUpdated();

  if (typeof window !== 'undefined') {
    const token = adminTokenOverride || localStorage.getItem('arm_admin_token') || '';
    if (token) {
      fetch(`/api/reviews/${encodeURIComponent(reviewId)}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  return item.isApproved;
}

export function deleteReview(reviewId: string, authTokenOverride?: string): boolean {
  const all = getAllReviews();
  const filtered = all.filter(r => r.id !== reviewId);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting review:', e);
  }
  dispatchReviewsUpdated();

  if (typeof window !== 'undefined') {
    const token = authTokenOverride || localStorage.getItem('arm_admin_token') || localStorage.getItem('arm_user_token') || '';
    if (token) {
      fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  return true;
}

export const toggleReviewApproval = toggleApproveReview;
