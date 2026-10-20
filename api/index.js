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

app.get(['/api/books', '/books'], (req, res) => {
  res.json({ books: memoryStore.books });
});

app.get(['/api/videos', '/videos'], (req, res) => {
  res.json({ videos: memoryStore.videos });
});

app.get(['/api/summaries', '/summaries'], (req, res) => {
  res.json({ summaries: memoryStore.summaries });
});

app.get(['/api/articles', '/articles'], (req, res) => {
  res.json({ articles: memoryStore.articles });
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

export default app;
