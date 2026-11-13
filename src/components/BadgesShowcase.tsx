import React, { useState } from 'react';
import { Award, BookOpen, CheckCircle2, GraduationCap, Lock, Sparkles, Trophy } from 'lucide-react';
import { StudentStats } from '../types';
import { BADGE_DEFINITIONS, computeStudentLevel, STUDENT_LEVELS } from '../utils/gamificationStore';

interface BadgesShowcaseProps {
  stats: StudentStats;
  compact?: boolean;
}

type BadgeFilter = 'all' | 'unlocked' | 'books' | 'exams' | 'excellence';

export const BadgesShowcase: React.FC<BadgesShowcaseProps> = ({ stats, compact = false }) => {
  const [filter, setFilter] = useState<BadgeFilter>('all');

  const levelInfo = computeStudentLevel(stats);
  const achievementsMap = new Map((stats.achievements || []).map((a) => [a.id, a]));

  const mergedBadges = BADGE_DEFINITIONS.map((def) => {
    const saved = achievementsMap.get(def.id);
    const currentVal = Math.max(0, def.computeCurrent(stats));
    const progress = Math.min(100, Math.round((currentVal / def.target) * 100));
    const unlocked = currentVal >= def.target || Boolean(saved?.unlocked);
    return {
      ...def,
      currentVal: Math.min(def.target, currentVal),
      progress: unlocked ? 100 : progress,
      unlocked,
      unlockedAt: saved?.unlockedAt,
    };
  });

  const unlockedCount = mergedBadges.filter((b) => b.unlocked).length;

  const filteredBadges = mergedBadges.filter((badge) => {
    if (filter === 'unlocked') return badge.unlocked;
    if (filter === 'books') return badge.category === 'books';
    if (filter === 'exams') return badge.category === 'exams';
    if (filter === 'excellence') return badge.category === 'excellence';
    return true;
  });

  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-md dark:shadow-xl space-y-6 text-right">
      {/* Level & XP Progress Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-slate-50 dark:from-amber-950/35 dark:via-zinc-950/90 dark:to-zinc-900 border border-amber-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${levelInfo.current.accentGradient} flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 flex-shrink-0 border border-white/60 dark:border-zinc-800`}
            >
              <span>{levelInfo.current.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 px-2.5 py-0.5 rounded-lg tabular-nums">
                  المستوى {levelInfo.current.level} من {STUDENT_LEVELS.length}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {unlockedCount} / {mergedBadges.length} شارة مكتسبة
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {levelInfo.current.title}
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {levelInfo.current.subtitle}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 bg-white/80 dark:bg-zinc-900/90 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">مجموع نقاط الخبرة</span>
            <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {levelInfo.xp} XP
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {levelInfo.next ? (
                <span>
                  نحو المستوى {levelInfo.next.level}: <strong className="text-amber-700 dark:text-amber-300">{levelInfo.next.icon} {levelInfo.next.title}</strong>
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">وصلت إلى أعلى مستوى في المنصة</span>
              )}
            </span>
            <span className="font-mono font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {levelInfo.next ? `متبقي ${levelInfo.xpNeededForNext} XP` : '100% مكتمل'}
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-200 dark:bg-zinc-900 rounded-full overflow-hidden border border-slate-300/70 dark:border-zinc-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${levelInfo.current.accentGradient} transition-all duration-500`}
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>

          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            اكسب النقاط تلقائياً: <strong className="text-zinc-700 dark:text-zinc-300">+25 XP</strong> لكل كتاب تحمله،{' '}
            <strong className="text-zinc-700 dark:text-zinc-300">+55 XP</strong> عند اجتياز امتحان، و{' '}
            <strong className="text-zinc-700 dark:text-zinc-300">+1 XP</strong> لكل دقيقة تركيز.
          </p>
        </div>
      </div>

      {/* Section Title + Segmented Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              شارات وأوسمة الإنجاز الدراسي
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              تُفتح تلقائياً عند تحميل عدد محدد من الكتب أو اجتياز الامتحانات بنجاح
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-x-auto">
          {(
            [
              { id: 'all', label: `الكل (${mergedBadges.length})` },
              { id: 'unlocked', label: `مكتسبة (${unlockedCount})` },
              { id: 'books', label: 'الكتب' },
              { id: 'exams', label: 'الامتحانات' },
              { id: 'excellence', label: 'التميز' },
            ] as { id: BadgeFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-2">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto opacity-80" />
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            لا توجد شارات مكتسبة في هذا التصنيف بعد.
          </p>
          <p className="text-[11px] text-zinc-500">
            حمّل أول كتاب PDF أو اجتز أول امتحان بنجاح لفتح أول شارة لك تلقائياً!
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-3.5`}>
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                badge.unlocked
                  ? 'bg-amber-50/60 dark:bg-zinc-950/85 border-amber-500/45 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                    badge.unlocked
                      ? 'bg-white dark:bg-zinc-900 border-amber-500/40 shadow-sm'
                      : 'bg-slate-100 dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 grayscale opacity-60'
                  }`}
                >
                  <span>{badge.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                      {badge.title}
                    </h4>
                    {badge.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مفتوحة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-slate-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded-lg flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        <span>قيد التقدم</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Footer */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-zinc-800/70">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 font-semibold">
                    {badge.category === 'books' ? (
                      <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    ) : badge.category === 'exams' ? (
                      <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="tabular-nums">
                      {badge.currentVal} / {badge.target} {badge.unitLabel}
                    </span>
                  </span>

                  <span className="font-mono font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                    {badge.unlocked && badge.unlockedAt ? `حصلت عليها: ${badge.unlockedAt}` : `${badge.progress}%`}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.unlocked
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                        : 'bg-amber-500/70 dark:bg-amber-400/70'
                    }`}
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
