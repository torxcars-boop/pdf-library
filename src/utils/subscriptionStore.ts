import { UserSubscription, SubscriptionPlan, SubscriptionPaymentRequest } from '../types';
import { dispatchContentChanged } from './contentStore';

// Voluntary Platform Support Accounts
export const PAYMENT_ACCOUNTS = {
  vodafone: {
    name: 'فودافون كاش (Vodafone Cash)',
    number: '+201092467818',
    cleanNumber: '01092467818',
    instructions: 'يمكنك المساهمة الاختيارية لدعم استمرار المنصة المجانية على رقم فودافون كاش ثم إرسال إشعار التحويل.',
    icon: '📱'
  },
  etisalat: {
    name: 'اتصالات كاش (Etisalat Cash)',
    number: '+201107093454',
    cleanNumber: '01107093454',
    instructions: 'يمكنك المساهمة الاختيارية لدعم المنصة على رقم اتصالات كاش ثم إرفاق صورة الإيصال.',
    icon: '💚'
  },
  instapay: {
    name: 'انستاباي (InstaPay)',
    address: 'mostafarafat2007@instapay',
    instructions: 'تحويل فوري اختياري عبر تطبيق انستاباي لدعم تطوير وتوسيع المكتبة المجانية.',
    icon: '⚡'
  }
};

export const DEVELOPER_WHATSAPP = '201092467818';

const PLANS_CONFIG_KEY = 'arm_admin_plans_config_v1';
const PAYMENT_REQUESTS_KEY = 'arm_payment_requests_v1';
const STUDENTS_SUBSCRIPTIONS_MAP_KEY = 'arm_students_subscriptions_map_v1';

// Voluntary Platform Support Package (100% Free Platform — Never Required!)
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_50',
    name: 'مساهمة دعم المنصة المجانية ❤️',
    tagline: 'جميع الكتب والامتحانات مجانية 100% للجميع — مساهمتك الاختيارية تساعدنا في الاستمرار والتطوير',
    priceEGP: 50,
    billingPeriod: 'دعم اختياري',
    badge: 'داعم للمنصة ❤️',
    isPopular: true,
    examsPerWeek: -1, // Everything is unlimited & free for everyone
    isActive: true,
    features: [
      'جميع الكتب والمذكرات الدراسية PDF متاحة ومجانية 100% لكل الطلاب بدون أي قيود',
      'كافة الامتحانات الإلكترونية والنماذج الوزارية متاحة مجاناً وبلا حد أقصى',
      'معلم نطق اللغة الإنجليزية بالذكاء الاصطناعي والخرائط الذهنية مجانية للجميع',
      'مساهمتك اختيارية تماماً وتذهب مباشرة لتغطية تكاليف الخوادم وإضافة كتب وامتحانات جديدة',
      'يحصل الداعم على شارة "داعم للمنصة ❤️" تقديراً لمساهمته الكريمة في استمرار التعليم المجاني'
    ],
    colorTheme: 'from-amber-600 via-amber-500 to-amber-400',
    ctaText: 'المساهمة الآن بـ 50 ج.م لدعم المنصة ❤️'
  }
];

export const SUPPORT_UPDATED_EVENT = 'arm_support_updated';

function dispatchSupportUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SUPPORT_UPDATED_EVENT, { detail: { timestamp: Date.now() } }));
  }
  dispatchContentChanged();
}

export const syncSupportFromServer = (payload?: {
  supportConfig?: Record<string, boolean>;
  supportRequests?: SubscriptionPaymentRequest[];
  studentSubscriptions?: Record<string, UserSubscription>;
}) => {
  if (!payload) return;
  try {
    if (payload.supportConfig && typeof payload.supportConfig === 'object') {
      localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(payload.supportConfig));
    }
    if (Array.isArray(payload.supportRequests)) {
      localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(payload.supportRequests));
    }
    if (payload.studentSubscriptions && typeof payload.studentSubscriptions === 'object') {
      const existing = getAllSavedSubscriptions();
      const merged = { ...existing, ...payload.studentSubscriptions };
      localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(merged));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SUPPORT_UPDATED_EVENT, { detail: { timestamp: Date.now() } }));
    }
  } catch (e) {
    console.error('Error syncing support data from server', e);
  }
};

