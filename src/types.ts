export interface UserSubscription {
  planId: 'free' | 'basic_50' | 'pro_100' | 'vip_200';
  planName: string;
  status: 'active' | 'expired' | 'none';
  examsRemainingThisWeek: number;
  maxExamsPerWeek: number; // 2 for basic_50, 5 for pro_100, -1 for unlimited
  startDate: string;
  endDate: string;
  pricePaid?: number;
  paymentMethod?: string;
}

export interface SubscriptionPlan {
  id: 'basic_50' | 'pro_100' | 'vip_200';
  name: string;
  tagline: string;
  priceEGP: number;
  billingPeriod: string;
  badge?: string;
  isPopular?: boolean;
  examsPerWeek: number; // 2, 5, or -1 (unlimited)
  features: string[];
  colorTheme: string;
  ctaText: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  academicStage: string;
  avatar: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin: string;
  bookmarks: BookmarkItem[];
  subscription?: UserSubscription;
}

export interface BookmarkItem {
  id: string;
  type: 'book' | 'article' | 'summary' | 'video';
  title: string;
  path: string;
  addedAt: string;
}

export interface Book {
  id: number;
  title: string;
  category: string;
  filepath: string;
  coverpath: string;
  is_student: number;
  grade?: string;
  description?: string;
  downloads: number;
  views: number;
  rating?: number;
  ratingCount?: number;
  created_at: string;
}

export interface Summary {
  id: number;
  title: string;
  imagepath: string;
  category: string;
  views: number;
  rating?: number;
  ratingCount?: number;
  created_at: string;
}

export interface Video {
  id: number;
  title: string;
  videourl: string;
  category: string;
  channel?: string;
  duration?: string;
  views: number;
  rating?: number;
  ratingCount?: number;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  imagepath: string;
  author: string;
  readTime: string;
  views: number;
  rating?: number;
  ratingCount?: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  type: 'login_success' | 'login_failed' | 'password_change' | 'item_created' | 'item_updated' | 'item_deleted' | 'user_status_changed';
  user: string;
  details: string;
  ip: string;
  status: 'success' | 'warning' | 'danger';
  timestamp: string;
}

export interface AdminStats {
  counts: {
    books: number;
    studentBooks: number;
    summaries: number;
    videos: number;
    articles: number;
    users: number;
    activeUsers: number;
    logsCount: number;
  };
  analytics: {
    totalDownloads: number;
    totalViews: number;
    systemHealth: string;
    database: string;
    securityStatus: string;
  };
}

// Student Exam & Statistics Interfaces
export interface ExamQuestion {
  id: number;
  question: string;
  image?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  difficulty: 'متوسط' | 'متقدم' | 'نموذج وزاري';
  totalMarks: number;
  passMarks: number;
  questionsCount: number;
  questions: ExamQuestion[];
  description: string;
  badge?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  submittedAt: string;
  answers: Record<number, number>;
  feedback: string;
}

export interface StudentAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 - 100
}

export interface DownloadedBookItem {
  id: number | string;
  title: string;
  category: string;
  filepath: string;
  coverpath?: string;
  downloadedAt: string;
  grade?: string;
  fileSize?: string;
}

export interface StudentStats {
  totalExamsTaken: number;
  passedExams: number;
  averageScore: number;
  totalStudyMinutes: number;
  booksReadCount: number;
  downloadedBooksCount?: number;
  downloadedBooksList?: DownloadedBookItem[];
  summariesReviewedCount: number;
  videosWatchedCount: number;
  streakDays: number;
  lastActiveDate: string;
  subjectPerformance: Record<string, {
    totalQuestions: number;
    correctQuestions: number;
    examsCount: number;
    averageScore: number;
  }>;
  recentExams: ExamSubmission[];
  achievements: StudentAchievement[];
}

export interface EnglishWordItem {
  id: string;
  word: string;
  phonetic: string;
  arabicTranslation: string;
  exampleSentence: string;
  exampleTranslation?: string;
  grade: 'الصف الثالث الإعدادي' | 'الصف الأول الثانوي' | 'الصف الثاني الثانوي' | 'الصف الثالث الثانوي' | 'جميع المراحل';
  category: 'مفردات أساسية' | 'تعبيرات وامتحانات' | 'حوارات ومواقف' | 'قواعد وتراكيب';
  tips?: string;
}

export interface PronunciationResult {
  targetText: string;
  spokenText: string;
  accuracyScore: number; // 0 to 100
  feedback: string;
  matchedWords: string[];
  missedWords: string[];
}
