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
  users: [
    {
      id: 'usr_student_demo',
      name: 'محمود عبد الرحمن',
      email: 'student@example.com',
      password: 'user123',
      role: 'user',
      academicStage: 'الصف الثالث الثانوي (علمي علوم)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      lastLogin: new Date().toISOString(),
      bookmarks: [
        {
          id: '1',
          type: 'book',
          title: 'كتاب الفيزياء للثانوية العامة 2026 - الكهربية والمغناطيسية والحديثة',
          path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          addedAt: '2026-09-10T12:00:00.000Z',
        },
        {
          id: '1',
          type: 'summary',
          title: 'خريطة ذهنية: الوحدات السبع في النحو لشهادة الثانوية العامة المصرية',
          path: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
          addedAt: '2026-09-12T15:30:00.000Z',
        }
      ],
    },
    {
      id: 'usr_sara_demo',
      name: 'مريم طارق الشريف',
      email: 'sara@example.com',
      password: 'user123',
      role: 'moderator',
      academicStage: 'الصف الثالث الثانوي (علمي رياضة)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      createdAt: '2026-09-05T14:20:00.000Z',
      lastLogin: new Date().toISOString(),
      bookmarks: [
        {
          id: '5',
          type: 'book',
          title: 'كتاب الرياضيات البحتة (التفاضل والتكامل والجبر والفراغية) - ثانوية عامة',
          path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          addedAt: '2026-09-08T09:15:00.000Z',
        }
      ],
    }
  ],
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
      downloads: 4890,
      views: 12450,
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
      downloads: 5120,
      views: 13900,
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
      downloads: 4340,
      views: 11200,
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
      downloads: 6200,
      views: 16800,
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
      downloads: 3820,
      views: 9400,
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
      downloads: 3190,
      views: 8200,
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
      downloads: 3750,
      views: 9900,
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
      downloads: 2980,
      views: 7600,
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
      downloads: 2840,
      views: 7100,
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
      downloads: 4120,
      views: 10800,
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
      downloads: 2840,
      views: 7410,
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
      downloads: 3120,
      views: 8900,
      created_at: '2026-09-12T11:45:00.000Z',
    }
  ],
  summaries: [
    {
      id: 1,
      title: 'خريطة ذهنية: الوحدات السبع في النحو لشهادة الثانوية العامة المصرية',
      imagepath: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
      category: 'لغة عربية (ثانوية عامة)',
      views: 8920,
      created_at: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'شجرة تفاعلات الكيمياء العضوية وتسمية IUPAC كاملة في صفحة واحدة',
      imagepath: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
      category: 'كيمياء (ثانوية عامة)',
      views: 7840,
      created_at: '2026-09-04T12:00:00.000Z',
    },
    {
      id: 3,
      title: 'ملخص بصري: قوانين الكهربية وكيرشوف والحث والدينامو (فيزياء 3 ثانوي)',
      imagepath: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
      category: 'فيزياء (ثانوية عامة)',
      views: 9150,
      created_at: '2026-09-08T15:20:00.000Z',
    },
    {
      id: 4,
      title: 'مخطط تدفقي: خطوات تخليق البروتين وآلية المناعة بالأجسام المضادة (أحياء)',
      imagepath: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      category: 'أحياء (ثانوية عامة)',
      views: 6420,
      created_at: '2026-09-10T09:40:00.000Z',
    },
    {
      id: 5,
      title: 'خريطة ذهنية: قوانين الهندسة الفراغية ومعادلات الخط المستقيم والمستوى',
      imagepath: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      category: 'رياضيات (علمي رياضة)',
      views: 5310,
      created_at: '2026-09-12T11:00:00.000Z',
    },
    {
      id: 6,
      title: 'انفوجرافيك: التراكيب الجيولوجية الأولية والثانوية ودورة الصخور الكاملة',
      imagepath: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      category: 'جيولوجيا (علمي علوم)',
      views: 4980,
      created_at: '2026-09-14T14:30:00.000Z',
    },
    {
      id: 7,
      title: 'خريطة مفاهيم: المدارس الشعرية في الأدب العربي وتطور القصيدة الحديثة',
      imagepath: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
      category: 'أدب ولغة عربية',
      views: 5890,
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
      views: 28400,
      created_at: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'الكبسولة الذهبية في الكيمياء العضوية وتسمية IUPAC وحل أصعب التفاعلات - 3 ثانوي',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'أكاديمية الكيمياء للثانوية',
      duration: '45:20',
      views: 22100,
      created_at: '2026-09-04T14:30:00.000Z',
    },
    {
      id: 3,
      title: 'أقوى مراجعة شاملة لمنهج النحو المصري وحل وتفكيك 100 فكرة امتحان وزارية',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'فرسان اللغة العربية',
      duration: '1:12:00',
      views: 31500,
      created_at: '2026-09-07T16:00:00.000Z',
    },
    {
      id: 4,
      title: 'شرح المناعة وآلية عمل الأجسام المضادة وخلايا الدم البيضاء بالتفصيل (أحياء 3 ثانوي)',
      videourl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      category: 'كتب الطلاب',
      channel: 'البيولوجيا ببساطة',
      duration: '38:15',
      views: 18900,
      created_at: '2026-09-10T11:20:00.000Z',
    },
    {
      id: 5,
      title: 'المراجعة الشاملة في التفاضل والتكامل وسلوك الدوال والهندسة الفراغية لطلاب علمي رياضة',
      videourl: 'https://www.youtube.com/watch?v=7u28s5V7gL4',
      category: 'كتب الطلاب',
      channel: 'أستاذ الرياضيات المتقدمة',
      duration: '52:40',
      views: 16700,
      created_at: '2026-09-12T15:10:00.000Z',
    },
    {
      id: 6,
      title: 'شرح نواتج التعلم في الجغرافيا السياسية والدولة والموقع والأحلاف العسكرية - ثانوية عامة',
      videourl: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
      category: 'كتب الطلاب',
      channel: 'منصة التاريخ والجغرافيا',
      duration: '41:00',
      views: 14200,
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
      views: 8940,
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
      views: 11200,
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
  ]
};

