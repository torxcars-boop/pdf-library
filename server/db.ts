import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'moderator' | 'admin';
  academicStage: string;
  avatar: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin: string;
  bookmarks: Array<{
    id: string;
    type: 'book' | 'article' | 'summary' | 'video';
    title: string;
    path: string;
    addedAt: string;
  }>;
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

export interface ServerReview {
  id: string;
  itemId: string | number;
  itemType: 'book' | 'video' | 'article' | 'summary';
  userId: string;
  userName: string;
  userAvatar?: string;
  academicStage?: string;
  rating: number;
  comment: string;
  createdAt: string;
  isApproved: boolean;
  likesCount?: number;
}

export interface ServerComment {
  id: string;
  itemId: string;
  itemType: 'book' | 'video' | 'article' | 'summary';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'admin' | 'moderator' | 'user';
  academicStage?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  likedBy: string[];
  isAdminLiked?: boolean;
}

export interface DeletedIdsStore {
  books: number[];
  summaries: number[];
  videos: number[];
  articles: number[];
  users: string[];
}

export interface DatabaseSchema {
  adminConfig: {
    username: string;
    passwordHash: string;
    updatedAt: string;
  };
  users: User[];
  pdfs: Book[];
  summaries: Summary[];
  videos: Video[];
  articles: Article[];
  auditLogs: AuditLog[];
  deletedIds?: DeletedIdsStore;
  reviews?: ServerReview[];
  comments?: ServerComment[];
  customExams?: any[];
  deletedExamIds?: string[];
  supportRequests?: any[];
  studentSubscriptions?: Record<string, any>;
  supportConfig?: Record<string, boolean>;
  studentStatsMap?: Record<string, any>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Egyptian 3rd Secondary (الصف الثالث الثانوي المصري) Rich Seed Dataset
export const EGYPT_THANAWEYA_DATA: DatabaseSchema = {
  adminConfig: {
    username: 'ARM',
    passwordHash: '1w2q3r4eA',
    updatedAt: new Date().toISOString(),
  },
  users: [],
  pdfs: [
    {
      id: 1,
      title: 'كتاب الفيزياء للثانوية العامة 2026 - الكهربية والمغناطيسية والحديثة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي)',
      description: 'المنهج الكامل للفيزياء: التيار الكهربي، كيرشوف، التأثير المغناطيسي، الحث الكهرومغناطيسي، الدوائر المهتزة، والفيزياء الحديثة وازدواجية الموجة والجسيم مع أسئلة امتحانات سابقة.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-01T12:00:00.000Z',
    },
    {
      id: 2,
      title: 'كتاب الكيمياء للثانوية العامة 2026 - العناصر الانتقالية والكيمياء العضوية',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي)',
      description: 'شرح مفصل ومخططات للأبواب الخمسة: العناصر الانتقالية والحديد، التحليل الكيميائي، الاتزان الأيوني والكيميائي، الكيمياء الكهربية والخلايا الجلفانية، والكيمياء العضوية وتفاعلاتها.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-02T14:15:00.000Z',
    },
    {
      id: 3,
      title: 'كتاب الأحياء لشهادة إتمام الثانوية العامة 2026 - الدعامة والتكاثر والمناعة والـ DNA',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي علوم)',
      description: 'المرجع الرسمي الشامل في الأحياء: فسيولوجيا الدعامة والحركة، التنسيق الهرموني، التكاثر في الكائنات الحية والإنسان، جهاز المناعة، والبيولوجيا الجزيئية والهندسة الوراثية.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-03T10:00:00.000Z',
    },
    {
      id: 4,
      title: 'الموجز الشامل في النحو والبلاغة لطلاب الثانوية العامة (الوحدات السبع كاملة)',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (عام وأدبي وعلمي)',
      description: 'تلخيص وحدات النحو السبع: المشتقات، إعراب الفعل وبناءه، نواسخ الجملة الاسمية، المفاعيل والمنصوبات، أحكام التوابع، وأساليب الاختصاص والتحذير والإغراء مع نصوص متحررة.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-04T11:20:00.000Z',
    },
    {
      id: 5,
      title: 'كتاب الرياضيات البحتة (التفاضل والتكامل والجبر والهندسة الفراغية) - ثانوية عامة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي رياضة)',
      description: 'شرح متكامل لنظريات النهايات والاشتقاق وتطبيقات القيم العظمى والصغرى، التكامل المحدد، التباديل والتوافيق، نظرية ذات الحدين، والمتجهات ومعادلة المستوى في الفراغ ثلاثي الأبعاد.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-05T09:30:00.000Z',
    },
    {
      id: 6,
      title: 'كتاب الرياضيات التطبيقية (الاستاتيكا والديناميكا) - الصف الثالث الثانوي',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي رياضة)',
      description: 'الاحتكاك، العزوم، القوى المتوازية المستوية، الاتزان العام، مركز الثقل، قوانين نيوتن الثلاثة، الشغل والقدرة والطاقة، وتطبيقات الدفع والتصادم.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-06T15:00:00.000Z',
    },
    {
      id: 7,
      title: 'كتاب الجيولوجيا والعلوم البيئية لشهادة الثانوية العامة 2026',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (علمي علوم)',
      description: 'التراكيب الجيولوجية الأولية والثانوية، علم المعادن وتكوين البلورات، أنواع الصخور، الحركات الأرضية والانجراف القاري، والنظام البيئي واستنزاف الموارد الطبيعية وحلولها.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-07T12:00:00.000Z',
    },
    {
      id: 8,
      title: 'كتاب التاريخ للثانوية العامة: مصر والوطن العربي في العصر الحديث والمعاصر',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (الشعبة الأدبية)',
      description: 'من الحملة الفرنسية على مصر والشام وبناء الدولة الحديثة في عهد محمد علي، إلى الثورة العرابية، ثورة 1919، ثورة 23 يوليو 1952، والحروب العربية الإسرائيلية حتى نصر أكتوبر.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-08T13:40:00.000Z',
    },
    {
      id: 9,
      title: 'كتاب الجغرافيا السياسية ونواتج التعلم التطبيقية - الصف الثالث الثانوي',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (الشعبة الأدبية)',
      description: 'الدولة تعريفها وأنواعها، المقومات الطبيعية والبشرية لقوة الدولة، الحدود السياسية وتطورها، التكتلات الاقتصادية والأحلاف العسكرية، والنظام العالمي الجديد.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-09T16:10:00.000Z',
    },
    {
      id: 10,
      title: 'كتاب اللغة الإنجليزية الشامل للثانوية العامة - قواعد وتراجم ومهارات الكتابة',
      category: 'كتب الطلاب',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
      is_student: 1,
      grade: 'الصف الثالث الثانوي (عام)',
      description: 'تغطية كاملة لـ 12 وحدة بالمنهج، القواعد الإنجليزية المعقدة، الفروق اللغوية الدقيقة (Confusing Words)، استراتيجيات حل القطع المتحررة وفنون الترجمة المتقدمة.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-10T14:00:00.000Z',
    },
    {
      id: 11,
      title: 'المدخل الشامل لبرمجة بايثون والخوارزميات (دليل عملي للطلاب)',
      category: 'برمجة',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      is_student: 0,
      grade: 'للمبتدئين والطلاب المهتمين بالتقنية',
      description: 'كتاب مرجعي باللغة العربية يشرح أساسيات ومتقدمات بايثون وهياكل البيانات وبناء المشاريع الحقيقية والتفكير البرمجي السليم.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-11T15:30:00.000Z',
    },
    {
      id: 12,
      title: 'أساسيات الذكاء الاصطناعي وتعلم الآلة للمستقبل',
      category: 'تقنية',
      filepath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      coverpath: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      is_student: 0,
      grade: 'ثقافي وعلمي متقدم',
      description: 'دليل مبسط وعملي للشباب والطلاب حول خوارزميات الذكاء الاصطناعي وكيف تغير التكنولوجيا مجالات الطب والهندسة والتعليم.',
      downloads: 0,
      views: 0,
      created_at: '2026-09-12T11:45:00.000Z',
    }
  ],
  summaries: [
    {
      id: 1,
      title: 'خريطة ذهنية: الوحدات السبع في النحو لشهادة الثانوية العامة المصرية',
      imagepath: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
      category: 'لغة عربية (ثانوية عامة)',
      views: 0,
      created_at: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'شجرة تفاعلات الكيمياء العضوية وتسمية IUPAC كاملة في صفحة واحدة',
      imagepath: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
      category: 'كيمياء (ثانوية عامة)',
      views: 0,
      created_at: '2026-09-04T12:00:00.000Z',
    },
    {
      id: 3,
      title: 'ملخص بصري: قوانين الكهربية وكيرشوف والحث والدينامو (فيزياء 3 ثانوي)',
      imagepath: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
      category: 'فيزياء (ثانوية عامة)',
      views: 0,
      created_at: '2026-09-08T15:20:00.000Z',
    },
    {
      id: 4,
      title: 'مخطط تدفقي: خطوات تخليق البروتين وآلية المناعة بالأجسام المضادة (أحياء)',
      imagepath: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      category: 'أحياء (ثانوية عامة)',
      views: 0,
      created_at: '2026-09-10T09:40:00.000Z',
    },
    {
      id: 5,
      title: 'خريطة ذهنية: قوانين الهندسة الفراغية ومعادلات الخط المستقيم والمستوى',
      imagepath: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      category: 'رياضيات (علمي رياضة)',
      views: 0,
      created_at: '2026-09-12T11:00:00.000Z',
    },
    {
      id: 6,
      title: 'انفوجرافيك: التراكيب الجيولوجية الأولية والثانوية ودورة الصخور الكاملة',
      imagepath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      category: 'جيولوجيا (علمي علوم)',
      views: 0,
      created_at: '2026-09-14T14:30:00.000Z',
    },
    {
      id: 7,
      title: 'خريطة مفاهيم: المدارس الشعرية في الأدب العربي وتطور القصيدة الحديثة',
      imagepath: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
      category: 'أدب ولغة عربية',
      views: 0,
      created_at: '2026-09-16T16:00:00.000Z',
    }
  ],
  videos: [
    {
      id: 1,
      title: 'مراجعة ليلة الامتحان في الفيزياء: أقوى تدريبات على كيرشوف والدينامو والحديثة (ثانوية عامة)',
      videourl: 'https://www.youtube.com/watch?v=7u28s5V7gL4',
      category: 'كتب الطلاب',
      channel: 'منصة المتفوقين في الفيزياء',
      duration: '58:00',
      views: 0,
      created_at: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'الكبسولة الذهبية في الكيمياء العضوية وتسمية IUPAC وحل أصعب التفاعلات - 3 ثانوي',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'أكاديمية الكيمياء للثانوية',
      duration: '45:20',
      views: 0,
      created_at: '2026-09-04T14:30:00.000Z',
    },
    {
      id: 3,
      title: 'أقوى مراجعة شاملة لمنهج النحو المصري وحل وتفكيك 100 فكرة امتحان وزارية',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'فرسان اللغة العربية',
      duration: '1:12:00',
      views: 0,
      created_at: '2026-09-07T16:00:00.000Z',
    },
    {
      id: 4,
      title: 'شرح المناعة وآلية عمل الأجسام المضادة وخلايا الدم البيضاء بالتفصيل (أحياء 3 ثانوي)',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'البيولوجيا ببساطة',
      duration: '38:15',
      views: 0,
      created_at: '2026-09-10T11:20:00.000Z',
    },
    {
      id: 5,
      title: 'المراجعة الشاملة في التفاضل والتكامل وسلوك الدوال والهندسة الفراغية لطلاب علمي رياضة',
      videourl: 'https://www.youtube.com/watch?v=7u28s5V7gL4',
      category: 'كتب الطلاب',
      channel: 'أستاذ الرياضيات المتقدمة',
      duration: '52:40',
      views: 0,
      created_at: '2026-09-12T15:10:00.000Z',
    },
    {
      id: 6,
      title: 'شرح نواتج التعلم في الجغرافيا السياسية والدولة والموقع والأحلاف العسكرية - ثانوية عامة',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'منصة التاريخ والجغرافيا',
      duration: '41:00',
      views: 0,
      created_at: '2026-09-15T13:00:00.000Z',
    }
  ],
  articles: [
    {
      id: 1,
      title: 'دليل طالب الثانوية العامة للتعامل مع امتحانات البابل شيت وإدارة وقت المراجعة',
      content: `## خريطة طريق التفوق في شهادة الثانوية العامة المصرية

تعتبر مرحلة الثانوية العامة مرحلة مفصلية تتطلب **التنظيم النفسي والمنهجي** قبل مجرد تكديس ساعات الاستذكار. هنا نلخص خلاصة تجارب أوائل الجمهورية:

### 1. فهم نواتج التعلم بدلاً من الحفظ الصم
اعتمدت وزارة التربية والتعليم في النظام الحديث على قياس مستويات التفكير العليا (التحليل، والتركيب، والاستنتاج). عند مذاكرة أي درس:
- اسأل نفسك: ما هو التطبيق العملي لهذه القاعدة أو القانون؟
- اربط بين الفصول المختلفة (مثلاً: ربط الكيمياء الكهربية بالعناصر الانتقالية).

### 2. مهارة التعامل مع ورقة البابل شيت (Bubble Sheet)
- لا تظلل الدائرة في ورقة البابل شيت إلا بعد التأكد النهائي من إجابتك في كراسة الأسئلة.
- استخدم القلم الرصاص أولاً ثم حبر بقلم جاف أزرق بهدوء لتجنب الكشط والتظليل المزدوج.

### 3. حل نماذج الامتحانات الاسترشادية الشاملة
- تدرب على الجلوس لمدة 3 ساعات متواصلة في بيئة هادئة ومماثلة للجنة الامتحان.
- قس وقت كل سؤال واعتمد تقنية "تجاوز السؤال الصعب مؤقتاً والعودة إليه لاحقاً".

> "ليس المهم كم كتاباً قرأت، بل كم فكرة فهمت وطبقت." — نصيحة المتفوقين`,
      imagepath: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
      author: 'المصمم Ahmed Raafat & فريق المناهج',
      readTime: '4 دقائق',
      views: 0,
      created_at: '2026-09-02T11:00:00.000Z',
    },
    {
      id: 2,
      title: 'كيف تضمن الدرجة النهائية في الفيزياء والكيمياء للثانوية العامة المصرية؟',
      content: `## أسرار التميز في المواد العلمية (علمي علوم ورياضة)

تعتبر مادتا الفيزياء والكيمياء من أكثر المواد التي تثير قلق الطلاب، ولكن بمفتاح التحليل الصحيح تتحول إلى أعلى درجات مجموعك:

### فيزياء الثانوية العامة:
1. **فهم وحدات القياس المكافئة:** سؤال مضمون في الامتحان غالباً ما يأتي عن وحدة تكافئ الفولت أو الويبر أو التسلا أو الهنري.
2. **الرسوم البيانية والميل (Slope):** عند رؤية أي رسم بياني، احسب الميل فوراً وحدد معناه الفيزيائي (مثل $\\Delta V / \\Delta I = R$).
3. **دوائر التيار المتردد:** احرص على حفظ متجهات الجهد والتيار وفرق الطور في دوائر $RLC$.

### كيمياء الثانوية العامة:
1. **كتابة معادلات العضوية بالصيغ البنائية:** لا تكتفِ بالصيغ الجزيئية حتى ترى أين حدث الكسر وأين حدثت الإضافة أو الاستبدال.
2. **مسائل حاصل الإذابة $K_{sp}$ والاتزان الأيوني:** التدريب على كتابة معادلة التفكك أولاً ثم تطبيق قانون فعل الكتلة.

بالتوفيق لجميع أبنائنا وبناتنا في الثانوية العامة!`,
      imagepath: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80',
      author: 'ARM',
      readTime: '5 دقائق',
      views: 0,
      created_at: '2026-09-09T17:20:00.000Z',
    }
  ],
  auditLogs: [
    {
      id: 'log_init',
      type: 'login_success',
      user: 'ARM (المدير العام)',
      details: 'تهيئة وتحديث مناهج الصف الثالث الثانوي المصري 2026 بنجاح',
      ip: '127.0.0.1',
      status: 'success',
      timestamp: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'log_seed',
      type: 'item_created',
      user: 'ARM (المدير العام)',
      details: 'إضافة كتب الفيزياء والكيمياء والأحياء والرياضيات والتاريخ والجغرافيا للثانوية العامة',
      ip: '127.0.0.1',
      status: 'success',
      timestamp: '2026-09-01T08:05:00.000Z',
    }
  ],
  deletedIds: { books: [], summaries: [], videos: [], articles: [], users: [] },
  reviews: [],
  comments: [],
  customExams: [],
  deletedExamIds: [],
  supportRequests: [],
  studentSubscriptions: {},
  supportConfig: { basic_50: true },
  studentStatsMap: {}
};

