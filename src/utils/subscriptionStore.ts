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

// Default 3 Plans (Monthly billing, weekly exams)
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_50',
    name: 'باقة الأساسيات والمتابعة',
    tagline: 'مثالية للتدريب الدوري والمراجعة الأسبوعية المستمرة',
    priceEGP: 50,
    billingPeriod: 'شهرياً',
    badge: 'بداية قوية 🎯',
    examsPerWeek: 2,
    isActive: true,
    features: [
      '2 امتحان إلكتروني أسبوعياً (8 امتحانات شهرياً)',
      'تصحيح فوري للامتحانات مع إظهار الإجابات النموذجية والشرح',
      'تحميل حتى 10 كتب ومذكرات دراسية PDF عالية الجودة شهرياً',
      'تصفح كامل لجميع ملخصات الصور والخرائط الذهنية',
      'تقرير أداء أسبوعي لمتوسط الدرجات ونسبة الإتقان',
      'دعم عبر الواتساب للاستفسارات العامة'
    ],
    colorTheme: 'from-blue-600 to-indigo-600',
    ctaText: 'اشترك الآن بـ 50 ج.م / شهرياً'
  },
  {
    id: 'pro_100',
    name: 'باقة التفوق الدراسي',
    tagline: 'الخيار الأفضل والأكثر طلباً لطلاب الشهادات والسنوية',
    priceEGP: 100,
    billingPeriod: 'شهرياً',
    badge: 'الأكثر طلباً ⭐',
    isPopular: true,
    examsPerWeek: 5,
    isActive: true,
    features: [
      '5 امتحانات أسبوعياً (20 امتحان شهرياً شامل كافة المواد)',
      'تحميل غير محدود لجميع الكتب والمذكرات الدراسية PDF',
      'تدريب مفتوح مع معلم نطق الإنجليزية بالذكاء الاصطناعي (AI Tutor)',
      'إتاحة بنك أسئلة الوزارة ونماذج امتحانات المحافظات السابقة',
      'تحليل ذكي لنقاط الضعف والقوة والمواضيع التي تحتاج مراجعة',
      'مؤقت بومودورو للمذاكرة والتركيز مع إحصائيات متقدمة',
      'أولوية في الدعم الفني والمتابعة الدراسية'
    ],
    colorTheme: 'from-amber-600 via-amber-500 to-amber-400',
    ctaText: 'اشترك في باقة التفوق بـ 100 ج.م / شهرياً'
  },
  {
    id: 'vip_200',
    name: 'باقة أوائل الجمهورية VIP',
    tagline: 'الاشتراك الملكي الشامل لكل ما يحتاجه طالب المجموع والقمة',
    priceEGP: 200,
    billingPeriod: 'شهرياً',
    badge: 'شاملة كل شيء 👑',
    examsPerWeek: -1, // Unlimited
    isActive: true,
    features: [
      'امتحانات غير محدودة طوال الأسبوع والشهر لكافة الصفوف (3 إعدادي - 3 ثانوي)',
      'تحميل فوري وسريع لكافة الكتب والملازم والخرائط الذهنية والشروحات',
      'وصول غير محدود لمعلم نطق الإنجليزية بالذكاء الاصطناعي مع تقييم الصوت بالمايكروفون',
      'نماذج ليلة الامتحان الوزارية المتوقعة مع شروحات الفيديو التفاعلية',
      'استشارات وتواصل مباشر مع نخبة المشرفين التعليميين عبر الواتساب VIP',
      'شهادة تفوق إلكترونية معتمدة تصدر باسم الطالب عند إتمام الاختبارات',
      'شارة طالب VIP ذهبي تظهر في الملف الشخصي ولوحة المتصدرين'
    ],
    colorTheme: 'from-emerald-600 via-teal-500 to-amber-500',
    ctaText: 'اشترك في باقة VIP بـ 200 ج.م / شهرياً'
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
    const start = userCreatedAt ? new Date(userCreatedAt) : new Date();
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
  try {
    const list = getPaymentRequests();
    const newReq: SubscriptionPaymentRequest = {
      ...request,
      id: 'req_' + Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    list.unshift(newReq);
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(list));
    dispatchContentChanged();
    return newReq;
  } catch (e) {
    console.error('Error submitting payment request', e);
    return null;
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
