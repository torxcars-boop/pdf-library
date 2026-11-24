import { StudentAchievement, StudentStats } from '../types';

export interface StudentLevelDef {
  level: number;
  title: string;
  subtitle: string;
  minXp: number;
  maxXp: number | null; // null for highest level
  icon: string;
  welcomeMessage: string;
  accentGradient: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'books' | 'exams' | 'excellence';
  target: number;
  unitLabel: string;
  computeCurrent: (stats: StudentStats) => number;
}

export interface ComputedStudentLevel {
  xp: number;
  current: StudentLevelDef;
  next: StudentLevelDef | null;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export interface LevelUpEventDetail {
  previousLevel: StudentLevelDef;
  newLevel: StudentLevelDef;
  xp: number;
  newlyUnlockedBadges: StudentAchievement[];
  reason: 'book' | 'exam' | 'focus' | 'progress';
}

export const LEVEL_UP_EVENT = 'arm_level_up';
export const BADGE_UNLOCKED_EVENT = 'arm_badge_unlocked';

export const STUDENT_LEVELS: StudentLevelDef[] = [
  {
    level: 1,
    title: 'طالب مبتدئ',
    subtitle: 'بداية رحلة التفوق في المكتبة الرقمية',
    minXp: 0,
    maxXp: 50,
    icon: '🌱',
    welcomeMessage: 'أهلاً بك في بداية مشوارك التعليمي! حمّل أول كتاب أو خض أول امتحان للانطلاق للمستوى التالي.',
    accentGradient: 'from-emerald-500 to-teal-400',
  },
  {
    level: 2,
    title: 'قارئ نشيط',
    subtitle: 'خطوات واثقة مع المناهج والمراجعة',
    minXp: 50,
    maxXp: 150,
    icon: '📖',
    welcomeMessage: 'أحسنت! وصلت إلى مستوى قارئ نشيط بفضل اجتهادك في الكتب والاختبارات. واصل التقدم!',
    accentGradient: 'from-sky-500 to-cyan-400',
  },
  {
    level: 3,
    title: 'باحث مجتهد',
    subtitle: 'تراكم معرفي حقيقي وحل مستمر للنماذج',
    minXp: 150,
    maxXp: 300,
    icon: '🔍',
    welcomeMessage: 'تألق مستمر! أصبحت الآن في مستوى باحث مجتهد — خطواتك المتواصلة تصنع الفارق في تحصيلك.',
    accentGradient: 'from-indigo-500 to-blue-400',
  },
  {
    level: 4,
    title: 'متفوق أكاديمياً',
    subtitle: 'إتقان واضح في الامتحانات والكتب الدراسية',
    minXp: 300,
    maxXp: 500,
    icon: '⭐',
    welcomeMessage: 'مبارك وصولك لمستوى متفوق أكاديمياً! أداؤك المميز في القراءة واجتياز الاختبارات يضعك في المقدمة.',
    accentGradient: 'from-amber-500 to-yellow-400',
  },
  {
    level: 5,
    title: 'بطل الامتحانات',
    subtitle: 'ثبات وقوة في اجتياز أصعب النماذج الوزارية',
    minXp: 500,
    maxXp: 800,
    icon: '🏅',
    welcomeMessage: 'إنجاز رائع! أهلاً بك في مستوى بطل الامتحانات — عزيمتك العالية تقربك من القمة.',
    accentGradient: 'from-orange-500 to-amber-400',
  },
  {
    level: 6,
    title: 'نجم الأوائل',
    subtitle: 'ضمن نخبة الطلاب الأكثر التزاماً وتفوقاً',
    minXp: 800,
    maxXp: 1200,
    icon: '🌟',
    welcomeMessage: 'مستوى استثنائي! وصلت إلى مرتبة نجم الأوائل بجدارة واستحقاق، فخورون بمثابرتك!',
    accentGradient: 'from-amber-600 via-amber-500 to-yellow-300',
  },
  {
    level: 7,
    title: 'سفير التفوق',
    subtitle: 'أعلى وسام ومرتبة أكاديمية في المنصة',
    minXp: 1200,
    maxXp: null,
    icon: '👑',
    welcomeMessage: 'تهانينا الكبرى! توّجت الآن بلقب سفير التفوق — قمة الإنجاز والالتزام في المكتبة الرقمية!',
    accentGradient: 'from-amber-500 via-yellow-400 to-emerald-400',
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'badge-book-1',
    title: 'القارئ الأول',
    description: 'أنجزت تحميل ومطالعة أول كتاب دراسي PDF.',
    icon: '📘',
    category: 'books',
    target: 1,
    unitLabel: 'كتاب',
    computeCurrent: (stats) => Math.max(stats.downloadedBooksCount || 0, stats.booksReadCount || 0),
  },
  {
    id: 'badge-book-3',
    title: 'عاشق المعرفة',
    description: 'أنجزت تحميل ودراسة 3 كتب ومذكرات دراسية.',
    icon: '📚',
    category: 'books',
    target: 3,
    unitLabel: 'كتب',
    computeCurrent: (stats) => Math.max(stats.downloadedBooksCount || 0, stats.booksReadCount || 0),
  },
  {
    id: 'badge-book-5',
    title: 'رفيق المكتبة',
    description: 'أنجزت تحميل 5 كتب ومراجع تعليمية معتمدة.',
    icon: '🏛️',
    category: 'books',
    target: 5,
    unitLabel: 'كتب',
    computeCurrent: (stats) => Math.max(stats.downloadedBooksCount || 0, stats.booksReadCount || 0),
  },
  {
    id: 'badge-book-10',
    title: 'عميد القراءة',
    description: 'إنجاز قياسي بتحميل ومراجعة 10 كتب دراسية كاملة.',
    icon: '👑',
    category: 'books',
    target: 10,
    unitLabel: 'كتب',
    computeCurrent: (stats) => Math.max(stats.downloadedBooksCount || 0, stats.booksReadCount || 0),
  },
  {
    id: 'badge-exam-pass-1',
    title: 'بداية النجاح',
    description: 'اجتزت أول امتحان إلكتروني بنجاح واستحقاق.',
    icon: '🎯',
    category: 'exams',
    target: 1,
    unitLabel: 'امتحان ناجح',
    computeCurrent: (stats) => stats.passedExams || 0,
  },
  {
    id: 'badge-exam-pass-3',
    title: 'نجم الاختبارات',
    description: 'اجتزت 3 امتحانات ونماذج وزارية بنجاح.',
    icon: '🏅',
    category: 'exams',
    target: 3,
    unitLabel: 'امتحانات ناجحة',
    computeCurrent: (stats) => stats.passedExams || 0,
  },
  {
    id: 'badge-exam-pass-5',
    title: 'قاهر الامتحانات',
    description: 'اجتزت 5 امتحانات بنجاح وأثبت جدارتك في المنهج.',
    icon: '🏆',
    category: 'exams',
    target: 5,
    unitLabel: 'امتحانات ناجحة',
    computeCurrent: (stats) => stats.passedExams || 0,
  },
  {
    id: 'badge-exam-excellence',
    title: 'وسام الامتياز 90%+',
    description: 'حققت 90% فأعلى في أحد الامتحانات بنجاح باهر.',
    icon: '💎',
    category: 'excellence',
    target: 1,
    unitLabel: 'امتحان امتياز',
    computeCurrent: (stats) =>
      (stats.recentExams || []).some((e) => e.passed && e.percentage >= 90) ? 1 : 0,
  },
  {
    id: 'badge-focus-streak',
    title: 'مثابر التركيز',
    description: 'أكملت 25 دقيقة مذاكرة مركزة أو 3 أيام التزام متتالية.',
    icon: '🔥',
    category: 'excellence',
    target: 25,
    unitLabel: 'دقيقة تركيز',
    computeCurrent: (stats) => {
      if ((stats.streakDays || 0) >= 3) return 25;
      return stats.totalStudyMinutes || 0;
    },
  },
];

export const getDefaultBadgesList = (): StudentAchievement[] =>
  BADGE_DEFINITIONS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    unlocked: false,
    progress: 0,
  }));