// Database Access Layer with Fallback & Postgres Integration
class DatabaseManager {
  private pool: Pool | null = null;
  private memoryData: DatabaseSchema;
  private pgSyncQueued = false;
  private pgSyncRunning = false;

  constructor() {
    this.memoryData = this.normalizeSchema(this.loadFromFile());
    this.initPostgres();
  }

  private normalizeSchema(data: Partial<DatabaseSchema>): DatabaseSchema {
    const fallback = JSON.parse(JSON.stringify(EGYPT_THANAWEYA_DATA)) as DatabaseSchema;
    return {
      ...fallback,
      ...data,
      adminConfig: data.adminConfig || fallback.adminConfig,
      users: Array.isArray(data.users) ? data.users : [],
      pdfs: Array.isArray(data.pdfs) ? data.pdfs : fallback.pdfs,
      summaries: Array.isArray(data.summaries) ? data.summaries : fallback.summaries,
      videos: Array.isArray(data.videos) ? data.videos : fallback.videos,
      articles: Array.isArray(data.articles) ? data.articles : fallback.articles,
      auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : fallback.auditLogs,
      deletedIds: {
        books: Array.isArray(data.deletedIds?.books) ? data.deletedIds!.books : [],
        summaries: Array.isArray(data.deletedIds?.summaries) ? data.deletedIds!.summaries : [],
        videos: Array.isArray(data.deletedIds?.videos) ? data.deletedIds!.videos : [],
        articles: Array.isArray(data.deletedIds?.articles) ? data.deletedIds!.articles : [],
        users: Array.isArray(data.deletedIds?.users) ? data.deletedIds!.users : [],
      },
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      comments: Array.isArray(data.comments) ? data.comments : [],
      customExams: Array.isArray(data.customExams) ? data.customExams : [],
      deletedExamIds: Array.isArray(data.deletedExamIds) ? data.deletedExamIds : [],
      supportRequests: Array.isArray(data.supportRequests) ? data.supportRequests : [],
      studentSubscriptions: data.studentSubscriptions && typeof data.studentSubscriptions === 'object' ? data.studentSubscriptions : {},
      supportConfig: data.supportConfig && typeof data.supportConfig === 'object' ? data.supportConfig : { basic_50: true },
      studentStatsMap: data.studentStatsMap && typeof data.studentStatsMap === 'object' ? data.studentStatsMap : {},
    };
  }

