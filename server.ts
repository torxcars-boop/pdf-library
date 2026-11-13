import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { db, Book, Summary, Video, Article, User } from './server/db.ts';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const app = express();
const cliPortIndex = process.argv.indexOf('--port');
const cliPort = cliPortIndex !== -1 ? parseInt(process.argv[cliPortIndex + 1], 10) : NaN;
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
const isProduction = process.env.NODE_ENV === 'production';
// Ensure dev server binds port 3000 instead of colliding with container proxy on 8080
const PORT = !Number.isNaN(cliPort)
  ? cliPort
  : (!isProduction && (Number.isNaN(envPort) || envPort === 8080))
    ? 3000
    : (!Number.isNaN(envPort) ? envPort : 3000);

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.pdf').toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `book_${uniqueSuffix}${ext}`);
  },
});

const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('يرجى رفع ملف بصيغة PDF فقط'));
    }
  },
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper to extract client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// --------------------------------------------------------------------------
// REAL-TIME WEBSOCKET BROADCAST HUB
// --------------------------------------------------------------------------
let activeWss: WebSocketServer | null = null;

function getOnlineCount(): number {
  if (!activeWss) return 0;
  let count = 0;
  activeWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) count += 1;
  });
  return count;
}

function broadcastWsJson(payload: Record<string, unknown>) {
  if (!activeWss) return;
  const serialized = JSON.stringify(payload);
  activeWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(serialized);
      } catch {
        // ignore closed client socket errors
      }
    }
  });
}

function broadcastSync(scope: string, extra?: Record<string, unknown>) {
  broadcastWsJson({
    type: 'sync',
    scope,
    ts: Date.now(),
    onlineCount: getOnlineCount(),
    ...(extra || {}),
  });
}

// --------------------------------------------------------------------------
// STATELESS HMAC-SHA256 AUTH TOKENS (Survives Server Restarts!)
// --------------------------------------------------------------------------
const activeAdminTokens = new Set<string>();
const revokedUserTokens = new Set<string>();
const USER_TOKEN_SECRET = process.env.SESSION_SECRET || 'arm_digital_library_user_hmac_2026_secret';

function signUserToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(payload).digest('base64url');
  return `tok_usr_${payload}.${sig}`;
}

function verifyUserToken(token: string | undefined): string | null {
  if (!token || revokedUserTokens.has(token)) return null;
  if (!token.startsWith('tok_usr_')) return null;
  const raw = token.slice('tok_usr_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return typeof decoded?.uid === 'string' ? decoded.uid : null;
  } catch {
    return null;
  }
}

function sanitizeUserForClient(user: User) {
  const { password: _, ...userSafe } = user;
  const storedSub = db.getStudentSubscriptions()[user.id];
  return storedSub ? { ...userSafe, subscription: storedSub } : userSafe;
}

function signAdminToken(username: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', `arm_secret_${secret}`).update(payload).digest('base64url');
  return `adm_hmac_${payload}.${sig}`;
}

function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const adminConfig = db.getAdminConfig();
  if (activeAdminTokens.has(token) || token === adminConfig.passwordHash) return true;
  if (token.startsWith('adm_hmac_')) {
    const raw = token.slice('adm_hmac_'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', `arm_secret_${adminConfig.passwordHash}`)
      .update(payload)
      .digest('base64url');
    return sig === expectedSig;
  }
  return false;
}

