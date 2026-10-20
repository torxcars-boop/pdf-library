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
