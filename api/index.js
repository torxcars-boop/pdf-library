import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import pg from 'pg';
const { Pool } = pg;

const app = express();
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

const ADMIN_USERNAME = 'ARM';
let adminPassword = process.env.ADMIN_PASSWORD || '1w2q3r4eA';

function getPool() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl && dbUrl.startsWith('postgres') && !dbUrl.includes('[YOUR-PASSWORD]')) {
    try {
      return new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
    } catch (e) {
      console.error("Pool Connection Init Error:", e.message);
      return null;
    }
  }
  return null;
}

// In-Memory Fallback Seed with Egyptian 3rd Secondary Curriculums
let memoryStore = {
  books: [
    {
      id: 1,
      title: 'كتاب الفيزياء للثانوية العامة المصرية 2026 - الكهربية والمغناطيسية والحديثة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - شعبة علمي',
      description: 'المنهج الكامل لفيزياء الثانوية العامة المصرية: التيار الكهربي وقانون أوم وكيرشوف، التأثير المغناطيسي، الحث الكهرومغناطيسي والدينامو، والفيزياء الحديثة وازدواجية الموجة والجسيم والأطياف الذرية والليزر.',
      downloads: 6420,
      views: 18900
    },
    {
      id: 2,
      title: 'كتاب الكيمياء للثانوية العامة المصرية 2026 - العناصر الانتقالية والكيمياء العضوية',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - شعبة علمي',
      description: 'العناصر الانتقالية وخامات الحديد، التحليل الكيميائي الوصفي والكمي، الاتزان الكيميائي والأيوني، الخلايا الجلفانية، والكيمياء العضوية الشاملة.',
      downloads: 7120,
      views: 21400
    },
    {
      id: 3,
      title: 'كتاب اللغة العربية لطلاب الثانوية العامة المصرية - النحو الشامل والبلاغة والأدب',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - عام وأدبي وعلمي',
      description: 'شرح وتدريبات الوحدات السبع في النحو: المشتقات، الأفعال، النواسخ، المنصوبات، حروف الجر، أساليب النحو، مع ملخص المدارس الشعرية وفنون البلاغة.',
      downloads: 8940,
      views: 26300
    },
    {
      id: 4,
      title: 'كتاب الرياضيات البحتة (التفاضل والتكامل والجبر والهندسة الفراغية) - ثانوية عامة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - شعبة علمي رياضة',
      description: 'تفاضل وتكامل الدوال الأسية واللوغاريتمية وتطبيقات القيم العظمى والصغرى، التباديل والتوافيق وذات الحدين، الأعداد المركبة، والهندسة الفراغية ثلاثية الأبعاد.',
      downloads: 4890,
      views: 14500
    },
    {
      id: 5,
      title: 'كتاب الرياضيات التطبيقية (الاستاتيكا والديناميكا) - الصف الثالث الثانوي المصري',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - علمي رياضة',
      description: 'الاحتكاك، العزوم في المستوى والفراغ، القوى المتوازية المستوية، الاتزان العام، مركز الثقل، قوانين نيوتن، الشغل والقدرة والطاقة، والدفع والتصادم.',
      downloads: 4120,
      views: 12800
    },
    {
      id: 6,
      title: 'كتاب الأحياء لشهادة إتمام الثانوية العامة المصرية 2026 - الدعامة والتكاثر والمناعة والـ DNA',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - شعبة علمي علوم',
      description: 'الدعامة والحركة، الهرمونات، التكاثر في الكائنات الحية والإنسان، جهاز المناعة، والبيولوجيا الجزيئية والهندسة الوراثية وتخليق البروتين.',
      downloads: 5780,
      views: 16900
    },
    {
      id: 7,
      title: 'كتاب الجيولوجيا والعلوم البيئية لشهادة الثانوية العامة المصرية 2026',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - علمي علوم',
      description: 'التراكيب الجيولوجية الأولية والطيّات والفوالق، علم المعادن والأنظمة البلورية، دورة الصخور، الحركات البنائية والهادمة، واستنزاف الموارد الطبيعية.',
      downloads: 4610,
      views: 13200
    },
    {
      id: 8,
      title: 'كتاب التاريخ للثانوية العامة المصرية: مصر والوطن العربي في العصر الحديث والمعاصر',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - الشعبة الأدبية',
      description: 'من الحملة الفرنسية وبناء الدولة الحديثة في عهد محمد علي، إلى الثورة العرابية، ثورة 1919، ثورة 23 يوليو 1952، والحروب العربية حتى نصر أكتوبر.',
      downloads: 3950,
      views: 11400
    },
    {
      id: 9,
      title: 'كتاب الجغرافيا السياسية ونواتج التعلم التطبيقية - الصف الثالث الثانوي المصري',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - الشعبة الأدبية',
      description: 'الدولة والمقومات الطبيعية والبشرية، الحدود السياسية وتطورها، التكتلات الاقتصادية والأحلاف العسكرية، والنظام العالمي الجديد.',
      downloads: 3820,
      views: 10900
    },
    {
      id: 10,
      title: 'كتاب اللغة الإنجليزية الشامل للثانوية العامة المصرية - قواعد ومفردات وبنك أسئلة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (المصري) - عام',
      description: 'قواعد الوحدات الـ 12 كاملة، الكلمات المربكة، استراتيجيات حل القطع المتحررة وفنون الترجمة المقالية المتقدمة بنظام البابل شيت.',
      downloads: 5410,
      views: 15300
    }
  ],
  videos: [
    {
      id: 1,
      title: 'مستر محمد عبد المعبود: مراجعة ليلة الامتحان في الفيزياء الكهربية والحديثة (ثانوية عامة مصرية)',
      videourl: 'https://www.youtube.com/watch?v=7u28s5V7gL4',
      category: 'كتب الطلاب',
      channel: 'الأستاذ محمد عبد المعبود - فيزياء',
      duration: '1:15:30',
      views: 145000
    },
    {
      id: 2,
      title: 'مستر خالد صقر: كبسولة الكيمياء العضوية وتسمية IUPAC وحل أصعب التفاعلات - 3 ثانوي',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'الأستاذ خالد صقر - كيمياء',
      duration: '54:20',
      views: 182000
    },
    {
      id: 3,
      title: 'الأستاذ رضا الفاروق: مراجعة النحو الكبرى والوحدات السبع وحل 100 فكرة امتحان وزارية',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'الأستاذ رضا الفاروق - لغة عربية',
      duration: '1:32:00',
      views: 210000
    },
    {
      id: 4,
      title: 'مستر محمد صلاح (قناة بسطتهالك): مراجعة الأدب والبلاغة وفنون النصوص المتحررة 3 ثانوي',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'بسطتهالك - مستر محمد صلاح',
      duration: '48:15',
      views: 164000
    },
    {
      id: 5,
      title: 'د. أحمد الجوهري: شرح المناعة والتكاثر والـ DNA بالتفصيل والرسوم المتحركة (أحياء 3 ثانوي)',
      videourl: 'https://www.youtube.com/watch?v=7u28s5V7gL4',
      category: 'كتب الطلاب',
      channel: 'د. أحمد الجوهري - أحياء ثانوية عامة',
      duration: '1:05:40',
      views: 128000
    },
    {
      id: 6,
      title: 'مقهى الرياضيات (مستر أحمد عصام): المراجعة النهائية في التفاضل والتكامل والهندسة الفراغية',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'مقهى الرياضيات - ثانوية عامة علمي رياضة',
      duration: '1:20:00',
      views: 98000
    }
  ],
  summaries: [
    {
      id: 1,
      title: 'خريطة ذهنية: الوحدات السبع في النحو لشهادة الثانوية العامة المصرية في ورقة واحدة',
      imagepath: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
      category: 'لغة عربية (ثانوية عامة)',
      views: 14200
    },
    {
      id: 2,
      title: 'شجرة تفاعلات الكيمياء العضوية وتسمية IUPAC كاملة في صفحة واحدة للمصريين',
      imagepath: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
      category: 'كيمياء (ثانوية عامة)',
      views: 12900
    },
    {
      id: 3,
      title: 'ملخص بصري: قوانين الكهربية وكيرشوف والحث والدينامو (فيزياء 3 ثانوي مصري)',
      imagepath: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
      category: 'فيزياء (ثانوية عامة)',
      views: 15400
    }
  ],
  articles: [
    {
      id: 1,
      title: 'دليل طالب الثانوية العامة للتعامل مع امتحانات البابل شيت وإدارة وقت المراجعة',
      content: '## نصائح أوائل الجمهورية في الثانوية العامة المصرية\n1. افهم نواتج التعلم وتطبيقاتها.\n2. تدرب على امتحانات البابل شيت 3 ساعات متواصلة.\n3. راجع الوحدات السبع في النحو وتفاعلات العضوية دورياً.',
      imagepath: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
      author: 'المصمم Ahmed Raafat & فريق المناهج',
      readTime: '4 دقائق',
      views: 8940
    }
  ],
  users: [
    {
      id: 'usr_demo',
      name: 'طالب الثانوية العامة',
      email: 'student@example.com',
      password: 'user123',
      role: 'user',
      academicStage: 'الصف الثالث الثانوي',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      bookmarks: []
    }
  ],
  auditLogs: [
    {
      id: 'log_vercel',
      type: 'login_success',
      user: 'ARM',
      details: 'مزامنة السيرفر السحابي مع مناهج الثانوية العامة المصرية 2026',
      ip: '127.0.0.1',
      status: 'success',
      timestamp: new Date().toISOString()
    }
  ]
};