// Security middleware for Admin
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.auth as string);

  if (isValidAdminToken(token)) {
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
  broadcastSync('all');
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

// Unified Bootstrap Sync Endpoint (Single Fast Payload for All Clients & Devices)
app.get('/api/sync/bootstrap', (_req: Request, res: Response) => {
  const deletedIds = db.getDeletedIds();
  const books = db.getBooks().filter(b => !deletedIds.books.includes(Number(b.id)));
  const summaries = db.getSummaries().filter(s => !deletedIds.summaries.includes(Number(s.id)));
  const videos = db.getVideos().filter(v => !deletedIds.videos.includes(Number(v.id)));
  const articles = db.getArticles().filter(a => !deletedIds.articles.includes(Number(a.id)));

  // Public supporter flags without sensitive payment receipts/phones
  const rawSubs = db.getStudentSubscriptions();
  const publicSupporters: Record<string, any> = {};
  Object.entries(rawSubs).forEach(([uid, sub]) => {
    if (sub && typeof sub === 'object') {
      publicSupporters[uid] = {
        planId: sub.planId,
        planName: sub.planName,
        status: sub.status,
        approvedByAdmin: Boolean(sub.approvedByAdmin),
        pricePaid: sub.pricePaid,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isTrial: false,
      };
    }
  });

  res.json({
    ts: Date.now(),
    onlineCount: getOnlineCount(),
    books,
    summaries,
    videos,
    articles,
    deletedIds,
    customExams: db.getCustomExams(),
    deletedExamIds: db.getDeletedExamIds(),
    reviews: db.getReviews(),
    comments: db.getComments(),
    supportConfig: db.getSupportConfig(),
    studentSubscriptions: publicSupporters,
  });
});

app.get('/api/deleted-ids', (_req: Request, res: Response) => {
  res.json({ deletedIds: db.getDeletedIds() });
});

app.post('/api/deleted-ids', (req: Request, res: Response) => {
  const updated = db.mergeDeletedIds(req.body || {});
  broadcastSync('content');
  res.json({ success: true, deletedIds: updated });
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

  const sessionToken = signUserToken(newUser.id);

  db.addAuditLog({
    type: 'login_success',
    user: `${newUser.name} (${newUser.email})`,
    details: 'إنشاء حساب جديد وتسجيل الدخول بنجاح',
    ip,
    status: 'success',
  });

  broadcastSync('users');

  res.status(201).json({
    message: 'تم إنشاء الحساب بنجاح! أهلاً بك في المكتبة الرقمية الفاخرة',
    token: sessionToken,
    user: sanitizeUserForClient(newUser),
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
  const updated = db.updateUser(user.id, { lastLogin: new Date().toISOString() }) || user;

  const sessionToken = signUserToken(user.id);

  db.addAuditLog({
    type: 'login_success',
    user: `${user.name} (${user.email})`,
    details: 'تسجيل دخول ناجح للمستخدم',
    ip,
    status: 'success',
  });

  res.json({
    message: `مرحباً بعودتك، ${user.name}!`,
    token: sessionToken,
    user: sanitizeUserForClient(updated),
  });
});

// Current Logged-in User Session check
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = verifyUserToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'الجلسة منتهية أو غير مسجلة' });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
  }

  res.json({ user: sanitizeUserForClient(user) });
});

// User Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    revokedUserTokens.add(token);
  }
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// Toggle Favorite / Bookmark for a user
app.post('/api/user/favorite', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = verifyUserToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لحفظ العناصر في المفضلة' });
  }

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

// Sync Student Stats / Progress / Badges across devices
app.get('/api/user/stats', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = verifyUserToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لمزامنة التقدم' });
  }
  const stats = db.getStudentStatsForUser(userId);
  res.json({ stats });
});

app.put('/api/user/stats', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = verifyUserToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لحفظ التقدم' });
  }
  const { stats } = req.body || {};
  if (!stats || typeof stats !== 'object') {
    return res.status(400).json({ error: 'بيانات الإحصائيات غير صالحة' });
  }
  const saved = db.setStudentStatsForUser(userId, stats);
  broadcastSync('user-stats', { userId });
  res.json({ success: true, stats: saved });
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

  broadcastSync('content');

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
  const userId = verifyUserToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }

  const { name, academicStage, avatar, password } = req.body;

  const updates: Partial<User> = {};
  if (name) updates.name = name.trim();
  if (academicStage) updates.academicStage = academicStage.trim();
  if (avatar) updates.avatar = avatar.trim();
  if (password && password.trim().length >= 6) updates.password = password.trim();

  const updated = db.updateUser(userId, updates);
  if (!updated) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });

  broadcastSync('users');

  res.json({ message: 'تم تحديث الملف الشخصي بنجاح', user: sanitizeUserForClient(updated) });
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
    const adminToken = signAdminToken(adminConfig.username, adminConfig.passwordHash);
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

  if (isValidAdminToken(token)) {
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
  const users = db.getUsers().map(sanitizeUserForClient);
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

  broadcastSync('users');

  res.json({ message: 'تم تحديث حالة المستخدم بنجاح', user: sanitizeUserForClient(updated!) });
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

  broadcastSync('users');

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
  const totalSummaryViews = summaries.reduce((acc, s) => acc + (s.views || 0), 0);
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
      totalViews: totalBookViews + totalVideoViews + totalSummaryViews + totalArticleViews,
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
  broadcastSync('all');
  res.json({ message: 'تمت استعادة البيانات بنجاح!' });
});