/**
 * Pure XP calculation from genuine student milestones:
 * - +25 XP per unique downloaded book
 * - +40 XP per passed exam
 * - +15 XP per attempted exam
 * - +15 XP bonus per high-score exam (>= 85%)
 * - +1 XP per study focus minute
 */
export const calculateStudentXp = (stats: StudentStats): number => {
  const booksCount = Math.max(stats.downloadedBooksCount || 0, stats.booksReadCount || 0);
  const passedCount = stats.passedExams || 0;
  const totalExams = stats.totalExamsTaken || 0;
  const highScoreCount = (stats.recentExams || []).filter((e) => e.passed && e.percentage >= 85).length;
  const studyMinutes = stats.totalStudyMinutes || 0;

  return (
    booksCount * 25 +
    passedCount * 40 +
    totalExams * 15 +
    highScoreCount * 15 +
    studyMinutes
  );
};

export const computeStudentLevel = (stats: StudentStats): ComputedStudentLevel => {
  const xp = calculateStudentXp(stats);
  let current = STUDENT_LEVELS[0];

  for (const lvl of STUDENT_LEVELS) {
    if (xp >= lvl.minXp) {
      current = lvl;
    }
  }

  const next = STUDENT_LEVELS.find((l) => l.level === current.level + 1) || null;
  if (!next) {
    return {
      xp,
      current,
      next: null,
      xpIntoLevel: xp - current.minXp,
      xpNeededForNext: 0,
      progressPercent: 100,
    };
  }

  const span = Math.max(1, next.minXp - current.minXp);
  const xpIntoLevel = Math.max(0, xp - current.minXp);
  const xpNeededForNext = Math.max(0, next.minXp - xp);
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / span) * 100));

  return {
    xp,
    current,
    next,
    xpIntoLevel,
    xpNeededForNext,
    progressPercent,
  };
};