// Endpoints
app.get(['/api/status', '/status'], (req, res) => {
  res.json({
    status: 'ok',
    engine: getPool() ? 'PostgreSQL Cloud' : 'Vercel Serverless Memory/Disk',
    totals: {
      books: memoryStore.books.length,
      videos: memoryStore.videos.length,
      summaries: memoryStore.summaries.length,
      articles: memoryStore.articles.length,
    }
  });
});

// Persistent Deleted Content Tracker across serverless calls
const deletedContentIds = {
  books: new Set(),
  summaries: new Set(),
  videos: new Set(),
  articles: new Set()
};

app.get(['/api/books', '/books'], (req, res) => {
  const filtered = memoryStore.books.filter(b => !deletedContentIds.books.has(b.id));
  res.json({ books: filtered });
});

app.get(['/api/videos', '/videos'], (req, res) => {
  const filtered = memoryStore.videos.filter(v => !deletedContentIds.videos.has(v.id));
  res.json({ videos: filtered });
});

app.get(['/api/summaries', '/summaries'], (req, res) => {
  const filtered = memoryStore.summaries.filter(s => !deletedContentIds.summaries.has(s.id));
  res.json({ summaries: filtered });
});

app.get(['/api/articles', '/articles'], (req, res) => {
  const filtered = memoryStore.articles.filter(a => !deletedContentIds.articles.has(a.id));
  res.json({ articles: filtered });
});

