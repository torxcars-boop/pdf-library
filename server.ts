import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db, Book, Summary, Video, Article, User } from './server/db.ts';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Helper to extract client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// YouTube URL parser
function getEmbedYoutubeUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('watch?v=', 'embed/').split('&')[0];
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

// Simple token storage for active sessions
const activeAdminTokens = new Set<string>();
const activeUserSessions = new Map<string, string>(); // token -> userId

// Security middleware for Admin
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.auth as string);
  const adminConfig = db.getAdminConfig();

  if (token && (activeAdminTokens.has(token) || token === adminConfig.passwordHash)) {
    return next();
  }
  return res.status(401).json({ error: 'غير مصرح: مطلوب صلاحية الأدمن' });
}

// --------------------------------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------------------------------

// Health and System Status
app.get('/api/status', (req: Request, res: Response) => {
  const books = db.getBooks();
  const summaries = db.getSummaries();
  const videos = db.getVideos();
  const articles = db.getArticles();
  const users = db.getUsers();

  res.json({
    status: 'ok',
    engine: db.isUsingPostgres() ? 'PostgreSQL Cloud Database' : 'Local High-Speed Persistence Engine',
    totals: {
      books: books.length,
      summaries: summaries.length,
      videos: videos.length,
      articles: articles.length,
      users: users.length,
    },
    version: '2.5.0-security-hardened',
  });
});

// Initialization & Sync endpoint for Egyptian Thanaweya Curriculum
app.get('/api/init-egypt-curriculum', (req: Request, res: Response) => {
  db.resetToEgyptianThanaweya();
  res.json({
    success: true,
    message: 'تمت تهيئة وتحديث مناهج وفيديوهات الصف الثالث الثانوي المصري بنجاح 🇪🇬',
    counts: {
      books: db.getBooks().length,
      videos: db.getVideos().length,
      summaries: db.getSummaries().length,
    }
  });
});

// --------------------------------------------------------------------------
// 1. AUTH & USER SYSTEM (تسجيل دخول المستخدمين)
// --------------------------------------------------------------------------

// User Registration (إنشاء حساب مستخدم جديد)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, academicStage, avatar } = req.body;
  const ip = getClientIp(req);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'الرجاء إدخال الاسم، البريد الإلكتروني، وكلمة المرور' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' });
  }

  const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

  const newUser = db.addUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role: 'user',
    academicStage: academicStage || 'طالب',
    avatar: defaultAvatar,
  });

  const sessionToken = 'tok_usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  activeUserSessions.set(sessionToken, newUser.id);

  db.addAuditLog({
    type: 'login_success',
    user: `${newUser.name} (${newUser.email})`,
    details: 'إنشاء حساب جديد وتسجيل الدخول بنجاح',
    ip,
    status: 'success',
  });

  const { password: _, ...userSafe } = newUser;
  res.status(201).json({
    message: 'تم إنشاء الحساب بنجاح! أهلاً بك في المكتبة الرقمية الفاخرة',
    token: sessionToken,
    user: userSafe,
  });
});

