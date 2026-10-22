import React, { useState, useEffect } from 'react';
import { StudentStats, ExamSubmission, User, DownloadedBookItem } from '../types';
import { getDownloadedBooks, recordBookDownload } from '../utils/contentStore';
import { 
  BarChart3, 
  Award, 
  Clock, 
  Flame, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  TrendingUp, 
  ArrowLeft, 
  ChevronRight, 
  Eye, 
  FileCheck, 
  Download, 
  PieChart as PieIcon, 
  HelpCircle, 
  BookMarked,
  ExternalLink,
  Check,
  X,
  Volume2,
  Zap,
  CreditCard
} from 'lucide-react';

interface StudentDashboardProps {
  stats: StudentStats;
  currentUser: User | null;
  onUpdateStats: (newStats: StudentStats) => void;
  onNavigateToExams: () => void;
  onNavigateToBooks: () => void;
  onNavigateToEnglishAI?: () => void;
  onOpenSubscriptions?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  stats,
  currentUser,
  onUpdateStats,
  onNavigateToExams,
  onNavigateToBooks,
  onNavigateToEnglishAI,
  onOpenSubscriptions
}) => {
  // Downloaded books state
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBookItem[]>([]);
  const [showDownloadsModal, setShowDownloadsModal] = useState<boolean>(false);

  // Focus Timer state (Pomodoro)
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number>(25);
  const [focusCompletedMsg, setFocusCompletedMsg] = useState<string | null>(null);

  // Selected past exam for answer review modal
  const [selectedPastExam, setSelectedPastExam] = useState<ExamSubmission | null>(null);

  // Active chart tab (most interested subjects vs subject mastery vs score trend)
  const [activeChartTab, setActiveChartTab] = useState<'donut' | 'bars' | 'trend'>('donut');
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);

  // Load downloaded books on mount and listen to changes
  useEffect(() => {
    const loadDownloads = () => {
      const list = getDownloadedBooks();
      setDownloadedBooks(list);
    };
    loadDownloads();

    const handleSync = () => loadDownloads();
    window.addEventListener('arm_content_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('arm_content_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Pomodoro Focus Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            handleLogCompletedFocusSession(selectedTimerDuration);
            return selectedTimerDuration * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, selectedTimerDuration]);

  const handleLogCompletedFocusSession = (minutes: number) => {
    const newTotal = stats.totalStudyMinutes + minutes;
    const updatedStats: StudentStats = {
      ...stats,
      totalStudyMinutes: newTotal,
      streakDays: Math.max(stats.streakDays, stats.streakDays + 1)
    };
    onUpdateStats(updatedStats);
    setFocusCompletedMsg(`رائع جداً! أتممت جلسة تركيز مدتها ${minutes} دقيقة وتم تسجيلها في إحصائياتك.`);
    setTimeout(() => setFocusCompletedMsg(null), 5000);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute downloaded books count
  const effectiveDownloadsCount = Math.max(stats.downloadedBooksCount || 0, downloadedBooks.length, stats.booksReadCount || 0);

  // Subject performance calculation for charts
  const subjectsMap = stats.subjectPerformance || {};
  const subjectKeys = Object.keys(subjectsMap);

  // Color mapping for subjects
  const subjectColors: Record<string, { bg: string; stroke: string; text: string; fill: string }> = {
    'كيمياء': { bg: 'bg-amber-500', stroke: '#f59e0b', text: 'text-amber-400', fill: '#f59e0b' },
    'فيزياء': { bg: 'bg-cyan-500', stroke: '#06b6d4', text: 'text-cyan-400', fill: '#06b6d4' },
    'أحياء': { bg: 'bg-emerald-500', stroke: '#10b981', text: 'text-emerald-400', fill: '#10b981' },
    'لغة عربية': { bg: 'bg-orange-500', stroke: '#f97316', text: 'text-orange-400', fill: '#f97316' },
    'رياضيات': { bg: 'bg-purple-500', stroke: '#a855f7', text: 'text-purple-400', fill: '#a855f7' },
    'علوم': { bg: 'bg-teal-500', stroke: '#14b8a6', text: 'text-teal-400', fill: '#14b8a6' },
    'لغة إنجليزية': { bg: 'bg-blue-500', stroke: '#3b82f6', text: 'text-blue-400', fill: '#3b82f6' },
    'جيولوجيا': { bg: 'bg-lime-500', stroke: '#84cc16', text: 'text-lime-400', fill: '#84cc16' },
    'دراسات': { bg: 'bg-rose-500', stroke: '#f43f5e', text: 'text-rose-400', fill: '#f43f5e' }
  };

  // Fallback defaults if no exams taken yet
  const displaySubjects = subjectKeys.length > 0 ? subjectKeys : ['كيمياء', 'فيزياء', 'أحياء', 'لغة عربية', 'رياضيات', 'لغة إنجليزية'];

  // Calculate total questions solved across all subjects for "المواد الأكثر اهتماماً"
  const totalQuestionsAllSubjects = displaySubjects.reduce((acc, sub) => {
    return acc + (subjectsMap[sub]?.totalQuestions || 10);
  }, 0);

  // Chart data: Most interested subjects (percentage of interest)
  const interestedSubjectsData = displaySubjects.map(sub => {
    const qCount = subjectsMap[sub]?.totalQuestions || 10;
    const examsCount = subjectsMap[sub]?.examsCount || 1;
    const percentage = totalQuestionsAllSubjects > 0 ? Math.round((qCount / totalQuestionsAllSubjects) * 100) : 15;
    const color = subjectColors[sub] || { bg: 'bg-amber-500', stroke: '#f59e0b', text: 'text-amber-400', fill: '#f59e0b' };
    return {
      subject: sub,
      count: qCount,
      examsCount,
      percentage,
      averageScore: subjectsMap[sub]?.averageScore || 85,
      color
    };
  }).sort((a, b) => b.count - a.count);

  // SVG Donut Chart Slices Generation
  let cumulativeAngle = 0;
  const radius = 64;
  const strokeWidth = 24;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  const donutSlices = interestedSubjectsData.map(item => {
    const sliceAngle = (item.percentage / 100) * 360;
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativeAngle / 360) * circumference);
    cumulativeAngle += sliceAngle;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ------------------------------------------------------------------- */}
      {/* 1. HERO BANNER: Student Identity & Academic Momentum */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-amber-950/30 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="relative">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt=""
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-xl shadow-amber-500/20"
              />
              <span className="absolute -bottom-1 -left-1 p-1 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-black shadow">
                🎓
              </span>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                  مرحباً بك يا {currentUser?.name || 'طالبنا المتميز'} ✨
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  {currentUser?.academicStage || 'المرحلة الثانوية'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                لوحة إحصائياتك الأكاديمية الشاملة: تابع كتبك المحملة، متوسط درجاتك، المواد الأكثر اهتماماً، ونمِّ مهاراتك باستمرار.
              </p>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={onNavigateToExams}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
            >
              <Target className="w-4 h-4" />
              <span>بدء اختبار جديد 🎯</span>
            </button>

            <button
              onClick={onNavigateToBooks}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>تصفح المناهج والكتب</span>
            </button>

            {onNavigateToEnglishAI && (
              <button
                onClick={onNavigateToEnglishAI}
                className="px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold rounded-xl border border-blue-500/30 transition flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span>نطق الإنجليزية AI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1.5 SUBSCRIPTION STATUS BANNER */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-100">
                {currentUser?.subscription?.status === 'active' 
                  ? `باقة الاشتراك المفعلة: ${currentUser.subscription.planName}`
                  : 'باقات الاشتراك الشهرية (تبدأ من 50 ج.م فقط)'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {currentUser?.subscription?.status === 'active' ? 'مفعلة ✅' : '3 باقات مرنة'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {currentUser?.subscription?.status === 'active' 
                ? currentUser.subscription.maxExamsPerWeek === -1
                  ? 'لديك إمكانية خوض امتحانات غير محدودة طوال الأسبوع والشهر لكافة المواد.'
                  : `متبقي لك عدد ${currentUser.subscription.examsRemainingThisWeek} امتحان إلكتروني لهذا الأسبوع.`
                : 'اشترك الآن في باقة الـ 50 ج.م واحصل على 2 امتحان أسبوعياً، أو باقة التفوق والـ VIP.'}
            </p>
          </div>
        </div>

        {onOpenSubscriptions && (
          <button
            onClick={onOpenSubscriptions}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 font-black text-xs shadow-md transition flex items-center gap-2 flex-shrink-0 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {currentUser?.subscription?.status === 'active' ? 'ترقية / تعديل الباقة' : 'عرض الباقات والاشتراك ⚡'}
            </span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. TOP METRICS GRID (إحصائيات الطالب الأربعة الرئيسية) */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: عدد الكتب المحملة (Requested explicitly by user) */}
        <div 
          onClick={() => setShowDownloadsModal(true)}
          className="bg-zinc-900/90 border border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-5 relative overflow-hidden group cursor-pointer transition shadow-xl"
        >
          <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Download className="w-6 h-6" />
            </span>
            <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-lg">
              انقر لعرض الكتب 📥
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">{effectiveDownloadsCount}</span>
              <span className="text-xs text-zinc-400 font-semibold">كتاب ومذكرة PDF</span>
            </div>
            <h4 className="text-xs font-bold text-amber-300 mt-1">عدد الكتب المحملة والمستعرضة</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              جاهزة للقراءة والتحميل الفوري لجهازك في أي وقت.
            </p>
          </div>
        </div>

        {/* Metric 2: متوسط درجات الاختبارات (Requested explicitly by user) */}
        <div className="bg-zinc-900/90 border border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-5 relative overflow-hidden group transition shadow-xl">
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Target className="w-6 h-6" />
            </span>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
              {stats.averageScore >= 90 ? 'ممتاز مرتفع 🌟' : stats.averageScore >= 80 ? 'جيد جداً ✨' : 'متقدم 📈'}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">{stats.averageScore}%</span>
              <span className="text-xs text-zinc-400 font-semibold">معدل تراكمي</span>
            </div>
            <h4 className="text-xs font-bold text-emerald-300 mt-1">متوسط درجات الاختبارات</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              محسوب من {stats.totalExamsTaken} اختبارات مكتملة.
            </p>
          </div>
        </div>

        {/* Metric 3: عدد الاختبارات المنجزة ونسبة النجاح */}
        <div className="bg-zinc-900/90 border border-cyan-500/30 hover:border-cyan-500/60 rounded-3xl p-5 relative overflow-hidden group transition shadow-xl">
          <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCheck className="w-6 h-6" />
            </span>
            <span className="text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg">
              نسبة اجتياز: 100%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-400">{stats.totalExamsTaken}</span>
              <span className="text-xs text-zinc-400 font-semibold">اختبار مكتمل</span>
            </div>
            <h4 className="text-xs font-bold text-cyan-300 mt-1">الاختبارات المنجزة والناجحة</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              اجتزت جميع النماذج بنجاح وتفوق.
            </p>
          </div>
        </div>

        {/* Metric 4: ساعات المذاكرة وشعلة الالتزام */}
        <div className="bg-zinc-900/90 border border-orange-500/30 hover:border-orange-500/60 rounded-3xl p-5 relative overflow-hidden group transition shadow-xl">
          <div className="absolute top-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="w-6 h-6" />
            </span>
            <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <span>{stats.streakDays} أيام متتالية</span>
              <span>🔥</span>
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-orange-400">
                {(stats.totalStudyMinutes / 60).toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">ساعة تركيز</span>
            </div>
            <h4 className="text-xs font-bold text-orange-300 mt-1">وقت المذاكرة والتحصيل</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              {stats.totalStudyMinutes} دقيقة مذاكرة نشطة مسجلة.
            </p>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. CHARTS SECTION (الرسوم البيانية - المواد الأكثر اهتماماً ومعدل التحصيل) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span>الرسوم البيانية لإحصائيات الطالب والمواد الأكثر اهتماماً</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              تحليل تفاعلي يوضح اهتماماتك الدراسية، مستوى دقة إجاباتك، ومنحنى تقدمك الزمني.
            </p>
          </div>

          {/* Chart Toggle Buttons */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveChartTab('donut')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeChartTab === 'donut'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>المواد الأكثر اهتماماً (دائري)</span>
            </button>

            <button
              onClick={() => setActiveChartTab('bars')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeChartTab === 'bars'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>معدل إتقان المواد (شريطي)</span>
            </button>

            <button
              onClick={() => setActiveChartTab('trend')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeChartTab === 'trend'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>منحنى الدرجات (زمني)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DONUT CHART - المواد الأكثر اهتماماً */}
        {activeChartTab === 'donut' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center animate-in fade-in">
            {/* SVG Interactive Donut Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  {donutSlices.map((slice, idx) => (
                    <circle
                      key={idx}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={slice.color.stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      onMouseEnter={() => setHoveredSubject(slice.subject)}
                      onMouseLeave={() => setHoveredSubject(null)}
                    />
                  ))}
                </svg>

                {/* Center of Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs text-zinc-400 font-semibold">
                    {hoveredSubject || 'المادة الأولى'}
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    {hoveredSubject 
                      ? `${interestedSubjectsData.find(d => d.subject === hoveredSubject)?.percentage || 0}%` 
                      : `${interestedSubjectsData[0]?.subject || 'كيمياء'}`}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold">
                    {hoveredSubject ? 'نسبة الاهتمام' : `${interestedSubjectsData[0]?.percentage || 30}% تركيز`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 text-center mt-3">
                💡 الرسوم مبنية على عدد الأسئلة المحلولة، الاختبارات المكتملة، وتنزيلات الكتب لكل مادة.
              </p>
            </div>

            {/* Breakdown List for Most Interested Subjects */}
            <div className="md:col-span-7 space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 mb-2">ترتيب المواد حسب حجم اهتمام الطالب وساعات التحصيل:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {interestedSubjectsData.map((item, idx) => (
                  <div
                    key={item.subject}
                    onMouseEnter={() => setHoveredSubject(item.subject)}
                    onMouseLeave={() => setHoveredSubject(null)}
                    className={`p-3 rounded-2xl bg-zinc-950/70 border transition flex items-center justify-between ${
                      hoveredSubject === item.subject
                        ? 'border-amber-500/60 bg-zinc-950 shadow-md scale-[1.02]'
                        : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color.stroke }} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100">{item.subject}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              الأكثر تركيزاً 🥇
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          {item.count} سؤالاً تم حله | {item.examsCount} اختبارات
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-sm font-black" style={{ color: item.color.stroke }}>
                        {item.percentage}%
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-semibold">
                        دقة {item.averageScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BAR CHART - معدل إتقان المواد ونسبة الدقة */}
        {activeChartTab === 'bars' && (
          <div className="mt-6 space-y-4 animate-in fade-in">
            <p className="text-xs text-zinc-400">
              يقيس هذا الرسم نسبة الأسئلة الصحيحة والإتقان الفعلي لكل مادة من واقع نتائج الاختبارات:
            </p>

            <div className="space-y-3">
              {interestedSubjectsData.map((item) => (
                <div key={item.subject} className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color.stroke }} />
                      <span className="text-xs font-bold text-zinc-200">{item.subject}</span>
                      <span className="text-[10px] text-zinc-500">({item.count} سؤالاً محلولاً)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        item.averageScore >= 90 ? 'bg-emerald-500/20 text-emerald-300' :
                        item.averageScore >= 80 ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {item.averageScore >= 90 ? 'إتقان فائق' : item.averageScore >= 80 ? 'جيد جداً' : 'مستوى واعد'}
                      </span>
                      <span className="text-xs font-black text-zinc-100">{item.averageScore}%</span>
                    </div>
                  </div>

                  {/* Visual Bar Indicator */}
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.averageScore}%`,
                        backgroundColor: item.color.stroke
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TREND CHART - منحنى الدرجات عبر الزمن */}
        {activeChartTab === 'trend' && (
          <div className="mt-6 space-y-4 animate-in fade-in">
            <p className="text-xs text-zinc-400">
              تطور درجاتك عبر الاختبارات الأخيرة التي خضتها في المنصة:
            </p>

            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-5">
              <div className="h-48 w-full flex items-end gap-3 sm:gap-6 justify-between pt-6 px-2">
                {stats.recentExams.slice(0, 7).reverse().map((sub, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-lg">
                      {sub.examTitle.slice(0, 25)}... | {sub.percentage}%
                    </div>

                    <span className="text-[11px] font-black text-amber-300">
                      {sub.percentage}%
                    </span>

                    <div className="w-full max-w-[48px] bg-zinc-900 rounded-xl overflow-hidden h-32 flex items-end border border-zinc-800">
                      <div
                        className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                        style={{ height: `${Math.max(15, sub.percentage)}%` }}
                      />
                    </div>

                    <span className="text-[10px] text-zinc-400 truncate max-w-[60px] block font-semibold text-center">
                      {sub.subject}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. DOWNLOADED BOOKS LOG & FOCUS POMODORO TIMER ROW */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DOWNLOADED BOOKS ARCHIVE (Left / Main) */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>سجل الكتب والمناهج المحملة للطالب ({effectiveDownloadsCount})</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  جميع الكتب والمذكرات التي قمت بتحميلها أو فتحها، متاحة للوصول السريع دون بحث.
                </p>
              </div>

              <button
                onClick={onNavigateToBooks}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
              >
                <span>تحميل المزيد</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of downloaded books */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {downloadedBooks.length > 0 ? (
                downloadedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/40 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={book.coverpath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-10 h-14 object-cover rounded-lg border border-zinc-800 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{book.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                          <span className="text-amber-400 font-semibold">{book.category}</span>
                          <span>•</span>
                          <span>{book.grade || 'منهج مدرسي'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={book.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح</span>
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800/50">
                  <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 font-semibold">لم تقم بتحميل أي كتب حتى الآن.</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    انتقل لقسم "كتب الطلاب" وحمّل الكتب المدرسية والمذكرات بضغطة زر واحدة لتظهر هنا مباشرة!
                  </p>
                  <button
                    onClick={onNavigateToBooks}
                    className="mt-3 px-4 py-2 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-md hover:brightness-110 transition"
                  >
                    تصفح الكتب وتحميلها الآن 📚
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* POMODORO FOCUS TIMER (Right) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-amber-200 flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <span>مؤقت جلسات التركيز (Pomodoro)</span>
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-2 py-0.5 rounded-lg">
                Focus Engine
              </span>
            </div>

            {focusCompletedMsg && (
              <div className="p-3 mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{focusCompletedMsg}</span>
              </div>
            )}

            {/* Timer Display */}
            <div className="text-center py-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 mb-4">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-zinc-100">
                {formatTimer(timerSeconds)}
              </span>
              <p className="text-[11px] text-zinc-400 mt-1">
                {isTimerRunning ? '🔥 جلسة التركيز جارية الآن، ركز على هدفك!' : 'اختر المدة واضغط بدء الانطلاق'}
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setSelectedTimerDuration(mins);
                    setTimerSeconds(mins * 60);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    selectedTimerDuration === mins && !isTimerRunning
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                isTimerRunning
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 shadow-amber-500/20 hover:brightness-110'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>إيقاف مؤقت</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>بدء جلسة التركيز 🚀</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(selectedTimerDuration * 60);
              }}
              className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 5. RECENT EXAMS & ANSWER REVIEW SECTION */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <span>سجل الاختبارات الأخيرة ومراجعة الإجابات النموذجية</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              يمكنك مراجعة أي اختبار لمعرفة الأسئلة التي أجبت عنها وشرح المعلم لكل إجابة.
            </p>
          </div>

          <button
            onClick={onNavigateToExams}
            className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>خوض اختبار جديد</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.recentExams.map((exam) => (
            <div
              key={exam.id}
              className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                  exam.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {exam.percentage}%
                </span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">{exam.examTitle}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    <span className="text-amber-400 font-semibold">{exam.subject}</span>
                    <span>•</span>
                    <span>الدرجة: {exam.score} من {exam.totalMarks}</span>
                    <span>•</span>
                    <span>⏱️ {Math.round(exam.timeSpentSeconds / 60)} دقيقة</span>
                    <span>•</span>
                    <span>{exam.submittedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setSelectedPastExam(exam)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-300 text-xs font-bold border border-zinc-700 transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>مراجعة الإجابات النموذجية</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 6. ACHIEVEMENTS & BADGES */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-amber-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Award className="w-5 h-5 text-amber-400" />
          <span>الأوسمة والإنجازات الأكاديمية للطالب 🏆</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {stats.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition flex items-center gap-3 ${
                ach.unlocked
                  ? 'bg-zinc-950/80 border-amber-500/40 shadow-lg'
                  : 'bg-zinc-950/30 border-zinc-800/60 opacity-60'
              }`}
            >
              <span className="text-2xl p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex-shrink-0">
                {ach.icon}
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <span>{ach.title}</span>
                  {ach.unlocked && <span className="text-emerald-400 text-[10px]">✓ مكتمل</span>}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">{ach.description}</p>
                {ach.unlockedAt && (
                  <span className="text-[9px] text-amber-400/80 mt-1 block">حصلت عليه: {ach.unlockedAt}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: DOWNLOADED BOOKS LIST */}
      {/* ------------------------------------------------------------------- */}
      {showDownloadsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-right max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowDownloadsModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-amber-200 mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-amber-400" />
              <span>أرشيف الكتب المدرسية المحملة ({effectiveDownloadsCount})</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              هذه الكتب والمذكرات قمت بتحميلها أو حفظها، ويمكنك فتحها مباشرة بصيغة PDF.
            </p>

            <div className="space-y-3">
              {downloadedBooks.map((book) => (
                <div key={book.id} className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={book.coverpath} alt="" className="w-10 h-14 object-cover rounded-lg border border-zinc-800 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{book.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {book.category} • {book.grade || 'منهج دراسي'}
                      </p>
                    </div>
                  </div>

                  <a
                    href={book.filepath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl hover:brightness-110 transition flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل وفتح</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: REVIEW PAST EXAM ANSWERS */}
      {/* ------------------------------------------------------------------- */}
      {selectedPastExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPastExam(null)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-zinc-800 pb-4 mb-5">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                مراجعة الأجوبة والنموذج الوزاري
              </span>
              <h3 className="text-lg font-bold text-zinc-100 mt-2">{selectedPastExam.examTitle}</h3>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                <span>المادة: <b className="text-amber-400">{selectedPastExam.subject}</b></span>
                <span>•</span>
                <span>الدرجة: <b className="text-emerald-400">{selectedPastExam.score} / {selectedPastExam.totalMarks} ({selectedPastExam.percentage}%)</b></span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 mb-6 text-xs text-zinc-300">
              💡 {selectedPastExam.feedback}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPastExam(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition"
              >
                إغلاق المراجعة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