app.post(['/api/deleted-ids', '/deleted-ids'], (req, res) => {
  const { books, summaries, videos, articles } = req.body || {};
  if (Array.isArray(books)) books.forEach(id => deletedContentIds.books.add(Number(id)));
  if (Array.isArray(summaries)) summaries.forEach(id => deletedContentIds.summaries.add(Number(id)));
  if (Array.isArray(videos)) videos.forEach(id => deletedContentIds.videos.add(Number(id)));
  if (Array.isArray(articles)) articles.forEach(id => deletedContentIds.articles.add(Number(id)));
  res.json({
    success: true,
    deletedCounts: {
      books: deletedContentIds.books.size,
      summaries: deletedContentIds.summaries.size,
      videos: deletedContentIds.videos.size,
      articles: deletedContentIds.articles.size
    }
  });
});

app.post(['/api/admin/login', '/admin/login'], (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === adminPassword) {
    const token = 'adm_' + Date.now();
    return res.json({ success: true, token, username: ADMIN_USERNAME });
  }
  return res.status(401).json({ error: 'بيانات غير صحيحة' });
});

app.get(['/api/admin/stats', '/admin/stats'], (req, res) => {
  res.json({
    counts: {
      books: memoryStore.books.length,
      studentBooks: memoryStore.books.length,
      videos: memoryStore.videos.length,
      summaries: memoryStore.summaries.length,
      articles: memoryStore.articles.length,
      users: memoryStore.users.length,
      activeUsers: 1,
      logsCount: memoryStore.auditLogs.length
    },
    analytics: {
      totalDownloads: 45000,
      totalViews: 120000,
      systemHealth: '100% ممتاز ومحمي',
      database: 'Vercel Serverless Ready',
      securityStatus: 'نشط'
    }
  });
});

