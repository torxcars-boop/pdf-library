import React, { useState, useEffect, useRef } from 'react';
import { Exam, ExamQuestion, ExamSubmission, StudentStats } from '../types';
import { getAllStudentExams, recordExamSubmission } from '../data/studentExamsData';
import { 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Award, 
  ArrowRight, 
  RotateCcw, 
  Filter, 
  Search, 
  Sparkles, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  Bookmark,
  Check,
  X,
  Play,
  BarChart3,
  Timer
} from 'lucide-react';

interface StudentExamsViewProps {
  stats: StudentStats;
  onUpdateStats: (newStats: StudentStats) => void;
  onNavigateToStats: () => void;
}

export const StudentExamsView: React.FC<StudentExamsViewProps> = ({
  stats,
  onUpdateStats,
  onNavigateToStats
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('الكل');
  const [selectedGrade, setSelectedGrade] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [examsList, setExamsList] = useState<Exam[]>(getAllStudentExams);

  useEffect(() => {
    setExamsList(getAllStudentExams());
  }, []);

  // Active taking exam state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [examStartedAt, setExamStartedAt] = useState<number>(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  
  // Exam result review state
  const [examResult, setExamResult] = useState<ExamSubmission | null>(null);
  const [viewingResultForExam, setViewingResultForExam] = useState<Exam | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Grade & Subject options
  const grades = ['الكل', 'الصف الثالث الإعدادي', 'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'];
  const subjects = ['الكل', 'كيمياء', 'فيزياء', 'أحياء', 'علوم', 'لغة عربية', 'رياضيات', 'لغة إنجليزية', 'جيولوجيا', 'دراسات'];

  // Start Exam handler
  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setRemainingSeconds(exam.durationMinutes * 60);
    setExamStartedAt(Date.now());
    setExamResult(null);
    setViewingResultForExam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Timer countdown
  useEffect(() => {
    if (!activeExam || examResult) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          handleSubmitExam(true); // Auto submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExam, examResult]);

  // Answer selection
  const handleSelectOption = (questionId: number, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  // Toggle flag for question review
  const handleToggleFlag = (questionId: number) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // Submit Exam calculation
  const handleSubmitExam = (isTimeout: boolean = false) => {
    if (!activeExam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const questions = activeExam.questions;
    let correctCount = 0;

    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    const marksPerQuestion = activeExam.totalMarks / questions.length;
    const finalScore = Math.round(correctCount * marksPerQuestion);
    const percentage = Math.round((finalScore / activeExam.totalMarks) * 100);
    const passed = finalScore >= activeExam.passMarks;

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - examStartedAt) / 1000));

    let feedback = '';
    if (percentage >= 90) {
      feedback = 'ما شاء الله! أداء استثنائي وعلامة شبه كاملة، استمر في هذا التألق!';
    } else if (percentage >= 75) {
      feedback = 'مستوى رائع جداً! استوعبت معظم جوانب المنهج وباقي القليل للإتقان التام.';
    } else if (percentage >= 50) {
      feedback = 'أداء جيد ونجاح مستحق، ننصح بمراجعة الأسئلة غير الموفقة والشروحات التفصيلية أدناه.';
    } else {
      feedback = 'بداية جيدة للتدريب! قم بمراجعة الإجابات النموذجية واستعن بملخصات المنصة.';
    }

    const submission: ExamSubmission = {
      id: 'sub_' + Date.now(),
      examId: activeExam.id,
      examTitle: activeExam.title,
      subject: activeExam.subject,
      score: finalScore,
      totalMarks: activeExam.totalMarks,
      percentage,
      passed,
      timeSpentSeconds,
      submittedAt: 'الآن',
      answers: { ...selectedAnswers },
      feedback
    };

    // Record submission into stats
    const updatedStats = recordExamSubmission(stats, {
      ...submission,
      totalQuestions: questions.length,
      correctQuestions: correctCount
    });
    onUpdateStats(updatedStats);

    setExamResult(submission);
    setViewingResultForExam(activeExam);
    setIsSubmitModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered exams list
  const filteredExams = examsList.filter(exam => {
    const matchesGrade = selectedGrade === 'الكل' || exam.grade.includes(selectedGrade);
    const matchesSubject = selectedSubject === 'الكل' || exam.subject === selectedSubject;
    const matchesSearch = !searchQuery || 
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesSubject && matchesSearch;
  });

  // Time format helper
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Quick Random Quiz generator
  const handleGenerateRandomQuiz = () => {
    // Pick subject or all
    const allQuestions: { q: ExamQuestion; subject: string }[] = [];
    examsList.forEach(e => {
      e.questions.forEach(q => {
        allQuestions.push({ q, subject: e.subject });
      });
    });

    // Shuffle and pick 6 questions
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 6);
    const customExam: Exam = {
      id: 'custom-practice-' + Date.now(),
      title: 'اختبار التدريب السريع المشترك - بنك الأسئلة المباشر',
      subject: 'تدريب عام',
      grade: 'الصف الثالث الثانوي',
      durationMinutes: 15,
      difficulty: 'متوسط',
      totalMarks: 30,
      passMarks: 15,
      questionsCount: shuffled.length,
      badge: 'تحدي سريع',
      description: 'اختبار تدريبي مجمع من مختلف المواد لاختبار الجاهزية وسرعة البديهة.',
      questions: shuffled.map(item => item.q)
    };

    handleStartExam(customExam);
  };

  // -------------------------------------------------------------
  // VIEW: EXAM RESULTS & DETAILED REVIEW
  // -------------------------------------------------------------
  if (examResult && viewingResultForExam) {
    const qList = viewingResultForExam.questions;
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
        
        {/* Result Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 shadow-2xl mb-8 relative overflow-hidden text-right">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-zinc-800/80 pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>تقرير نتيجة الامتحان</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100 mb-1">
                {viewingResultForExam.title}
              </h2>
              <p className="text-xs text-zinc-400">
                المادة: <strong className="text-amber-300">{viewingResultForExam.subject}</strong> · تم الحفظ تلقائياً في سجل إحصائياتك
              </p>
            </div>

            {/* Score Badge */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/80 border border-amber-500/40 min-w-[140px]">
              <span className="text-xs text-zinc-400 font-bold mb-1">الدرجة المحققة</span>
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                {examResult.score} / {examResult.totalMarks}
              </div>
              <span className={`text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                examResult.percentage >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                examResult.percentage >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                نسبة النجاح: {examResult.percentage}%
              </span>
            </div>
          </div>

          {/* Performance Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-1">الحالة التقديرية</span>
              <span className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                {examResult.passed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">ناجح بتفوق</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-400">بحاجة لإعادة</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-1">زمن الإجابة المستغرق</span>
              <span className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{Math.floor(examResult.timeSpentSeconds / 60)} دقيقة و {examResult.timeSpentSeconds % 60} ثانية</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-1">الأسئلة الصحيحة</span>
              <span className="text-sm font-bold text-emerald-400">
                {qList.filter(q => examResult.answers[q.id] === q.correctIndex).length} من {qList.length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block mb-1">الأسئلة غير الموفقة</span>
              <span className="text-sm font-bold text-rose-400">
                {qList.filter(q => examResult.answers[q.id] !== q.correctIndex).length} أسئلة
              </span>
            </div>
          </div>

          <p className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed mb-6">
            💡 <strong>ملاحظة الموجه التربوي:</strong> {examResult.feedback}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleStartExam(viewingResultForExam)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاختبار الآن</span>
            </button>

            <button
              onClick={onNavigateToStats}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs border border-zinc-700 transition"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>عرض في صفحة إحصائيات الطالب</span>
            </button>

            <button
              onClick={() => {
                setExamResult(null);
                setViewingResultForExam(null);
                setActiveExam(null);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs border border-zinc-800 transition mr-auto"
            >
              <span>العودة لقائمة الامتحانات</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>

        {/* Detailed Questions Review List */}
        <div className="space-y-6 text-right">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>مراجعة نموذج الإجابة التفصيلي وتصحيح الأسئلة</span>
            </h3>
            <span className="text-xs text-zinc-400">
              إجمالي الأسئلة: {qList.length}
            </span>
          </div>

          {qList.map((q, idx) => {
            const studentChoice = examResult.answers[q.id];
            const isCorrect = studentChoice === q.correctIndex;
            const isUnanswered = studentChoice === undefined;

            return (
              <div 
                key={q.id}
                className={`p-5 sm:p-6 rounded-3xl border transition duration-200 ${
                  isCorrect 
                    ? 'bg-zinc-950/80 border-emerald-500/30' 
                    : 'bg-zinc-950/80 border-rose-500/30'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      الموضوع: {q.topic}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isCorrect 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {isCorrect ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>إجابة صحيحة</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isUnanswered ? 'لم يتم الحل' : 'إجابة خاطئة'}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-sm sm:text-base font-bold text-zinc-100 leading-relaxed mb-5">
                  {q.question}
                </p>

                {/* Options List */}
                <div className="space-y-2.5 mb-5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = studentChoice === optIdx;
                    const isThisCorrect = optIdx === q.correctIndex;

                    let optStyle = 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300';
                    if (isThisCorrect) {
                      optStyle = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      optStyle = 'bg-rose-500/15 border-rose-500/50 text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isThisCorrect ? 'bg-emerald-500 text-zinc-950' : 
                            isSelected ? 'bg-rose-500 text-zinc-100' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {['أ', 'ب', 'ج', 'د'][optIdx]}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isThisCorrect && (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            الإجابة النموذجية
                          </span>
                        )}
                        {isSelected && !isThisCorrect && (
                          <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" />
                            اختيارك السابق
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution Explanation Box */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs leading-relaxed">
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>تفسير الحل والشرح النموذجي:</span>
                  </div>
                  <p className="text-zinc-300">
                    {q.explanation}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: ACTIVE EXAM SIMULATION (Taking the test)
  // -------------------------------------------------------------
  if (activeExam) {
    const q = activeExam.questions[currentQuestionIndex];
    const totalQuestions = activeExam.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const isCurrentFlagged = flaggedQuestions.has(q.id);
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
        
        {/* Sticky Exam Simulator Header */}
        <div className="sticky top-20 z-30 p-4 sm:p-5 rounded-3xl bg-zinc-950/90 backdrop-blur-xl border border-amber-500/30 shadow-2xl mb-6 text-right">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {activeExam.subject}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 truncate max-w-md">
                  {activeExam.title}
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                سؤال {currentQuestionIndex + 1} من أصل {totalQuestions} · أجبت على {answeredCount} سؤالاً
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${
                remainingSeconds < 300 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse' 
                  : 'bg-zinc-900 border-zinc-800 text-amber-300'
              }`}>
                <Timer className="w-4 h-4" />
                <span className="font-mono text-sm sm:text-base font-black tracking-wider">
                  {formatTime(remainingSeconds)}
                </span>
              </div>

              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                تسليم الامتحان
              </button>
            </div>

          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800 shadow-xl mb-6 text-right">
          
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm">
                {currentQuestionIndex + 1}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                الموضوع: <strong className="text-zinc-200">{q.topic}</strong>
              </span>
            </div>

            {/* Flag for review button */}
            <button
              onClick={() => handleToggleFlag(q.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isCurrentFlagged
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-current text-amber-400' : ''}`} />
              <span>{isCurrentFlagged ? 'تم تمييزه للمراجعة' : 'تمييز للمراجعة'}</span>
            </button>
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 leading-relaxed mb-6">
            {q.question}
          </h3>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {q.options.map((option, idx) => {
              const isSelected = selectedAnswers[q.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(q.id, idx)}
                  className={`w-full p-4 rounded-2xl border text-right transition flex items-center justify-between gap-4 group ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-100 shadow-lg shadow-amber-500/10 font-bold'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-black'
                        : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
                    }`}>
                      {['أ', 'ب', 'ج', 'د'][idx]}
                    </span>
                    <span className="text-xs sm:text-sm">{option}</span>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-amber-400 bg-amber-500 text-zinc-950' : 'border-zinc-700'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next / Previous Controls */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-5">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السؤال السابق</span>
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                <span>السؤال التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إنهاء وتسليم الاختبار</span>
              </button>
            )}
          </div>

        </div>

        {/* Question Grid Matrix Navigator */}
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-right">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-zinc-300">مخطط الأسئلة السريع:</span>
            <div className="flex items-center gap-4 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> تمت الإجابة
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" /> لم تتم الإجابة
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 ring-2 ring-amber-400/40" /> مميز للمراجعة
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeExam.questions.map((item, i) => {
              const isAnswered = selectedAnswers[item.id] !== undefined;
              const isFlagged = flaggedQuestions.has(item.id);
              const isCurrent = currentQuestionIndex === i;

              let btnColor = 'bg-zinc-900 border-zinc-800 text-zinc-400';
              if (isAnswered) {
                btnColor = 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold';
              }
              if (isCurrent) {
                btnColor += ' ring-2 ring-amber-400';
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`w-9 h-9 rounded-xl border text-xs flex items-center justify-center relative transition ${btnColor}`}
                >
                  {i + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-100 text-center mb-2">
                هل أنت متأكد من تسليم الامتحان؟
              </h3>
              
              <p className="text-xs text-zinc-400 text-center leading-relaxed mb-6">
                لقد أجبت على <strong className="text-amber-400">{answeredCount}</strong> من أصل <strong className="text-zinc-200">{totalQuestions}</strong> سؤالاً.
                {totalQuestions - answeredCount > 0 && (
                  <span className="text-rose-400 block mt-1">
                    تنبيه: لديك {totalQuestions - answeredCount} أسئلة لم تقم بالإجابة عليها بعد!
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSubmitExam(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  نعم، تسليم وتصحيح الآن
                </button>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs border border-zinc-700 transition"
                >
                  متابعة الحل
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: EXAM CATALOG & HUB (Main Directory)
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Hero Exam Portal Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-zinc-900/80 to-zinc-900/60 border border-amber-500/20 shadow-xl relative overflow-hidden text-right">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              <GraduationCap className="w-4 h-4" />
              <span>بنك الامتحانات الإلكترونية التفاعلية للثانوية العامة 2026</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 mb-2">
              اختبر معلوماتك وتدرّب على أسئلة الامتحان الوزاري
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              نماذج امتحانية معتمدة تغطي كافة مواد الشعبة العلمية والأدبية، محددة بوقت زمني مع تصحيح إلكتروني فوري وشرح تفصيلي لكل مسألة وسؤال.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleGenerateRandomQuiz}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد اختبار تدريبي سريع (15 دقيقة)</span>
            </button>

            <button
              onClick={onNavigateToStats}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 font-bold text-xs border border-amber-500/30 transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>عرض إحصائياتي ونتائجي السابقة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Grade Filter Row */}
        <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-zinc-850">
          <span className="text-xs font-bold text-amber-400 ml-2">المرحلة الدراسية:</span>
          {grades.map(grd => (
            <button
              key={grd}
              onClick={() => setSelectedGrade(grd)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedGrade === grd
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-extrabold'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              {grd}
            </button>
          ))}
        </div>

        {/* Subject Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Subject Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                  selectedSubject === sub
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-bold'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الامتحانات والأسئلة..."
              className="w-full py-2 pr-9 pl-4 text-xs bg-zinc-900/80 border border-zinc-800 rounded-2xl focus:outline-none focus:border-amber-500 text-zinc-100 placeholder:text-zinc-500 text-right"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
        {filteredExams.map((exam) => {
          // Check if user has taken this exam before
          const pastSub = stats.recentExams.find(s => s.examId === exam.id);

          return (
            <div
              key={exam.id}
              className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/5 transition duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Subject & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    {exam.subject}
                  </span>
                  
                  <span className="text-[11px] font-medium text-zinc-400">
                    {exam.badge || 'نموذج وزاري'}
                  </span>
                </div>

                {/* Exam Title */}
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-300 transition duration-200 mb-2 leading-snug">
                  {exam.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                  {exam.description}
                </p>

                {/* Meta details */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-800/60 mb-5 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">المدة</span>
                    <span className="text-xs font-bold text-zinc-200 flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {exam.durationMinutes} دقيقة
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 block">الأسئلة</span>
                    <span className="text-xs font-bold text-zinc-200 flex items-center justify-center gap-1 mt-0.5">
                      <HelpCircle className="w-3 h-3 text-amber-400" />
                      {exam.questionsCount} سؤالاً
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 block">الدرجة</span>
                    <span className="text-xs font-bold text-amber-400 mt-0.5 block">
                      {exam.totalMarks} درجة
                    </span>
                  </div>
                </div>

                {/* Past score badge if exists */}
                {pastSub && (
                  <div className="mb-4 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">آخر درجة حققتها:</span>
                    <span className="font-bold text-emerald-400">
                      {pastSub.score} / {pastSub.totalMarks} ({pastSub.percentage}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Start Exam Button */}
              <button
                onClick={() => handleStartExam(exam)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/30 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>بدء الامتحان الآن</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
          <GraduationCap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300 mb-1">لم يتم العثور على امتحانات مطابقة</h3>
          <p className="text-xs text-zinc-500">جرب البحث بكلمات أخرى أو تغيير تصنيف المادة.</p>
        </div>
      )}

    </div>
  );
};
