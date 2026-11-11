import { UserSubscription, SubscriptionPlan, SubscriptionPaymentRequest } from '../types';
import { dispatchContentChanged } from './contentStore';

// Payment Accounts requested by user
export const PAYMENT_ACCOUNTS = {
  vodafone: {
    name: 'فودافون كاش (Vodafone Cash)',
    number: '+201092467818',
    cleanNumber: '01092467818',
    instructions: 'قم بالتحويل على رقم فودافون كاش ثم أرفق لقطة شاشة لإشعار التحويل لتفعيل الباقة.',
    icon: '📱'
  },
  etisalat: {
    name: 'اتصالات كاش (Etisalat Cash)',
    number: '+201107093454',
    cleanNumber: '01107093454',
    instructions: 'قم بالتحويل على رقم اتصالات كاش ثم أرفق صورة إيصال التحويل.',
    icon: '💚'
  },
  instapay: {
    name: 'انستاباي (InstaPay)',
    address: 'mostafarafat2007@instapay',
    instructions: 'قم بالتحويل اللحظي عبر تطبيق انستاباي إلى العنوان أعلاه.',
    icon: '⚡'
  }
};

export const DEVELOPER_WHATSAPP = '201092467818';

const PLANS_CONFIG_KEY = 'arm_admin_plans_config_v1';
const PAYMENT_REQUESTS_KEY = 'arm_payment_requests_v1';
const STUDENTS_SUBSCRIPTIONS_MAP_KEY = 'arm_students_subscriptions_map_v1';

// Unified 50 EGP Optional Plan with comprehensive attractive features
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_50',
    name: 'باقة التفوق الشاملة (اختيارية)',
    tagline: 'الباقة الموحدة الشاملة لكل المناهج والامتحانات ونماذج الإجابة',
    priceEGP: 50,
    billingPeriod: 'شهرياً',
    badge: 'الباقة الموحدة الشاملة 💎',
    isPopular: true,
    examsPerWeek: -1, // Unlimited exams
    isActive: true,
    features: [
      'امتحانات إلكترونية شاملة غير محدودة أسبوعياً مع تصحيح فوري وشرح تفصيلي',
      'تحميل فوري وغير محدود لجميع الكتب والمذكرات الدراسية PDF بجودة فائقة',
      'وصول كامل لمعلم نطق اللغة الإنجليزية الذكي (AI English Tutor)',
      'تصفح كامل للخرائط الذهنية الذكية ونماذج امتحانات الثانوية العامة والوزارة',
      'متابعة أسبوعية دقيقة للدرجات وإحصائيات نقاط القوة والضعف للطالب',
      'شهادة تفوق إلكترونية معتمدة تصدر باسم الطالب عند اجتياز الاختبارات',
      'دعم مباشر وسريع عبر الواتساب للاستفسارات والمتابعة الدراسية'
    ],
    colorTheme: 'from-amber-600 via-amber-500 to-amber-400',
    ctaText: 'اشترك الآن في الباقة الشاملة بـ 50 ج.م فقط'
  }
];

// 1. Admin Plans Configuration (Enable / Disable Packages)
export const getAdminPlansConfig = (): SubscriptionPlan[] => {
  try {
    const raw = localStorage.getItem(PLANS_CONFIG_KEY);
    if (raw) {
      const saved: Record<string, boolean> = JSON.parse(raw);
      return DEFAULT_SUBSCRIPTION_PLANS.map(p => ({
        ...p,
        isActive: saved[p.id] !== undefined ? saved[p.id] : true
      }));
    }
  } catch (e) {}
  return DEFAULT_SUBSCRIPTION_PLANS;
};

export const saveAdminPlanStatus = (planId: string, isActive: boolean) => {
  try {
    let saved: Record<string, boolean> = {};
    const raw = localStorage.getItem(PLANS_CONFIG_KEY);
    if (raw) saved = JSON.parse(raw);
    saved[planId] = isActive;
    localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(saved));
    dispatchContentChanged();
  } catch (e) {
    console.error('Error saving plan status', e);
  }
};