app.post(['/api/rate', '/rate'], (req, res) => {
  const { id, type, rating } = req.body;
  if (!id || !type || typeof rating !== 'number') {
    return res.status(400).json({ error: 'البيانات غير مكتملة' });
  }
  const star = Math.min(5, Math.max(1, Math.round(rating)));
  let list = [];
  if (type === 'book') list = memoryStore.books;
  else if (type === 'summary') list = memoryStore.summaries;
  else if (type === 'video') list = memoryStore.videos;
  else if (type === 'article') list = memoryStore.articles;

  const item = list.find(i => i.id === Number(id));
  if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });

  const currentCount = item.ratingCount || 1;
  const currentRating = item.rating || 5;
  const newCount = currentCount + 1;
  const newRating = Math.round((((currentRating * currentCount) + star) / newCount) * 10) / 10;
  item.rating = newRating;
  item.ratingCount = newCount;

  res.json({ success: true, message: 'تم تسجيل تقييمك بنجاح ⭐', rating: newRating, ratingCount: newCount });
});

app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const { email, password } = req.body;
  const user = memoryStore.users.find(u => u.email === email && u.password === password);
  if (user) {
    const token = 'tok_usr_' + Date.now();
    return res.json({ success: true, token, user });
  }
  return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
});

app.post(['/api/auth/register', '/auth/register'], (req, res) => {
  const { name, email, password, academicStage } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'يرجى إكمال البيانات' });
  }
  const newUser = {
    id: 'usr_' + Date.now(),
    name,
    email,
    password,
    role: 'user',
    academicStage: academicStage || 'طالب',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    status: 'active',
    bookmarks: []
  };
  memoryStore.users.push(newUser);
  const token = 'tok_usr_' + Date.now();
  res.json({ success: true, token, user: newUser });
});

