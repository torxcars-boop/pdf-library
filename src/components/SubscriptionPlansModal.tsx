import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  Upload,
  Image as ImageIcon,
  MessageCircle,
  Lock,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  PAYMENT_ACCOUNTS, 
  DEVELOPER_WHATSAPP, 
  getAdminPlansConfig, 
  submitPaymentRequest,
  saveStudentSubscription 
} from '../utils/subscriptionStore';

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>(getAdminPlansConfig);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone' | 'etisalat' | 'instapay'>('vodafone');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlans(getAdminPlansConfig());
    }
  }, [isOpen]);

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

  // Image Upload for Receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 5 ميجابايت.');
        return;
      }
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Build WhatsApp URL to notify developer
  const getWhatsAppNotifyUrl = (plan: SubscriptionPlan) => {
    const studentInfo = currentUser 
      ? `الطالب: ${currentUser.name} (${currentUser.email}) - ${currentUser.academicStage || 'ثانوية عامة'}`
      : 'طالب في المنصة';
    
    const paymentName = paymentMethod === 'vodafone' 
      ? 'فودافون كاش' 
      : paymentMethod === 'etisalat' 
      ? 'اتصالات كاش' 
      : 'انستاباي';

    const text = `مرحباً يا بشمهندس أحمد، أرسل لك إشعار تحويل للاشتراك في المنصة:
📌 الباقة: ${plan.name} (${plan.priceEGP} ج.م / شهرياً)
👤 ${studentInfo}
💳 وسيلة الدفع: ${paymentName}
📱 رقم الهاتف المحول منه: ${senderPhone || 'مرفق'}
🔢 كود التحويل / المرجع: ${transactionRef || 'تم الإرسال'}
يرجى تأكيد التفعيل لحسابي، شكراً جزيلاً!`;

    return `https://wa.me/${DEVELOPER_WHATSAPP}?text=${encodeURIComponent(text)}`;
  };

  const handleConfirmPayment = () => {
    if (!selectedPlan || !currentUser) return;

    if (!senderPhone.trim()) {
      alert('يرجى إدخال رقم الهاتف المحول منه أو رقم العملية للمراجعة والتفعيل.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days Monthly

      const newSubscription: UserSubscription = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        status: 'active',
        billingPeriod: 'monthly',
        examsRemainingThisWeek: selectedPlan.examsPerWeek === -1 ? 9999 : selectedPlan.examsPerWeek,
        maxExamsPerWeek: selectedPlan.examsPerWeek,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        isTrial: false,
        pricePaid: selectedPlan.priceEGP,
        paymentMethod: paymentMethod === 'vodafone' ? 'فودافون كاش' : paymentMethod === 'etisalat' ? 'اتصالات كاش' : 'انستاباي',
        paymentSenderPhone: senderPhone,
        transactionRef: transactionRef || undefined,
        receiptImage: receiptImage || undefined,
        approvedByAdmin: true
      };

      // 1. Submit payment request record for admin audit & approval tracking
      submitPaymentRequest({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amountEGP: selectedPlan.priceEGP,
        paymentMethod,
        senderPhone,
        transactionRef,
        receiptImage: receiptImage || undefined,
        notes: `تم التفعيل للطالب ${currentUser.name}`
      });

      // 2. Save into per-student subscription storage
      saveStudentSubscription(currentUser.id, newSubscription);
      
      onSubscriptionUpdated(newSubscription);
      setIsProcessing(false);
      setSuccessMessage(`تم تفعيل ${selectedPlan.name} بنجاح! مبروك يا ${currentUser.name} 🎉`);

      setTimeout(() => {
        setSelectedPlan(null);
        setSuccessMessage(null);
        onClose();
      }, 3000);
    }, 1000);
  };

  const activeSub = currentUser?.subscription;
  const isTrial = activeSub?.isTrial;
  const trialDaysLeft = activeSub?.trialDaysLeft ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-5xl w-full p-5 sm:p-8 my-auto relative shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition border border-zinc-800"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black mb-3">
            <Sparkles className="w-4 h-4" />
            <span>باقات الاشتراك الشهرية المعتمدة لطلاب الثانوية 2026</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 mb-2">
            اختر باقتك الشهرية وتدرب على نماذج الامتحانات الوزارية
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            الاشتراك شهري بالكامل ويشمل بنك الامتحانات الأسبوعي، مذكرات PDF الأصلية، والتدريب على النطق بالذكاء الاصطناعي.
          </p>
        </div>

        {/* 10-Day Free Trial Notice Banner */}
        {currentUser && (
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-right ${
            isTrial && trialDaysLeft > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : activeSub?.status === 'active' && !isTrial
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                {isTrial && trialDaysLeft > 0 ? (
                  <Clock className="w-4 h-4 text-amber-400" />
                ) : activeSub?.status === 'active' && !isTrial ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {isTrial && trialDaysLeft > 0 ? (
                    <>أنت حالياً في <strong className="text-amber-400">الفترة التجريبية المجانية (10 أيام)</strong> — متبقي لك: <span className="underline">{trialDaysLeft} أيام</span> (لك 2 امتحان أسبوعياً)</>
                  ) : activeSub?.status === 'active' && !isTrial ? (
                    <>باقتك الشهرية النشطة: <strong className="text-emerald-400">{activeSub.planName}</strong> (تنتهي في {new Date(activeSub.endDate).toLocaleDateString('ar-EG')})</>
                  ) : (
                    <>تنبيه: انتهت فترتك التجريبية المجانية (10 أيام). يرجى الاشتراك في إحدى الباقات الشهرية للاستمرار في الامتحانات.</>
                  )}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  حساب الطالب: {currentUser.name} ({currentUser.email})
                </span>
              </div>
            </div>

            <div className="shrink-0 text-xs font-bold">
              {isTrial && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  تجربة مجانية نشطة
                </span>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 1: PLANS DIRECTORY VIEW */}
        {/* ----------------------------------------------------------------- */}
        {!selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = activeSub?.status === 'active' && activeSub?.planId === plan.id;
              const isClosed = plan.isActive === false;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between relative ${
                    isCurrent
                      ? 'bg-zinc-900/90 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                      : plan.isPopular
                      ? 'bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 border-amber-500/50 shadow-2xl shadow-amber-500/10 scale-[1.02]'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[11px] font-black shadow-md bg-amber-500 text-zinc-950">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Header: Name & Tagline */}
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-zinc-100 mb-1 flex items-center justify-between">
                        <span>{plan.name}</span>
                        {plan.id === 'vip_200' && <Crown className="w-5 h-5 text-amber-400" />}
                        {plan.id === 'pro_100' && <Zap className="w-5 h-5 text-amber-400" />}
                        {plan.id === 'basic_50' && <GraduationCap className="w-5 h-5 text-blue-400" />}
                      </h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed min-h-[32px]">
                        {plan.tagline}
                      </p>
                    </div>

                    {/* Price Tag */}
                    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 mb-5 text-center">
                      <div className="flex items-baseline justify-center gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                          {plan.priceEGP}
                        </span>
                        <span className="text-xs font-bold text-zinc-300">جنيه مصري</span>
                        <span className="text-[10px] text-zinc-500">/ شهرياً</span>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {plan.examsPerWeek === -1 ? 'امتحانات غير محدودة أسبوعياً' : `${plan.examsPerWeek} امتحان أسبوعياً (${plan.examsPerWeek * 4} شهرياً)`}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
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
                        className="w-full py-3 rounded-2xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 cursor-default"
                      >
                        باقتك الحالية المفعلة ✅
                      </button>
                    ) : isClosed ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-2xl bg-zinc-800 text-zinc-500 text-xs font-bold border border-zinc-700 cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>مغلقة مؤقتاً للتسجيل</span>
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
        {/* STEP 2: PAYMENT, PROOF ATTACHMENT & WHATSAPP NOTIFICATION */}
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
                <p className="text-xs text-zinc-300 leading-relaxed">
                  تم حفظ إثبات التحويل وتفعيل الباقة الشهرية لحسابك بنجاح! تم تجديد حصتك الأسبوعية من الامتحانات لتتمكن من التدريب فوراً.
                </p>
                <div className="pt-2">
                  <a
                    href={getWhatsAppNotifyUrl(selectedPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs shadow-md transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال إشعار التفعيل للمطور عبر واتساب</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                
                {/* Plan Summary Card */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block mb-1">الباقة الشهرية المختارة:</span>
                    <h4 className="text-sm sm:text-base font-black text-zinc-100">{selectedPlan.name}</h4>
                    <span className="text-xs text-zinc-400">
                      {selectedPlan.examsPerWeek === -1 ? 'امتحانات غير محدودة طوال الشهر' : `${selectedPlan.examsPerWeek} امتحان أسبوعياً`}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-amber-400">{selectedPlan.priceEGP} ج.م</span>
                    <span className="text-[10px] text-zinc-500 block">اشتراك شهري كامل</span>
                  </div>
                </div>

                {/* Payment Method Selector (Vodafone Cash, Etisalat Cash, InstaPay) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">
                    اختر وسيلة الدفع والتحويل:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Vodafone Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vodafone')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'vodafone'
                          ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-md ring-1 ring-rose-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.vodafone.icon}</div>
                      <span>فودافون كاش</span>
                    </button>

                    {/* Etisalat Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('etisalat')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'etisalat'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.etisalat.icon}</div>
                      <span>اتصالات كاش</span>
                    </button>

                    {/* InstaPay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('instapay')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'instapay'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md ring-1 ring-purple-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.instapay.icon}</div>
                      <span>انستاباي</span>
                    </button>
                  </div>
                </div>

                {/* Payment Instructions Details */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <div className="text-xs font-bold text-zinc-200">
                    {paymentMethod === 'vodafone' && 'بيانات التحويل عبر فودافون كاش:'}
                    {paymentMethod === 'etisalat' && 'بيانات التحويل عبر اتصالات كاش:'}
                    {paymentMethod === 'instapay' && 'بيانات التحويل الفوري عبر انستاباي (InstaPay):'}
                  </div>

                  {/* Vodafone Box */}
                  {paymentMethod === 'vodafone' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">رقم المحفظة:</span>
                        <span className="font-mono text-base font-bold text-rose-400">{PAYMENT_ACCOUNTS.vodafone.number}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.vodafone.cleanNumber, 'فودافون')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'فودافون' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  )}

                  {/* Etisalat Box */}
                  {paymentMethod === 'etisalat' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">رقم المحفظة:</span>
                        <span className="font-mono text-base font-bold text-emerald-400">{PAYMENT_ACCOUNTS.etisalat.number}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.etisalat.cleanNumber, 'اتصالات')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'اتصالات' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  )}

                  {/* InstaPay Box */}
                  {paymentMethod === 'instapay' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">عنوان الدفع اللحظي (IPA):</span>
                        <span className="font-mono text-base font-bold text-purple-400">{PAYMENT_ACCOUNTS.instapay.address}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.instapay.address, 'انستاباي')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'انستاباي' ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    قم بتحويل مبلغ <strong className="text-amber-300">{selectedPlan.priceEGP} جنيه مصري</strong>، ثم أرفق إثبات التحويل أدناه واضغط لتأكيد التفعيل الفوري.
                  </p>
                </div>

                {/* Verification Fields: Sender Phone & Transaction Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      رقم الهاتف المحول منه <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="مثال: 01092467818"
                      className="w-full py-2.5 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      كود التحويل / الرقم المرجعي (اختياري):
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="رقم العملية في رسالة التحويل"
                      className="w-full py-2.5 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Proof Attachment (إرفاق إثبات التحويل / إيصال الدفع) */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <label className="block text-xs font-bold text-zinc-200 mb-2 flex items-center justify-between">
                    <span>إرفاق إثبات التحويل (لقطة شاشة أو إيصال الدفع):</span>
                    <span className="text-[11px] text-amber-400 font-normal">اختياري ومفضل للتأكيد السريع</span>
                  </label>

                  {receiptImage ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-amber-500/40">
                      <img 
                        src={receiptImage} 
                        alt="إيصال التحويل" 
                        className="w-16 h-16 object-cover rounded-lg border border-zinc-700" 
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-emerald-400 block">تم إرفاق صورة الإيصال بنجاح ✓</span>
                        <span className="text-[10px] text-zinc-400 block truncate max-w-xs">{receiptFileName || 'receipt_proof.jpg'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage('');
                          setReceiptFileName('');
                        }}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        حذف ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-700 hover:border-amber-500/60 bg-zinc-900/60 cursor-pointer transition group">
                      <Upload className="w-6 h-6 text-zinc-500 group-hover:text-amber-400 mb-1 transition" />
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-zinc-100">
                        اضغط لرفع لقطة شاشة لإشعار التحويل من هاتفك
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1">يدعم الصور JPG, PNG (حد أقصى 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Direct Contact With Developer Button (واتساب لإبلاغه وتفعيل الباقة) */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300 block">
                        إبلاغ المطور بالدفع وتأكيد التفعيل عبر واتساب:
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        تواصل مباشر مع البشمهندس على {PAYMENT_ACCOUNTS.vodafone.number}
                      </span>
                    </div>
                  </div>

                  <a
                    href={getWhatsAppNotifyUrl(selectedPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>مراسلة عبر واتساب</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </a>
                </div>

                {/* Submit Confirmation Button */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>جاري تسجيل إثبات الدفع وتفعيل الباقة...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد الاشتراك وتفعيل الباقة فوراً ({selectedPlan.priceEGP} ج.م)</span>
                    </>
                  )}
                </button>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