// 2. Student 10-Day Free Trial Calculation & Multi-Student Account Persistence
export const calculateStudentSubscription = (
  userId: string,
  userCreatedAt?: string,
  explicitSub?: UserSubscription
): UserSubscription => {
  try {
    // 1. Check if Admin or student previously set a persistent subscription
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) {
      const map: Record<string, UserSubscription> = JSON.parse(rawMap);
      if (map[userId]) {
        const sub = map[userId];
        // If it's a trial, refresh days left
        if (sub.isTrial) {
          const endDate = new Date(sub.endDate).getTime();
          const now = Date.now();
          const msLeft = endDate - now;
          const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
          sub.trialDaysLeft = daysLeft;
          sub.status = daysLeft > 0 ? 'active' : 'expired';
        }
        return sub;
      }
    }

    if (explicitSub && explicitSub.planId) {
      return explicitSub;
    }

    // 2. Otherwise: Automatic 10-Day Free Trial for every student account
    // CRITICAL: Look up if this student already has a trial start date saved to prevent resetting/expiring upon avatar or profile changes!
    let savedStartDate: string | undefined;
    try {
      const storedTrialStart = localStorage.getItem(`arm_trial_start_${userId}`);
      if (storedTrialStart) {
        savedStartDate = storedTrialStart;
      } else if (userCreatedAt) {
        savedStartDate = userCreatedAt;
        localStorage.setItem(`arm_trial_start_${userId}`, userCreatedAt);
      } else {
        savedStartDate = new Date().toISOString();
        localStorage.setItem(`arm_trial_start_${userId}`, savedStartDate);
      }
    } catch (e) {}

    const start = savedStartDate ? new Date(savedStartDate) : new Date();
    const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
    const msLeft = end.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    const trialSub: UserSubscription = {
      planId: 'free_trial',
      planName: 'فترة تجريبية مجانية (10 أيام)',
      status: daysLeft > 0 ? 'active' : 'expired',
      billingPeriod: 'trial',
      examsRemainingThisWeek: 2,
      maxExamsPerWeek: 2,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      isTrial: true,
      trialDaysLeft: daysLeft
    };

    // Save into the per-student map
    saveStudentSubscription(userId, trialSub);
    return trialSub;
  } catch (e) {
    return {
      planId: 'basic_50',
      planName: 'باقة الأساسيات',
      status: 'active',
      examsRemainingThisWeek: 2,
      maxExamsPerWeek: 2,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
};

export const saveStudentSubscription = (userId: string, sub: UserSubscription) => {
  try {
    let map: Record<string, UserSubscription> = {};
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) map = JSON.parse(rawMap);
    map[userId] = sub;
    localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(map));
    localStorage.setItem(`arm_subscription_${userId}`, JSON.stringify(sub));
    dispatchContentChanged();
  } catch (e) {
    console.error('Error saving student subscription', e);
  }
};

export const getAllSavedSubscriptions = (): Record<string, UserSubscription> => {
  try {
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) return JSON.parse(rawMap);
  } catch (e) {}
  return {};
};