// Database Access Layer with Fallback & Postgres Integration
class DatabaseManager {
  private pool: Pool | null = null;
  private memoryData: DatabaseSchema;

  constructor() {
    this.memoryData = this.loadFromFile();
    this.initPostgres();
  }

  private loadFromFile(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Verify if it contains the updated Thanaweya books
        if (parsed.pdfs && parsed.pdfs.length >= 10) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading db file, using seed:', e);
    }
    this.saveToFile(EGYPT_THANAWEYA_DATA);
    return JSON.parse(JSON.stringify(EGYPT_THANAWEYA_DATA));
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
        `);
        console.log('PostgreSQL connected & initialized successfully.');
      } catch (err: any) {
        console.warn('Postgres connection failed, continuing with robust Local Engine:', err.message);
        this.pool = null;
      }
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
  }

  public resetToEgyptianThanaweya() {
    this.memoryData = JSON.parse(JSON.stringify(EGYPT_THANAWEYA_DATA));
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
    const nextId = this.memoryData.pdfs.length > 0 
      ? Math.max(...this.memoryData.pdfs.map(b => b.id)) + 1 
      : 1;
    const newBook: Book = {
      id: nextId,
      downloads: 0,
      views: 0,
      created_at: new Date().toISOString(),
      ...book,
    };
    this.memoryData.pdfs.unshift(newBook);
    this.commit();
    return newBook;
  }

  public updateBook(id: number, updates: Partial<Book>): Book | null {
    const idx = this.memoryData.pdfs.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.memoryData.pdfs[idx] = { ...this.memoryData.pdfs[idx], ...updates };
    this.commit();
    return this.memoryData.pdfs[idx];
  }

  public deleteBook(id: number): boolean {
    const idx = this.memoryData.pdfs.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.memoryData.pdfs.splice(idx, 1);
    this.commit();
    return true;
  }

  // Summaries
  public getSummaries(): Summary[] {
    return this.memoryData.summaries;
  }

  public addSummary(summary: Omit<Summary, 'id' | 'views' | 'created_at'>): Summary {
    const nextId = this.memoryData.summaries.length > 0 
      ? Math.max(...this.memoryData.summaries.map(s => s.id)) + 1 
      : 1;
    const newSum: Summary = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...summary,
    };
    this.memoryData.summaries.unshift(newSum);
    this.commit();
    return newSum;
  }

  public updateSummary(id: number, updates: Partial<Summary>): Summary | null {
    const idx = this.memoryData.summaries.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.memoryData.summaries[idx] = { ...this.memoryData.summaries[idx], ...updates };
    this.commit();
    return this.memoryData.summaries[idx];
  }

  public deleteSummary(id: number): boolean {
    const idx = this.memoryData.summaries.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.memoryData.summaries.splice(idx, 1);
    this.commit();
    return true;
  }

  // Videos
  public getVideos(): Video[] {
    return this.memoryData.videos;
  }

  public addVideo(video: Omit<Video, 'id' | 'views' | 'created_at'>): Video {
    const nextId = this.memoryData.videos.length > 0 
      ? Math.max(...this.memoryData.videos.map(v => v.id)) + 1 
      : 1;
    const newVid: Video = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...video,
    };
    this.memoryData.videos.unshift(newVid);
    this.commit();
    return newVid;
  }

  public updateVideo(id: number, updates: Partial<Video>): Video | null {
    const idx = this.memoryData.videos.findIndex(v => v.id === id);
    if (idx === -1) return null;
    this.memoryData.videos[idx] = { ...this.memoryData.videos[idx], ...updates };
    this.commit();
    return this.memoryData.videos[idx];
  }

  public deleteVideo(id: number): boolean {
    const idx = this.memoryData.videos.findIndex(v => v.id === id);
    if (idx === -1) return false;
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
    const nextId = this.memoryData.articles.length > 0 
      ? Math.max(...this.memoryData.articles.map(a => a.id)) + 1 
      : 1;
    const newArt: Article = {
      id: nextId,
      views: 0,
      created_at: new Date().toISOString(),
      ...art,
    };
    this.memoryData.articles.unshift(newArt);
    this.commit();
    return newArt;
  }

  public updateArticle(id: number, updates: Partial<Article>): Article | null {
    const idx = this.memoryData.articles.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.memoryData.articles[idx] = { ...this.memoryData.articles[idx], ...updates };
    this.commit();
    return this.memoryData.articles[idx];
  }

  public deleteArticle(id: number): boolean {
    const idx = this.memoryData.articles.findIndex(a => a.id === id);
    if (idx === -1) return false;
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

    const currentCount = item.ratingCount || 1;
    const currentRating = item.rating || 5;
    const newCount = currentCount + 1;
    const newRating = Math.round((((currentRating * currentCount) + star) / newCount) * 10) / 10;

    item.rating = newRating;
    item.ratingCount = newCount;
    this.commit();
    return { rating: newRating, ratingCount: newCount };
  }

  public restore(data: DatabaseSchema) {
    this.memoryData = data;
    this.commit();
  }
}

export const db = new DatabaseManager();
