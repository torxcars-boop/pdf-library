import React from 'react';
import { Sparkles, Trophy, X, CheckCircle2, ArrowLeft } from 'lucide-react';
import { LevelUpEventDetail, STUDENT_LEVELS } from '../utils/gamificationStore';

interface LevelUpCelebrationModalProps {
  event: LevelUpEventDetail | null;
  studentName?: string;
  onClose: () => void;
  onNavigateToDashboard?: () => void;
}

export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  event,
  studentName,
  onClose,
  onNavigateToDashboard,
}) => {
  if (!event) return null;

  const { previousLevel, newLevel, xp, newlyUnlockedBadges, reason } = event;
  const nextLevel = STUDENT_LEVELS.find((l) => l.level === newLevel.level + 1) || null;
  const xpToNext = nextLevel ? Math.max(0, nextLevel.minXp - xp) : 0;

  const reasonText =
    reason === 'book'
      ? 'بفضل إنجازك في تحميل ودراسة الكتب الدراسية'
      : reason === 'exam'
      ? 'بفضل تفوقك واجتيازك للامتحانات بنجاح'
      : reason === 'focus'
      ? 'بفضل التزامك في جلسات التركيز والمذاكرة'
      : 'بفضل تقدمك الدراسي المستمر';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      onClick={onClose}
    >
      <div
        className="arm-level-modal-enter relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-amber-500/40 p-6 sm:p-8 shadow-2xl text-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft radiant backdrop accents */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-500/15 dark:bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Subtle animated geometric sparkles (compositor transform/opacity only) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <span className="arm-sparkle-particle absolute top-14 right-10 text-amber-500 text-sm" style={{ animationDelay: '0s' }}>✦</span>
          <span className="arm-sparkle-particle absolute top-20 left-12 text-emerald-500 text-xs" style={{ animationDelay: '0.55s' }}>★</span>
          <span className="arm-sparkle-particle absolute bottom-24 right-16 text-amber-400 text-xs" style={{ animationDelay: '1.1s' }}>✦</span>
          <span className="arm-sparkle-particle absolute bottom-20 left-16 text-cyan-500 text-sm" style={{ animationDelay: '1.6s' }}>★</span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="relative z-10 absolute top-5 left-5 p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-800 transition"
          aria-label="إغلاق رسالة الترحيب"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Crest & Rings */}
        <div className="relative z-10 flex flex-col items-center text-center pt-2">
          <div className="relative w-24 h-24 flex items-center justify-center mb-5">
            <div className="arm-ring-expand absolute inset-0 rounded-full border-2 border-amber-500/40" />
            <div
              className="arm-ring-expand absolute inset-1 rounded-full border border-amber-400/30"
              style={{ animationDelay: '0.9s' }}
            />
            <div
              className={`arm-crest-float relative w-20 h-20 rounded-3xl bg-gradient-to-br ${newLevel.accentGradient} flex items-center justify-center text-4xl shadow-xl shadow-amber-500/25 border-2 border-white/70 dark:border-zinc-900`}
            >
              <span>{newLevel.icon}</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 text-amber-800 dark:text-amber-300 text-xs font-bold mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="tabular-nums">
              ارتقيت من المستوى {previousLevel.level} إلى المستوى {newLevel.level}
            </span>
          </div>

          <h2
            id="level-up-title"
            className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 leading-tight mb-2"
          >
            أهلاً بك في مستوى <span className="text-amber-600 dark:text-amber-400">{newLevel.title}</span>!
          </h2>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md mb-1">
            {studentName ? `مبارك لك يا ${studentName}، ` : ''}
            {newLevel.welcomeMessage}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            {reasonText}
          </p>
        </div>

        {/* XP & Next Milestone Box */}
        <div className="relative z-10 mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>رصيد نقاط الخبرة الحالي:</span>
            </span>
            <span className="font-black font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {xp.toLocaleString('ar-EG')} XP
            </span>
          </div>

          {nextLevel ? (
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              المستوى القادم: <strong className="text-zinc-900 dark:text-zinc-200">{nextLevel.icon} {nextLevel.title}</strong> — يتبقى لك{' '}
              <strong className="font-mono tabular-nums text-amber-700 dark:text-amber-300">{xpToNext}</strong> نقطة خبرة.
            </p>
          ) : (
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              بلغت أعلى مرتبة أكاديمية في المنصة! استمر في التميز والإبداع.
            </p>
          )}
        </div>

        {/* Newly Unlocked Badges List (if any badges unlocked at the same time) */}
        {newlyUnlockedBadges && newlyUnlockedBadges.length > 0 && (
          <div className="relative z-10 mt-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2.5">
            <h3 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>شارات جديدة انضمت إلى سجل إنجازاتك:</span>
            </h3>
            <div className="space-y-2">
              {newlyUnlockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-emerald-500/20"
                >
                  <span className="text-xl flex-shrink-0">{badge.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{badge.title}</p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="relative z-10 mt-6 flex flex-col sm:flex-row gap-2.5">
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToDashboard();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>عرض شاراتي ومستواي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95"
          >
            متابعة رحلة التفوق 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