  private loadFromFile(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Accept the existing database state as authoritative without resetting when items are deleted
        if (parsed && Array.isArray(parsed.pdfs)) {
          return this.normalizeSchema(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading db file, using seed:', e);
    }
    const seed = this.normalizeSchema(EGYPT_THANAWEYA_DATA);
    this.saveToFile(seed);
    return seed;
  }

  public saveToFile(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db file:', e);
    }
  }

  private async initPostgres() {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && dbUrl.startsWith('postgres') && !dbUrl.includes('[YOUR-PASSWORD]')) {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false },
        });
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            academic_stage VARCHAR(100),
            avatar TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            bookmarks JSONB DEFAULT '[]'::jsonb
          );
          CREATE TABLE IF NOT EXISTS summaries (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            imagepath TEXT NOT NULL,
            category VARCHAR(100) DEFAULT 'عام',
            views INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS videos (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            videourl TEXT NOT NULL,
            category VARCHAR(100) DEFAULT 'عام',
            channel VARCHAR(100),
            duration VARCHAR(50),
            views INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS pdfs (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'تعليم',
            filepath TEXT NOT NULL,
            coverpath TEXT,
            is_student INT DEFAULT 0,
            grade VARCHAR(100),
            description TEXT,
            downloads INT DEFAULT 0,
            views INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS articles (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            imagepath TEXT,
            author VARCHAR(100) DEFAULT 'ARM',
            read_time VARCHAR(50) DEFAULT '5 دقائق',
            views INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(100) PRIMARY KEY,
            type VARCHAR(100) NOT NULL,
            user_label VARCHAR(255),
            details TEXT,
            ip VARCHAR(100),
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS app_sync_state (
            id TEXT PRIMARY KEY,
            payload JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
        const res = await this.pool.query('SELECT payload FROM app_sync_state WHERE id = $1 LIMIT 1', ['main']);
        if (res.rows.length > 0 && res.rows[0].payload) {
          this.memoryData = this.normalizeSchema(res.rows[0].payload);
          this.saveToFile(this.memoryData);
        } else {
          await this.pool.query(
            `INSERT INTO app_sync_state (id, payload, updated_at) VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
            ['main', JSON.stringify(this.memoryData)]
          );
        }
        console.log('PostgreSQL connected & synchronized successfully.');
      } catch (err: any) {
        console.warn('Postgres connection failed, continuing with robust Local Engine:', err.message);
        this.pool = null;
      }
    }
  }

  private async syncToPostgres() {
    if (!this.pool) return;
    if (this.pgSyncRunning) {
      this.pgSyncQueued = true;
      return;
    }
    this.pgSyncRunning = true;
    try {
      do {
        this.pgSyncQueued = false;
        await this.pool.query(
          `INSERT INTO app_sync_state (id, payload, updated_at) VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
          ['main', JSON.stringify(this.memoryData)]
        );
      } while (this.pgSyncQueued);
    } catch (err: any) {
      console.warn('Postgres sync warning:', err.message);
    } finally {
      this.pgSyncRunning = false;
    }
  }

  public isUsingPostgres(): boolean {
    return this.pool !== null;
  }

  public getData(): DatabaseSchema {
    return this.memoryData;
  }

  public async commit() {
    this.saveToFile(this.memoryData);
    void this.syncToPostgres();
  }

  public resetToEgyptianThanaweya() {
    this.memoryData = this.normalizeSchema(EGYPT_THANAWEYA_DATA);
    this.commit();
  }

  // Admin credentials verification
  public getAdminConfig() {
    return this.memoryData.adminConfig;
  }

  public setAdminPassword(newPassword: string, adminUsername = 'ARM') {
    this.memoryData.adminConfig.passwordHash = newPassword;
    this.memoryData.adminConfig.username = adminUsername;
    this.memoryData.adminConfig.updatedAt = new Date().toISOString();
    this.commit();
  }

  // Audit Logs
  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.memoryData.auditLogs.unshift(log);
    if (this.memoryData.auditLogs.length > 200) {
      this.memoryData.auditLogs = this.memoryData.auditLogs.slice(0, 200);
    }
    this.commit();
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return this.memoryData.auditLogs;
  }

  // Users
  public getUsers(): User[] {
    return this.memoryData.users;
  }

  public getUserById(id: string): User | undefined {
    return this.memoryData.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.memoryData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'bookmarks' | 'status'>): User {
    const newUser: User = {
      id: 'usr_' + Date.now(),
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      bookmarks: [],
      ...user,
    };
    this.memoryData.users.push(newUser);
    this.commit();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.memoryData.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.memoryData.users[idx] = { ...this.memoryData.users[idx], ...updates };
    this.commit();
    return this.memoryData.users[idx];
  }

  public deleteUser(id: string): boolean {
    const idx = this.memoryData.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.memoryData.users.splice(idx, 1);
    this.commit();
    return true;
  }

  // Books
  public getBooks(): Book[] {
    return this.memoryData.pdfs;
  }

  public addBook(book: Omit<Book, 'id' | 'downloads' | 'views' | 'created_at'>): Book {
    const deleted = this.getDeletedIds().books;
    const nextId = Math.max(0, ...this.memoryData.pdfs.map(b => Number(b.id) || 0), ...deleted.map(Number)) + 1;
    const newBook: Book = {
      id: nextId,
      downloads: 0,
      views: 0,
      created_at: new Date().toISOString(),
      ...book,
    };
    this.getDeletedIds().books = deleted.filter(id => Number(id) !== nextId);
    this.memoryData.pdfs.unshift(newBook);
    this.commit();
    return newBook;
  }

  public updateBook(id: number, updates: Partial<Book>): Book | null {
    const idx = this.memoryData.pdfs.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.memoryData.pdfs[idx] = { ...this.memoryData.pdfs[idx], ...updates, id };
    this.commit();
    return this.memoryData.pdfs[idx];
  }

  public deleteBook(id: number): boolean {
    const idx = this.memoryData.pdfs.findIndex(b => b.id === id);
    const deleted = this.getDeletedIds();
    if (!deleted.books.includes(Number(id))) {
      deleted.books.push(Number(id));
    }
    if (idx === -1) {
      this.commit();
      return false;
    }
    this.memoryData.pdfs.splice(idx, 1);
    this.commit();
    return true;
  }

  // Summaries
  public getSummaries(): Summary[] {
    return this.memoryData.summaries;
  }

  public addSummary(summary: Omit<Summary, 'id' | 'views' | 'created_at'>): Summary {
    const deleted = this.getDeletedIds().summaries;
    const nextId = Math.max(0, ...this.memoryData.summaries.map(s => Number(s.id) || 0), ...deleted.map(Number)) + 1;
    const newSum: Summary = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...summary,
    };
    this.getDeletedIds().summaries = deleted.filter(id => Number(id) !== nextId);
    this.memoryData.summaries.unshift(newSum);
    this.commit();
    return newSum;
  }

  public updateSummary(id: number, updates: Partial<Summary>): Summary | null {
    const idx = this.memoryData.summaries.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.memoryData.summaries[idx] = { ...this.memoryData.summaries[idx], ...updates, id };
    this.commit();
    return this.memoryData.summaries[idx];
  }

  public deleteSummary(id: number): boolean {
    const idx = this.memoryData.summaries.findIndex(s => s.id === id);
    const deleted = this.getDeletedIds();
    if (!deleted.summaries.includes(Number(id))) {
      deleted.summaries.push(Number(id));
    }
    if (idx === -1) {
      this.commit();
      return false;
    }
    this.memoryData.summaries.splice(idx, 1);
    this.commit();
    return true;
  }

  // Videos
  public getVideos(): Video[] {
    return this.memoryData.videos;
  }

  public addVideo(video: Omit<Video, 'id' | 'views' | 'created_at'>): Video {
    const deleted = this.getDeletedIds().videos;
    const nextId = Math.max(0, ...this.memoryData.videos.map(v => Number(v.id) || 0), ...deleted.map(Number)) + 1;
    const newVid: Video = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...video,
    };
    this.getDeletedIds().videos = deleted.filter(id => Number(id) !== nextId);
    this.memoryData.videos.unshift(newVid);
    this.commit();
    return newVid;
  }

  public updateVideo(id: number, updates: Partial<Video>): Video | null {
    const idx = this.memoryData.videos.findIndex(v => v.id === id);
    if (idx === -1) return null;
    this.memoryData.videos[idx] = { ...this.memoryData.videos[idx], ...updates, id };
    this.commit();
    return this.memoryData.videos[idx];
  }

  public deleteVideo(id: number): boolean {
    const idx = this.memoryData.videos.findIndex(v => v.id === id);
    const deleted = this.getDeletedIds();
    if (!deleted.videos.includes(Number(id))) {
      deleted.videos.push(Number(id));
    }
    if (idx === -1) {
      this.commit();
      return false;
    }
    this.memoryData.videos.splice(idx, 1);
    this.commit();
    return true;
  }

  // Articles
  public getArticles(): Article[] {
    return this.memoryData.articles;
  }

  public getArticleById(id: number): Article | undefined {
    return this.memoryData.articles.find(a => a.id === id);
  }

  public addArticle(art: Omit<Article, 'id' | 'views' | 'created_at'>): Article {
    const deleted = this.getDeletedIds().articles;
    const nextId = Math.max(0, ...this.memoryData.articles.map(a => Number(a.id) || 0), ...deleted.map(Number)) + 1;
    const newArt: Article = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...art,
    };
    this.getDeletedIds().articles = deleted.filter(id => Number(id) !== nextId);
    this.memoryData.articles.unshift(newArt);
    this.commit();
    return newArt;
  }

  public updateArticle(id: number, updates: Partial<Article>): Article | null {
    const idx = this.memoryData.articles.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.memoryData.articles[idx] = { ...this.memoryData.articles[idx], ...updates, id };
    this.commit();
    return this.memoryData.articles[idx];
  }

  public deleteArticle(id: number): boolean {
    const idx = this.memoryData.articles.findIndex(a => a.id === id);
    const deleted = this.getDeletedIds();
    if (!deleted.articles.includes(Number(id))) {
      deleted.articles.push(Number(id));
    }
    if (idx === -1) {
      this.commit();
      return false;
    }
    this.memoryData.articles.splice(idx, 1);
    this.commit();
    return true;
  }

  public rateItem(type: 'book' | 'summary' | 'video' | 'article', id: number, userRating: number): { rating: number; ratingCount: number } | null {
    const star = Math.min(5, Math.max(1, Math.round(userRating)));
    let targetList: Array<{ id: number; rating?: number; ratingCount?: number }> = [];
    if (type === 'book') targetList = this.memoryData.pdfs;
    else if (type === 'summary') targetList = this.memoryData.summaries;
    else if (type === 'video') targetList = this.memoryData.videos;
    else if (type === 'article') targetList = this.memoryData.articles;
    else return null;

    const item = targetList.find(i => i.id === id);
    if (!item) return null;

    const currentCount = item.ratingCount || 0;
    const currentRating = item.rating || 0;
    const newCount = currentCount + 1;
    const newRating = Math.round((((currentRating * currentCount) + star) / newCount) * 10) / 10;

    item.rating = newRating;
    item.ratingCount = newCount;
    this.commit();
    return { rating: newRating, ratingCount: newCount };
  }

  // Deleted IDs Registry
  public getDeletedIds(): DeletedIdsStore {
    if (!this.memoryData.deletedIds) {
      this.memoryData.deletedIds = { books: [], summaries: [], videos: [], articles: [], users: [] };
    }
    return this.memoryData.deletedIds;
  }

  public mergeDeletedIds(payload: Partial<DeletedIdsStore>): DeletedIdsStore {
    const store = this.getDeletedIds();
    if (Array.isArray(payload.books)) {
      payload.books.forEach(id => {
        const n = Number(id);
        if (!store.books.includes(n)) store.books.push(n);
      });
      this.memoryData.pdfs = this.memoryData.pdfs.filter(b => !store.books.includes(Number(b.id)));
    }
    if (Array.isArray(payload.summaries)) {
      payload.summaries.forEach(id => {
        const n = Number(id);
        if (!store.summaries.includes(n)) store.summaries.push(n);
      });
      this.memoryData.summaries = this.memoryData.summaries.filter(s => !store.summaries.includes(Number(s.id)));
    }
    if (Array.isArray(payload.videos)) {
      payload.videos.forEach(id => {
        const n = Number(id);
        if (!store.videos.includes(n)) store.videos.push(n);
      });
      this.memoryData.videos = this.memoryData.videos.filter(v => !store.videos.includes(Number(v.id)));
    }
    if (Array.isArray(payload.articles)) {
      payload.articles.forEach(id => {
        const n = Number(id);
        if (!store.articles.includes(n)) store.articles.push(n);
      });
      this.memoryData.articles = this.memoryData.articles.filter(a => !store.articles.includes(Number(a.id)));
    }
    if (Array.isArray(payload.users)) {
      payload.users.forEach(id => {
        const s = String(id);
        if (!store.users.includes(s)) store.users.push(s);
      });
    }
    this.commit();
    return store;
  }

  // Reviews
  public getReviews(): ServerReview[] {
    if (!this.memoryData.reviews) this.memoryData.reviews = [];
    return this.memoryData.reviews;
  }

  public addReview(rev: Omit<ServerReview, 'id' | 'createdAt' | 'isApproved'> & { id?: string }): ServerReview {
    const list = this.getReviews();
    const created: ServerReview = {
      ...rev,
      id: rev.id || 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      isApproved: true,
      likesCount: 0,
    };
    list.unshift(created);
    this.commit();
    return created;
  }

  public toggleApproveReview(reviewId: string): ServerReview | null {
    const list = this.getReviews();
    const target = list.find(r => r.id === reviewId);
    if (!target) return null;
    target.isApproved = !target.isApproved;
    this.commit();
    return target;
  }

  public deleteReview(reviewId: string): boolean {
    const list = this.getReviews();
    const idx = list.findIndex(r => r.id === reviewId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.commit();
    return true;
  }

  // Comments
  public getComments(): ServerComment[] {
    if (!this.memoryData.comments) this.memoryData.comments = [];
    return this.memoryData.comments;
  }

  public addComment(cmt: Omit<ServerComment, 'id' | 'createdAt' | 'likesCount' | 'likedBy'> & { id?: string }): ServerComment {
    const list = this.getComments();
    const created: ServerComment = {
      ...cmt,
      id: cmt.id || 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      likedBy: [],
      isAdminLiked: cmt.authorRole === 'admin' || cmt.authorRole === 'moderator',
    };
    list.unshift(created);
    this.commit();
    return created;
  }

  public toggleLikeComment(commentId: string, actorId: string): { comment: ServerComment; hasLiked: boolean } | null {
    const list = this.getComments();
    const c = list.find(item => item.id === commentId);
    if (!c) return null;
    if (!Array.isArray(c.likedBy)) c.likedBy = [];
    const idx = c.likedBy.indexOf(actorId);
    let hasLiked = false;
    if (idx >= 0) {
      c.likedBy.splice(idx, 1);
      c.likesCount = Math.max(0, (c.likesCount || 0) - 1);
      hasLiked = false;
    } else {
      c.likedBy.push(actorId);
      c.likesCount = (c.likesCount || 0) + 1;
      hasLiked = true;
    }
    this.commit();
    return { comment: c, hasLiked };
  }

  public toggleAdminLikeComment(commentId: string): ServerComment | null {
    const list = this.getComments();
    const c = list.find(item => item.id === commentId);
    if (!c) return null;
    c.isAdminLiked = !c.isAdminLiked;
    this.commit();
    return c;
  }

  public deleteComment(commentId: string): boolean {
    const list = this.getComments();
    const idx = list.findIndex(c => c.id === commentId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.commit();
    return true;
  }

  // Exams
  public getCustomExams(): any[] {
    if (!this.memoryData.customExams) this.memoryData.customExams = [];
    return this.memoryData.customExams;
  }

  public getDeletedExamIds(): string[] {
    if (!this.memoryData.deletedExamIds) this.memoryData.deletedExamIds = [];
    return this.memoryData.deletedExamIds;
  }

  public addCustomExam(exam: any): any {
    const list = this.getCustomExams();
    const clean = [exam, ...list.filter(e => String(e.id) !== String(exam.id))];
    this.memoryData.customExams = clean;
    this.commit();
    return exam;
  }

  public deleteExam(examId: string): boolean {
    const deleted = this.getDeletedExamIds();
    if (!deleted.includes(examId)) {
      deleted.push(examId);
    }
    this.memoryData.customExams = this.getCustomExams().filter(e => String(e.id) !== String(examId));
    this.commit();
    return true;
  }

  // Voluntary Support & Supporter Badges
  public getSupportConfig(): Record<string, boolean> {
    if (!this.memoryData.supportConfig) this.memoryData.supportConfig = { basic_50: true };
    return this.memoryData.supportConfig;
  }

  public setSupportPlanStatus(planId: string, isActive: boolean): Record<string, boolean> {
    const cfg = this.getSupportConfig();
    cfg[planId] = isActive;
    this.commit();
    return cfg;
  }

  public getSupportRequests(): any[] {
    if (!this.memoryData.supportRequests) this.memoryData.supportRequests = [];
    return this.memoryData.supportRequests;
  }

  public addSupportRequest(req: any): any {
    const list = this.getSupportRequests();
    const newReq = {
      ...req,
      id: req.id || 'req_' + Date.now(),
      submittedAt: req.submittedAt || new Date().toISOString(),
      status: req.status || 'pending',
    };
    list.unshift(newReq);
    if (list.length > 100) {
      this.memoryData.supportRequests = list.slice(0, 100);
    }
    this.commit();
    return newReq;
  }

  public updateSupportRequestStatus(requestId: string, newStatus: 'approved' | 'rejected'): any | null {
    const list = this.getSupportRequests();
    const target = list.find(r => r.id === requestId);
    if (!target) return null;
    target.status = newStatus;
    if (newStatus === 'approved' && target.userId) {
      const now = new Date();
      const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      this.setStudentSubscription(target.userId, {
        planId: target.planId || 'basic_50',
        planName: 'داعم للمنصة المجانية ❤️',
        status: 'active',
        billingPeriod: 'monthly',
        examsRemainingThisWeek: -1,
        maxExamsPerWeek: -1,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        isTrial: false,
        pricePaid: target.amountEGP,
        paymentMethod: target.paymentMethod,
        paymentSenderPhone: target.senderPhone,
        transactionRef: target.transactionRef,
        approvedByAdmin: true,
      });
    }
    this.commit();
    return target;
  }

  public getStudentSubscriptions(): Record<string, any> {
    if (!this.memoryData.studentSubscriptions) this.memoryData.studentSubscriptions = {};
    return this.memoryData.studentSubscriptions;
  }

  public setStudentSubscription(userId: string, sub: any): Record<string, any> {
    const map = this.getStudentSubscriptions();
    map[userId] = {
      ...sub,
      status: 'active',
      examsRemainingThisWeek: -1,
      maxExamsPerWeek: -1,
      isTrial: false,
    };
    this.commit();
    return map[userId];
  }

  // Per-Student Progress Stats (XP, Badges, Passed Exams, Downloads)
  public getStudentStatsForUser(userId: string): any | null {
    if (!this.memoryData.studentStatsMap) this.memoryData.studentStatsMap = {};
    return this.memoryData.studentStatsMap[userId] || null;
  }

  public setStudentStatsForUser(userId: string, stats: any): any {
    if (!this.memoryData.studentStatsMap) this.memoryData.studentStatsMap = {};
    this.memoryData.studentStatsMap[userId] = stats;
    this.commit();
    return stats;
  }

  public restore(data: DatabaseSchema) {
    this.memoryData = this.normalizeSchema(data);
    this.commit();
  }
}

export const db = new DatabaseManager();
