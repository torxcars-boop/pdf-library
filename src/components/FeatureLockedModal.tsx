import React from 'react';
import { Lock, Sparkles, CreditCard, X, MessageCircle, CheckCircle } from 'lucide-react';
import { DEVELOPER_WHATSAPP } from '../utils/subscriptionStore';
import { User } from '../types';

interface FeatureLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscriptionModal: () => void;
  featureName?: string;
  currentUser: User | null;
}

export const FeatureLockedModal: React.FC<FeatureLockedModalProps> = ({
  isOpen,
  onClose,
  onOpenSubscriptionModal,
  featureName = 'هذه الميزة التعليمية',
  currentUser
}) => {
  if (!isOpen) return null;

  const whatsappUrl = `https://wa.me/${DEVELOPER_WHATSAPP}?text=${encodeURIComponent(
    `السلام عليكم، أنا الطالب ${currentUser?.name || ''} (${currentUser?.email || ''})، انتهت فترتي التجريبية وأرغب في الاشتراك وتفعيل الباقة الشهرية.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-right overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4 text-red-400 shadow-xl shadow-red-500/20">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black inline-block">
            انتهت الفترة التجريبية المجانية (10 أيام) 🔒
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
            تم إيقاف {featureName} مؤقتاً
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            لقد انتهت فترة الـ 10 أيام التجريبية المجانية الممنوحة لحسابك. للاستمرار في إجراء الاختبارات وتحميل المناهج بصيغة PDF واستخدام معلم النطق بالذكاء الاصطناعي، يرجى الاشتراك في إحدى باقاتنا الشهرية المرنة.
          </p>
        </div>

        {/* Price Highlight Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-zinc-950/80 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">الاشتراك الشهري يبدأ من:</span>
            <span className="text-base font-black text-amber-400 font-mono">50 ج.م / شهرياً فقط</span>
          </div>
          <div className="text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>امتحانات إلكترونية أسبوعية وشهرية مع التصحيح الفوري النموذجي</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>تحميل وقراءة جميع مذكرات وكتب الثانوية العامة والشهادة الإعدادية PDF</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>طرق دفع سهلة: فودافون كاش، اتصالات كاش، وتطبيق انستاباي اللحظي</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              onClose();
              onOpenSubscriptionModal();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:brightness-110 active:scale-95 text-zinc-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>عرض الباقات وتفعيل الاشتراك الآن (من 50 ج.م)</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-zinc-800 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل مع المطور عبر واتساب لتفعيل الحساب (+201092467818)</span>
          </a>
        </div>

      </div>
    </div>
  );
};
