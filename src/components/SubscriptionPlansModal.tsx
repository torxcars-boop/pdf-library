import React, { useState, useEffect } from 'react';
import { User, SubscriptionPlan, UserSubscription } from '../types';
import { 
  Check, 
  Heart, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ArrowRight,
  Copy,
  Upload,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  PAYMENT_ACCOUNTS, 
  DEVELOPER_WHATSAPP, 
  getAdminPlansConfig, 
  submitPaymentRequest,
  saveStudentSubscription 
} from '../utils/subscriptionStore';
import { saveRegisteredStudent } from '../utils/studentUserStore';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSubscriptionUpdated: (subscription: UserSubscription) => void;
}

const SUPPORT_AMOUNTS = [25, 50, 100, 200];

const compressReceiptFile = (file: File, maxDim = 500, quality = 0.65): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => resolve(readerEvent.target?.result as string);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onSubscriptionUpdated
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(getAdminPlansConfig);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [supportAmount, setSupportAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone' | 'etisalat' | 'instapay'>('vodafone');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlans(getAdminPlansConfig());
      setPaymentError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleInitiateSupport = (plan: SubscriptionPlan) => {
    if (!currentUser) {
      onClose();
      onOpenAuth();
      return;
    }
    setSupportAmount(plan.priceEGP || 50);
    setSelectedPlan(plan);
    setSuccessMessage(null);
    setPaymentError(null);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      try {
        const compressedBase64 = await compressReceiptFile(file, 500, 0.65);
        setReceiptImage(compressedBase64);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = () => setReceiptImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const getWhatsAppNotifyUrl = (plan: SubscriptionPlan) => {
    const studentInfo = currentUser 
      ? `الطالب: ${currentUser.name} (${currentUser.email})`
      : 'طالب داعم للمنصة';
    
    const paymentName = paymentMethod === 'vodafone' 
      ? 'فودافون كاش' 
      : paymentMethod === 'etisalat' 
      ? 'اتصالات كاش' 
      : 'انستاباي';

    const text = `مرحباً يا بشمهندس، أرسل لك إشعار مساهمة لدعم استمرار المنصة المجانية:
❤️ المساهمة: ${plan.name} (${supportAmount} ج.م)
👤 ${studentInfo}
💳 وسيلة التحويل: ${paymentName}
📱 رقم الهاتف المحول منه: ${senderPhone || 'مرفق'}
🔢 كود التحويل / المرجع: ${transactionRef || 'تم الإرسال'}
شكراً لجهودكم في إبقاء المنصة مجانية للجميع!`;

    return `https://wa.me/${DEVELOPER_WHATSAPP}?text=${encodeURIComponent(text)}`;
  };

  const handleConfirmSupport = () => {
    if (!selectedPlan || !currentUser) return;

    setPaymentError(null);

    if (!senderPhone.trim()) {
      setPaymentError('يرجى إدخال رقم الهاتف المحول منه لتوثيق مساهمتك ومنحك شارة داعم للمنصة ❤️');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const now = new Date();
        const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        const supporterBadge: UserSubscription = {
          planId: selectedPlan.id,
          planName: 'داعم للمنصة المجانية ❤️',
          status: 'active',
          billingPeriod: 'monthly',
          examsRemainingThisWeek: -1,
          maxExamsPerWeek: -1,
          startDate: now.toISOString(),
          endDate: expiry.toISOString(),
          isTrial: false,
          pricePaid: supportAmount,
          paymentMethod: paymentMethod === 'vodafone' ? 'فودافون كاش' : paymentMethod === 'etisalat' ? 'اتصالات كاش' : 'انستاباي',
          paymentSenderPhone: senderPhone.trim(),
          transactionRef: transactionRef.trim() || undefined,
          approvedByAdmin: true
        };

        submitPaymentRequest({
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          planId: selectedPlan.id,
          planName: `دعم المنصة المجانية (${supportAmount} ج.م)`,
          amountEGP: supportAmount,
          paymentMethod,
          senderPhone: senderPhone.trim(),
          transactionRef: transactionRef.trim(),
          receiptImage: receiptImage || undefined,
          notes: `مساهمة تطوعية لدعم المنصة من ${currentUser.name}`
        });

        saveStudentSubscription(currentUser.id, supporterBadge);
        saveRegisteredStudent({
          ...currentUser,
          subscription: supporterBadge
        });
        
        onSubscriptionUpdated(supporterBadge);
        setIsProcessing(false);
        setSuccessMessage(`شكراً من القلب يا ${currentUser.name}! تم تسجيل دعمك للمنصة بنجاح ❤️`);

        setTimeout(() => {
          setSelectedPlan(null);
          setSuccessMessage(null);
          setSenderPhone('');
          setTransactionRef('');
          setReceiptImage('');
          setReceiptFileName('');
          onClose();
        }, 2500);
      } catch (err: any) {
        setIsProcessing(false);
        setSuccessMessage('تم تسجيل مساهمتك بنجاح! شكراً لدعمك استمرار المنصة المجانية ❤️');
        setTimeout(() => {
          setSelectedPlan(null);
          setSuccessMessage(null);
          onClose();
        }, 3000);
      }
    }, 500);
  };

  const isSupporter = Boolean(currentUser?.subscription?.approvedByAdmin || currentUser?.subscription?.pricePaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 dark:bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-4xl w-full p-5 sm:p-8 my-auto relative shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition border border-slate-200 dark:border-zinc-800"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black mb-3">
            <Sparkles className="w-4 h-4" />
            <span>منصة تعليمية مجانية 100% لجميع الطلاب</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 mb-2">
            ادعم استمرار وتطوير <span className="text-amber-600 dark:text-amber-400">المكتبة المجانية</span> ❤️
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            لا توجد أي اشتراكات إجبارية أو قيود على الكتب والامتحانات — كل شيء متاح مجاناً للجميع للأبد. دعمك الاختياري يساعدنا في تغطية تكاليف التشغيل وإضافة محتوى جديد باستمرار.
          </p>
        </div>

        {/* Free Forever Status Banner */}
        {currentUser && (
          <div className="mb-6 p-4 rounded-2xl border bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {isSupporter
                    ? 'أنت مسجل كـ "داعم للمنصة المجانية ❤️" — شكراً لعطائك الكريم!'
                    : 'حسابك يملك وصولاً مجانياً كاملاً 100% لجميع الكتب والامتحانات بلا حدود.'}
                </span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block mt-0.5">
                  حساب الطالب: {currentUser.name} ({currentUser.email})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: VOLUNTARY SUPPORT CARD */}
        {!selectedPlan && (
          <div className="max-w-xl mx-auto w-full">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-3xl p-6 sm:p-8 border bg-gradient-to-b from-amber-50/70 via-white to-slate-50 dark:from-zinc-900/90 dark:via-zinc-950 dark:to-zinc-950 border-amber-500/40 shadow-xl flex flex-col justify-between relative"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 fill-current" />
                  </div>
                </div>

                {/* Free Guarantee Highlight */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 mb-5 text-center shadow-sm">
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      كل شيء مجاني 100%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1.5">
                    يمكنك المساهمة طوعياً بأي مبلغ (مثل <strong className="text-amber-700 dark:text-amber-300 font-mono">50 ج.م</strong> أو أكثر) لدعم استمرار المشروع
                  </p>
                </div>

                {/* Why support / What remains free */}
                <ul className="space-y-2.5 mb-6 text-xs text-zinc-700 dark:text-zinc-300">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <button
                    onClick={() => handleInitiateSupport(plan)}
                    className="w-full py-3.5 rounded-2xl text-xs font-black shadow-lg transition duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-110 active:scale-95 shadow-amber-500/20"
                  >
                    <Heart className="w-4 h-4" />
                    <span>ساهم الآن في دعم المنصة (اختياري)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 2: VOLUNTARY SUPPORT TRANSFER & OPTIONAL RECEIPT */}
        {selectedPlan && (
          <div className="max-w-2xl mx-auto animate-in fade-in">
            <button
              onClick={() => {
                setSelectedPlan(null);
                setPaymentError(null);
              }}
              className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
            >
              <span>← العودة لصفحة الدعم</span>
            </button>

            {successMessage ? (
              <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/40 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <Heart className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300">{successMessage}</h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  مساهمتك تساعد في استمرار المكتبة مجانية لجميع الطلاب. تم منحك شارة داعم للمنصة ❤️.
                </p>
                <div className="pt-2">
                  <a
                    href={getWhatsAppNotifyUrl(selectedPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white dark:text-zinc-950 font-bold text-xs shadow-md transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال رسالة شكر وإيصال عبر واتساب</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                
                {/* Support Amount Selector */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mb-0.5">قيمة الدعم الاختياري:</span>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">اختر مبلغ المساهمة المناسب لك</h4>
                    </div>
                    <span className="text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {supportAmount} ج.م
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {SUPPORT_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSupportAmount(amt)}
                        className={`py-2 rounded-xl text-xs font-black font-mono border transition ${
                          supportAmount === amt
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-amber-500/40'
                        }`}
                      >
                        {amt} ج.م
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-300 mb-2">
                    اختر وسيلة التحويل لدعم المنصة:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vodafone')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'vodafone'
                          ? 'bg-rose-500/15 dark:bg-rose-600/20 border-rose-500 text-rose-700 dark:text-rose-300 shadow-md ring-1 ring-rose-500'
                          : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.vodafone.icon}</div>
                      <span>فودافون كاش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('etisalat')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'etisalat'
                          ? 'bg-emerald-500/15 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.etisalat.icon}</div>
                      <span>اتصالات كاش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('instapay')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition text-center ${
                        paymentMethod === 'instapay'
                          ? 'bg-purple-500/15 dark:bg-purple-600/20 border-purple-500 text-purple-700 dark:text-purple-300 shadow-md ring-1 ring-purple-500'
                          : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm mb-1">{PAYMENT_ACCOUNTS.instapay.icon}</div>
                      <span>انستاباي</span>
                    </button>
                  </div>
                </div>

                {/* Account Copy Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {paymentMethod === 'vodafone' && 'بيانات التحويل عبر فودافون كاش:'}
                    {paymentMethod === 'etisalat' && 'بيانات التحويل عبر اتصالات كاش:'}
                    {paymentMethod === 'instapay' && 'بيانات التحويل الفوري عبر انستاباي (InstaPay):'}
                  </div>

                  {paymentMethod === 'vodafone' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">رقم المحفظة:</span>
                        <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">{PAYMENT_ACCOUNTS.vodafone.number}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.vodafone.cleanNumber, 'فودافون')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'فودافون' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'etisalat' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">رقم المحفظة:</span>
                        <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">{PAYMENT_ACCOUNTS.etisalat.number}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.etisalat.cleanNumber, 'اتصالات')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'اتصالات' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'instapay' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">عنوان الدفع اللحظي (IPA):</span>
                        <span className="font-mono text-base font-bold text-purple-600 dark:text-purple-400">{PAYMENT_ACCOUNTS.instapay.address}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_ACCOUNTS.instapay.address, 'انستاباي')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'انستاباي' ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    بعد تحويل مبلغ الدعم (<strong className="text-amber-700 dark:text-amber-300">{supportAmount} ج.م</strong>)، أدخل رقمك لتسجيل المساهمة في لوحة الداعمين.
                  </p>
                </div>

                {/* Verification Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-300 mb-1">
                      رقم الهاتف المحول منه <span className="text-rose-500 dark:text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => {
                        setSenderPhone(e.target.value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="مثال: 01092467818"
                      className={`w-full py-2.5 px-3.5 bg-white dark:bg-zinc-950 border rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-mono ${
                        paymentError && !senderPhone.trim() ? 'border-rose-500 ring-1 ring-rose-500/40' : 'border-slate-300 dark:border-zinc-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-300 mb-1">
                      رقم المرجع / ملاحظة (اختياري):
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="رقم العملية أو كلمة تشجيعية"
                      className="w-full py-2.5 px-3.5 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Receipt Upload */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                    <span>إرفاق صورة إيصال التحويل (اختياري):</span>
                  </label>

                  {receiptImage ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-amber-500/40">
                      <img 
                        src={receiptImage} 
                        alt="إيصال التحويل" 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-zinc-700" 
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">تم إرفاق صورة الإيصال بنجاح ✓</span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate max-w-xs">{receiptFileName || 'receipt.jpg'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage('');
                          setReceiptFileName('');
                        }}
                        className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        حذف ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-amber-500/60 bg-slate-50 dark:bg-zinc-900/60 cursor-pointer transition group">
                      <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 mb-1 transition" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        اضغط لرفع صورة إشعار التحويل (اختياري)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Developer WhatsApp */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                        إرسال إشعار الدعم عبر واتساب للمطور:
                      </span>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                        {PAYMENT_ACCOUNTS.vodafone.number}
                      </span>
                    </div>
                  </div>

                  <a
                    href={getWhatsAppNotifyUrl(selectedPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:text-zinc-950 font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>مراسلة عبر واتساب</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </a>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmSupport}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>جاري تسجيل دعمك للمنصة...</span>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      <span>تأكيد المساهمة لدعم المنصة ({supportAmount} ج.م) ❤️</span>
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
