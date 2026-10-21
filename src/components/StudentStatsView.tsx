import React, { useState, useEffect } from 'react';
import { StudentStats, ExamSubmission, User } from '../types';
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
  FileCheck
} from 'lucide-react';

interface StudentStatsViewProps {
  stats: StudentStats;
  currentUser: User | null;
  onUpdateStats: (newStats: StudentStats) => void;
  onNavigateToExams: () => void;
}

export const StudentStatsView: React.FC<StudentStatsViewProps> = ({
  stats,
  currentUser,
  onUpdateStats,
  onNavigateToExams,
}) => {
  // Study Timer (Pomodoro Focus Session) state
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number>(25);
  const [sessionCompletedMsg, setSessionCompletedMsg] = useState<string | null>(null);

  // Selected past exam for quick review modal
  const [selectedPastExam, setSelectedPastExam] = useState<ExamSubmission | null>(null);

  // Focus timer effect
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

  // Log completed focus study session
  const handleLogCompletedFocusSession = (minutes: number) => {
    const newTotalMinutes = stats.totalStudyMinutes + minutes;
    const updatedStats: StudentStats = {
      ...stats,
      totalStudyMinutes: newTotalMinutes,
      streakDays: Math.max(stats.streakDays, stats.streakDays + 1)
    };
    onUpdateStats(updatedStats);
    setSessionCompletedMsg(`أحسنت! أتممت جلسة تركيز مدتها ${minutes} دقيقة وتمت إضافتها لسجل إحصائياتك.`);
    setTimeout(() => setSessionCompletedMsg(null), 5000);
  };

  const handleResetTimer = (minutes: number) => {
    setIsTimerRunning(false);
    setSelectedTimerDuration(minutes);
    setTimerSeconds(minutes * 60);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Overall syllabus completion approximation (weighted by exams and books)
  const syllabusCompletion = Math.min(100, Math.round(((stats.totalExamsTaken * 7) + (stats.booksReadCount * 5) + (stats.summariesReviewedCount * 3)) / 1.5));

  const subjectsList = [
    { name: 'كيمياء', icon: '⚗️', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300' },
    { name: 'فيزياء', icon: '⚡', color: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/30 text-cyan-300' },
    { name: 'أحياء', icon: '🧬', color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-300' },
    { name: 'لغة عربية', icon: '📖', color: 'from-orange-500/20 to-amber-600/10 border-orange-500/30 text-orange-300' },
    { name: 'رياضيات', icon: '📐', color: 'from-purple-500/20 to-indigo-600/10 border-purple-500/30 text-purple-300' },
    { name: 'لغة إنجليزية', icon: '🌍', color: 'from-blue-500/20 to-sky-600/10 border-blue-500/30 text-sky-300' },
    { name: 'جيولوجيا', icon: '💎', color: 'from-stone-500/20 to-zinc-600/10 border-stone-500/30 text-stone-300' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 text-right">

      {/* Hero Student Greeting Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-zinc-900/80 to-zinc-900/60 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              <GraduationCap className="w-4 h-4" />
              <span>لوحة التحصيل الأكاديمي الشاملة للثانوية العامة المصرية</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 mb-2">
              مرحباً بك يا {currentUser?.name || 'طالبنا المتميز'} ✨
            </h2>
            
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              تتبّع معدل درجاتك التراكمي، مستوى تمكنك في كل مادة دراسية، ساعات تركيزك، وسجل إنجازاتك في امتحانات الثانوية العامة وفق النظام الحديث.
            </p>
          </div>

          {/* Quick CTA to jump into Exams */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={onNavigateToExams}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>بدء اختبار جديد الآن</span>
            </button>
          </div>
        </div>

        {/* Syllabus Progress Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              <span>مؤشر تغطية ومراجعة المنهج الدراسي للثانوية العامة</span>
            </span>
            <span className="font-bold text-amber-400">{syllabusCompletion}% مكتمل</span>
          </div>
          <div className="w-full bg-zinc-900/90 h-2.5 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${syllabusCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Core Academic Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Metric 1: Average Score */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/30 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-zinc-400">المعدل التراكمي العام</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              {stats.averageScore}%
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {stats.averageScore >= 85 ? 'تقدير: ممتاز ومؤهل للقمة 🌟' : stats.averageScore >= 70 ? 'تقدير: جيد جداً' : 'بحاجة لتدريب مكثف'}
            </p>
          </div>
        </div>

        {/* Metric 2: Completed Exams */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/30 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-zinc-400">الامتحانات المنجزة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-100">
              {stats.totalExamsTaken} <span className="text-xs font-normal text-zinc-400">اختبار</span>
            </div>
            <p className="text-[10px] text-emerald-400 mt-1">
              اجتزت بنجاح: {stats.passedExams} اختبارات
            </p>
          </div>
        </div>

        {/* Metric 3: Study Hours Logged */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/30 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-zinc-400">إجمالي وقت المذاكرة</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-100">
              {(stats.totalStudyMinutes / 60).toFixed(1)} <span className="text-xs font-normal text-zinc-400">ساعة</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {stats.totalStudyMinutes} دقيقة تركيز موثقة
            </p>
          </div>
        </div>

        {/* Metric 4: Continuous Streak */}
        <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/30 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-zinc-400">شعلة الالتزام اليومي</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-orange-400 flex items-center gap-1.5">
              <span>{stats.streakDays}</span>
              <span className="text-xs font-normal text-zinc-400">أيام متتالية</span>
            </div>
            <p className="text-[10px] text-orange-300 mt-1">
              استمر في المذاكرة للحفاظ على الشعلة! 🔥
            </p>
          </div>
        </div>

      </div>

      {/* Focus Study Timer Card (Pomodoro Tracker) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
              <Timer className="w-3.5 h-3.5" />
              <span>مؤقت جلسات المذاكرة والتركيز (Pomodoro)</span>
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-1">
              نظم وقتك وثبّت ساعات دراستك اليومية
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              اختر مدة الجلسة وابدأ المذاكرة بدون مقاطعات، وعند اكتمال الوقت تضاف الدقائق تلقائياً إلى رصيدك الدراسي وشعلة التزامك.
            </p>
            {sessionCompletedMsg && (
              <p className="mt-3 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                {sessionCompletedMsg}
              </p>
            )}
          </div>

          {/* Timer Display & Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Quick Duration Buttons */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
              {[15, 25, 45].map((duration) => (
                <button
                  key={duration}
                  onClick={() => handleResetTimer(duration)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedTimerDuration === duration && !isTimerRunning
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {duration} دقيقة
                </button>
              ))}
            </div>

            {/* Countdown Digits */}
            <div className="font-mono text-3xl sm:text-4xl font-black px-6 py-2 rounded-2xl bg-zinc-900 border border-amber-500/30 text-amber-300 tracking-wider shadow-inner">
              {formatTimer(timerSeconds)}
            </div>

            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-lg transition active:scale-95 ${
                  isTimerRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>بدء الجلسة</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleResetTimer(selectedTimerDuration)}
                className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Subject Performance Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span>مستوى الإتقان والتحصيل حسب المواد الدراسية</span>
          </h3>
          <span className="text-xs text-zinc-400">
            محدث بناءً على إجاباتك في النماذج
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjectsList.map((sub) => {
            const perf = stats.subjectPerformance[sub.name] || {
              totalQuestions: 10,
              correctQuestions: 8,
              examsCount: 1,
              averageScore: 80
            };

            const accuracy = perf.totalQuestions > 0 
              ? Math.round((perf.correctQuestions / perf.totalQuestions) * 100)
              : 80;

            return (
              <div 
                key={sub.name}
                className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{sub.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">{sub.name}</h4>
                      <span className="text-[10px] text-zinc-400">
                        {perf.examsCount} اختبار مكتمل · {perf.correctQuestions}/{perf.totalQuestions} أسئلة صحيحة
                      </span>
                    </div>
                  </div>

                  <span className="text-sm font-black text-amber-400">
                    {accuracy}%
                  </span>
                </div>

                {/* Accuracy progress bar */}
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span>المعدل المتوسط: <strong className="text-zinc-200">{perf.averageScore}%</strong></span>
                  <button 
                    onClick={onNavigateToExams}
                    className="text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>حل اختبار</span>
                    <ChevronRight className="w-3 h-3 rotate-180" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Exam History & Achievements Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Exam History (Takes 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>سجل آخر الاختبارات والنماذج المكتملة ({stats.recentExams.length})</span>
            </h3>
            <button
              onClick={onNavigateToExams}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              عرض كل الامتحانات ↢
            </button>
          </div>

          <div className="space-y-3">
            {stats.recentExams.map((examSub) => (
              <div
                key={examSub.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      {examSub.subject}
                    </span>
                    <span className="text-xs font-bold text-zinc-200">
                      {examSub.examTitle}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    تم التسليم: {examSub.submittedAt} · الوقت المستغرق: {Math.floor(examSub.timeSpentSeconds / 60)} دقيقة
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-left">
                    <div className="text-sm font-black text-amber-400">
                      {examSub.score} / {examSub.totalMarks}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      {examSub.percentage}% نسبة النجاح
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedPastExam(examSub)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
                    title="استعراض الملاحظات والنتيجة"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {stats.recentExams.length === 0 && (
              <div className="text-center py-10 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-xs text-zinc-500">
                لم تقم بإجراء أي اختبارات بعد. ابدأ أول امتحان لك الآن!
              </div>
            )}
          </div>
        </div>

        {/* Student Badges & Achievements (Takes 1 column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>أوسمة وشارات التفوق ({stats.achievements.filter(a => a.unlocked).length}/{stats.achievements.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {stats.achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition ${
                  ach.unlocked
                    ? 'bg-zinc-950/80 border-amber-500/30'
                    : 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{ach.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-200">{ach.title}</h4>
                      {ach.unlocked && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
                          تم الفتح ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      {ach.description}
                    </p>
                    
                    {!ach.unlocked && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>التقدم</span>
                          <span>{ach.progress}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-zinc-600 h-full rounded-full"
                            style={{ width: `${ach.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Past Exam Feedback Modal */}
      {selectedPastExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-right">
            
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 truncate">
                {selectedPastExam.examTitle}
              </h3>
              <button
                onClick={() => setSelectedPastExam(null)}
                className="text-zinc-500 hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block mb-1">النتيجة والدرجة</span>
                  <div className="text-xl font-bold text-amber-400">
                    {selectedPastExam.score} من أصل {selectedPastExam.totalMarks} ({selectedPastExam.percentage}%)
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-zinc-400 block mb-1">وقت المذاكرة</span>
                  <span className="text-zinc-200 font-bold">
                    {Math.floor(selectedPastExam.timeSpentSeconds / 60)} دقيقة
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 leading-relaxed text-amber-200">
                <strong>ملاحظة الموجه التربوي:</strong> {selectedPastExam.feedback}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedPastExam(null);
                    onNavigateToExams();
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition"
                >
                  إعادة هذا الامتحان
                </button>
                <button
                  onClick={() => setSelectedPastExam(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