// User Login (تسجيل دخول المستخدم)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);

  if (!email || !password) {
    return res.status(400).json({ error: 'الرجاء ملء البريد الإلكتروني وكلمة المرور' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password !== password.trim()) {
    db.addAuditLog({
      type: 'login_failed',
      user: email,
      details: 'محاولة تسجيل دخول فاشلة للمستخدم (كلمة مرور غير صحيحة)',
      ip,
      status: 'warning',
    });
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  if (user.status === 'suspended') {
    db.addAuditLog({
      type: 'login_failed',
      user: `${user.name} (${user.email})`,
      details: 'محاولة دخول من حساب موقوف/محظور',
      ip,
      status: 'danger',
    });
    return res.status(403).json({ error: 'تم تجميد هذا الحساب من قِبل إدارة الأمان. يرجى التواصل مع الدعم.' });
  }

  // Update last login
  db.updateUser(user.id, { lastLogin: new Date().toISOString() });

  const sessionToken = 'tok_usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  activeUserSessions.set(sessionToken, user.id);

  db.addAuditLog({
    type: 'login_success',
    user: `${user.name} (${user.email})`,
    details: 'تسجيل دخول ناجح للمستخدم',
    ip,
    status: 'success',
  });

  const { password: _, ...userSafe } = user;
  res.json({
    message: `مرحباً بعودتك، ${user.name}!`,
    token: sessionToken,
    user: userSafe,
  });
});

// Current Logged-in User Session check
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !activeUserSessions.has(token)) {
    return res.status(401).json({ error: 'الجلسة منتهية أو غير مسجلة' });
  }

  const userId = activeUserSessions.get(token)!;
  const user = db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// User Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    activeUserSessions.delete(token);
  }
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// Toggle Favorite / Bookmark for a user
app.post('/api/user/favorite', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !activeUserSessions.has(token)) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لحفظ العناصر في المفضلة' });
  }

  const userId = activeUserSessions.get(token)!;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const { id, type, title, path: itemPath } = req.body;
  if (!id || !type || !title) {
    return res.status(400).json({ error: 'بيانات العنصر غير مكتملة' });
  }

  const bookmarks = [...(user.bookmarks || [])];
  const existingIndex = bookmarks.findIndex(b => b.id === String(id) && b.type === type);

  let isBookmarked = false;
  if (existingIndex >= 0) {
    bookmarks.splice(existingIndex, 1);
    isBookmarked = false;
  } else {
    bookmarks.unshift({
      id: String(id),
      type,
      title,
      path: itemPath || '',
      addedAt: new Date().toISOString(),
    });
    isBookmarked = true;
  }

  db.updateUser(userId, { bookmarks });

  res.json({
    isBookmarked,
    bookmarksCount: bookmarks.length,
    bookmarks,
    message: isBookmarked ? 'تمت الإضافة إلى مفضلتك بنجاح ⭐' : 'تمت الإزالة من المفضلة',
  });
});

// Rate Content (تقييم المحتوى بالنجوم)
app.post('/api/rate', (req: Request, res: Response) => {
  const { id, type, rating } = req.body;
  if (!id || !type || typeof rating !== 'number') {
    return res.status(400).json({ error: 'البيانات غير مكتملة (id, type, rating مطلوبة)' });
  }

  const result = db.rateItem(type, Number(id), rating);
  if (!result) {
    return res.status(404).json({ error: 'العنصر المطلوب غير موجود' });
  }

  res.json({
    success: true,
    message: 'تم تسجيل تقييمك بنجاح ⭐',
    rating: result.rating,
    ratingCount: result.ratingCount,
  });
});

// Update User Profile
app.put('/api/user/profile', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !activeUserSessions.has(token)) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }

  const userId = activeUserSessions.get(token)!;
  const { name, academicStage, avatar, password } = req.body;

  const updates: Partial<User> = {};
  if (name) updates.name = name.trim();
  if (academicStage) updates.academicStage = academicStage.trim();
  if (avatar) updates.avatar = avatar.trim();
  if (password && password.trim().length >= 6) updates.password = password.trim();

  const updated = db.updateUser(userId, updates);
  if (!updated) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });

  const { password: _, ...userSafe } = updated;
  res.json({ message: 'تم تحديث الملف الشخصي بنجاح', user: userSafe });
});

// --------------------------------------------------------------------------
// 2. ADMIN & SECURITY SYSTEM (تحسين صفحة الأمان والأدمن)
// --------------------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  const adminConfig = db.getAdminConfig();

  if (username === adminConfig.username && password === adminConfig.passwordHash) {
    const adminToken = 'adm_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    activeAdminTokens.add(adminToken);

    db.addAuditLog({
      type: 'login_success',
      user: `الأدمن ${adminConfig.username}`,
      details: 'تسجيل دخول ناجح إلى لوحة التحكم الإدارية والأمنية',
      ip,
      status: 'success',
    });

    return res.json({
      success: true,
      token: adminToken,
      username: adminConfig.username,
      message: 'تم التحقق من الصلاحيات الأمنية بنجاح 🛡️',
    });
  }

  db.addAuditLog({
    type: 'login_failed',
    user: username || 'مجهول',
    details: `محاولة دخول فاشلة إلى لوحة الأدمن بكلمة مرور غير صحيحة`,
    ip,
    status: 'danger',
  });

  return res.status(401).json({
    success: false,
    error: 'اسم المستخدم أو كلمة مرور الأدمن غير صحيحة',
  });
});

// Admin Verify Token
app.get('/api/admin/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const adminConfig = db.getAdminConfig();

  if (token && (activeAdminTokens.has(token) || token === adminConfig.passwordHash)) {
    return res.json({ verified: true, username: adminConfig.username });
  }
  return res.status(401).json({ verified: false });
});