// 3. Payment Proof Requests Management
export const getPaymentRequests = (): SubscriptionPaymentRequest[] => {
  try {
    const raw = localStorage.getItem(PAYMENT_REQUESTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
};

export const submitPaymentRequest = (request: Omit<SubscriptionPaymentRequest, 'id' | 'submittedAt' | 'status'>) => {
  const newReq: SubscriptionPaymentRequest = {
    ...request,
    id: 'req_' + Date.now(),
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };

  try {
    let list = getPaymentRequests();
    // Keep max 25 recent requests to avoid storage overflow
    if (list.length > 25) {
      list = list.slice(0, 25);
    }
    list.unshift(newReq);
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
    dispatchContentChanged();
    return newReq;
  } catch (e) {
    console.warn('Quota exceeded while saving payment request, retrying without large payload...', e);
    try {
      // Retry without receiptImage in storage if quota exceeded
      const fallbackReq = { ...newReq, receiptImage: undefined };
      let list = getPaymentRequests().map(r => ({ ...r, receiptImage: undefined })).slice(0, 15);
      list.unshift(fallbackReq);
      localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
      dispatchContentChanged();
      return fallbackReq;
    } catch (err2) {
      console.error('Final fallback for payment request', err2);
      dispatchContentChanged();
      return newReq;
    }
  }
};

export const updatePaymentRequestStatus = (
  requestId: string,
  newStatus: 'approved' | 'rejected'
) => {
  try {
    const list = getPaymentRequests();
    const req = list.find(r => r.id === requestId);
    if (!req) return false;

    req.status = newStatus;
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));

    // If approved, automatically activate the plan for that student!
    if (newStatus === 'approved') {
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days monthly
      const plans = getAdminPlansConfig();
      const plan = plans.find(p => p.id === req.planId) || DEFAULT_SUBSCRIPTION_PLANS[0];

      const newSub: UserSubscription = {
        planId: req.planId,
        planName: req.planName,
        status: 'active',
        billingPeriod: 'monthly',
        examsRemainingThisWeek: plan.examsPerWeek === -1 ? 9999 : plan.examsPerWeek,
        maxExamsPerWeek: plan.examsPerWeek,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        isTrial: false,
        pricePaid: req.amountEGP,
        paymentMethod: req.paymentMethod,
        receiptImage: req.receiptImage,
        paymentSenderPhone: req.senderPhone,
        transactionRef: req.transactionRef,
        approvedByAdmin: true
      };

      saveStudentSubscription(req.userId, newSub);
    }

    dispatchContentChanged();
    return true;
  } catch (e) {
    console.error('Error updating payment request status', e);
    return false;
  }
};

// 4. Live Countdown Calculations & Feature Lock Checks
export interface TrialRemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  percentElapsed: number;
}

export const getTrialRemainingTime = (subscription?: UserSubscription): TrialRemainingTime => {
  if (!subscription || !subscription.endDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isExpired: true,
      percentElapsed: 100
    };
  }

  const endMs = new Date(subscription.endDate).getTime();
  const startMs = subscription.startDate ? new Date(subscription.startDate).getTime() : endMs - 10 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const totalDurationMs = Math.max(1, endMs - startMs);
  const totalMs = Math.max(0, endMs - nowMs);
  const isExpired = totalMs <= 0 || subscription.status === 'expired';

  const elapsedMs = Math.max(0, nowMs - startMs);
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    isExpired,
    percentElapsed
  };
};

/**
 * Checks if the student's 10-day free trial has expired.
 * Admins/moderators are never expired.
 * Paid active subscriptions are not expired.
 */
export const isStudentTrialExpired = (user?: { role?: string; subscription?: UserSubscription } | null): boolean => {
  if (!user) return false;
  // Admins & moderators are never locked
  if (user.role === 'admin' || user.role === 'moderator') return false;

  const sub = user.subscription;
  if (!sub) return false;

  // If user has an active paid subscription (not trial), they are not expired
  if (sub.status === 'active' && !sub.isTrial && sub.planId !== 'free_trial') {
    return false;
  }

  // If it's a trial, check end timestamp
  if (sub.isTrial || sub.planId === 'free_trial') {
    const endMs = new Date(sub.endDate).getTime();
    return Date.now() >= endMs || (sub.trialDaysLeft !== undefined && sub.trialDaysLeft <= 0);
  }

  // If status is explicitly expired or suspended
  if (sub.status === 'expired' || sub.status === 'suspended') {
    return true;
  }

  return false;
};

/**
 * Determines whether educational features (taking exams, downloading books, English AI, mindmaps)
 * should be locked due to expired trial without active paid subscription.
 */
export const isEducationalFeatureLocked = (user?: { role?: string; subscription?: UserSubscription } | null): boolean => {
  return isStudentTrialExpired(user);
};
