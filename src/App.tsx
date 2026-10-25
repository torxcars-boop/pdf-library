import React, { useState, useEffect } from 'react';
import { User, Book, Summary, Video, Article, BookmarkItem, UserSubscription } from './types';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPortal } from './components/AdminPortal';
import { BookDetailModal } from './components/BookDetailModal';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { ImageDetailModal } from './components/ImageDetailModal';
import { VideoDetailModal } from './components/VideoDetailModal';
import { SubscriptionPlansModal } from './components/SubscriptionPlansModal';
import { 
  BookOpen, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Bookmark, 
  Search, 
  Download, 
  Eye, 
  ExternalLink, 
  Sparkles, 
  ArrowLeft,
  CheckCircle,
  MessageCircle,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

import { 
  EGYPT_THANAWEYA_BOOKS, 
  EGYPT_THANAWEYA_VIDEOS, 
  EGYPT_THANAWEYA_SUMMARIES,
  EGYPT_THANAWEYA_ARTICLES,
  EGYPTIAN_SUBJECT_FILTERS
} from './data/egyptCurriculum';
import { RatingStars } from './components/RatingStars';
import { StudentDashboard } from './components/StudentDashboard';
import { Sidebar } from './components/Sidebar';
import { EnglishAITutor } from './components/EnglishAITutor';
import { StudentExamsView } from './components/StudentExamsView';
import { StudentStats } from './types';
import { getStudentStats, saveStudentStats } from './data/studentExamsData';
import { 
  filterOutDeleted, 
  getCustomItems, 
  applyEditedOverrides, 
  recordBookDownload, 
  getDownloadedBooksCount, 
  listenToContentChanged 
} from './utils/contentStore';
import { 
  calculateStudentSubscription, 
  saveStudentSubscription, 
  isEducationalFeatureLocked 
} from './utils/subscriptionStore';
import { TrialCountdownBanner } from './components/TrialCountdownBanner';
import { FeatureLockedModal } from './components/FeatureLockedModal';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string>('');
  
  // Modals & Navigation visibility
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isFeatureLockedModalOpen, setIsFeatureLockedModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState<string>('هذه الميزة التعليمية');

  // Student statistics & local downloads
  const [studentStats, setStudentStats] = useState<StudentStats>(getStudentStats);
  const [downloadedCount, setDownloadedCount] = useState<number>(getDownloadedBooksCount);

  // Detail View Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Filter & Navigation
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data collections - Initialized with comprehensive Egyptian 3rd Secondary curriculum
  const [books, setBooks] = useState<Book[]>(EGYPT_THANAWEYA_BOOKS);
  const [summaries, setSummaries] = useState<Summary[]>(EGYPT_THANAWEYA_SUMMARIES);
  const [videos, setVideos] = useState<Video[]>(EGYPT_THANAWEYA_VIDEOS);
  const [articles, setArticles] = useState<Article[]>(EGYPT_THANAWEYA_ARTICLES);
  const [loading, setLoading] = useState(true);

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Initial Data Fetch & Egyptian Curriculum Synchronization with Persistent Admin Actions
  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes, vRes, aRes] = await Promise.all([
        fetch('/api/books').catch(() => null),
        fetch('/api/summaries').catch(() => null),
        fetch('/api/videos').catch(() => null),
        fetch('/api/articles').catch(() => null),
      ]);

      // 1. Books processing: server authoritative + custom items, filtered by deletions & edits
      let serverBooks: Book[] = [];
      if (bRes && bRes.ok) {
        const b = await bRes.json();
        serverBooks = b.books || [];
      }
      // Never re-inject deleted books! Use server results if available, else initial seed
      let combinedBooks = (serverBooks && serverBooks.length > 0)
        ? [...serverBooks]
        : [...EGYPT_THANAWEYA_BOOKS];

      // Merge custom admin-uploaded books
      const customBooks = getCustomItems<Book>('arm_custom_books_v2');
      customBooks.forEach(cb => {
        if (!combinedBooks.some(b => String(b.id) === String(cb.id))) {
          combinedBooks.unshift(cb);
        }
      });
      // Filter out deleted books (enforcing persistent deletions)
      combinedBooks = filterOutDeleted('book', combinedBooks);
      // Apply edited field overrides
      combinedBooks = applyEditedOverrides('book', combinedBooks);
      // Format student category tags
      combinedBooks = combinedBooks.map(book => {
        if (
          book.title.includes('الثانوية') || 
          book.title.includes('ثانوي') || 
          book.title.includes('إعدادي') || 
          book.grade?.includes('ثانوي') ||
          book.grade?.includes('إعدادي')
        ) {
          return { ...book, is_student: 1 };
        }
        return book;
      });
      setBooks(combinedBooks);

      // 2. Summaries processing
      let serverSums: Summary[] = [];
      if (sRes && sRes.ok) {
        const s = await sRes.json();
        serverSums = s.summaries || [];
      }
      let combinedSums = (serverSums && serverSums.length > 0)
        ? [...serverSums]
        : [...EGYPT_THANAWEYA_SUMMARIES];
      const customSums = getCustomItems<Summary>('arm_custom_summaries_v2');
      customSums.forEach(cs => {
        if (!combinedSums.some(s => String(s.id) === String(cs.id))) {
          combinedSums.unshift(cs);
        }
      });
      combinedSums = filterOutDeleted('summary', combinedSums);
      combinedSums = applyEditedOverrides('summary', combinedSums);
      setSummaries(combinedSums);

      // 3. Videos processing
      let serverVids: Video[] = [];
      if (vRes && vRes.ok) {
        const v = await vRes.json();
        serverVids = v.videos || [];
      }
      let combinedVids = (serverVids && serverVids.length > 0)
        ? [...serverVids]
        : [...EGYPT_THANAWEYA_VIDEOS];
      const customVids = getCustomItems<Video>('arm_custom_videos_v2');
      customVids.forEach(cv => {
        if (!combinedVids.some(v => String(v.id) === String(cv.id))) {
          combinedVids.unshift(cv);
        }
      });
      combinedVids = filterOutDeleted('video', combinedVids);
      combinedVids = applyEditedOverrides('video', combinedVids);
      setVideos(combinedVids);

      // 4. Articles processing
      let serverArts: Article[] = [];
      if (aRes && aRes.ok) {
        const a = await aRes.json();
        serverArts = a.articles || [];
      }
      let combinedArts = (serverArts && serverArts.length > 0)
        ? [...serverArts]
        : [...EGYPT_THANAWEYA_ARTICLES];
      const customArts = getCustomItems<Article>('arm_custom_articles_v2');
      customArts.forEach(ca => {
        if (!combinedArts.some(art => String(art.id) === String(ca.id))) {
          combinedArts.unshift(ca);
        }
      });
      combinedArts = filterOutDeleted('article', combinedArts);
      combinedArts = applyEditedOverrides('article', combinedArts);
      setArticles(combinedArts);

      // Refresh student downloads & statistics
      setDownloadedCount(getDownloadedBooksCount());
      setStudentStats(getStudentStats());
    } catch (err) {
      console.error('Fetch error:', err);
      // Fallback filtered by deletions
      setBooks(filterOutDeleted('book', EGYPT_THANAWEYA_BOOKS));
      setVideos(filterOutDeleted('video', EGYPT_THANAWEYA_VIDEOS));
      setSummaries(filterOutDeleted('summary', EGYPT_THANAWEYA_SUMMARIES));
      setArticles(filterOutDeleted('article', EGYPT_THANAWEYA_ARTICLES));
    } finally {
      setLoading(false);
    }
  };

  // Restore user session from token
  const restoreUserSession = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Calculate trial or retrieve active subscription for this specific student
        const studentSub = calculateStudentSubscription(data.user.id, data.user.createdAt, data.user.subscription);
        data.user.subscription = studentSub;
        setCurrentUser(data.user);
        setUserToken(token);
        localStorage.setItem('arm_current_user', JSON.stringify(data.user));
      }
    } catch (e) {
      // If offline, keep cached user session from localStorage
    }
  };

  const handleUpdateUserSubscription = (sub: UserSubscription) => {
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        subscription: sub
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('arm_current_user', JSON.stringify(updatedUser));
      saveStudentSubscription(currentUser.id, sub);
    }
    showToast(`تم تفعيل باقة الاشتراك بنجاح: ${sub.planName} ⚡`);
  };

  useEffect(() => {
    fetchData();

    // 1. Immediately restore cached student session to avoid any flicker/logout
    const savedUserJson = localStorage.getItem('arm_current_user');
    if (savedUserJson) {
      try {
        const cachedUser: User = JSON.parse(savedUserJson);
        const studentSub = calculateStudentSubscription(cachedUser.id, cachedUser.createdAt, cachedUser.subscription);
        cachedUser.subscription = studentSub;
        setCurrentUser(cachedUser);
      } catch (err) {
        // ignore parse error
      }
    }

    // 2. Verify or refresh token from server
    const savedUserToken = localStorage.getItem('arm_user_token');
    if (savedUserToken) {
      setUserToken(savedUserToken);
      restoreUserSession(savedUserToken);
    }

    // Realtime Content Synchronization Listener (Cross-component and Cross-tab)
    const unsubscribeSync = listenToContentChanged(() => {
      fetchData();
      setStudentStats(getStudentStats());
      setDownloadedCount(getDownloadedBooksCount());
    });

    // Hidden Admin Trigger: Check URL path /admin, hash #admin, or query ?admin=1
    const checkAdminRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (path === '/admin' || hash === '#admin' || search.includes('admin=1')) {
        setIsAdminOpen(true);
      }
    };
    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);

    // Secret Admin Hotkey: Ctrl + Shift + A (or Cmd + Shift + A)
    const handleAdminHotKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ش')) {
        e.preventDefault();
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleAdminHotKey);

    return () => {
      unsubscribeSync();
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('keydown', handleAdminHotKey);
    };
  }, []);

  const handleLoginSuccess = (user: User, token: string) => {
    const studentSub = calculateStudentSubscription(user.id, user.createdAt, user.subscription);
    user.subscription = studentSub;
    setCurrentUser(user);
    setUserToken(token);
    localStorage.setItem('arm_user_token', token);
    localStorage.setItem('arm_current_user', JSON.stringify(user));
    showToast(`مرحباً بك يا ${user.name}! تم تسجيل الدخول بنجاح ومزامنة تقدمك ✨`);
  };

  const handleLogout = async () => {
    if (userToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${userToken}` },
        });
      } catch (e) {
        // ignore
      }
    }
    setCurrentUser(null);
    setUserToken('');
    localStorage.removeItem('arm_user_token');
    localStorage.removeItem('arm_current_user');
    showToast('تم تسجيل الخروج بنجاح.');
  };

  // Toggle Favorite / Bookmark
  const handleToggleFavorite = async (id: string, type: 'book' | 'article' | 'summary' | 'video', title: string, path: string) => {
    if (!currentUser || !userToken) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/user/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ id, type, title, path }),
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser({ ...currentUser, bookmarks: data.bookmarks });
        showToast(data.message);
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const isItemBookmarked = (id: string | number, type: string): boolean => {
    if (!currentUser?.bookmarks) return false;
    return currentUser.bookmarks.some(b => String(b.id) === String(id) && b.type === type);
  };

  const handleRemoveBookmark = (item: BookmarkItem) => {
    handleToggleFavorite(item.id, item.type, item.title, item.path);
  };

  const handleOpenBookmarkItem = (item: BookmarkItem) => {
    if (item.type === 'book') {
      const found = books.find(b => String(b.id) === item.id);
      if (found) setSelectedBook(found);
      else window.open(item.path, '_blank');
    } else if (item.type === 'article') {
      const found = articles.find(a => String(a.id) === item.id);
      if (found) setSelectedArticle(found);
    } else if (item.type === 'summary') {
      const found = summaries.find(s => String(s.id) === item.id);
      if (found) setSelectedSummary(found);
      else window.open(item.path, '_blank');
    } else if (item.type === 'video') {
      const found = videos.find(v => String(v.id) === item.id);
      if (found) setSelectedVideo(found);
      else window.open(item.path, '_blank');
    }
    setIsProfileOpen(false);
  };

  // Handle Content Rating (1-5 stars)
  const handleRateItem = async (type: 'book' | 'summary' | 'video' | 'article', id: number, star: number) => {
    try {
      // 1. Optimistic updates
      if (type === 'book') {
        setBooks(prev => prev.map(b => {
          if (b.id === id) {
            const count = (b.ratingCount || 100) + 1;
            const current = b.rating || 4.9;
            const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
            return { ...b, rating: newRating, ratingCount: count };
          }
          return b;
        }));
        if (selectedBook && selectedBook.id === id) {
          const count = (selectedBook.ratingCount || 100) + 1;
          const current = selectedBook.rating || 4.9;
          const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
          setSelectedBook({ ...selectedBook, rating: newRating, ratingCount: count });
        }
      } else if (type === 'video') {
        setVideos(prev => prev.map(v => {
          if (v.id === id) {
            const count = (v.ratingCount || 200) + 1;
            const current = v.rating || 4.9;
            const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
            return { ...v, rating: newRating, ratingCount: count };
          }
          return v;
        }));
        if (selectedVideo && selectedVideo.id === id) {
          const count = (selectedVideo.ratingCount || 200) + 1;
          const current = selectedVideo.rating || 4.9;
          const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
          setSelectedVideo({ ...selectedVideo, rating: newRating, ratingCount: count });
        }
      } else if (type === 'summary') {
        setSummaries(prev => prev.map(s => {
          if (s.id === id) {
            const count = (s.ratingCount || 150) + 1;
            const current = s.rating || 5.0;
            const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
            return { ...s, rating: newRating, ratingCount: count };
          }
          return s;
        }));
        if (selectedSummary && selectedSummary.id === id) {
          const count = (selectedSummary.ratingCount || 150) + 1;
          const current = selectedSummary.rating || 5.0;
          const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
          setSelectedSummary({ ...selectedSummary, rating: newRating, ratingCount: count });
        }
      } else if (type === 'article') {
        setArticles(prev => prev.map(a => {
          if (a.id === id) {
            const count = (a.ratingCount || 120) + 1;
            const current = a.rating || 4.9;
            const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
            return { ...a, rating: newRating, ratingCount: count };
          }
          return a;
        }));
        if (selectedArticle && selectedArticle.id === id) {
          const count = (selectedArticle.ratingCount || 120) + 1;
          const current = selectedArticle.rating || 4.9;
          const newRating = Math.round((((current * (count - 1)) + star) / count) * 10) / 10;
          setSelectedArticle({ ...selectedArticle, rating: newRating, ratingCount: count });
        }
      }

      showToast(`شكراً لك! تم تسجيل تقييمك (${star} ⭐) بنجاح.`);

      // 2. Server API call
      await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, rating: star }),
      });
    } catch (e) {
      console.error('Failed to rate item:', e);
    }
  };

  // Filtered Collections
  const categories = ['الكل', 'كتب الطلاب', 'برمجة', 'تقنية', 'علوم', 'أدب', 'تعليم'];

  const filteredBooks = books.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      b.title.toLowerCase().includes(q) || 
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.grade && b.grade.toLowerCase().includes(q)) ||
      (b.category && b.category.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;

    // 1. Subject Classification Filter (فلتر تصنيف المواد الدراسية)
    if (selectedSubject !== 'all') {
      const subjectDef = EGYPTIAN_SUBJECT_FILTERS.find(s => s.id === selectedSubject);
      if (subjectDef && subjectDef.keywords) {
        const textToSearch = `${b.title} ${b.category || ''} ${b.grade || ''} ${b.description || ''}`.toLowerCase();
        const matchesSubject = subjectDef.keywords.some(k => textToSearch.includes(k.toLowerCase()));
        if (!matchesSubject) return false;
      }
    }

    if (selectedCategory === 'الكل') return true;
    if (selectedCategory === 'كتب الطلاب') return b.is_student === 1 || b.category === 'كتب الطلاب' || (b.grade && b.grade.includes('ثانوي'));
    if (selectedCategory === 'علوم') return b.category === 'علوم' || b.title.includes('فيزياء') || b.title.includes('كيمياء') || b.title.includes('أحياء') || b.title.includes('جيولوجيا');
    if (selectedCategory === 'أدب') return b.category === 'أدب' || b.title.includes('العربية') || b.title.includes('تاريخ') || b.title.includes('أدب') || b.title.includes('جغرافيا');
    return b.category === selectedCategory;
  });

  const filteredArticles = articles.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const filteredSummaries = summaries.filter(s => {
    if (!searchQuery) return true;
    return s.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredVideos = videos.filter(v => {
    if (!searchQuery) return true;
    return v.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const userBookmarksList = currentUser?.bookmarks || [];

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-amber-500/40 text-amber-300 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      <div>
        {/* Navigation Bar */}
        <Navbar
          user={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onLogout={handleLogout}
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'pricing') {
              setIsSubscriptionModalOpen(true);
            } else if (tab === 'student-books') {
              setSelectedCategory('كتب الطلاب');
              setActiveTab('books');
            } else {
              setActiveTab(tab);
            }
          }}
          bookmarksCount={userBookmarksList.length}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onOpenSubscriptions={() => setIsSubscriptionModalOpen(true)}
        />

        {/* Prominent Live Trial Countdown Banner (10-Day Free Trial Timer & Expiration) */}
        <TrialCountdownBanner
          currentUser={currentUser}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          variant="top-bar"
        />

        {/* Hero Section with Quick Statistics */}
        <div className="relative overflow-hidden border-b border-amber-500/10 bg-gradient-to-b from-amber-950/20 via-zinc-950/40 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>🎓 مناهج وكتب الصف الثالث الثانوي المصري 2026 + خرائط ذهنية وشروحات مرئية</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 leading-tight mb-4">
              المكتبة الرقمية الفاخرة للثانوية العامة والمناهج
            </h1>

            <p className="max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
              بوابتك المتكاملة لتحميل كتب ومذكرات الصف الثالث الثانوي المصري (علمي علوم، علمي رياضة، والشعبة الأدبية)، استعراض الخرائط الذهنية الذكية، ومتابعة أقوى مراجعات الفيديو والشروحات.
            </p>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs text-zinc-400">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span><strong className="text-zinc-200">{books.length}</strong> كتاب ومنهج</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span><strong className="text-zinc-200">{summaries.length}</strong> خريطة ذهنية</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <VideoIcon className="w-4 h-4 text-amber-400" />
                <span><strong className="text-zinc-200">{videos.length}</strong> شرح فيديو</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <FileText className="w-4 h-4 text-amber-400" />
                <span><strong className="text-zinc-200">{articles.length}</strong> مقالة متخصصة</span>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-6 border-b border-zinc-800/80 pb-5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
              }`}
            >
              🌐 عرض الكل
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-300 border-amber-500/30 hover:border-amber-500 hover:text-amber-300'
              }`}
            >
              📊 لوحة تحكم الطالب
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'exams'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-300 border-amber-500/30 hover:border-amber-500 hover:text-amber-300'
              }`}
            >
              🎓 بنك الامتحانات (3 إعدادي - 3 ثانوي)
            </button>
            <button
              onClick={() => setActiveTab('english-ai')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'english-ai'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:brightness-110'
              }`}
            >
              🎙️ نطق الإنجليزية بالذكاء الاصطناعي ✨
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'books'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
              }`}
            >
              📚 الكتب والمناهج ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'articles'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
              }`}
            >
              📝 المقالات ({articles.length})
            </button>
            <button
              onClick={() => setActiveTab('summaries')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'summaries'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
              }`}
            >
              🖼️ صور الملخصات والخرائط ({summaries.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                activeTab === 'videos'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
              }`}
            >
              🎬 شروحات الفيديو ({videos.length})
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                  activeTab === 'bookmarks'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-amber-300'
                }`}
              >
                ⭐ مفضلتي ({userBookmarksList.length})
              </button>
            )}
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition border bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 text-amber-300 border-amber-500/50 hover:border-amber-400 hover:brightness-125 shadow-lg shadow-amber-500/10 flex items-center gap-1.5 active:scale-95"
            >
              ⚡ باقات الاشتراك (تبدأ من 50ج)
            </button>
          </div>

          {/* Egyptian Curriculum Subject Classification Filter (فلتر تصنيف المواد الدراسية) */}
          {(activeTab === 'all' || activeTab === 'books') && (
            <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-zinc-900/80 border border-amber-500/20 backdrop-blur-md shadow-xl animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>فلتر تصنيف المواد الدراسية (مناهج الثانوية العامة المصرية 2026)</span>
                      {selectedSubject !== 'all' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold shadow-sm">
                          مفلتر حالياً
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      اختر المادة الدراسية لتصفية الكتب والمذكرات ونماذج الإجابة بسهولة
                    </p>
                  </div>
                </div>

                {selectedSubject !== 'all' && (
                  <button
                    onClick={() => setSelectedSubject('all')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline transition"
                  >
                    عرض كل المواد ✕
                  </button>
                )}
              </div>

              {/* Subject Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {EGYPTIAN_SUBJECT_FILTERS.map((subj) => {
                  const isSelected = selectedSubject === subj.id;
                  const count = subj.id === 'all'
                    ? books.length
                    : books.filter(b => {
                        const text = `${b.title} ${b.category || ''} ${b.grade || ''} ${b.description || ''}`.toLowerCase();
                        return subj.keywords?.some(k => text.includes(k.toLowerCase()));
                      }).length;

                  return (
                    <button
                      key={subj.id}
                      onClick={() => setSelectedSubject(subj.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]'
                          : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:border-amber-500/40 hover:text-amber-300'
                      }`}
                    >
                      <span>{subj.icon}</span>
                      <span>{subj.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Active Indicator */}
          {searchQuery && (
            <div className="mb-6 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-300">
                نتائج البحث عن: <strong className="text-amber-400">"{searchQuery}"</strong>
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-amber-400 hover:underline font-bold"
              >
                مسح البحث ✕
              </button>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB: STUDENT DASHBOARD (إحصائيات الطالب المتقدمة) */}
          {/* ---------------------------------------------------------------- */}
          {activeTab === 'dashboard' && (
            <div className="mb-14 animate-in fade-in">
              <StudentDashboard
                stats={studentStats}
                currentUser={currentUser}
                onUpdateStats={(newStats) => {
                  setStudentStats(newStats);
                  saveStudentStats(newStats);
                }}
                onNavigateToExams={() => setActiveTab('exams')}
                onNavigateToBooks={() => {
                  setSelectedCategory('كتب الطلاب');
                  setActiveTab('books');
                }}
                onNavigateToEnglishAI={() => setActiveTab('english-ai')}
                onOpenSubscriptions={() => setIsSubscriptionModalOpen(true)}
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB: EXAMS BANK (امتحانات 3 إعدادي حتى 3 ثانوي) */}
          {/* ---------------------------------------------------------------- */}
          {activeTab === 'exams' && (
            <div className="mb-14 animate-in fade-in">
              <StudentExamsView
                stats={studentStats}
                currentUser={currentUser}
                onUpdateStats={(newStats) => {
                  setStudentStats(newStats);
                  saveStudentStats(newStats);
                }}
                onNavigateToStats={() => setActiveTab('dashboard')}
                onOpenSubscriptions={() => setIsSubscriptionModalOpen(true)}
                onUpdateUserSubscription={handleUpdateUserSubscription}
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB: ENGLISH AI PRONUNCIATION TUTOR (نطق الإنجليزية بالذكاء الاصطناعي) */}
          {/* ---------------------------------------------------------------- */}
          {activeTab === 'english-ai' && (
            <div className="mb-14 animate-in fade-in">
              <EnglishAITutor />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TAB: BOOKMARKS (إذا اختار المستخدم تبويب مفضلتي) */}
          {/* ---------------------------------------------------------------- */}
          {activeTab === 'bookmarks' && (
            <section className="mb-14 animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-400 fill-current" />
                  <span>العناصر المحفوظة في مفضلتك الشخصية ({userBookmarksList.length})</span>
                </h2>
              </div>

              {userBookmarksList.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
                  <Bookmark className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">لم تقم بإضافة أي عنصر إلى مفضلتك بعد.</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    انقر على أيقونة النجمة ⭐ على أي كتاب أو مقال لتجده هنا في أي وقت.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBookmarksList.map((bm, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-amber-500/40 transition"
                    >
                      <div className="overflow-hidden">
                        <span className="text-[10px] text-amber-400 font-bold block mb-1">
                          {bm.type === 'book' ? 'كتاب / منهج' : bm.type === 'article' ? 'مقال' : bm.type === 'summary' ? 'ملخص صورة' : 'فيديو'}
                        </span>
                        <h4 className="font-bold text-xs text-zinc-100 truncate">{bm.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleOpenBookmarkItem(bm)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl"
                        >
                          عرض
                        </button>
                        <button
                          onClick={() => handleRemoveBookmark(bm)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-xl"
                          title="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* VIDEOS SECTION */}
          {/* ---------------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'videos') && filteredVideos.length > 0 && (
            <section className="mb-14 animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>🎬</span> مقاطع الفيديو والشروحات المرئية
                </h2>
                {activeTab === 'all' && (
                  <button
                    onClick={() => setActiveTab('videos')}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    عرض كل الفيديوهات ({videos.length}) ←
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((vid) => {
                  const bookmarked = isItemBookmarked(vid.id, 'video');
                  return (
                    <div
                      key={vid.id}
                      className="lux-card bg-zinc-900/70 border border-zinc-800 rounded-3xl overflow-hidden p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div 
                        onClick={() => setSelectedVideo(vid)}
                        className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 cursor-pointer relative group"
                      >
                        <iframe
                          src={vid.videourl.replace('watch?v=', 'embed/').split('&')[0]}
                          className="w-full h-full pointer-events-none"
                          title={vid.title}
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition">
                          <div className="w-12 h-12 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            ▶
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>🇪🇬</span>
                            <span>{vid.category}</span>
                          </span>
                          <span>⏱️ {vid.duration || '20:00'}</span>
                        </div>
                        {vid.channel && (
                          <div className="text-[11px] text-amber-200/90 font-medium mb-1">
                            📺 {vid.channel}
                          </div>
                        )}
                        <h3 
                          onClick={() => setSelectedVideo(vid)}
                          className="font-bold text-sm text-zinc-100 line-clamp-2 cursor-pointer hover:text-amber-300 transition"
                        >
                          {vid.title}
                        </h3>

                        {/* Interactive Rating */}
                        <div className="flex items-center justify-between pt-2">
                          <RatingStars
                            rating={vid.rating || 4.9}
                            ratingCount={vid.ratingCount || 420}
                            size="sm"
                            interactive
                            onRate={(star) => handleRateItem('video', vid.id, star)}
                          />
                          <span className="text-[10px] text-zinc-500">👁️ {vid.views.toLocaleString('ar-EG')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => setSelectedVideo(vid)}
                          className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>مشاهدة الشرح</span> ↗
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(String(vid.id), 'video', vid.title, vid.videourl)}
                          className={`p-2 rounded-xl transition ${
                            bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400'
                          }`}
                          title="حفظ في المفضلة"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* IMAGE SUMMARIES SECTION */}
          {/* ---------------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'summaries') && filteredSummaries.length > 0 && (
            <section className="mb-14 animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>🖼️</span> ملخصات الصور والخرائط الذهنية الذكية
                </h2>
                {activeTab === 'all' && (
                  <button
                    onClick={() => setActiveTab('summaries')}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    عرض كل الملخصات ({summaries.length}) ←
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredSummaries.map((sum) => {
                  const bookmarked = isItemBookmarked(sum.id, 'summary');
                  return (
                    <div
                      key={sum.id}
                      className="lux-card bg-zinc-900/70 border border-zinc-800 rounded-3xl overflow-hidden p-3 space-y-3 flex flex-col justify-between"
                    >
                      <div 
                        onClick={() => setSelectedSummary(sum)}
                        className="block h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 relative group cursor-pointer"
                      >
                        <img
                          src={sum.imagepath}
                          alt={sum.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-amber-300 font-bold">
                          🔍 تكبير ومعاينة الخريطة
                        </div>
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 text-amber-300 text-[10px] font-bold">
                          {sum.category}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs text-zinc-200 line-clamp-1 px-1">
                        {sum.title}
                      </h3>

                      {/* Interactive Rating */}
                      <div className="flex items-center justify-between px-1">
                        <RatingStars
                          rating={sum.rating || 5.0}
                          ratingCount={sum.ratingCount || 245}
                          size="sm"
                          interactive
                          onRate={(star) => handleRateItem('summary', sum.id, star)}
                        />
                        <span className="text-[10px] text-zinc-500">👁️ {sum.views}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSummary(sum)}
                          className="flex-1 text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition"
                        >
                          معاينة وتنزيل ⬇️
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(String(sum.id), 'summary', sum.title, sum.imagepath)}
                          className={`p-2 rounded-xl transition ${
                            bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400'
                          }`}
                          title="حفظ في المفضلة"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* ARTICLES SECTION */}
          {/* ---------------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'articles') && filteredArticles.length > 0 && (
            <section className="mb-14 animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>📝</span> المقالات والدراسات المنشورة
                </h2>
                {activeTab === 'all' && (
                  <button
                    onClick={() => setActiveTab('articles')}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    عرض كل المقالات ({articles.length}) ←
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredArticles.map((art) => {
                  const bookmarked = isItemBookmarked(art.id, 'article');
                  return (
                    <div
                      key={art.id}
                      className="lux-card bg-zinc-900/70 rounded-3xl p-5 border border-zinc-800 flex gap-4 items-center hover:border-amber-500/40 cursor-pointer justify-between"
                    >
                      <div 
                        onClick={() => setSelectedArticle(art)}
                        className="flex gap-4 items-center flex-1 overflow-hidden"
                      >
                        <img
                          src={art.imagepath || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=300'}
                          alt={art.title}
                          className="w-24 h-24 object-cover rounded-2xl shadow-sm flex-shrink-0 border border-zinc-800"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[10px] text-amber-500 font-bold block">
                            قراءة: {art.readTime || '5 دقائق'} • بواسطة {art.author}
                          </span>
                          <h3 className="text-sm font-bold text-zinc-100 mt-1 line-clamp-1 hover:text-amber-300 transition">
                            {art.title}
                          </h3>
                          <div className="my-1.5">
                            <RatingStars
                              rating={art.rating || 4.9}
                              ratingCount={art.ratingCount || 187}
                              size="sm"
                              interactive
                              onRate={(star) => handleRateItem('article', art.id, star)}
                            />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {art.content.replace(/[\#\*\>]/g, '')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFavorite(String(art.id), 'article', art.title, `/article/${art.id}`)}
                        className={`p-2 rounded-xl transition ${
                          bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400'
                        }`}
                        title="حفظ في المفضلة"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* BOOKS SECTION */}
          {/* ---------------------------------------------------------------- */}
          {(activeTab === 'all' || activeTab === 'books') && (
            <section className="mb-14 animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>📚</span> الكتب والمناهج الدراسية الشاملة
                </h2>
                <span className="text-xs text-zinc-400">
                  متاح: <strong className="text-amber-300">{filteredBooks.length}</strong> كتاب
                </span>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900/40 border border-zinc-800 rounded-3xl">
                  لا توجد كتب مضافة في هذا التصنيف حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBooks.map((pdf) => {
                    const bookmarked = isItemBookmarked(pdf.id, 'book');
                    return (
                      <div
                        key={pdf.id}
                        className="lux-card bg-zinc-900/70 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col justify-between"
                      >
                        <div 
                          onClick={() => setSelectedBook(pdf)}
                          className="h-48 bg-zinc-950 relative border-b border-zinc-800/80 cursor-pointer overflow-hidden group"
                        >
                          <img
                            src={pdf.coverpath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
                            alt={pdf.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className={`absolute top-3 right-3 px-3 py-1 ${
                            pdf.is_student ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950/80 text-amber-300'
                          } rounded-xl text-[10px] font-bold shadow-md`}>
                            {pdf.is_student ? '🎓 كتب الطلاب' : pdf.category}
                          </span>
                        </div>

                        <div className="p-5 flex-1">
                          <h3 
                            onClick={() => setSelectedBook(pdf)}
                            className="font-bold text-zinc-100 text-sm line-clamp-2 cursor-pointer hover:text-amber-300 transition"
                          >
                            {pdf.title}
                          </h3>
                          {pdf.description && (
                            <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-2">
                              {pdf.description}
                            </p>
                          )}

                          {/* Rating and Downloads */}
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-800/60">
                            <RatingStars
                              rating={pdf.rating || 4.9}
                              ratingCount={pdf.ratingCount || 154}
                              size="sm"
                              interactive
                              onRate={(star) => handleRateItem('book', pdf.id, star)}
                            />
                            <span className="text-[10px] text-zinc-400 font-mono">
                              📥 {pdf.downloads.toLocaleString('ar-EG')}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 border-t border-zinc-800/60 flex justify-between items-center bg-zinc-950/40">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedBook(pdf)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-semibold rounded-xl border border-amber-500/20 transition flex items-center gap-1"
                            >
                              <span>👁️ معاينة</span> ↗
                            </button>

                            <button
                              onClick={() => {
                                recordBookDownload(pdf);
                                setSelectedBook(pdf);
                              }}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 text-xs font-bold rounded-xl shadow hover:brightness-110 transition flex items-center gap-1"
                            >
                              <span>تحميل</span> ⬇️
                            </button>
                          </div>

                          <button
                            onClick={() => handleToggleFavorite(String(pdf.id), 'book', pdf.title, pdf.filepath)}
                            className={`p-1.5 rounded-xl transition ${
                              bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400'
                            }`}
                            title="حفظ في المفضلة"
                          >
                            <Bookmark className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* Sleek Collapsible Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'pricing') {
            setIsSubscriptionModalOpen(true);
          } else if (tab === 'student-books') {
            setSelectedCategory('كتب الطلاب');
            setActiveTab('books');
          } else {
            setActiveTab(tab);
          }
        }}
        currentUser={currentUser}
        stats={studentStats}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSubscriptions={() => setIsSubscriptionModalOpen(true)}
        downloadedCount={downloadedCount}
      />

      {/* ALL INTERACTIVE MODALS */}
      <SubscriptionPlansModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSubscriptionUpdated={handleUpdateUserSubscription}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {currentUser && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          token={userToken}
          onUpdateUser={(u) => {
            setCurrentUser(u);
            localStorage.setItem('arm_current_user', JSON.stringify(u));
          }}
          onRemoveBookmark={handleRemoveBookmark}
          onOpenItem={handleOpenBookmarkItem}
        />
      )}

      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onDataChanged={fetchData}
      />

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onToggleFavorite={handleToggleFavorite}
        isBookmarked={selectedBook ? isItemBookmarked(selectedBook.id, 'book') : false}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRate={(star) => selectedBook && handleRateItem('book', selectedBook.id, star)}
        onOpenSubscriptions={() => setIsSubscriptionModalOpen(true)}
      />

      <FeatureLockedModal
        isOpen={isFeatureLockedModalOpen}
        onClose={() => setIsFeatureLockedModalOpen(false)}
        onOpenSubscriptionModal={() => {
          setIsFeatureLockedModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
        featureName={lockedFeatureName}
        currentUser={currentUser}
      />

      <ArticleDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onToggleFavorite={handleToggleFavorite}
        isBookmarked={selectedArticle ? isItemBookmarked(selectedArticle.id, 'article') : false}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRate={(star) => selectedArticle && handleRateItem('article', selectedArticle.id, star)}
      />

      <ImageDetailModal
        summary={selectedSummary}
        onClose={() => setSelectedSummary(null)}
        onToggleFavorite={handleToggleFavorite}
        isBookmarked={selectedSummary ? isItemBookmarked(selectedSummary.id, 'summary') : false}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRate={(star) => selectedSummary && handleRateItem('summary', selectedSummary.id, star)}
      />

      <VideoDetailModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onToggleFavorite={handleToggleFavorite}
        isBookmarked={selectedVideo ? isItemBookmarked(selectedVideo.id, 'video') : false}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRate={(star) => selectedVideo && handleRateItem('video', selectedVideo.id, star)}
      />

      {/* Luxury Footer with Developer Contact & Security Badges */}
      <footer className="bg-zinc-950 border-t border-zinc-800/80 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          
          <div className="space-y-1">
            <p className="text-xs text-zinc-400">
              تصميم وتطوير: <span className="font-bold text-amber-400">المصمم Ahmed Raafat</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              المكتبة الرقمية الفاخرة © 2026 - نظام تعليمي متكامل بنظام أمني متقدم وتشفير للجلسات
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* WhatsApp Developer Contact Button */}
            <a
              href="https://wa.me/201115491611"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-2xl text-xs font-bold transition shadow-lg active:scale-95"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.39c1.45.79 3.09 1.21 4.69 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01-1.87-1.87-4.36-2.9-7.01-2.9zm0 1.83c2.18 0 4.23.85 5.77 2.39 1.54 1.54 2.39 3.59 2.39 5.77 0 4.5-3.67 8.17-8.17 8.17-1.42 0-2.81-.37-4.03-1.08l-.29-.17-3.03.8.81-2.95-.19-.31c-.77-1.24-1.18-2.68-1.18-4.14 0-4.5 3.67-8.17 8.17-8.17zm-3.9 4.34c-.17 0-.36.06-.55.25-.19.19-.72.7-.72 1.7s.74 1.96.84 2.1c.1.14 1.45 2.22 3.51 3.11 1.91.83 2.29.67 2.7.61.41-.06 1.32-.54 1.51-1.06.19-.52.19-.97.13-1.06-.06-.09-.23-.14-.48-.27s-1.32-.65-1.52-.72c-.2-.07-.35-.11-.5.11-.15.22-.58.72-.71.87-.13.15-.26.17-.51.04-.25-.13-1.05-.39-2-1.24-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.01-.39.11-.51.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.43l-.47-.01z"/>
              </svg>
              <span>تواصل مع المطور (واتساب)</span>
            </a>

            {/* Discreet Admin Trigger - Hidden from ordinary visitors */}
            <span
              onClick={() => setIsAdminOpen(true)}
              className="cursor-default select-none opacity-20 hover:opacity-50 text-[10px] text-zinc-500 transition"
              title=""
            >
              •
            </span>
          </div>

        </div>
      </footer>

    </div>
  );
}