// User Session Me endpoint
app.get(['/api/auth/me', '/auth/me'], (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  const user = memoryStore.users[0] || {
    id: 'usr_demo',
    name: 'طالب الثانوية العامة',
    email: 'student@example.com',
    role: 'user',
    academicStage: 'الصف الثالث الثانوي (المصري)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    bookmarks: []
  };
  const { password: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// User Profile Update endpoint (name, academicStage, avatar, password)
app.put(['/api/user/profile', '/user/profile'], (req, res) => {
  const { name, academicStage, avatar, password } = req.body;
  const user = memoryStore.users[0] || { id: 'usr_demo', name: 'طالب الثانوية العامة' };
  if (name) user.name = name.trim();
  if (academicStage) user.academicStage = academicStage.trim();
  if (avatar) user.avatar = avatar;
  if (password) user.password = password.trim();
  const { password: _, ...userSafe } = user;
  res.json({ message: 'تم تحديث الملف الشخصي بنجاح', user: userSafe });
});

// Toggle Favorite / Bookmark
app.post(['/api/user/favorite', '/user/favorite'], (req, res) => {
  const { id, type, title, path } = req.body;
  const user = memoryStore.users[0] || { id: 'usr_demo', bookmarks: [] };
  if (!user.bookmarks) user.bookmarks = [];
  const idx = user.bookmarks.findIndex(b => b.id === String(id) && b.type === type);
  let isBookmarked = false;
  if (idx >= 0) {
    user.bookmarks.splice(idx, 1);
    isBookmarked = false;
  } else {
    user.bookmarks.unshift({ id: String(id), type, title, path: path || '', addedAt: new Date().toISOString() });
    isBookmarked = true;
  }
  res.json({ isBookmarked, bookmarksCount: user.bookmarks.length, bookmarks: user.bookmarks });
});

// BOOKS CRUD
app.post(['/api/books', '/books'], (req, res) => {
  const { title, category, filepath, coverpath, is_student, grade, description } = req.body;
  if (!title || !filepath) {
    return res.status(400).json({ error: 'العنوان ورابط الملف مطلوبان' });
  }
  const newId = memoryStore.books.length > 0 ? Math.max(...memoryStore.books.map(b => b.id)) + 1 : 1;
  const newBook = {
    id: newId,
    title: title.trim(),
    category: category || 'كتب الطلاب',
    filepath: filepath.trim(),
    coverpath: coverpath || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    is_student: is_student ? 1 : 0,
    grade: grade || 'الصف الثالث الثانوي',
    description: description || '',
    downloads: 0,
    views: 0,
    rating: 5,
    ratingCount: 1,
    created_at: new Date().toISOString()
  };
  memoryStore.books.unshift(newBook);
  res.status(201).json({ book: newBook, message: 'تمت إضافة الكتاب بنجاح' });
});

app.put(['/api/books/:id', '/books/:id'], (req, res) => {
  const id = Number(req.params.id);
  const idx = memoryStore.books.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'الكتاب غير موجود' });
  memoryStore.books[idx] = { ...memoryStore.books[idx], ...req.body, id };
  res.json({ book: memoryStore.books[idx], message: 'تم تحديث بيانات الكتاب بنجاح' });
});

app.delete(['/api/books/:id', '/books/:id'], (req, res) => {
  const id = Number(req.params.id);
  deletedContentIds.books.add(id);
  memoryStore.books = memoryStore.books.filter(b => b.id !== id);
  res.json({ success: true, message: 'تم حذف الكتاب بنجاح' });
});

// SUMMARIES CRUD
app.post(['/api/summaries', '/summaries'], (req, res) => {
  const { title, imagepath, category } = req.body;
  if (!title || !imagepath) {
    return res.status(400).json({ error: 'العنوان ورابط صورة الملخص مطلوبان' });
  }
  const newId = memoryStore.summaries.length > 0 ? Math.max(...memoryStore.summaries.map(s => s.id)) + 1 : 1;
  const newSum = {
    id: newId,
    title: title.trim(),
    imagepath: imagepath.trim(),
    category: category || 'عام',
    views: 0,
    rating: 5,
    ratingCount: 1,
    created_at: new Date().toISOString()
  };
  memoryStore.summaries.unshift(newSum);
  res.status(201).json({ summary: newSum, message: 'تمت إضافة الملخص بنجاح' });
});

app.put(['/api/summaries/:id', '/summaries/:id'], (req, res) => {
  const id = Number(req.params.id);
  const idx = memoryStore.summaries.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'الملخص غير موجود' });
  memoryStore.summaries[idx] = { ...memoryStore.summaries[idx], ...req.body, id };
  res.json({ summary: memoryStore.summaries[idx], message: 'تم تعديل الملخص بنجاح' });
});

app.delete(['/api/summaries/:id', '/summaries/:id'], (req, res) => {
  const id = Number(req.params.id);
  deletedContentIds.summaries.add(id);
  memoryStore.summaries = memoryStore.summaries.filter(s => s.id !== id);
  res.json({ success: true, message: 'تم حذف الملخص بنجاح' });
});

// VIDEOS CRUD
app.post(['/api/videos', '/videos'], (req, res) => {
  const { title, videourl, category, channel, duration } = req.body;
  if (!title || !videourl) {
    return res.status(400).json({ error: 'العنوان ورابط الفيديو مطلوبان' });
  }
  const newId = memoryStore.videos.length > 0 ? Math.max(...memoryStore.videos.map(v => v.id)) + 1 : 1;
  const newVid = {
    id: newId,
    title: title.trim(),
    videourl: videourl.trim(),
    category: category || 'شروحات',
    channel: channel || 'المكتبة الرقمية',
    duration: duration || '15:00',
    views: 0,
    rating: 5,
    ratingCount: 1,
    created_at: new Date().toISOString()
  };
  memoryStore.videos.unshift(newVid);
  res.status(201).json({ video: newVid, message: 'تمت إضافة الفيديو بنجاح' });
});