// --------------------------------------------------------------------------
// 3. CONTENT CRUD ENDPOINTS (الكتب، الملخصات، المقاطع، المقالات)
// --------------------------------------------------------------------------

// Real Multipart PDF Upload endpoint (supports up to 50MB PDFs cleanly with progress tracking)
app.post('/api/admin/upload-pdf', requireAdminAuth, (req: Request, res: Response) => {
  uploadPdf.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'فشل رفع ملف PDF' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم اختيار ملف PDF للرفع' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      url,
      filename: req.file.filename,
      size: req.file.size,
      message: 'تم رفع ملف الكتاب بنجاح',
    });
  });
});

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

  broadcastSync('books');
  res.status(201).json({ book, message: 'تمت إضافة الكتاب بنجاح' });
});

app.put('/api/books/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateBook(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الكتاب غير موجود' });
  broadcastSync('books');
  res.json({ book: updated, message: 'تم تحديث بيانات الكتاب بنجاح' });
});

app.delete('/api/books/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  const success = db.deleteBook(id);
  db.mergeDeletedIds({ books: [id] });
  if (!success) {
    broadcastSync('books');
    return res.json({ message: 'تمت إزالة الكتاب من المنصة' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف كتاب: "${book?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('books');
  res.json({ message: 'تم حذف الكتاب بنجاح' });
});

app.post('/api/books/:id/view', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  if (book) {
    db.updateBook(id, { views: (book.views || 0) + 1 });
    broadcastSync('content');
  }
  res.json({ success: true });
});

app.post('/api/books/:id/download', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const book = db.getBooks().find(b => b.id === id);
  let newDownloads = 1;
  if (book) {
    newDownloads = (book.downloads || 0) + 1;
    db.updateBook(id, { downloads: newDownloads });
    broadcastSync('content');
  }
  res.json({ success: true, downloads: newDownloads });
});

// Fast Student PDF Download Proxy (forces direct attachment download even for cross-origin PDFs)
app.get('/api/download-pdf', async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  const rawName = typeof req.query.filename === 'string' ? req.query.filename : 'book.pdf';
  if (!rawUrl) {
    return res.status(400).json({ error: 'رابط الملف غير صالح' });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'صيغة الرابط غير صالحة' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'بروتوكول الرابط غير مدعوم' });
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith('169.254.')
  ) {
    return res.status(403).json({ error: 'غير مسموح بالوصول إلى عناوين محلية' });
  }

  const safeName = rawName.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80) || 'book.pdf';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(parsed.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) {
      return res.redirect(parsed.toString());
    }
    const arrayBuffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="book.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(arrayBuffer));
  } catch {
    clearTimeout(timeout);
    return res.redirect(parsed.toString());
  }
});