const getBadgeTimestampsKey = (userId?: string) =>
  userId ? `arm_unlocked_badges_${userId}` : 'arm_unlocked_badges_guest';

const getLastSeenLevelKey = (userId?: string) =>
  userId ? `arm_student_level_${userId}` : 'arm_student_level_guest';

const getUnlockedTimestampsMap = (userId?: string): Record<string, string> => {
  try {
    const raw = localStorage.getItem(getBadgeTimestampsKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
};

const saveUnlockedTimestampsMap = (map: Record<string, string>, userId?: string) => {
  try {
    localStorage.setItem(getBadgeTimestampsKey(userId), JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const syncAchievementsWithStats = (
  stats: StudentStats,
  userId?: string
): { achievements: StudentAchievement[]; newlyUnlocked: StudentAchievement[] } => {
  const timestamps = getUnlockedTimestampsMap(userId);
  const existingMap = new Map((stats.achievements || []).map((a) => [a.id, a]));
  const newlyUnlocked: StudentAchievement[] = [];
  let changed = false;

  const achievements: StudentAchievement[] = BADGE_DEFINITIONS.map((def) => {
    const current = Math.max(0, def.computeCurrent(stats));
    const progress = Math.min(100, Math.round((current / def.target) * 100));
    const isUnlocked = current >= def.target;

    const prevAch = existingMap.get(def.id);
    let unlockedAt = timestamps[def.id] || prevAch?.unlockedAt;

    if (isUnlocked && !unlockedAt) {
      unlockedAt = new Date().toLocaleDateString('ar-EG');
      timestamps[def.id] = unlockedAt;
      changed = true;
      if (prevAch && !prevAch.unlocked) {
        newlyUnlocked.push({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlocked: true,
          unlockedAt,
          progress: 100,
        });
      } else if (!prevAch) {
        newlyUnlocked.push({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlocked: true,
          unlockedAt,
          progress: 100,
        });
      }
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlocked: isUnlocked,
      unlockedAt: isUnlocked ? unlockedAt : undefined,
      progress,
    };
  });

  if (changed) {
    saveUnlockedTimestampsMap(timestamps, userId);
  }

  return { achievements, newlyUnlocked };
};

/**
 * Evaluates badges and student level after real activity (book download, exam submission, focus session).
 * - Initializes lastSeenLevel silently if it was never stored (never fires on initial load).
 * - If level increased compared to lastSeenLevel, persists new level and dispatches LEVEL_UP_EVENT.
 * - If only a badge unlocked (without leveling up), dispatches BADGE_UNLOCKED_EVENT.
 */
export const evaluateAndNotifyProgress = (
  stats: StudentStats,
  userId?: string,
  reason: 'book' | 'exam' | 'focus' | 'progress' = 'progress',
  allowNotify: boolean = true
): StudentStats => {
  const { achievements, newlyUnlocked } = syncAchievementsWithStats(stats, userId);
  const updatedStats: StudentStats = {
    ...stats,
    achievements,
  };

  const levelInfo = computeStudentLevel(updatedStats);
  const storageKey = getLastSeenLevelKey(userId);

  let previousLevelNum: number | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        previousLevelNum = parsed;
      }
    }
  } catch {
    // ignore
  }

  if (previousLevelNum === null) {
    // First-time baseline initialization — persist silently unless explicit activity pushed past level 1
    try {
      localStorage.setItem(storageKey, String(levelInfo.current.level));
    } catch {
      // ignore
    }
    if (allowNotify && levelInfo.current.level > 1) {
      const prevDef = STUDENT_LEVELS[0];
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<LevelUpEventDetail>(LEVEL_UP_EVENT, {
            detail: {
              previousLevel: prevDef,
              newLevel: levelInfo.current,
              xp: levelInfo.xp,
              newlyUnlockedBadges: newlyUnlocked,
              reason,
            },
          })
        );
      }
    } else if (allowNotify && newlyUnlocked.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<StudentAchievement[]>(BADGE_UNLOCKED_EVENT, { detail: newlyUnlocked })
      );
    }
    return updatedStats;
  }

  if (levelInfo.current.level > previousLevelNum) {
    const prevDef =
      STUDENT_LEVELS.find((l) => l.level === previousLevelNum) || STUDENT_LEVELS[0];
    try {
      localStorage.setItem(storageKey, String(levelInfo.current.level));
    } catch {
      // ignore
    }
    if (allowNotify && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<LevelUpEventDetail>(LEVEL_UP_EVENT, {
          detail: {
            previousLevel: prevDef,
            newLevel: levelInfo.current,
            xp: levelInfo.xp,
            newlyUnlockedBadges: newlyUnlocked,
            reason,
          },
        })
      );
    }
  } else if (allowNotify && newlyUnlocked.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<StudentAchievement[]>(BADGE_UNLOCKED_EVENT, { detail: newlyUnlocked })
    );
  }

  return updatedStats;
};