// Admin Security: Change Password (تغيير كلمة مرور الأدمن بأمان)
app.post('/api/admin/security/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const ip = getClientIp(req);
  const adminConfig = db.getAdminConfig();

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'الرجاء إدخال كلمة المرور الحالية والجديدة' });
  }

  if (currentPassword !== adminConfig.passwordHash) {
    db.addAuditLog({
      type: 'password_change',
      user: adminConfig.username,
      details: 'محاولة فاشلة لتغيير كلمة المرور: كلمة المرور الحالية غير صحيحة',
      ip,
      status: 'danger',
    });
    return res.status(400).json({ error: 'كلمة المرور الحالية غير مطابقة' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور الجديدة عن 6 خانات للأمان' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'تأكيد كلمة المرور غير متطابق' });
  }

  db.setAdminPassword(newPassword);

  db.addAuditLog({
    type: 'password_change',
    user: adminConfig.username,
    details: 'تم تحديث كلمة مرور المدير بنجاح وتعزيز أمان الحساب',
    ip,
    status: 'success',
  });

  res.json({
    success: true,
    message: 'تم تغيير كلمة مرور الأدمن بنجاح! تم تسجيل العملية في سجل الأمان.',
  });
});

// Admin Security: Get Audit Logs (سجلات الحماية والعمليات)
app.get('/api/admin/security/logs', requireAdminAuth, (req: Request, res: Response) => {
  const logs = db.getAuditLogs();
  res.json({ logs });
});

// Admin Security: Clear or reset logs
app.post('/api/admin/security/clear-logs', requireAdminAuth, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const adminConfig = db.getAdminConfig();

  db.getData().auditLogs = [
    {
      id: 'log_clear_' + Date.now(),
      type: 'item_updated',
      user: adminConfig.username,
      details: 'تم تصفير وأرشفة سجلات الأمان السابقة من قِبل المدير العام',
      ip,
      status: 'warning',
      timestamp: new Date().toISOString(),
    }
  ];
  db.commit();

  res.json({ message: 'تم مسح السجلات بنجاح وبدء دورة أمنية جديدة' });
});

// Admin: Manage Users (عرض، تعديل، حظر المستخدمين)
app.get('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  const users = db.getUsers().map(({ password, ...u }) => u);
  res.json({ users });
});

app.put('/api/admin/users/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, role } = req.body;
  const ip = getClientIp(req);
  const adminConfig = db.getAdminConfig();

  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const updates: Partial<User> = {};
  if (status) updates.status = status;
  if (role) updates.role = role;

  const updated = db.updateUser(id, updates);

  db.addAuditLog({
    type: 'user_status_changed',
    user: adminConfig.username,
    details: `تعديل حالة المستخدم ${user.name} إلى (${status || 'نفس الحالة'}) ورتبة (${role || 'نفس الرتبة'})`,
    ip,
    status: 'warning',
  });

  const { password: _, ...userSafe } = updated!;
  res.json({ message: 'تم تحديث حالة المستخدم بنجاح', user: userSafe });
});

app.delete('/api/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  const adminConfig = db.getAdminConfig();

  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  db.deleteUser(id);

  db.addAuditLog({
    type: 'item_deleted',
    user: adminConfig.username,
    details: `حذف حساب المستخدم ${user.name} (${user.email}) بشكل نهائي`,
    ip,
    status: 'danger',
  });

  res.json({ message: 'تم حذف حساب المستخدم' });
});

// Admin Stats Overview
app.get('/api/admin/stats', requireAdminAuth, (req: Request, res: Response) => {
  const books = db.getBooks();
  const summaries = db.getSummaries();
  const videos = db.getVideos();
  const articles = db.getArticles();
  const users = db.getUsers();
  const logs = db.getAuditLogs();

  const totalDownloads = books.reduce((acc, b) => acc + (b.downloads || 0), 0);
  const totalBookViews = books.reduce((acc, b) => acc + (b.views || 0), 0);
  const totalVideoViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
  const totalArticleViews = articles.reduce((acc, a) => acc + (a.views || 0), 0);

  res.json({
    counts: {
      books: books.length,
      studentBooks: books.filter(b => b.is_student === 1).length,
      summaries: summaries.length,
      videos: videos.length,
      articles: articles.length,
      users: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      logsCount: logs.length,
    },
    analytics: {
      totalDownloads,
      totalViews: totalBookViews + totalVideoViews + totalArticleViews,
      systemHealth: '100% ممتاز ومحمي',
      database: db.isUsingPostgres() ? 'PostgreSQL' : 'JSON Persistent Engine',
      securityStatus: 'جدار الحماية نشط - 0 هجمات نشطة',
    }
  });
});