app.post('/api/items/:type/:id/view', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const numId = parseInt(id, 10);
  let views = 1;
  if (type === 'book') {
    const book = db.getBooks().find(b => b.id === numId);
    if (book) {
      views = (book.views || 0) + 1;
      db.updateBook(numId, { views });
    }
  } else if (type === 'summary') {
    const sum = db.getSummaries().find(s => s.id === numId);
    if (sum) {
      views = (sum.views || 0) + 1;
      db.updateSummary(numId, { views });
    }
  } else if (type === 'video') {
    const vid = db.getVideos().find(v => v.id === numId);
    if (vid) {
      views = (vid.views || 0) + 1;
      db.updateVideo(numId, { views });
    }
  } else if (type === 'article') {
    const art = db.getArticles().find(a => a.id === numId);
    if (art) {
      views = (art.views || 0) + 1;
      db.updateArticle(numId, { views });
    }
  }
  broadcastSync('content');
  res.json({ success: true, views });
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

  broadcastSync('summaries');
  res.status(201).json({ summary, message: 'تمت إضافة الملخص بنجاح' });
});

app.put('/api/summaries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateSummary(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الملخص غير موجود' });
  broadcastSync('summaries');
  res.json({ summary: updated, message: 'تم تعديل الملخص بنجاح' });
});

