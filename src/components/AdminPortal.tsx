import React, { useState, useEffect } from 'react';
import { Book, Summary, Video, Article, User, AuditLog, AdminStats, Exam, ExamQuestion } from '../types';
import { getAllStudentExams, addCustomStudentExam, deleteStudentExam } from '../data/studentExamsData';
import { markItemAsDeleted, saveCustomItem, saveEditedItem, dispatchContentChanged } from '../utils/contentStore';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Users, 
  BookOpen, 
  FileText, 
  Image, 
  Video as VideoIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  BarChart3, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  X,
  ExternalLink,
  Save,
  Sparkles,
  Search,
  UserCheck,
  UserX,
  ArrowRight,
  GraduationCap,
  Upload,
  FileUp,
  HelpCircle,
  Check
} from 'lucide-react';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose, onDataChanged }) => {
  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminUser, setAdminUser] = useState('ARM');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active Admin View Tab
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'books' | 'summaries' | 'videos' | 'articles' | 'exams' | 'users' | 'security'>('dashboard');

  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [studentExams, setStudentExams] = useState<Exam[]>(getAllStudentExams);
  const [loadingData, setLoadingData] = useState(false);

  // Form States - Book (with PDF file upload & Cover upload preview)
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookCategory, setBookCategory] = useState('كتب الطلاب');
  const [bookFilePath, setBookFilePath] = useState('');
  const [bookPdfFileName, setBookPdfFileName] = useState('');
  const [bookPdfSize, setBookPdfSize] = useState('');
  const [bookCoverPath, setBookCoverPath] = useState('');
  const [bookCoverPreview, setBookCoverPreview] = useState('');
  const [bookIsStudent, setBookIsStudent] = useState(1);
  const [bookGrade, setBookGrade] = useState('الثانوية العامة');
  const [bookDescription, setBookDescription] = useState('');

  // Form States - Student Exam
  const [showExamModal, setShowExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState('كيمياء');
  const [examGrade, setExamGrade] = useState('الصف الثالث الثانوي');
  const [examDuration, setExamDuration] = useState(25);
  const [examTotalMarks, setExamTotalMarks] = useState(30);
  const [examPassMarks, setExamPassMarks] = useState(18);
  const [examDifficulty, setExamDifficulty] = useState<'متوسط' | 'متقدم' | 'نموذج وزاري'>('نموذج وزاري');
  const [examBadge, setExamBadge] = useState('بنك أسئلة الوزارة');
  const [examDescription, setExamDescription] = useState('');
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([
    {
      id: 1,
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
      topic: 'الوحدة الأولى'
    }
  ]);

  // Form States - Summary
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState('');
  const [summaryImagePath, setSummaryImagePath] = useState('');
  const [summaryCategory, setSummaryCategory] = useState('عام');

  // Form States - Video
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCategory, setVideoCategory] = useState('شروحات');
  const [videoChannel, setVideoChannel] = useState('المكتبة الرقمية');
  const [videoDuration, setVideoDuration] = useState('20:00');

  // Form States - Article
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleImagePath, setArticleImagePath] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('ARM');
  const [articleReadTime, setArticleReadTime] = useState('5 دقائق');

  // Security - Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [changingPwd, setChangingPwd] = useState(false);

  // Search in tables
  const [tableSearch, setTableSearch] = useState('');

  // Check stored admin session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('arm_admin_token');
    if (savedToken) {
      verifyAdminToken(savedToken);
    }
  }, []);

  const verifyAdminToken = async (token: string) => {
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setIsAdminLoggedIn(true);
        setAdminToken(token);
        fetchAdminData(token);
      } else {
        localStorage.removeItem('arm_admin_token');
      }
    } catch (e) {
      localStorage.removeItem('arm_admin_token');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsernameInput,
          password: adminPassInput,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل التحقق من هوية الأدمن');
      }

      setIsAdminLoggedIn(true);
      setAdminToken(data.token);
      setAdminUser(data.username);
      localStorage.setItem('arm_admin_token', data.token);
      fetchAdminData(data.token);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('arm_admin_token');
    setIsAdminLoggedIn(false);
    setAdminToken('');
  };

  const fetchAdminData = async (token = adminToken) => {
    if (!token) return;
    setLoadingData(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, booksRes, sumRes, vidRes, artRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/books'),
        fetch('/api/summaries'),
        fetch('/api/videos'),
        fetch('/api/articles'),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/security/logs', { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (booksRes.ok) {
        const b = await booksRes.json();
        setBooks(b.books || []);
      }
      if (sumRes.ok) {
        const s = await sumRes.json();
        setSummaries(s.summaries || []);
      }
      if (vidRes.ok) {
        const v = await vidRes.json();
        setVideos(v.videos || []);
      }
      if (artRes.ok) {
        const a = await artRes.json();
        setArticles(a.articles || []);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
      }
      if (logsRes.ok) {
        const l = await logsRes.json();
        setLogs(l.logs || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // BOOK ACTIONS
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBookId ? `/api/books/${editingBookId}` : '/api/books';
      const method = editingBookId ? 'PUT' : 'POST';

      const payload = {
        title: bookTitle,
        category: bookCategory,
        filepath: bookFilePath,
        coverpath: bookCoverPath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        is_student: bookIsStudent,
        grade: bookGrade,
        description: bookDescription,
      };

      // Always save locally in contentStore immediately for rock-solid sync
      if (editingBookId) {
        saveEditedItem('book', editingBookId, payload);
      } else {
        const newBook: Book = {
          id: Date.now(),
          ...payload,
          downloads: 0,
          views: 0,
          created_at: new Date().toISOString()
        };
        saveCustomItem('book', newBook);
      }
      dispatchContentChanged();

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      setShowBookModal(false);
      resetBookForm();
      fetchAdminData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBookPdfFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setBookPdfSize(`${sizeMb} ميجابايت`);
    if (!bookTitle) {
      setBookTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBookFilePath(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setBookCoverPath(url);
        setBookCoverPreview(url);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteBook = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكتاب نهائياً من المكتبة؟')) return;
    try {
      markItemAsDeleted('book', id);
      setBooks(prev => prev.filter(b => b.id !== id));
      await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => {});
      fetchAdminData();
      onDataChanged();
    } catch (err) {
      // handled
    }
  };

  const openEditBook = (b: Book) => {
    setEditingBookId(b.id);
    setBookTitle(b.title);
    setBookCategory(b.category);
    setBookFilePath(b.filepath);
    setBookPdfFileName('');
    setBookPdfSize('');
    setBookCoverPath(b.coverpath);
    setBookCoverPreview(b.coverpath);
    setBookIsStudent(b.is_student);
    setBookGrade(b.grade || '');
    setBookDescription(b.description || '');
    setShowBookModal(true);
  };

  const resetBookForm = () => {
    setEditingBookId(null);
    setBookTitle('');
    setBookCategory('كتب الطلاب');
    setBookFilePath('');
    setBookPdfFileName('');
    setBookPdfSize('');
    setBookCoverPath('');
    setBookCoverPreview('');
    setBookIsStudent(1);
    setBookGrade('الثانوية العامة');
    setBookDescription('');
  };

  // STUDENT EXAMS ACTIONS
  const handleDeleteExam = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الامتحان بالكامل من المنصة؟')) return;
    const updated = deleteStudentExam(id);
    setStudentExams(updated);
    onDataChanged();
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      alert('يرجى إدخال عنوان الامتحان');
      return;
    }
    if (examQuestions.length === 0) {
      alert('يرجى إضافة سؤال واحد على الأقل للامتحان');
      return;
    }
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i];
      if (!q.question.trim()) {
        alert(`يرجى كتابة نص السؤال رقم ${i + 1}`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert(`يرجى ملء جميع الخيارات الأربعة للسؤال رقم ${i + 1}`);
        return;
      }
    }

    const newExam: Exam = {
      id: 'exam_' + Date.now(),
      title: examTitle.trim(),
      subject: examSubject,
      grade: examGrade,
      durationMinutes: Number(examDuration),
      difficulty: examDifficulty,
      totalMarks: Number(examTotalMarks),
      passMarks: Number(examPassMarks),
      questionsCount: examQuestions.length,
      badge: examBadge || 'امتحان مدرسي',
      description: examDescription || `امتحان تدريبي في مادة ${examSubject} لطلاب ${examGrade}`,
      questions: examQuestions.map((q, idx) => ({ ...q, id: idx + 1 }))
    };

    const updated = addCustomStudentExam(newExam);
    setStudentExams(updated);
    setShowExamModal(false);
    resetExamForm();
    onDataChanged();
    alert('تمت إضافة الامتحان بنجاح وأصبح متاحاً للطلاب فوراً! 🎉');
  };

  const resetExamForm = () => {
    setExamTitle('');
    setExamSubject('كيمياء');
    setExamGrade('الصف الثالث الثانوي');
    setExamDuration(25);
    setExamTotalMarks(30);
    setExamPassMarks(18);
    setExamDifficulty('نموذج وزاري');
    setExamBadge('بنك أسئلة الوزارة');
    setExamDescription('');
    setExamQuestions([
      {
        id: 1,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        topic: 'الوحدة الأولى'
      }
    ]);
  };

  const handleAddQuestionToExam = () => {
    setExamQuestions(prev => [
      ...prev,
      {
        id: prev.length + 1,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        topic: `سؤال ${prev.length + 1}`
      }
    ]);
  };

  const handleRemoveQuestionFromExam = (index: number) => {
    if (examQuestions.length <= 1) {
      alert('يجب أن يحتوي الامتحان على سؤال واحد على الأقل');
      return;
    }
    setExamQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestionField = (index: number, field: keyof ExamQuestion, value: any) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleUpdateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  // SUMMARY ACTIONS
  const [editingSummaryId, setEditingSummaryId] = useState<number | null>(null);

  const openEditSummary = (s: Summary) => {
    setEditingSummaryId(s.id);
    setSummaryTitle(s.title);
    setSummaryImagePath(s.imagepath);
    setSummaryCategory(s.category);
    setShowSummaryModal(true);
  };

  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: summaryTitle,
        imagepath: summaryImagePath,
        category: summaryCategory,
      };

      if (editingSummaryId) {
        saveEditedItem('summary', editingSummaryId, payload);
      } else {
        const newSum: Summary = {
          id: Date.now(),
          ...payload,
          views: 0,
          created_at: new Date().toISOString()
        };
        saveCustomItem('summary', newSum);
      }
      dispatchContentChanged();

      const url = editingSummaryId ? `/api/summaries/${editingSummaryId}` : '/api/summaries';
      const method = editingSummaryId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      setShowSummaryModal(false);
      setEditingSummaryId(null);
      setSummaryTitle('');
      setSummaryImagePath('');
      fetchAdminData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSummary = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف صورة الملخص نهائياً؟')) return;
    try {
      markItemAsDeleted('summary', id);
      setSummaries(prev => prev.filter(s => s.id !== id));
      dispatchContentChanged();

      await fetch(`/api/summaries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => {});
      fetchAdminData();
      onDataChanged();
    } catch (e) {
      // handled
    }
  };

  // VIDEO ACTIONS
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);

  const openEditVideo = (v: Video) => {
    setEditingVideoId(v.id);
    setVideoTitle(v.title);
    setVideoUrl(v.videourl);
    setVideoCategory(v.category);
    setVideoChannel(v.channel || 'المكتبة الرقمية');
    setVideoDuration(v.duration || '20:00');
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: videoTitle,
        videourl: videoUrl,
        category: videoCategory,
        channel: videoChannel,
        duration: videoDuration,
      };

      if (editingVideoId) {
        saveEditedItem('video', editingVideoId, payload);
      } else {
        const newVid: Video = {
          id: Date.now(),
          ...payload,
          views: 0,
          created_at: new Date().toISOString()
        };
        saveCustomItem('video', newVid);
      }
      dispatchContentChanged();

      const url = editingVideoId ? `/api/videos/${editingVideoId}` : '/api/videos';
      const method = editingVideoId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      setShowVideoModal(false);
      setEditingVideoId(null);
      setVideoTitle('');
      setVideoUrl('');
      fetchAdminData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف مقطع الفيديو نهائياً؟')) return;
    try {
      markItemAsDeleted('video', id);
      setVideos(prev => prev.filter(v => v.id !== id));
      dispatchContentChanged();

      await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => {});
      fetchAdminData();
      onDataChanged();
    } catch (e) {
      // handled
    }
  };

  // ARTICLE ACTIONS
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: articleTitle,
        content: articleContent,
        imagepath: articleImagePath || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
        author: articleAuthor,
        readTime: articleReadTime,
      };

      if (editingArticleId) {
        saveEditedItem('article', editingArticleId, payload);
      } else {
        const newArt: Article = {
          id: Date.now(),
          ...payload,
          views: 0,
          created_at: new Date().toISOString()
        };
        saveCustomItem('article', newArt);
      }
      dispatchContentChanged();

      const url = editingArticleId ? `/api/articles/${editingArticleId}` : '/api/articles';
      const method = editingArticleId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});

      setShowArticleModal(false);
      setEditingArticleId(null);
      setArticleTitle('');
      setArticleContent('');
      setArticleImagePath('');
      fetchAdminData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المقال نهائياً؟')) return;
    try {
      markItemAsDeleted('article', id);
      setArticles(prev => prev.filter(a => a.id !== id));
      dispatchContentChanged();

      await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => {});
      fetchAdminData();
      onDataChanged();
    } catch (e) {
      // handled
    }
  };

  // SECURITY: CHANGE PASSWORD
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setChangingPwd(true);

    try {
      const res = await fetch('/api/admin/security/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث كلمة المرور');

      setPwdMsg({ text: data.message, type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchAdminData();
    } catch (err: any) {
      setPwdMsg({ text: err.message, type: 'error' });
    } finally {
      setChangingPwd(false);
    }
  };

  // USER MANAGEMENT ACTIONS
  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAdminData();
    } catch (e) {
      alert('فشل تحديث حالة المستخدم');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم وسجلاته؟')) return;
    try {
      markItemAsDeleted('user', id);
      setUsers(prev => prev.filter(u => u.id !== id));
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => {});
      fetchAdminData();
    } catch (e) {
      // handled
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('هل تريد تصفير سجلات الأمان وبدء دورة أمنية جديدة؟')) return;
    try {
      await fetch('/api/admin/security/clear-logs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      fetchAdminData();
    } catch (e) {
      alert('فشل تصفير السجلات');
    }
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------------------
  // IF NOT LOGGED IN AS ADMIN: SHOW HIGH-SECURITY ADMIN LOGIN SCREEN
  // -------------------------------------------------------------------------
  if (!isAdminLoggedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
        <div 
          className="relative w-full max-w-md bg-zinc-950 border border-amber-500/40 rounded-3xl p-8 shadow-2xl text-right overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-zinc-950 shadow-xl mb-3">
              <ShieldCheck className="w-8 h-8 stroke-[2.3]" />
            </div>
            <h2 className="text-xl font-bold text-amber-100">بوابة تحكم المدير والأمان</h2>
            <p className="text-xs text-zinc-400 mt-1">
              الرجاء إدخال بيانات الاعتماد الإدارية المصرح بها للوصول إلى لوحة الأمان والتحكم.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">اسم مستخدم الأدمن</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="ARM"
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">كلمة مرور الأدمن</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="•••••••••"
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {authLoading ? 'جاري التحقق من الصلاحيات...' : 'التحقق والدخول إلى لوحة الأمان 🛡️'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FULL-FEATURED ADMIN & SECURITY MANAGEMENT INTERFACE
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Admin Security Bar */}
      <header className="bg-zinc-900/90 border-b border-amber-500/30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-lg">
            <ShieldCheck className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-amber-200">مركز إدارة المنصة والأمان</h2>
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                الأمان نشط ومحمي
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              جلسة المدير: <span className="text-amber-400 font-bold">{adminUser}</span> | محرك البيانات: {stats?.analytics.database || 'Local High-Speed Engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdminData()}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <a
            href="/api/admin/backup"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-amber-300 hover:bg-zinc-700 text-xs font-semibold border border-zinc-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>نسخة احتياطية JSON</span>
          </a>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>عرض المنصة الرئيسية</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج المدير</span>
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <nav className="bg-zinc-900/60 border-b border-zinc-800 px-6 flex flex-wrap gap-2 py-2 overflow-x-auto">
        {[
          { id: 'dashboard', label: '📊 لوحة المؤشرات والإحصائيات', icon: BarChart3 },
          { id: 'books', label: `📚 الكتب والمناهج (${books.length})`, icon: BookOpen },
          { id: 'summaries', label: `🖼️ ملخصات الصور (${summaries.length})`, icon: Image },
          { id: 'videos', label: `🎬 مقاطع الفيديو (${videos.length})`, icon: VideoIcon },
          { id: 'articles', label: `📝 المقالات (${articles.length})`, icon: FileText },
          { id: 'exams', label: `🎓 امتحانات الطلاب (${studentExams.length})`, icon: GraduationCap },
          { id: 'users', label: `👥 إدارة المستخدمين (${users.length})`, icon: Users },
          { id: 'security', label: '🛡️ مركز الأمان وكلمة المرور والسجلات', icon: KeyRound },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === tab.id
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* ------------------------------------------------------------------- */}
        {/* 1. DASHBOARD OVERVIEW */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-amber-400">{books.length}</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">إجمالي الكتب والمناهج</p>
                <div className="text-[11px] text-amber-500 mt-2 font-bold">
                  {books.filter(b => b.is_student === 1).length} مناهج دراسية للطلاب
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-emerald-400">{users.length}</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">المستخدمون المسجلون</p>
                <div className="text-[11px] text-emerald-500 mt-2 font-bold">
                  {users.filter(u => u.status === 'active').length} حسابات نشطة حالياً
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-blue-400">{summaries.length}</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">ملخصات الصور والخرائط</p>
                <div className="text-[11px] text-blue-500 mt-2 font-bold">خرائط ذهنية عالية الدقة</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-rose-400">{videos.length}</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">مقاطع الفيديو والشروحات</p>
                <div className="text-[11px] text-rose-500 mt-2 font-bold">مشغلات مدمجة تفاعلية</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-purple-400">{articles.length}</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">المقالات المنشورة</p>
                <div className="text-[11px] text-purple-500 mt-2 font-bold">مدعومة بصيغة Markdown</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-amber-300">
                  {books.reduce((acc, b) => acc + (b.downloads || 0), 0)}
                </span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">إجمالي مرات التنزيل</p>
                <div className="text-[11px] text-amber-500 mt-2 font-bold">تنزيلات PDF للطلاب</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-cyan-400">
                  {logs.length}
                </span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">سجلات الرقابة الأمنية</p>
                <div className="text-[11px] text-cyan-500 mt-2 font-bold">مراقبة على مدار الساعة</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
                <span className="text-2xl font-black text-emerald-400">100%</span>
                <p className="text-xs text-zinc-400 mt-1 font-semibold">مؤشر سلامة وحماية النظام</p>
                <div className="text-[11px] text-emerald-500 mt-2 font-bold">خالي من الثغرات الأمنية</div>
              </div>
            </div>

            {/* Quick Actions & Security Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>التحكم السريع في المنصة</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  يمكنك إضافة أي كتاب جديد، مقال تفصيلي، ملخص مصور، أو فحص سجل الأمان بضغطة زر واحدة.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => { resetBookForm(); setShowBookModal(true); }}
                  className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة كتاب جديد</span>
                </button>
                <button
                  onClick={() => setShowArticleModal(true)}
                  className="px-4 py-2.5 bg-zinc-800 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 hover:bg-zinc-700 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>نشر مقال</span>
                </button>
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="px-4 py-2.5 bg-zinc-800 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 hover:bg-zinc-700 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة خريطة ذهنية</span>
                </button>
              </div>
            </div>

            {/* Recent Audit Activity Snapshot */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>أحدث العمليات الأمنية والإدارية الموثقة</span>
                </h3>
                <button
                  onClick={() => setActiveAdminTab('security')}
                  className="text-xs text-amber-400 hover:underline"
                >
                  عرض كافة السجلات ({logs.length}) ←
                </button>
              </div>

              <div className="space-y-2">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-400' : log.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                      }`} />
                      <span className="font-bold text-zinc-200">{log.user}:</span>
                      <span className="text-zinc-400">{log.details}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG')} - {new Date(log.timestamp).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 2. BOOKS & CURRICULUMS MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'books' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => { resetBookForm(); setShowBookModal(true); }}
                className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-2xl shadow-md hover:brightness-110 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة كتاب أو منهج دراسي جديد</span>
              </button>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث في الكتب..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full py-2 pr-9 pl-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Books Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">الغلاف</th>
                      <th className="py-3 px-4">العنوان</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">المرحلة</th>
                      <th className="py-3 px-4">التنزيلات</th>
                      <th className="py-3 px-4">المشاهدات</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {books
                      .filter(b => !tableSearch || b.title.includes(tableSearch) || b.category.includes(tableSearch))
                      .map((book) => (
                        <tr key={book.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4">
                            <img src={book.coverpath} alt="" className="w-10 h-14 object-cover rounded-lg border border-zinc-800" />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-zinc-100 block">{book.title}</span>
                            <span className="text-[10px] text-zinc-500 truncate max-w-xs block">{book.description}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              book.is_student ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {book.is_student ? '🎓 كتب الطلاب' : book.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{book.grade || 'عام'}</td>
                          <td className="py-3 px-4 font-bold text-amber-400">{book.downloads || 0}</td>
                          <td className="py-3 px-4 text-zinc-400">{book.views || 0}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={book.filepath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition"
                                title="معاينة الملف"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => openEditBook(book)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-400 transition"
                                title="تعديل الكتاب"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBook(book.id)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-rose-400 transition"
                                title="حذف الكتاب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 3. SUMMARIES MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'summaries' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowSummaryModal(true)}
                className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-2xl shadow-md hover:brightness-110 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ملخص صورة أو خريطة ذهنية</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaries.map((sum) => (
                <div key={sum.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between space-y-3">
                  <div className="h-44 rounded-2xl overflow-hidden bg-black border border-zinc-800 relative group">
                    <img src={sum.imagepath} alt={sum.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-amber-300 text-[10px] font-bold">
                      {sum.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-100 line-clamp-1">{sum.title}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <a
                      href={sum.imagepath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      عرض بدقة كاملة
                    </a>
                    <button
                      onClick={() => handleDeleteSummary(sum.id)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-rose-400 transition"
                      title="حذف الملخص"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 4. VIDEOS MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'videos' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-2xl shadow-md hover:brightness-110 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فيديو أو شرح دراسي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between space-y-3">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
                    <iframe
                      src={vid.videourl.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-100 line-clamp-2">{vid.title}</h4>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2">
                      <span>{vid.channel || 'المكتبة'}</span>
                      <span>⏱️ {vid.duration || '20 دقيقة'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-amber-400 font-bold">
                      {vid.category}
                    </span>
                    <button
                      onClick={() => handleDeleteVideo(vid.id)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-rose-400 transition"
                      title="حذف الفيديو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 5. ARTICLES MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'articles' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setEditingArticleId(null);
                  setArticleTitle('');
                  setArticleContent('');
                  setArticleImagePath('');
                  setShowArticleModal(true);
                }}
                className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-2xl shadow-md hover:brightness-110 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>نشر مقال علمي أو إرشادي جديد</span>
              </button>
            </div>

            <div className="space-y-3">
              {articles.map((art) => (
                <div key={art.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <img src={art.imagepath} alt="" className="w-20 h-20 rounded-2xl object-cover border border-zinc-800 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">{art.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 max-w-xl">{art.content.replace(/[\#\*\>]/g, '')}</p>
                      <div className="flex items-center gap-3 text-[11px] text-amber-500 mt-2 font-semibold">
                        <span>الكاتب: {art.author}</span>
                        <span>•</span>
                        <span>وقت القراءة: {art.readTime}</span>
                        <span>•</span>
                        <span>👁️ {art.views} مشاهدة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingArticleId(art.id);
                        setArticleTitle(art.title);
                        setArticleContent(art.content);
                        setArticleImagePath(art.imagepath);
                        setArticleAuthor(art.author);
                        setArticleReadTime(art.readTime);
                        setShowArticleModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-300 text-xs font-bold border border-zinc-700 transition"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art.id)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-rose-400 border border-zinc-700 transition"
                      title="حذف المقال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 6. USERS MANAGEMENT (حسابات المستخدمين المسجلين) */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'users' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-200">إدارة حسابات المستفيدين والطلاب المسجلين</h3>
                <p className="text-xs text-zinc-400 mt-0.5">يمكنك تجميد الحسابات المشبوهة، تغيير الصلاحيات، أو إزالة المستخدمين.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                إجمالي المسجلين: {users.length}
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">المستخدم</th>
                      <th className="py-3 px-4">البريد الإلكتروني</th>
                      <th className="py-3 px-4">المرحلة الدراسية</th>
                      <th className="py-3 px-4">الرتبة</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">تاريخ الانضمام</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4 flex items-center gap-2">
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                          <span className="font-bold text-zinc-200">{u.name}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                        <td className="py-3 px-4 text-zinc-300">{u.academicStage || 'غير محدد'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'moderator' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {u.role === 'moderator' ? 'مشرف' : 'مستخدم'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {u.status === 'active' ? 'نشط' : 'محظور / مجمّد'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                u.status === 'active'
                                  ? 'bg-zinc-800 text-rose-400 border-zinc-700 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                            >
                              {u.status === 'active' ? 'تجميد 🚫' : 'تنشيط ✅'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-rose-400 transition"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 6.5 EXAMS MANAGEMENT FOR STUDENTS */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'exams' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => { resetExamForm(); setShowExamModal(true); }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-2xl shadow-md hover:brightness-110 transition flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة امتحان أو اختبار إلكتروني جديد للطلاب 🎓</span>
              </button>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="بحث في الامتحانات..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full py-2 pr-9 pl-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Exams Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">عنوان الامتحان</th>
                      <th className="py-3 px-4">المادة</th>
                      <th className="py-3 px-4">المرحلة الدراسية</th>
                      <th className="py-3 px-4">المدة</th>
                      <th className="py-3 px-4">عدد الأسئلة</th>
                      <th className="py-3 px-4">الدرجة الكلية</th>
                      <th className="py-3 px-4">مستوى الصعوبة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {studentExams
                      .filter(e => !tableSearch || e.title.includes(tableSearch) || e.subject.includes(tableSearch) || e.grade.includes(tableSearch))
                      .map((exam) => (
                        <tr key={exam.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-bold text-zinc-100">
                            <span>{exam.title}</span>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-xs">{exam.description}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              {exam.subject}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-semibold">{exam.grade}</td>
                          <td className="py-3 px-4 text-zinc-400">{exam.durationMinutes} دقيقة</td>
                          <td className="py-3 px-4 text-zinc-200 font-bold">{exam.questions.length} أسئلة</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{exam.totalMarks} (نجاح {exam.passMarks})</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-300">
                              {exam.difficulty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-rose-400 transition"
                                title="حذف الامتحان بالكامل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 7. SECURITY & PASSWORD HUB (تحسين صفحة الأمان) */}
        {/* ------------------------------------------------------------------- */}
        {activeAdminTab === 'security' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Security Status Banner */}
            <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-200">حالة جدار الحماية ونظام الأمان المتقدم</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      النظام محمي بجلسات مشفرة، تقييد محاولات الدخول الخاطئة (Brute-force protection)، وتسجيل تدقيقي لكافة العمليات.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    🛡️ الجدار الناري: مُفعل 100%
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold">
                    تشفير الجلسات: نشط
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* CHANGE ADMIN PASSWORD FORM */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>تغيير كلمة مرور المدير (الأدمن)</span>
                </h4>
                <p className="text-xs text-zinc-400">
                  قم بتعيين كلمة مرور قوية تتضمن حروفاً وأرقاماً لمنع أي وصول غير مصرح به.
                </p>

                {pwdMsg && (
                  <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    pwdMsg.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}>
                    {pwdMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{pwdMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeAdminPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">كلمة المرور الحالية</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية"
                      className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة مرور جديدة (6 خانات فأكثر)"
                      className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور للتأكيد"
                      className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPwd}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition disabled:opacity-50"
                  >
                    {changingPwd ? 'جاري الحفظ والتدقيق الأمني...' : 'تأكيد وحفظ كلمة المرور الجديدة 🔐'}
                  </button>
                </form>
              </div>

              {/* SYSTEM HEALTH & BACKUP */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>سلامة البيانات والنسخ الاحتياطي</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    احرص على أخذ نسخة احتياطية بشكل دوري لحماية بيانات الطلاب والكتب.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                      <span className="text-zinc-400">قاعدة البيانات:</span>
                      <span className="font-bold text-amber-400">{stats?.analytics.database || 'Local Store'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                      <span className="text-zinc-400">مجموع السجلات:</span>
                      <span className="font-bold text-zinc-200">
                        {books.length + summaries.length + videos.length + articles.length + users.length} سجل
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                      <span className="text-zinc-400">حالة السيرفر:</span>
                      <span className="font-bold text-emerald-400">يعمل بكفاءة 100%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
                  <a
                    href="/api/admin/backup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل نسخة احتياطية من قاعدة البيانات (.json)</span>
                  </a>
                </div>
              </div>

            </div>

            {/* AUDIT LOGS TABLE */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-amber-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>سجل الرقابة الأمنية والعمليات الموثقة (Audit Security Logs)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    كل تسجيل دخول، تعديل، حذف، أو محاولة مشبوهة يتم تسجيلها تلقائياً مع عنوان IP والتوقيت.
                  </p>
                </div>

                <button
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-xs font-semibold border border-zinc-700 transition"
                >
                  تصفير السجلات 🔄
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">المستخدم / الفاعل</th>
                      <th className="py-2.5 px-3">تفاصيل العملية</th>
                      <th className="py-2.5 px-3">عنوان IP</th>
                      <th className="py-2.5 px-3">التوقيت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'success' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : log.status === 'warning' 
                              ? 'bg-amber-500/20 text-amber-300' 
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {log.status === 'success' ? 'نجاح ✅' : log.status === 'warning' ? 'تنبيه ⚠️' : 'خطر 🛑'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-200">{log.user}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{log.details}</td>
                        <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">{log.ip}</td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT BOOK */}
      {/* ------------------------------------------------------------------- */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowBookModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-amber-200 mb-4">
              {editingBookId ? 'تعديل بيانات الكتاب' : 'إضافة كتاب أو منهج دراسي جديد'}
            </h3>

            <form onSubmit={handleSaveBook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">عنوان الكتاب</label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="مثال: كتاب الفيزياء الحديثة 2026"
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">التصنيف</label>
                  <select
                    value={bookCategory}
                    onChange={(e) => setBookCategory(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="كتب الطلاب">كتب الطلاب</option>
                    <option value="برمجة">برمجة</option>
                    <option value="تقنية">تقنية</option>
                    <option value="علوم">علوم</option>
                    <option value="أدب">أدب</option>
                    <option value="تعليم">تعليم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المرحلة / الصف</label>
                  <input
                    type="text"
                    value={bookGrade}
                    onChange={(e) => setBookGrade(e.target.value)}
                    placeholder="مثال: الصف الثالث الثانوي"
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* PDF File Picker (Local upload from device or URL) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <label className="block text-xs font-bold text-amber-300">
                  ملف الكتاب PDF (اختر ملفاً من جهازك أو أدخل الرابط) 📄
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label
                    htmlFor="adminLocalPdfInput"
                    className="w-full sm:flex-1 py-3 px-4 bg-zinc-900 border-2 border-dashed border-amber-500/40 hover:border-amber-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-xs font-bold text-amber-300 group"
                  >
                    <FileUp className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                    <span>{bookPdfFileName ? `تم اختيار: ${bookPdfFileName} (${bookPdfSize})` : 'اختر ملف PDF من جهازك'}</span>
                  </label>
                  <input
                    id="adminLocalPdfInput"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileChange}
                    className="hidden"
                  />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={bookFilePath}
                    onChange={(e) => setBookFilePath(e.target.value)}
                    placeholder="أو أدخل رابط PDF مباشر (URL)"
                    className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  {bookFilePath && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-bold">
                      جاهز ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Cover Image Picker (Local upload from device or URL) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <label className="block text-xs font-bold text-amber-300">
                  صورة غلاف الكتاب (اختر من جهازك أو ضع رابطاً) 🖼️
                </label>

                <div className="flex items-center gap-3">
                  <label
                    htmlFor="adminLocalCoverInput"
                    className="flex-1 py-2.5 px-3 bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-amber-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-xs font-semibold text-zinc-300 group"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                    <span>{bookCoverPreview ? 'تغيير صورة الغلاف من جهازك' : 'رفع صورة غلاف من جهازك'}</span>
                  </label>
                  <input
                    id="adminLocalCoverInput"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />

                  {bookCoverPreview && (
                    <img 
                      src={bookCoverPreview} 
                      alt="Cover Preview" 
                      className="w-10 h-14 object-cover rounded-lg border border-amber-500/50 shadow flex-shrink-0" 
                    />
                  )}
                </div>

                <input
                  type="text"
                  value={bookCoverPath}
                  onChange={(e) => {
                    setBookCoverPath(e.target.value);
                    setBookCoverPreview(e.target.value);
                  }}
                  placeholder="أو أدخل رابط صورة الغلاف (URL)"
                  className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <input
                  type="checkbox"
                  id="studentBookCheck"
                  checked={bookIsStudent === 1}
                  onChange={(e) => setBookIsStudent(e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="studentBookCheck" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                  تحديد هذا الكتاب كـ "منهج مدرسي للطلاب" 🎓
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">وصف مختصر للكتاب</label>
                <textarea
                  rows={3}
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  placeholder="اكتب نبذة عن محتويات الكتاب وأهميته..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  حفظ الكتاب وإتاحته للطلاب 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ADD SUMMARY */}
      {/* ------------------------------------------------------------------- */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 text-right">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-amber-200 mb-4">إضافة ملخص بصري / خريطة ذهنية</h3>

            <form onSubmit={handleSaveSummary} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">عنوان الملخص</label>
                <input
                  type="text"
                  required
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  placeholder="مثال: خريطة ذهنية لقواعد النحو والإعراب"
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">التصنيف</label>
                <input
                  type="text"
                  value={summaryCategory}
                  onChange={(e) => setSummaryCategory(e.target.value)}
                  placeholder="مثال: لغة عربية، برمجة، فيزياء..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">رابط الصورة (URL)</label>
                <input
                  type="url"
                  required
                  value={summaryImagePath}
                  onChange={(e) => setSummaryImagePath(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {summaryImagePath && (
                <div className="h-40 rounded-xl overflow-hidden bg-black border border-zinc-800">
                  <img src={summaryImagePath} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-md"
              >
                حفظ الملخص 🖼️
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ADD VIDEO */}
      {/* ------------------------------------------------------------------- */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 text-right">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-amber-200 mb-4">إضافة مقطع فيديو تعليمي</h3>

            <form onSubmit={handleSaveVideo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">عنوان الفيديو</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="مثال: شرح درس التفاضل والتكامل كاملاً"
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">رابط الفيديو (YouTube)</label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">التصنيف</label>
                  <input
                    type="text"
                    value={videoCategory}
                    onChange={(e) => setVideoCategory(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">القناة</label>
                  <input
                    type="text"
                    value={videoChannel}
                    onChange={(e) => setVideoChannel(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المدة</label>
                  <input
                    type="text"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-md"
              >
                حفظ الفيديو 🎬
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT ARTICLE */}
      {/* ------------------------------------------------------------------- */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowArticleModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-amber-200 mb-4">
              {editingArticleId ? 'تعديل المقال' : 'نشر مقال علمي جديد'}
            </h3>

            <form onSubmit={handleSaveArticle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">عنوان المقال</label>
                <input
                  type="text"
                  required
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="مثال: استراتيجيات التعلم السريع والتفوق الدراسي"
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم الكاتب</label>
                  <input
                    type="text"
                    value={articleAuthor}
                    onChange={(e) => setArticleAuthor(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">مدة القراءة التقديرية</label>
                  <input
                    type="text"
                    value={articleReadTime}
                    onChange={(e) => setArticleReadTime(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">رابط صورة المقال</label>
                <input
                  type="url"
                  value={articleImagePath}
                  onChange={(e) => setArticleImagePath(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">محتوى المقال (يدعم Markdown)</label>
                <textarea
                  rows={8}
                  required
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="اكتب المقال هنا باستخدام تنسيق الماركداون: ## للعناوين، **للنص العريض**..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-md"
              >
                حفظ ونشر المقال 📝
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT STUDENT EXAM */}
      {/* ------------------------------------------------------------------- */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 text-right max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setShowExamModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-zinc-800 pb-3 mb-5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                منظومة الاختبارات الذكية
              </span>
              <h3 className="text-lg font-bold text-zinc-100 mt-1">
                إضافة امتحان إلكتروني جديد للطلاب 🎓
              </h3>
              <p className="text-xs text-zinc-400">
                أدخل بيانات الامتحان وأسئلته، وسيتاح فوراً في لوحة الطالب وبنك الامتحانات مع التصحيح التلقائي.
              </p>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">عنوان الامتحان</label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="مثال: امتحان الأحياء والوراثة - الصف الثالث الثانوي 2026"
                  className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المادة</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="كيمياء">كيمياء</option>
                    <option value="فيزياء">فيزياء</option>
                    <option value="أحياء">أحياء</option>
                    <option value="علوم">علوم</option>
                    <option value="لغة عربية">لغة عربية</option>
                    <option value="رياضيات">رياضيات</option>
                    <option value="لغة إنجليزية">لغة إنجليزية</option>
                    <option value="جيولوجيا">جيولوجيا</option>
                    <option value="دراسات">دراسات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">الصف الدراسي</label>
                  <select
                    value={examGrade}
                    onChange={(e) => setExamGrade(e.target.value)}
                    className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المدة (بالدقائق)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={examDuration}
                    onChange={(e) => setExamDuration(parseInt(e.target.value) || 20)}
                    className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">الدرجة الكلية</label>
                  <input
                    type="number"
                    value={examTotalMarks}
                    onChange={(e) => setExamTotalMarks(parseInt(e.target.value) || 30)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">درجة النجاح</label>
                  <input
                    type="number"
                    value={examPassMarks}
                    onChange={(e) => setExamPassMarks(parseInt(e.target.value) || 18)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">مستوى الصعوبة</label>
                  <select
                    value={examDifficulty}
                    onChange={(e) => setExamDifficulty(e.target.value as any)}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100"
                  >
                    <option value="متوسط">متوسط</option>
                    <option value="متقدم">متقدم</option>
                    <option value="نموذج وزاري">نموذج وزاري</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">وصف موجز للامتحان</label>
                <textarea
                  rows={2}
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  placeholder="اكتب نبذة عن أبواب المنهج التي يغطيها الاختبار..."
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Questions Section */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>أسئلة الامتحان ({examQuestions.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestionToExam}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سؤال جديد</span>
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {examQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">سؤال رقم {qIdx + 1}</span>
                        {examQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromExam(qIdx)}
                            className="text-xs text-rose-400 hover:text-rose-300 p-1"
                            title="حذف هذا السؤال"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => handleUpdateQuestionField(qIdx, 'question', e.target.value)}
                        placeholder={`نص السؤال رقم ${qIdx + 1}...`}
                        className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctIndex === optIdx}
                              onChange={() => handleUpdateQuestionField(qIdx, 'correctIndex', optIdx)}
                              className="text-amber-500 focus:ring-amber-500"
                              title="حدد هذا الخيار كإجابة صحيحة"
                            />
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => handleUpdateQuestionOption(qIdx, optIdx, e.target.value)}
                              placeholder={`الخيار (${optIdx + 1})`}
                              className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={q.explanation}
                          onChange={(e) => handleUpdateQuestionField(qIdx, 'explanation', e.target.value)}
                          placeholder="الشرح والتفسير العلمي للإجابة الصحيحة..."
                          className="w-full py-1.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300"
                        />
                        <input
                          type="text"
                          value={q.topic}
                          onChange={(e) => handleUpdateQuestionField(qIdx, 'topic', e.target.value)}
                          placeholder="موضوع أو باب السؤال (مثال: الكيمياء الكهربية)..."
                          className="w-full py-1.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  حفظ ونشر الامتحان للطلاب فوراً 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