export const syncBookDownloadProgress = (
  downloadedCount: number,
  downloadedList: any[],
  explicitUserId?: string
): void => {
  try {
    let effectiveUserId = explicitUserId;
    if (!effectiveUserId) {
      const userRaw = localStorage.getItem('arm_current_user');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        effectiveUserId = parsedUser?.id;
      }
    }

    const storageKey = effectiveUserId
      ? `arm_student_stats_${effectiveUserId}`
      : 'arm_student_stats_v2';

    const rawStats =
      localStorage.getItem(storageKey) || localStorage.getItem('arm_student_stats_v2');

    const baseStats: StudentStats = rawStats
      ? JSON.parse(rawStats)
      : {
          totalExamsTaken: 0,
          passedExams: 0,
          averageScore: 0,
          totalStudyMinutes: 0,
          booksReadCount: 0,
          downloadedBooksCount: 0,
          downloadedBooksList: [],
          summariesReviewedCount: 0,
          videosWatchedCount: 0,
          streakDays: 0,
          lastActiveDate: new Date().toISOString(),
          subjectPerformance: {},
          recentExams: [],
          achievements: getDefaultBadgesList(),
        };

    const nextCount = Math.max(
      downloadedCount,
      baseStats.downloadedBooksCount || 0,
      baseStats.booksReadCount || 0
    );

    const candidateStats: StudentStats = {
      ...baseStats,
      downloadedBooksCount: nextCount,
      booksReadCount: nextCount,
      downloadedBooksList: downloadedList,
      lastActiveDate: new Date().toISOString(),
    };

    const evaluated = evaluateAndNotifyProgress(
      candidateStats,
      effectiveUserId,
      'book',
      true
    );

    localStorage.setItem(storageKey, JSON.stringify(evaluated));
    localStorage.setItem('arm_student_stats_v2', JSON.stringify(evaluated));

    const userToken = localStorage.getItem('arm_user_token');
    if (userToken) {
      fetch('/api/user/stats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ stats: evaluated }),
      }).catch(() => {});
    }
  } catch {
    // ignore storage errors
  }
};

