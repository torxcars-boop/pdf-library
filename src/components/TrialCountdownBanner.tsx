import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getTrialRemainingTime, TrialRemainingTime, DEVELOPER_WHATSAPP } from '../utils/subscriptionStore';
import { Clock, ShieldAlert, Sparkles, CreditCard, ChevronLeft, Lock, MessageCircle, AlertTriangle } from 'lucide-react';

interface TrialCountdownBannerProps {
  currentUser: User | null;
  onOpenSubscriptionModal: () => void;
  onOpenAuth?: () => void;
  variant?: 'top-bar' | 'card';
}

export const TrialCountdownBanner: React.FC<TrialCountdownBannerProps> = ({
  currentUser,
  onOpenSubscriptionModal,
  onOpenAuth,
  variant = 'top-bar'
}) => {
  // Visitor Mode: not logged in yet -> Show enticing 10-day free trial banner
  if (!currentUser) {
    if (variant === 'top-bar') {
      return (
        <div className="w-full bg-gradient-to-r from-amber-950 via-zinc-950 to-amber-950 text-white border-b border-amber-500/40 shadow-xl relative z-40 animate-in fade-in">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow">
                    فترة تجريبية مجانية (10 أيام كاملة) 🎁
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-zinc-200">
                    مناهج وامتحانات ونماذج إجابة الصف الثالث الثانوي المصري 2026
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
                  سجل حسابك كطالب الآن مجاناً واستمتع بـ 10 أيام تدريب واختبارات وتحميل كتب بدون أي مصاريف!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center flex-shrink-0">
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>سجل وابدأ الـ 10 أيام مجاناً ✨</span>
                </button>
              )}
              <button
                onClick={onOpenSubscriptionModal}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>باقات الاشتراك (من 50 ج.م)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  // Only show for students who are on trial or expired (skip for active paid plans, admins)
  const isPaidActive = currentUser?.subscription?.status === 'active' && 
                       !currentUser?.subscription?.isTrial && 
                       currentUser?.subscription?.planId !== 'free_trial';

  if (currentUser.role === 'admin' || isPaidActive) {
    return null;
  }

  const [remaining, setRemaining] = useState<TrialRemainingTime>(() => 
    getTrialRemainingTime(currentUser?.subscription)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getTrialRemainingTime(currentUser?.subscription));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser?.subscription]);

  const isExpired = remaining.isExpired;
  const isUrgent = !isExpired && remaining.days < 2;

  // WhatsApp link for developer
  const whatsappUrl = `https://wa.me/${DEVELOPER_WHATSAPP}?text=${encodeURIComponent(
    `السلام عليكم ورحمة الله، أنا الطالب: ${currentUser?.name || ''} (${currentUser?.email || ''})، وأرغب في تفعيل باقة الاشتراك الشهري لمنصة المناهج والامتحانات.`
  )}`;

  // -------------------------------------------------------------------------
  // 1. TOP BAR VARIANT (Sticky/Prominent across views)
  // -------------------------------------------------------------------------
  if (variant === 'top-bar') {
    if (isExpired) {
      return (
        <div className="w-full bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-white border-b-2 border-red-500 shadow-2xl relative z-40 animate-in fade-in">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
            
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-red-600/40 border border-red-400 flex items-center justify-center flex-shrink-0 animate-pulse">
                <Lock className="w-5 h-5 text-red-200" />
              </span>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-black uppercase tracking-wider">
                    انتهت الفترة التجريبية 🔒
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-red-100">
                    تم إيقاف المميزات مؤقتاً (الامتحانات، تحميل PDF، ومعلم النطق AI)
                  </span>
                </div>
                <p className="text-[11px] text-red-200/90 mt-0.5">
                  لقد استنفدت الـ 10 أيام التجريبية المجانية. اشترك في الباقة الشهرية (تبدأ من 50 ج.م فقط) لاستئناف دراستك فوراً!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center flex-shrink-0">
              <button
                onClick={onOpenSubscriptionModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 animate-bounce"
              >
                <Sparkles className="w-4 h-4" />
                <span>تفعيل الباقة الشهرية الآن (من 50 ج.م)</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                title="تواصل مع المطور عبر واتساب"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">واتساب المطور</span>
              </a>
            </div>

          </div>
        </div>
      );
    }

    return (
      <div className={`w-full text-white border-b shadow-lg relative z-40 transition-colors ${
        isUrgent 
          ? 'bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 border-orange-500/60' 
          : 'bg-gradient-to-r from-zinc-950 via-amber-950/40 to-zinc-950 border-amber-500/40'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right">
          
          {/* Label & Description */}
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isUrgent ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isUrgent ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </span>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isUrgent ? 'bg-orange-500 text-zinc-950' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isUrgent ? 'تنبيه: اقترب انتهاء التجربة ⚠️' : 'فترة تجريبية مجانية (10 أيام) ✨'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-200">
                  جميع المناهج والامتحانات متاحة لك مجاناً
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
                بعد انتهاء العداد، يلزم الاشتراك في الباقة الشهرية (من 50 ج.م) لمتابعة تحميل الكتب وأداء الاختبارات.
              </p>
            </div>
          </div>

          {/* Live Digital Countdown Clock Boxes */}
          <div className="flex items-center gap-2 flex-wrap justify-center flex-shrink-0">
            <div className="flex items-center gap-1.5 font-mono text-xs direction-ltr" dir="ltr">
              {/* Days */}
              <div className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-center min-w-[42px] shadow">
                <span className="block text-sm font-black text-amber-300">{remaining.days}</span>
                <span className="block text-[9px] text-zinc-400 font-sans">يوم</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              {/* Hours */}
              <div className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2 py-1 text-center min-w-[38px] shadow">
                <span className="block text-sm font-black text-amber-300">{remaining.hours.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] text-zinc-400 font-sans">ساعة</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              {/* Minutes */}
              <div className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2 py-1 text-center min-w-[38px] shadow">
                <span className="block text-sm font-black text-amber-300">{remaining.minutes.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] text-zinc-400 font-sans">دقيقة</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              {/* Seconds */}
              <div className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2 py-1 text-center min-w-[38px] shadow">
                <span className="block text-sm font-black text-amber-400 animate-pulse">{remaining.seconds.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] text-zinc-400 font-sans">ثانية</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onOpenSubscriptionModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>ترقية الباقة (50 ج.م)</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. CARD VARIANT (Inside Student Dashboard)
  // -------------------------------------------------------------------------
  return (
    <div className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
      isExpired 
        ? 'bg-gradient-to-br from-rose-950/80 via-zinc-900 to-red-950/60 border-red-500/60' 
        : isUrgent
        ? 'bg-gradient-to-br from-orange-950/70 via-zinc-900 to-amber-950/60 border-orange-500/60'
        : 'bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-500/30'
    }`}>
      <div className="relative z-10 space-y-4">
        
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
              isExpired ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isExpired ? '🔒' : '⏳'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-100">
                  {isExpired 
                    ? 'انتهت الفترة التجريبية المجانية (10 أيام)' 
                    : 'العد التنازلي للفترة التجريبية المجانية (10 أيام كاملة)'}
                </h3>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  isExpired 
                    ? 'bg-red-500 text-white' 
                    : isUrgent 
                    ? 'bg-orange-500 text-zinc-950' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isExpired ? 'المميزات مقفلة ⛔' : isUrgent ? 'أوشكت على الانتهاء ⚠️' : 'نشطة ومجانية ✅'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isExpired
                  ? 'تم إيقاف إجراء الاختبارات وتحميل المناهج الدراسية لحين الاشتراك في الباقة الشهرية.'
                  : 'يمكنك تجربة جميع الامتحانات وتحميل المذكرات مجاناً طوال مدة الـ 10 أيام.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSubscriptionModal}
              className={`px-4 py-2 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 active:scale-95 ${
                isExpired
                  ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white hover:brightness-110 animate-bounce'
                  : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-110'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{isExpired ? 'اشترك الآن لتفعيل الحساب (من 50 ج.م)' : 'ترقية الباقة الشهرية'}</span>
            </button>
          </div>
        </div>

        {/* Digital Countdown Timer Display */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
          <div className="text-right w-full md:w-auto">
            <span className="text-xs text-zinc-400 block font-semibold mb-1">
              الوقت المتبقي بدقة متناهية (ثانية بثانية):
            </span>
            <div className="flex items-center gap-2 font-mono text-center direction-ltr" dir="ltr">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-amber-300">{remaining.days}</span>
                <span className="block text-[10px] text-zinc-400 font-sans font-bold">أيام</span>
              </div>
              <span className="text-amber-500 font-black text-xl">:</span>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-amber-300">{remaining.hours.toString().padStart(2, '0')}</span>
                <span className="block text-[10px] text-zinc-400 font-sans font-bold">ساعات</span>
              </div>
              <span className="text-amber-500 font-black text-xl">:</span>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-amber-300">{remaining.minutes.toString().padStart(2, '0')}</span>
                <span className="block text-[10px] text-zinc-400 font-sans font-bold">دقائق</span>
              </div>
              <span className="text-amber-500 font-black text-xl">:</span>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-amber-400 animate-pulse">{remaining.seconds.toString().padStart(2, '0')}</span>
                <span className="block text-[10px] text-zinc-400 font-sans font-bold">ثواني</span>
              </div>
            </div>
          </div>

          {/* 10-day Progress Bar & WhatsApp Contact */}
          <div className="w-full md:flex-1 md:max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">نسبة استهلاك الـ 10 أيام:</span>
              <span className="font-bold text-amber-300 font-mono">{remaining.percentElapsed}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isExpired 
                    ? 'bg-red-500' 
                    : isUrgent 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300'
                }`}
                style={{ width: `${Math.min(100, remaining.percentElapsed)}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">بداية التجربة: اليوم 1</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>إبلاغ المطور بالدفع (+201092467818)</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