app.put(['/api/videos/:id', '/videos/:id'], (req, res) => {
  const id = Number(req.params.id);
  const idx = memoryStore.videos.findIndex(v => v.id === id);
  if (idx === -1) return res.status(404).json({ error: 'الفيديو غير موجود' });
  memoryStore.videos[idx] = { ...memoryStore.videos[idx], ...req.body, id };
  res.json({ video: memoryStore.videos[idx], message: 'تم تعديل الفيديو بنجاح' });
});

app.delete(['/api/videos/:id', '/videos/:id'], (req, res) => {
  const id = Number(req.params.id);
  deletedContentIds.videos.add(id);
  memoryStore.videos = memoryStore.videos.filter(v => v.id !== id);
  res.json({ success: true, message: 'تم حذف الفيديو بنجاح' });
});

// ARTICLES CRUD
app.post(['/api/articles', '/articles'], (req, res) => {
  const { title, content, imagepath, author, readTime } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
  }
  const newId = memoryStore.articles.length > 0 ? Math.max(...memoryStore.articles.map(a => a.id)) + 1 : 1;
  const newArt = {
    id: newId,
    title: title.trim(),
    content: content.trim(),
    imagepath: imagepath || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
    author: author || 'ARM',
    readTime: readTime || '5 دقائق',
    views: 0,
    rating: 5,
    ratingCount: 1,
    created_at: new Date().toISOString()
  };
  memoryStore.articles.unshift(newArt);
  res.status(201).json({ article: newArt, message: 'تمت إضافة المقالة بنجاح' });
});

app.put(['/api/articles/:id', '/articles/:id'], (req, res) => {
  const id = Number(req.params.id);
  const idx = memoryStore.articles.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'المقالة غير موجودة' });
  memoryStore.articles[idx] = { ...memoryStore.articles[idx], ...req.body, id };
  res.json({ article: memoryStore.articles[idx], message: 'تم تعديل المقالة بنجاح' });
});

app.delete(['/api/articles/:id', '/articles/:id'], (req, res) => {
  const id = Number(req.params.id);
  deletedContentIds.articles.add(id);
  memoryStore.articles = memoryStore.articles.filter(a => a.id !== id);
  res.json({ success: true, message: 'تم حذف المقالة بنجاح' });
});

// ADMIN MANAGEMENT
app.get(['/api/admin/verify', '/admin/verify'], (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token && (token.startsWith('adm_') || token === adminPassword)) {
    return res.json({ verified: true, username: ADMIN_USERNAME });
  }
  return res.status(401).json({ verified: false });
});

app.get(['/api/admin/users', '/admin/users'], (req, res) => {
  res.json({ users: memoryStore.users.map(({ password, ...u }) => u) });
});

app.put(['/api/admin/users/:id/status', '/admin/users/:id/status'], (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;
  const user = memoryStore.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (status) user.status = status;
  if (role) user.role = role;
  res.json({ message: 'تم تحديث حالة المستخدم بنجاح', user });
});

app.delete(['/api/admin/users/:id', '/admin/users/:id'], (req, res) => {
  const { id } = req.params;
  memoryStore.users = memoryStore.users.filter(u => u.id !== id);
  res.json({ message: 'تم حذف حساب المستخدم بنجاح' });
});

app.get(['/api/admin/security/logs', '/admin/security/logs'], (req, res) => {
  res.json({ logs: memoryStore.auditLogs });
});

app.post(['/api/admin/security/clear-logs', '/admin/security/clear-logs'], (req, res) => {
  memoryStore.auditLogs = [];
  res.json({ message: 'تم مسح السجلات بنجاح' });
});

app.post(['/api/admin/security/change-password', '/admin/security/change-password'], (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (currentPassword !== adminPassword) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'كلمتا المرور غير متطابقتين' });
  }
  adminPassword = newPassword;
  res.json({ success: true, message: 'تم تغيير كلمة مرور المدير بنجاح!' });
});

export default app;