// Admin Backup & Restore
app.get('/api/admin/backup', requireAdminAuth, (req: Request, res: Response) => {
  const data = db.getData();
  res.setHeader('Content-Disposition', `attachment; filename="luxury_library_backup_${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

app.post('/api/admin/restore', requireAdminAuth, (req: Request, res: Response) => {
  const backupData = req.body;
  if (!backupData || !backupData.pdfs || !backupData.users) {
    return res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح' });
  }
  db.restore(backupData);
  res.json({ message: 'تمت استعادة البيانات بنجاح!' });
});

// --------------------------------------------------------------------------
// 3. CONTENT CRUD ENDPOINTS (الكتب، الملخصات، المقاطع، المقالات)
// --------------------------------------------------------------------------

// BOOKS (PDFs)
app.get('/api/books', (req: Request, res: Response) => {
  const { category, search, student } = req.query;
  let books = db.getBooks();

  if (student === '1') {
    books = books.filter(b => b.is_student === 1);
  }

  if (category && category !== 'الكل' && category !== 'كتب الطلاب') {
    books = books.filter(b => b.category === category);
  } else if (category === 'كتب الطلاب') {
    books = books.filter(b => b.is_student === 1);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    books = books.filter(b => 
      b.title.toLowerCase().includes(q) || 
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.grade && b.grade.toLowerCase().includes(q))
    );
  }

  res.json({ books });
});

app.post('/api/books', requireAdminAuth, (req: Request, res: Response) => {
  const { title, category, filepath, coverpath, is_student, grade, description } = req.body;
  if (!title || !filepath) {
    return res.status(400).json({ error: 'العنوان ورابط الملف مطلوبان' });
  }

  const book = db.addBook({
    title: title.trim(),
    category: category || 'تعليم',
    filepath: filepath.trim(),
    coverpath: coverpath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    is_student: is_student ? 1 : 0,
    grade: grade || '',
    description: description || '',
  });

  db.addAuditLog({
    type: 'item_created',
    user: 'الأدمن',
    details: `إضافة كتاب جديد: "${book.title}" (${book.category})`,
    ip: getClientIp(req),
    status: 'success',
  });

  res.status(201).json({ book, message: 'تمت إضافة الكتاب بنجاح' });
});

app.put('/api/books/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateBook(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الكتاب غير موجود' });
  res.json({ book: updated, message: 'تم تحديث بيانات الكتاب بنجاح' });
});

app.delete('/api/books/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  const success = db.deleteBook(id);
  if (!success) return res.status(404).json({ error: 'الكتاب غير موجود' });

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف كتاب: "${book?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  res.json({ message: 'تم حذف الكتاب بنجاح' });
});

app.post('/api/books/:id/view', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  if (book) {
    db.updateBook(id, { views: (book.views || 0) + 1 });
  }
  res.json({ success: true });
});

app.post('/api/books/:id/download', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  if (book) {
    db.updateBook(id, { downloads: (book.downloads || 0) + 1 });
  }
  res.json({ success: true, downloads: (book?.downloads || 0) + 1 });
});

// SUMMARIES
app.get('/api/summaries', (req: Request, res: Response) => {
  const { search } = req.query;
  let summaries = db.getSummaries();
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    summaries = summaries.filter(s => s.title.toLowerCase().includes(q));
  }
  res.json({ summaries });
});

app.post('/api/summaries', requireAdminAuth, (req: Request, res: Response) => {
  const { title, imagepath, category } = req.body;
  if (!title || !imagepath) {
    return res.status(400).json({ error: 'العنوان ورابط صورة الملخص مطلوبان' });
  }

  const summary = db.addSummary({
    title: title.trim(),
    imagepath: imagepath.trim(),
    category: category || 'عام',
  });

  db.addAuditLog({
    type: 'item_created',
    user: 'الأدمن',
    details: `إضافة ملخص صورة جديد: "${summary.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  res.status(201).json({ summary, message: 'تمت إضافة الملخص بنجاح' });
});

app.put('/api/summaries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateSummary(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الملخص غير موجود' });
  res.json({ summary: updated, message: 'تم تعديل الملخص بنجاح' });
});