export const fetchAdminSupportFromServer = async (adminToken: string): Promise<void> => {
  if (!adminToken) return;
  try {
    const res = await fetch('/api/support/requests', {
      headers: { Authorization: `Bearer ${adminToken}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      syncSupportFromServer({
        supportRequests: Array.isArray(data.requests) ? data.requests : undefined,
        studentSubscriptions: data.studentSubscriptions,
      });
    }
  } catch {
    // offline fallback
  }
};

// 1. Admin Support Package Configuration
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

export const saveAdminPlanStatus = (planId: string, isActive: boolean, adminTokenOverride?: string) => {
  try {
    let saved: Record<string, boolean> = {};
    const raw = localStorage.getItem(PLANS_CONFIG_KEY);
    if (raw) saved = JSON.parse(raw);
    saved[planId] = isActive;
    localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(saved));
    dispatchSupportUpdated();

    if (typeof window !== 'undefined') {
      const adminToken = adminTokenOverride || localStorage.getItem('arm_admin_token') || '';
      if (adminToken) {
        fetch('/api/support/config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ planId, isActive }),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Error saving support config status', e);
  }
};

// 2. 100% Free Forever Full Access for Every Student
export const calculateStudentSubscription = (
  userId: string,
  userCreatedAt?: string,
  explicitSub?: UserSubscription
): UserSubscription => {
  try {
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) {
      const map: Record<string, UserSubscription> = JSON.parse(rawMap);
      const savedSub = map[userId];
      if (savedSub && (savedSub.approvedByAdmin || savedSub.pricePaid)) {
        return {
          ...savedSub,
          planId: 'basic_50',
          planName: 'داعم للمنصة المجانية ❤️',
          status: 'active',
          examsRemainingThisWeek: -1,
          maxExamsPerWeek: -1,
          isTrial: false,
        };
      }
    }

    if (explicitSub && (explicitSub.approvedByAdmin || explicitSub.pricePaid)) {
      return {
        ...explicitSub,
        planId: 'basic_50',
        planName: 'داعم للمنصة المجانية ❤️',
        status: 'active',
        examsRemainingThisWeek: -1,
        maxExamsPerWeek: -1,
        isTrial: false,
      };
    }
  } catch (e) {}

  const start = userCreatedAt ? new Date(userCreatedAt) : new Date();
  const futureEnd = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

  return {
    planId: 'free',
    planName: 'وصول مجاني كامل 100%',
    status: 'active',
    billingPeriod: 'monthly',
    examsRemainingThisWeek: -1,
    maxExamsPerWeek: -1,
    startDate: start.toISOString(),
    endDate: futureEnd.toISOString(),
    isTrial: false,
  };
};

export const saveStudentSubscription = (
  userId: string,
  sub: UserSubscription,
  syncToServer = true,
  adminTokenOverride?: string
) => {
  try {
    let map: Record<string, UserSubscription> = {};
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) map = JSON.parse(rawMap);
    const normalizedSub: UserSubscription = {
      ...sub,
      status: 'active',
      examsRemainingThisWeek: -1,
      maxExamsPerWeek: -1,
      isTrial: false,
    };
    map[userId] = normalizedSub;
    localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(map));
    localStorage.setItem(`arm_subscription_${userId}`, JSON.stringify(normalizedSub));
    dispatchSupportUpdated();

    if (syncToServer && typeof window !== 'undefined') {
      const adminToken = adminTokenOverride || localStorage.getItem('arm_admin_token') || '';
      if (adminToken) {
        fetch(`/api/support/supporters/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(normalizedSub),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Error saving student support record', e);
  }
};

export const getAllSavedSubscriptions = (): Record<string, UserSubscription> => {
  try {
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) return JSON.parse(rawMap);
  } catch (e) {}
  return {};
};

// 3. Voluntary Support Requests Management
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
    if (list.length > 25) {
      list = list.slice(0, 25);
    }
    list.unshift(newReq);
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
    dispatchSupportUpdated();
  } catch (e) {
    console.warn('Quota exceeded while saving support request, retrying without large payload...', e);
    try {
      const fallbackReq = { ...newReq, receiptImage: undefined };
      let list = getPaymentRequests().map(r => ({ ...r, receiptImage: undefined })).slice(0, 15);
      list.unshift(fallbackReq);
      localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
      dispatchSupportUpdated();
    } catch (err2) {
      console.error('Final fallback for support request', err2);
      dispatchSupportUpdated();
    }
  }

  if (typeof window !== 'undefined') {
    fetch('/api/support/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq),
    }).catch(() => {});
  }

  return newReq;
};

export const updatePaymentRequestStatus = (
  requestId: string,
  newStatus: 'approved' | 'rejected',
  adminTokenOverride?: string
) => {
  try {
    const list = getPaymentRequests();
    const req = list.find(r => r.id === requestId);
    if (!req) return false;

    req.status = newStatus;
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));

    if (newStatus === 'approved') {
      const now = new Date();
      const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const supporterSub: UserSubscription = {
        planId: req.planId || 'basic_50',
        planName: 'داعم للمنصة المجانية ❤️',
        status: 'active',
        billingPeriod: 'monthly',
        examsRemainingThisWeek: -1,
        maxExamsPerWeek: -1,
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

      saveStudentSubscription(req.userId, supporterSub, false);
    }

    if (typeof window !== 'undefined') {
      const adminToken = adminTokenOverride || localStorage.getItem('arm_admin_token') || '';
      if (adminToken) {
        fetch(`/api/support/requests/${encodeURIComponent(requestId)}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }).catch(() => {});
      }
    }

    dispatchSupportUpdated();
    return true;
  } catch (e) {
    console.error('Error updating support request status', e);
    return false;
  }
};

// 4. Legacy Compatibility Helpers (Zero Locks - 100% Free Forever)
export interface TrialRemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  percentElapsed: number;
}

export const getTrialRemainingTime = (_subscription?: UserSubscription): TrialRemainingTime => ({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalMs: 0,
  isExpired: false,
  percentElapsed: 0
});

export const isStudentTrialExpired = (_user?: { role?: string; subscription?: UserSubscription } | null): boolean => {
  return false;
};

export const isEducationalFeatureLocked = (_user?: { role?: string; subscription?: UserSubscription } | null): boolean => {
  return false;
};
