import { ItemReview } from '../types';

const REVIEWS_STORAGE_KEY = 'arm_item_reviews_v2';

const SEED_REVIEWS: ItemReview[] = [
  {
    id: 'rev_seed_1',
    itemId: '1',
    itemType: 'book',
    userId: 'usr_rev_1',
    userName: 'محمود عبد السلام',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    academicStage: '3 ثانوي - علمي علوم',
    rating: 5,
    comment: 'كتاب فيزياء شامل ومتقن جداً، خصوصاً توضيح قوانين كيرشوف وحسابات أجهزة القياس بنظام البابل شيت. أنصح كل طالب باقتنائه.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    isApproved: true,
    likesCount: 18,
  },
  {
    id: 'rev_seed_2',
    itemId: '1',
    itemType: 'book',
    userId: 'usr_rev_2',
    userName: 'سارة إبراهيم',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
    academicStage: '3 ثانوي - علمي رياضة',
    rating: 5,
    comment: 'المسائل متدرجة من السهل إلى مسائل المستويات العليا الوزارية، مع إجابات نموذجية وتفسيرات واضحة.',
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    isApproved: true,
    likesCount: 12,
  },
  {
    id: 'rev_seed_3',
    itemId: '2',
    itemType: 'book',
    userId: 'usr_rev_3',
    userName: 'يوسف الهواري',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
    academicStage: '3 ثانوي - علمي',
    rating: 5,
    comment: 'مخططات الكيمياء العضوية وتفاعلات الحديد في الباب الأول قمة في الإبداع والتبسيط.',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    isApproved: true,
    likesCount: 9,
  },
  {
    id: 'rev_seed_4',
    itemId: '1',
    itemType: 'video',
    userId: 'usr_rev_4',
    userName: 'كريم نادر',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
    academicStage: '3 ثانوي',
    rating: 5,
    comment: 'أفضل شرح للتيار المتردد والدينامو بدون تعقيد، شكراً لمستر محمد عبد المعبود وللمنصة.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    isApproved: true,
    likesCount: 22,
  },
  {
    id: 'rev_seed_5',
    itemId: '1',
    itemType: 'article',
    userId: 'usr_rev_5',
    userName: 'هند أحمد',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
    academicStage: '3 ثانوي - أدبي',
    rating: 5,
    comment: 'دليل البابل شيت وإدارة وقت الامتحان في 3 ساعات أنقذني في تجربة الامتحانات الشاملة.',
    createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    isApproved: true,
    likesCount: 15,
  }
];

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

export function getItemRatingStats(itemId: string | number, itemType: string, defaultRating = 4.9, defaultCount = 120): { averageRating: number; totalReviews: number } {
  const reviews = getReviewsForItem(itemId, itemType);
  if (reviews.length === 0) {
    return { averageRating: defaultRating, totalReviews: defaultCount };
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
