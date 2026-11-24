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

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_50',
    name: 'مساهمة دعم المنصة المجانية ❤️',
    tagline: 'جميع الكتب والامتحانات مجانية 100% للجميع — مساهمتك الاختيارية تساعدنا في الاستمرار والتطوير',
    priceEGP: 50,
    billingPeriod: 'دعم اختياري',
    badge: 'داعم للمنصة ❤️',
    isPopular: true,
    examsPerWeek: -1,
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
      localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(payload.studentSubscriptions));
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
    // read-only fallback
  }
};

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
  } catch {}
  return DEFAULT_SUBSCRIPTION_PLANS;
};

export const saveAdminPlanStatus = async (
  planId: string,
  isActive: boolean,
  adminTokenOverride?: string
): Promise<{ ok: boolean; error?: string; unauthorized?: boolean }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت' };
  }
  const adminToken = adminTokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('arm_admin_token') || '' : '');
  if (!adminToken) {
    return { ok: false, unauthorized: true, error: 'مطلوب صلاحية الأدمن' };
  }

  try {
    const res = await fetch('/api/support/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ planId, isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, unauthorized: res.status === 401 || res.status === 403, error: data.error || 'تعذر حفظ حالة باقة الدعم' };
    }
    const saved = data.supportConfig || { [planId]: isActive };
    localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(saved));
    dispatchSupportUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
};

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
  } catch {}

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

export const saveStudentSubscription = async (
  userId: string,
  sub: UserSubscription,
  adminTokenOverride?: string
): Promise<{ ok: boolean; subscription?: UserSubscription; error?: string; unauthorized?: boolean }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت' };
  }
  const adminToken = adminTokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('arm_admin_token') || '' : '');
  if (!adminToken) {
    return { ok: false, unauthorized: true, error: 'مطلوب صلاحية الأدمن لمنح الشارة' };
  }

  const normalizedSub: UserSubscription = {
    ...sub,
    status: 'active',
    examsRemainingThisWeek: -1,
    maxExamsPerWeek: -1,
    isTrial: false,
  };

  try {
    const res = await fetch(`/api/support/supporters/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(normalizedSub),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, unauthorized: res.status === 401 || res.status === 403, error: data.error || 'تعذر حفظ شارة الداعم' };
    }
    const saved = (data.subscription || normalizedSub) as UserSubscription;
    const map = getAllSavedSubscriptions();
    map[userId] = saved;
    localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(map));
    dispatchSupportUpdated();
    return { ok: true, subscription: saved };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
};

export const getAllSavedSubscriptions = (): Record<string, UserSubscription> => {
  try {
    const rawMap = localStorage.getItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY);
    if (rawMap) return JSON.parse(rawMap);
  } catch {}
  return {};
};

export const getPaymentRequests = (): SubscriptionPaymentRequest[] => {
  try {
    const raw = localStorage.getItem(PAYMENT_REQUESTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const submitPaymentRequest = async (
  request: Omit<SubscriptionPaymentRequest, 'id' | 'submittedAt' | 'status'>,
  clientRequestId?: string
): Promise<{
  ok: boolean;
  request?: SubscriptionPaymentRequest;
  subscription?: UserSubscription;
  error?: string;
  unauthorized?: boolean;
}> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت — تعذر إرسال إشعار الدعم' };
  }
  const userToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_user_token') || '') : '';
  const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('arm_admin_token') || '') : '';
  const token = userToken || adminToken;

  if (!token) {
    return { ok: false, unauthorized: true, error: 'يرجى تسجيل الدخول أولاً لتوثيق مساهمة الدعم' };
  }

  const reqPayload = {
    ...request,
    id: clientRequestId || ('req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
    submittedAt: new Date().toISOString(),
    status: 'pending' as const,
  };

  try {
    const res = await fetch('/api/support/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reqPayload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.request) {
      return {
        ok: false,
        unauthorized: res.status === 401 || res.status === 403,
        error: data.error || 'تعذر تسجيل مساهمة الدعم في الخادم',
      };
    }

    const savedReq = data.request as SubscriptionPaymentRequest;
    const savedSub = data.subscription as UserSubscription | undefined;
    try {
      const list = getPaymentRequests().filter(r => r.id !== savedReq.id).slice(0, 50);
      list.unshift(savedReq);
      localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
      if (savedSub && savedReq.userId) {
        const map = getAllSavedSubscriptions();
        map[savedReq.userId] = savedSub;
        localStorage.setItem(STUDENTS_SUBSCRIPTIONS_MAP_KEY, JSON.stringify(map));
      }
    } catch {
      // ignore storage quota errors on optional cache
    }
    dispatchSupportUpdated();
    return { ok: true, request: savedReq, subscription: savedSub };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.' };
  }
};

export const updatePaymentRequestStatus = async (
  requestId: string,
  newStatus: 'approved' | 'rejected',
  adminTokenOverride?: string
): Promise<{ ok: boolean; error?: string; unauthorized?: boolean }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'أنت غير متصل بالإنترنت' };
  }
  const adminToken = adminTokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('arm_admin_token') || '' : '');
  if (!adminToken) {
    return { ok: false, unauthorized: true, error: 'مطلوب صلاحية الأدمن' };
  }

  try {
    const res = await fetch(`/api/support/requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        unauthorized: res.status === 401 || res.status === 403,
        error: data.error || 'تعذر تحديث حالة طلب الدعم',
      };
    }
    const list = getPaymentRequests();
    const target = list.find(r => r.id === requestId);
    if (target) {
      target.status = newStatus;
      localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
    }
    await fetchAdminSupportFromServer(adminToken);
    dispatchSupportUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
};

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
