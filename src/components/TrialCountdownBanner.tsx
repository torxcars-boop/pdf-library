import React from 'react';
import { User } from '../types';
import { Heart, Sparkles, CheckCircle2 } from 'lucide-react';

interface TrialCountdownBannerProps {
  currentUser: User | null;
  onOpenSubscriptionModal: () => void;
  onOpenAuth?: () => void;
  variant?: 'top-bar' | 'card';
}

export const TrialCountdownBanner: React.FC<TrialCountdownBannerProps> = ({
  currentUser,
  onOpenSubscriptionModal,
  variant = 'top-bar'
}) => {
  const isSupporter = Boolean(currentUser?.subscription?.approvedByAdmin || currentUser?.subscription?.pricePaid);

  if (variant === 'top-bar') {
    return (
      <div className="w-full bg-gradient-to-r from-amber-50/90 via-white to-emerald-50/60 dark:from-zinc-950 dark:via-zinc-900/95 dark:to-amber-950/30 text-zinc-900 dark:text-zinc-100 border-b border-amber-500/20 relative z-30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
              <CheckCircle2 className="w-3 h-3" />
              <span>مجانية 100%</span>
            </span>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              جميع الكتب والامتحانات والشروحات مجانية بالكامل لكل الطلاب دون أي اشتراكات إجبارية
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500 hover:text-zinc-950 text-amber-800 dark:text-amber-300 border border-amber-500/35 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{isSupporter ? 'أنت داعم للمنصة ❤️' : 'ادعم استمرار المنصة (اختياري)'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/60 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-emerald-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-3.5 text-right">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              {isSupporter ? 'شكراً لمساهمتك الكريمة في دعم المنصة ❤️' : 'منصة تعليمية مجانية 100% لجميع الطلاب'}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              وصول مجاني غير محدود
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            كل الكتب الدراسية، الامتحانات، ومعلم النطق بالذكاء الاصطناعي متاحة مجاناً للأبد. يمكنك دعم استمرار وتطوير المنصة اختيارياً.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSubscriptionModal}
        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 font-black text-xs shadow-md transition flex items-center gap-1.5 flex-shrink-0 active:scale-95"
      >
        <Heart className="w-4 h-4" />
        <span>{isSupporter ? 'تفاصيل دعم المنصة' : 'ساهم في دعم المنصة ❤️'}</span>
      </button>
    </div>
  );
};
