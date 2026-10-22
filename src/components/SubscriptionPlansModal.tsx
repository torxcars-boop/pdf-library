import React, { useState } from 'react';
import { User, SubscriptionPlan, UserSubscription } from '../types';
import { 
  Check, 
  Crown, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Volume2, 
  X, 
  CreditCard, 
  PhoneCall, 
  CheckCircle2, 
  ArrowRight,
  Copy,
  Clock,
  HelpCircle
} from 'lucide-react';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_50',
    name: 'باقة الأساسيات والمتابعة',
    tagline: 'مثالية للتدريب المنتظم والمراجعة الأسبوعية المستمرة',
    priceEGP: 50,
    billingPeriod: 'شهرياً',
    badge: 'بداية قوية 🎯',
    examsPerWeek: 2,
    features: [
      '2 امتحان إلكتروني أسبوعياً (8 امتحانات شهرياً)',
      'تصحيح فوري للامتحانات مع إظهار الإجابات النموذجية',
      'تحميل حتى 10 كتب ومذكرات دراسية PDF عالية الجودة',
      'تصفح كامل لجميع ملخصات الصور والخرائط الذهنية',
      'تقرير أداء أسبوعي لمتوسط الدرجات ونسبة الإتقان',
      'دعم عبر الواتساب للاستفسارات العامة'
    ],
    colorTheme: 'from-blue-600 to-indigo-600',
    ctaText: 'اشترك الآن بـ 50 ج.م'
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
    ctaText: 'اشترك في باقة التفوق بـ 100 ج.م'
  },
  {
    id: 'vip_200',
    name: 'باقة أوائل الجمهورية VIP',
    tagline: 'الاشتراك الملكي الشامل لكل ما يحتاجه طالب المجموع والقمة',
    priceEGP: 200,
    billingPeriod: 'شهرياً',
    badge: 'شاملة كل شيء 👑',
    examsPerWeek: -1, // Unlimited
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
    ctaText: 'اشترك في باقة VIP بـ 200 ج.م'
  }
];

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSubscriptionUpdated: (subscription: UserSubscription) => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onSubscriptionUpdated
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone' | 'instapay' | 'fawry'>('vodafone');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleInitiateSubscribe = (plan: SubscriptionPlan) => {
    if (!currentUser) {
      onClose();
      onOpenAuth();
      return;
    }
    setSelectedPlan(plan);
    setSuccessMessage(null);
  };

  const handleConfirmPayment = () => {
    if (!selectedPlan) return;
    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const newSubscription: UserSubscription = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        status: 'active',
        examsRemainingThisWeek: selectedPlan.examsPerWeek === -1 ? 9999 : selectedPlan.examsPerWeek,
        maxExamsPerWeek: selectedPlan.examsPerWeek,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        pricePaid: selectedPlan.priceEGP,
        paymentMethod: paymentMethod === 'vodafone' ? 'فودافون كاش' : paymentMethod === 'instapay' ? 'انستاباي' : 'فوري'
      };

      // Save to localStorage for persistence
      localStorage.setItem('arm_user_subscription', JSON.stringify(newSubscription));
      
      onSubscriptionUpdated(newSubscription);
      setIsProcessing(false);
      setSuccessMessage(`تم تفعيل ${selectedPlan.name} بنجاح! مبروك يا ${currentUser?.name} 🎉`);

      setTimeout(() => {
        setSelectedPlan(null);
        setSuccessMessage(null);
        onClose();
      }, 2500);
    }, 1200);
  };

  const currentPlanId = currentUser?.subscription?.status === 'active' 
    ? currentUser.subscription.planId 
    : 'free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-zinc-950 border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl text-right max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-amber-500/40 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>باقات اشتراك دراسية مرنة تبدأ من 50 ج.م فقط</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500">
            اختر باقة التفوق المناسبة لمستواك الدراسي
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            امتحانات إلكترونية تفاعلية أسبوعية تحاكي أسئلة الوزارة، تدريب النطق الإنجليزي بالذكاء الاصطناعي، وتحميل مباشر للمذكرات.
          </p>

          {currentUser?.subscription?.status === 'active' && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 inline-flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>أنت مشترك حالياً في: <strong>{currentUser.subscription.planName}</strong></span>
              <span>• متبقي لك: {currentUser.subscription.maxExamsPerWeek === -1 ? 'امتحانات غير محدودة ♾️' : `${currentUser.subscription.examsRemainingThisWeek} امتحان هذا الأسبوع`}</span>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* STEP 1: PLANS GRID VIEW */}
        {/* ----------------------------------------------------------------- */}
        {!selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                    plan.isPopular
                      ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/10 scale-[1.02]'
                      : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-zinc-100">{plan.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{plan.tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 my-4 pb-4 border-b border-zinc-800">
                      <span className="text-4xl font-black text-amber-300">{plan.priceEGP}</span>
                      <span className="text-sm font-bold text-zinc-300">ج.م</span>
                      <span className="text-xs text-zinc-500 font-medium">/ {plan.billingPeriod}</span>
                    </div>

                    {/* Weekly Exam Limit Pill */}
                    <div className="mb-5 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-amber-200 font-semibold flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        {plan.examsPerWeek === -1 ? (
                          <strong className="text-amber-400 font-bold">امتحانات غير محدودة طوال الأسبوع</strong>
                        ) : (
                          <>عدد <strong className="text-amber-400 font-bold">{plan.examsPerWeek} امتحان أسبوعياً</strong> (مجددة كل سبت)</>
                        )}
                      </span>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700 cursor-default"
                      >
                        باقتك الحالية المفعلة ✅
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiateSubscribe(plan)}
                        className={`w-full py-3 rounded-2xl text-xs font-black shadow-lg transition duration-200 flex items-center justify-center gap-2 ${
                          plan.isPopular
                            ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-110 active:scale-95 shadow-amber-500/20'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-zinc-700 active:scale-95'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>{plan.ctaText}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 2: PAYMENT & ACTIVATION VIEW */}
        {/* ----------------------------------------------------------------- */}
        {selectedPlan && (
          <div className="max-w-2xl mx-auto animate-in fade-in">
            <button
              onClick={() => setSelectedPlan(null)}
              className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:underline"
            >
              <span>← العودة لاختيار باقة أخرى</span>
            </button>

            {successMessage ? (
              <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-black text-emerald-300">{successMessage}</h3>
                <p className="text-xs text-zinc-300">
                  تم تفعيل الباقة وإضافة حصة الامتحانات الأسبوعية لحسابك بنجاح. يمكنك البدء بالحل الآن!
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                
                {/* Plan Summary Card */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block mb-1">الباقة المختارة:</span>
                    <h4 className="text-sm sm:text-base font-black text-zinc-100">{selectedPlan.name}</h4>
                    <span className="text-xs text-zinc-400">
                      {selectedPlan.examsPerWeek === -1 ? 'امتحانات غير محدودة' : `${selectedPlan.examsPerWeek} امتحان أسبوعياً`}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-amber-400">{selectedPlan.priceEGP} ج.م</span>
                    <span className="text-[10px] text-zinc-500 block">شامل التفعيل الفوري</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">
                    اختر وسيلة الدفع المناسبة لك في مصر:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vodafone')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'vodafone'
                          ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">📱</div>
                      <span>فودافون كاش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('instapay')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'instapay'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">⚡</div>
                      <span>انستاباي (InstaPay)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('fawry')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'fawry'
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">🏪</div>
                      <span>فوري (Fawry)</span>
                    </button>
                  </div>
                </div>

                {/* Payment Instructions Details */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <div className="text-xs font-bold text-zinc-200">
                    {paymentMethod === 'vodafone' && 'طريقة التحويل عبر محفظة فودافون كاش:'}
                    {paymentMethod === 'instapay' && 'طريقة التحويل الفوري عبر انستاباي (InstaPay):'}
                    {paymentMethod === 'fawry' && 'طريقة الدفع بكود فوري:'}
                  </div>

                  {paymentMethod === 'vodafone' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">رقم محفظة التحويل:</span>
                        <span className="font-mono text-base font-bold text-rose-400">01115491611</span>
                      </div>
                      <button
                        onClick={() => handleCopy('01115491611', 'رقم المحفظة')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'رقم المحفظة' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'instapay' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">عنوان الدفع اللحظي (IPA):</span>
                        <span className="font-mono text-base font-bold text-purple-400">arm.academy@instapay</span>
                      </div>
                      <button
                        onClick={() => handleCopy('arm.academy@instapay', 'انستاباي')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'انستاباي' ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'fawry' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">كود الخدمة عبر ماكينات فوري:</span>
                        <span className="font-mono text-base font-bold text-amber-400">78821 (المكتبة الرقمية)</span>
                      </div>
                      <button
                        onClick={() => handleCopy('78821', 'كود فوري')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'كود فوري' ? 'تم النسخ!' : 'نسخ الكود'}</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    قم بتحويل مبلغ <strong className="text-amber-300">{selectedPlan.priceEGP} جنيه مصري</strong>، ثم اكتب رقم الهاتف أو الرقم المرجعي للتحويل أدناه واضغط لتأكيد التفعيل الفوري.
                  </p>
                </div>

                {/* Verification Input */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      رقم الهاتف المحول منه / رقم عملية التحويل:
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="مثال: 01012345678 أو رقم إشعار التحويل"
                      className="w-full py-2.5 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Submit Confirmation Button */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>جاري التحقق وتفعيل الباقة...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد الاشتراك وتفعيل الباقة فوراً ({selectedPlan.priceEGP} ج.م)</span>
                    </>
                  )}
                </button>

                {/* Direct WhatsApp Assistance */}
                <div className="text-center pt-2 border-t border-zinc-800">
                  <a
                    href="https://wa.me/201115491611?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D9%81%D9%8A%20%D8%A8%D8%A7%D9%82%D8%A9%20%D8%A7%D9%84%D8%AA%D9%81%D9%88%D9%82"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>تحتاج مساعدة أو استفسار؟ تحدث معنا مباشرة على واتساب</span>
                  </a>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
