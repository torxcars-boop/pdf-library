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

export function addReview(newRev: Omit<ItemReview, 'id' | 'createdAt' | 'isApproved'>): ItemReview {
  const all = getAllReviews();
  const created: ItemReview = {
    ...newRev,
    id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    isApproved: true, // Published immediately as requested
    likesCount: 0,
  };
  all.unshift(created);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving review:', e);
  }

  // Broadcast sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arm_reviews_updated', { detail: created }));
  }
  return created;
}

export function toggleApproveReview(reviewId: string): boolean {
  const all = getAllReviews();
  const item = all.find(r => r.id === reviewId);
  if (!item) return false;
  item.isApproved = !item.isApproved;
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Error updating review:', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arm_reviews_updated'));
  }
  return item.isApproved;
}

export function deleteReview(reviewId: string): boolean {
  const all = getAllReviews();
  const filtered = all.filter(r => r.id !== reviewId);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting review:', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arm_reviews_updated'));
  }
  return true;
}

export const REVIEWS_UPDATED_EVENT = 'arm_reviews_updated';
export const toggleReviewApproval = toggleApproveReview;