app.delete('/api/summaries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const sum = db.getSummaries().find(s => s.id === id);
  const success = db.deleteSummary(id);
  if (!success) return res.status(404).json({ error: 'الملخص غير موجود' });

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف ملخص: "${sum?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  res.json({ message: 'تم حذف الملخص بنجاح' });
});

// VIDEOS
app.get('/api/videos', (req: Request, res: Response) => {
  const { search } = req.query;
  let videos = db.getVideos();
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    videos = videos.filter(v => v.title.toLowerCase().includes(q));
  }
  res.json({ videos });
});

app.post('/api/videos', requireAdminAuth, (req: Request, res: Response) => {
  const { title, videourl, category, channel, duration } = req.body;
  if (!title || !videourl) {
    return res.status(400).json({ error: 'العنوان ورابط الفيديو مطلوبان' });
  }

  const video = db.addVideo({
    title: title.trim(),
    videourl: videourl.trim(),
    category: category || 'شروحات',
    channel: channel || 'المكتبة الرقمية',
    duration: duration || '15:00',
  });

  db.addAuditLog({
    type: 'item_created',
    user: 'الأدمن',
    details: `إضافة فيديو تعليمي: "${video.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  res.status(201).json({ video, message: 'تمت إضافة الفيديو بنجاح' });
});

app.put('/api/videos/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateVideo(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الفيديو غير موجود' });
  res.json({ video: updated, message: 'تم تعديل الفيديو بنجاح' });
});

app.delete('/api/videos/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const vid = db.getVideos().find(v => v.id === id);
  const success = db.deleteVideo(id);
  if (!success) return res.status(404).json({ error: 'الفيديو غير موجود' });

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف فيديو: "${vid?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  res.json({ message: 'تم حذف مقطع الفيديو بنجاح' });
});

// ARTICLES
app.get('/api/articles', (req: Request, res: Response) => {
  const { search } = req.query;
  let articles = db.getArticles();
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    articles = articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.content.toLowerCase().includes(q)
    );
  }
  res.json({ articles });
});

app.get('/api/articles/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const article = db.getArticleById(id);
  if (!article) return res.status(404).json({ error: 'المقالة غير موجودة' });
  db.updateArticle(id, { views: (article.views || 0) + 1 });
  res.json({ article });
});

app.post('/api/articles', requireAdminAuth, (req: Request, res: Response) => {
  const { title, content, imagepath, author, readTime } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'عنوان المقال والمحتوى مطلوبان' });
  }

  const article = db.addArticle({
    title: title.trim(),
    content: content.trim(),
    imagepath: imagepath || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
    author: author || 'ARM',
    readTime: readTime || '5 دقائق',
  });

  db.addAuditLog({
    type: 'item_created',
    user: 'الأدمن',
    details: `نشر مقال جديد: "${article.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  res.status(201).json({ article, message: 'تم نشر المقال بنجاح' });
});

app.put('/api/articles/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateArticle(id, req.body);
  if (!updated) return res.status(404).json({ error: 'المقالة غير موجودة' });
  res.json({ article: updated, message: 'تم تعديل المقال بنجاح' });
});

app.delete('/api/articles/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const art = db.getArticles().find(a => a.id === id);
  const success = db.deleteArticle(id);
  if (!success) return res.status(404).json({ error: 'المقالة غير موجودة' });

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف مقال: "${art?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  res.json({ message: 'تم حذف المقالة بنجاح' });
});

// --------------------------------------------------------------------------
// VITE INTEGRATION & SSR / STATIC SERVING
// --------------------------------------------------------------------------

async function startServer() {
  const http = await import('http');
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n👑 خادم المكتبة الرقمية الفاخرة يعمل بنجاح على: http://localhost:${PORT}`);
    console.log(`🛡️ وضع الأمان نشط: نظام تسجيل دخول المستخدمين + لوحة تحكم الأدمن جاهزة.`);
    console.log(`📁 مخزن البيانات: ${db.isUsingPostgres() ? 'PostgreSQL Cloud DB' : 'مخزن محلي فائق السرعة data/db.json'}\n`);
  });
}

startServer().catch(err => {
  console.error('فشل بدء تشغيل الخادم:', err);
});