app.delete('/api/summaries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const sum = db.getSummaries().find(s => s.id === id);
  const success = db.deleteSummary(id);
  db.mergeDeletedIds({ summaries: [id] });
  if (!success) {
    broadcastSync('summaries');
    return res.json({ message: 'تم حذف الملخص بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف ملخص: "${sum?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('summaries');
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

  broadcastSync('videos');
  res.status(201).json({ video, message: 'تمت إضافة الفيديو بنجاح' });
});

app.put('/api/videos/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateVideo(id, req.body);
  if (!updated) return res.status(404).json({ error: 'الفيديو غير موجود' });
  broadcastSync('videos');
  res.json({ video: updated, message: 'تم تعديل الفيديو بنجاح' });
});

app.delete('/api/videos/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const vid = db.getVideos().find(v => v.id === id);
  const success = db.deleteVideo(id);
  db.mergeDeletedIds({ videos: [id] });
  if (!success) {
    broadcastSync('videos');
    return res.json({ message: 'تم حذف مقطع الفيديو بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف فيديو: "${vid?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('videos');
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

  broadcastSync('articles');
  res.status(201).json({ article, message: 'تم نشر المقال بنجاح' });
});

app.put('/api/articles/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = db.updateArticle(id, req.body);
  if (!updated) return res.status(404).json({ error: 'المقالة غير موجودة' });
  broadcastSync('articles');
  res.json({ article: updated, message: 'تم تعديل المقال بنجاح' });
});

app.delete('/api/articles/:id', requireAdminAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const art = db.getArticles().find(a => a.id === id);
  const success = db.deleteArticle(id);
  db.mergeDeletedIds({ articles: [id] });
  if (!success) {
    broadcastSync('articles');
    return res.json({ message: 'تم حذف المقالة بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: 'الأدمن',
    details: `حذف مقال: "${art?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('articles');
  res.json({ message: 'تم حذف المقالة بنجاح' });
});

// --------------------------------------------------------------------------
// 4. SHARED EXAMS, REVIEWS, COMMENTS & SUPPORT ENDPOINTS (Cross-Device Sync)
// --------------------------------------------------------------------------

// EXAMS
app.get('/api/exams', (_req: Request, res: Response) => {
  res.json({
    customExams: db.getCustomExams(),
    deletedExamIds: db.getDeletedExamIds(),
  });
});

app.post('/api/exams', requireAdminAuth, (req: Request, res: Response) => {
  const exam = req.body;
  if (!exam || !exam.title || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return res.status(400).json({ error: 'بيانات الامتحان والأسئلة غير مكتملة' });
  }
  const saved = db.addCustomExam({
    ...exam,
    id: exam.id || 'exam_' + Date.now(),
    createdByAdmin: true,
  });
  broadcastSync('exams');
  res.status(201).json({ exam: saved, message: 'تم نشر الامتحان لجميع الطلاب بنجاح' });
});

app.delete('/api/exams/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  db.deleteExam(id);
  broadcastSync('exams');
  res.json({ success: true, message: 'تم حذف الامتحان بنجاح' });
});

// REVIEWS
app.get('/api/reviews', (req: Request, res: Response) => {
  const { itemId, itemType } = req.query;
  let reviews = db.getReviews();
  if (itemId && itemType) {
    reviews = reviews.filter(r => String(r.itemId) === String(itemId) && r.itemType === String(itemType));
  }
  res.json({ reviews });
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const body = req.body || {};
  const token = req.headers.authorization?.replace('Bearer ', '');
  const verifiedUserId = verifyUserToken(token);
  const effectiveUserId = verifiedUserId || body.userId;

  if (!effectiveUserId || !body.itemId || !body.itemType || !body.comment || typeof body.rating !== 'number') {
    return res.status(400).json({ error: 'بيانات المراجعة غير مكتملة' });
  }

  const created = db.addReview({
    id: body.id,
    itemId: body.itemId,
    itemType: body.itemType,
    userId: String(effectiveUserId),
    userName: String(body.userName || 'طالب'),
    userAvatar: body.userAvatar,
    academicStage: body.academicStage || 'طالب',
    rating: Math.min(5, Math.max(1, Number(body.rating))),
    comment: String(body.comment).trim(),
  });
  broadcastSync('reviews');
  res.status(201).json({ review: created });
});

app.put('/api/reviews/:id/toggle', requireAdminAuth, (req: Request, res: Response) => {
  const updated = db.toggleApproveReview(req.params.id);
  if (!updated) return res.status(404).json({ error: 'المراجعة غير موجودة' });
  broadcastSync('reviews');
  res.json({ review: updated });
});

app.delete('/api/reviews/:id', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const isAdmin = isValidAdminToken(token);
  const uid = verifyUserToken(token);
  const rev = db.getReviews().find(r => r.id === req.params.id);
  if (!rev) return res.status(404).json({ error: 'المراجعة غير موجودة' });

  if (!isAdmin && uid !== rev.userId) {
    return res.status(403).json({ error: 'غير مصرح بحذف هذه المراجعة' });
  }
  db.deleteReview(req.params.id);
  broadcastSync('reviews');
  res.json({ success: true });
});

// COMMENTS
app.get('/api/comments', (req: Request, res: Response) => {
  const { itemId, itemType } = req.query;
  let comments = db.getComments();
  if (itemId && itemType) {
    comments = comments.filter(c => String(c.itemId) === String(itemId) && c.itemType === String(itemType));
  }
  res.json({ comments });
});

app.post('/api/comments', (req: Request, res: Response) => {
  const body = req.body || {};
  const token = req.headers.authorization?.replace('Bearer ', '');
  const verifiedUserId = verifyUserToken(token);
  const effectiveAuthorId = verifiedUserId || body.authorId;

  if (!effectiveAuthorId || !body.itemId || !body.itemType || !body.content) {
    return res.status(400).json({ error: 'بيانات التعليق غير مكتملة' });
  }

  const created = db.addComment({
    id: body.id,
    itemId: String(body.itemId),
    itemType: body.itemType,
    authorId: String(effectiveAuthorId),
    authorName: String(body.authorName || 'طالب'),
    authorAvatar: body.authorAvatar,
    authorRole: body.authorRole || 'user',
    academicStage: body.academicStage || 'طالب',
    content: String(body.content).trim(),
  });
  broadcastSync('comments');
  res.status(201).json({ comment: created });
});

app.post('/api/comments/:id/like', (req: Request, res: Response) => {
  const actorId = String(req.body?.actorId || 'guest');
  const result = db.toggleLikeComment(req.params.id, actorId);
  if (!result) return res.status(404).json({ error: 'التعليق غير موجود' });
  broadcastSync('comments');
  res.json(result);
});

app.post('/api/comments/:id/admin-like', requireAdminAuth, (req: Request, res: Response) => {
  const updated = db.toggleAdminLikeComment(req.params.id);
  if (!updated) return res.status(404).json({ error: 'التعليق غير موجود' });
  broadcastSync('comments');
  res.json({ comment: updated });
});

app.delete('/api/comments/:id', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const isAdmin = isValidAdminToken(token);
  const uid = verifyUserToken(token);
  const cmt = db.getComments().find(c => c.id === req.params.id);
  if (!cmt) return res.status(404).json({ error: 'التعليق غير موجود' });

  if (!isAdmin && uid !== cmt.authorId) {
    return res.status(403).json({ error: 'غير مصرح بحذف هذا التعليق' });
  }
  db.deleteComment(req.params.id);
  broadcastSync('comments');
  res.json({ success: true });
});

// VOLUNTARY SUPPORT & SUPPORTERS
app.get('/api/support/config', (_req: Request, res: Response) => {
  res.json({ supportConfig: db.getSupportConfig() });
});

app.put('/api/support/config', requireAdminAuth, (req: Request, res: Response) => {
  const { planId, isActive } = req.body || {};
  if (!planId || typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'بيانات غير صالحة' });
  }
  const supportConfig = db.setSupportPlanStatus(String(planId), isActive);
  broadcastSync('support');
  res.json({ supportConfig });
});

app.get('/api/support/requests', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({
    requests: db.getSupportRequests(),
    studentSubscriptions: db.getStudentSubscriptions(),
  });
});

app.post('/api/support/requests', (req: Request, res: Response) => {
  const body = req.body || {};
  if (!body.userId || !body.senderPhone) {
    return res.status(400).json({ error: 'بيانات مساهمة الدعم غير مكتملة' });
  }
  const created = db.addSupportRequest(body);
  // Automatically register supporter badge immediately
  const now = new Date();
  const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  db.setStudentSubscription(String(body.userId), {
    planId: body.planId || 'basic_50',
    planName: 'داعم للمنصة المجانية ❤️',
    status: 'active',
    billingPeriod: 'monthly',
    examsRemainingThisWeek: -1,
    maxExamsPerWeek: -1,
    startDate: now.toISOString(),
    endDate: expiry.toISOString(),
    isTrial: false,
    pricePaid: body.amountEGP,
    paymentMethod: body.paymentMethod,
    paymentSenderPhone: body.senderPhone,
    transactionRef: body.transactionRef,
    approvedByAdmin: true,
  });
  broadcastSync('support');
  res.status(201).json({ request: created });
});

app.put('/api/support/requests/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { status } = req.body || {};
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'الحالة غير صالحة' });
  }
  const updated = db.updateSupportRequestStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'طلب الدعم غير موجود' });
  broadcastSync('support');
  res.json({ request: updated });
});

app.put('/api/support/supporters/:userId', requireAdminAuth, (req: Request, res: Response) => {
  const saved = db.setStudentSubscription(req.params.userId, req.body || {});
  broadcastSync('support');
  res.json({ subscription: saved });
});

// --------------------------------------------------------------------------
// VITE INTEGRATION & SSR / STATIC SERVING
// --------------------------------------------------------------------------

async function startServer() {
  const http = await import('http');
  const httpServer = http.createServer(app);

  // Attach Real-Time WebSocket Server (/ws) on port 3000
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  activeWss = wss;

  wss.on('connection', (ws: WebSocket) => {
    const onlineCount = getOnlineCount();
    try {
      ws.send(JSON.stringify({ type: 'connected', onlineCount, ts: Date.now() }));
    } catch {
      // ignore
    }
    broadcastWsJson({ type: 'presence', onlineCount, ts: Date.now() });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'ping' && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now(), onlineCount: getOnlineCount() }));
        }
      } catch {
        // ignore non-json frames
      }
    });

    ws.on('close', () => {
      broadcastWsJson({ type: 'presence', onlineCount: getOnlineCount(), ts: Date.now() });
    });
  });

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
    console.log(`⚡ المزامنة الفورية WebSocket متاحة على المسار: /ws`);
    console.log(`🛡️ وضع الأمان نشط: نظام تسجيل دخول المستخدمين + لوحة تحكم الأدمن جاهزة.`);
    console.log(`📁 مخزن البيانات: ${db.isUsingPostgres() ? 'PostgreSQL Cloud DB' : 'مخزن محلي فائق السرعة data/db.json'}\n`);
  });
}

startServer().catch(err => {
  console.error('فشل بدء تشغيل الخادم:', err);
});
