import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  administrators,
  books,
  categories,
  siteSettings,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed() {
  // 1. Seed Site Settings if empty
  const existingSettings = await db
    .select({ total: count() })
    .from(siteSettings);

  if ((existingSettings[0]?.total ?? 0) === 0) {
    await db
      .insert(siteSettings)
      .values({
        settingKey: 'main',
        siteNameAr: 'المكتبة الرقمية الفاخرة',
        siteSubtitleAr: 'مصدر معرفتك .. في مكان واحد',
        siteDescriptionAr:
          'منصة عربية راقية تجمع بين فخامة المكتبات الكلاسيكية وسهولة الوصول الرقمي، لتمنحك تجربة تصفح وقراءة وتحميل فوري لأهم الكتب والمراجع بصيغة PDF.',
        logoUrl: '/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg',
        contactEmail: 'torxcars@gmail.com',
        contactPhone: '+201115491611',
        aboutTextAr:
          'نسعى في المكتبة الرقمية الفاخرة إلى إثراء المحتوى العربي وإتاحة المعرفة الموثوقة في شتى المجالات العلمية والأدبية والتقنية والدينية ضمن واجهة عربية أنيقة وسريعة، مع إمكانية القراءة الفورية والتحميل المباشر للجميع.',
        footerTaglineAr: 'معاً نحو عالم المعرفة',
        socialTelegram: 'https://t.me/PDF_Library0',
        socialYoutube: '',
        socialFacebook: '',
      })
      .onConflictDoNothing();
  } else {
    const current = await db
      .select()
      .from(siteSettings)
      .limit(1);
    if (current[0] && current[0].contactEmail === 'info@luxury-library.com') {
      const { eq } = await import('drizzle-orm');
      await db
        .update(siteSettings)
        .set({
          contactEmail: 'torxcars@gmail.com',
          contactPhone: '+201115491611',
          socialTelegram: 'https://t.me/PDF_Library0',
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, current[0].id));
    }
  }

  // 2. Seed initial project owner administrator for Google Sign-In if empty
  const existingAdmins = await db
    .select({ total: count() })
    .from(administrators);

  if ((existingAdmins[0]?.total ?? 0) === 0) {
    await db
      .insert(administrators)
      .values({
        email: 'torxcars@gmail.com',
        name: 'المدير العام للمكتبة',
        role: 'super_admin',
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // 3. Seed 9 Categories if empty
  const existingCategories = await db
    .select({ total: count() })
    .from(categories);

  let categoryRows = await db.select().from(categories);

  if ((existingCategories[0]?.total ?? 0) === 0) {
    categoryRows = await db
      .insert(categories)
      .values([
        {
          slug: 'islamic-studies',
          nameAr: 'الدين الإسلامي',
          nameEn: 'Islamic Studies',
          descriptionAr: 'كتب التفسير والحديث والفقه والسيرة النبوية الشريفة.',
          iconName: 'BookOpenCheck',
          sortOrder: 1,
          isActive: true,
        },
        {
          slug: 'education',
          nameAr: 'التعليم',
          nameEn: 'Education',
          descriptionAr: 'مناهج تعليمية ومهارات تربوية وأساليب التعلم الحديثة.',
          iconName: 'GraduationCap',
          sortOrder: 2,
          isActive: true,
        },
        {
          slug: 'science',
          nameAr: 'العلوم',
          nameEn: 'Science',
          descriptionAr: 'الفيزياء والكيمياء والفلك وعلوم الطبيعة والبحث العلمي.',
          iconName: 'Atom',
          sortOrder: 3,
          isActive: true,
        },
        {
          slug: 'health-medicine',
          nameAr: 'الصحة والتغذية',
          nameEn: 'Health and Medicine',
          descriptionAr: 'موسوعات طبية والتغذية العلاجية واللياقة البدنية.',
          iconName: 'HeartPulse',
          sortOrder: 4,
          isActive: true,
        },
        {
          slug: 'programming-tech',
          nameAr: 'البرمجة والتقنية',
          nameEn: 'Programming and Technology',
          descriptionAr: 'لغات البرمجة والذكاء الاصطناعي وهندسة البرمجيات.',
          iconName: 'Code2',
          sortOrder: 5,
          isActive: true,
        },
        {
          slug: 'literature',
          nameAr: 'الأدب',
          nameEn: 'Literature',
          descriptionAr: 'الروايات الكلاسيكية والشعر العربي والبلاغة والبيان.',
          iconName: 'Feather',
          sortOrder: 6,
          isActive: true,
        },
        {
          slug: 'history',
          nameAr: 'التاريخ',
          nameEn: 'History',
          descriptionAr: 'تاريخ الحضارات القديمة والتاريخ الإسلامي والعالمي.',
          iconName: 'Landmark',
          sortOrder: 7,
          isActive: true,
        },
        {
          slug: 'social-sciences',
          nameAr: 'العلوم الاجتماعية',
          nameEn: 'Social Sciences',
          descriptionAr: 'علم النفس وعلم الاجتماع والإدارة وتطوير الذات.',
          iconName: 'Users',
          sortOrder: 8,
          isActive: true,
        },
        {
          slug: 'other',
          nameAr: 'أخرى',
          nameEn: 'Other Categories',
          descriptionAr: 'موسوعات متنوعة وفنون وإبداعات معرفية شاملة.',
          iconName: 'Sparkles',
          sortOrder: 9,
          isActive: true,
        },
      ])
      .onConflictDoNothing()
      .returning();

    if (categoryRows.length === 0) {
      categoryRows = await db.select().from(categories);
    }
  }

  // 4. Seed initial curated books if empty
  const existingBooks = await db.select({ total: count() }).from(books);
  if ((existingBooks[0]?.total ?? 0) === 0 && categoryRows.length > 0) {
    const catBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));
    const now = Date.now();

    await db
      .insert(books)
      .values([
        {
          slug: 'tafsir-al-quran-al-karim',
          titleAr: 'تفسير القرآن الكريم',
          titleEn: 'Tafsir Al-Quran Al-Karim',
          descriptionAr:
            'مرجع ميسر وشامل في تفسير آيات القرآن الكريم وبيان مقاصد السور وأسباب النزول بأسلوب علمي رصين يناسب الباحثين وعامة القراء.',
          author: 'د. عبد الرحمن السعدي',
          keywords: 'تفسير, القرآن الكريم, علوم القرآن, الدين الإسلامي',
          categoryId: catBySlug.get('islamic-studies') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_islamic_tafsir_1795538778818.jpg',
          fileSizeBytes: 2457600,
          pageCount: 412,
          spineColor: '#0E4B35',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: true,
          downloadCount: 1840,
          viewCount: 3420,
          publishedAt: new Date(now - 1000 * 60 * 60 * 2),
        },
        {
          slug: 'artificial-intelligence-horizons',
          titleAr: 'الذكاء الاصطناعي',
          titleEn: 'Artificial Intelligence Horizons',
          descriptionAr:
            'دليل حديث يستعرض أسس التعلم الآلي والشبكات العصبية العميقة وتطبيقات الذكاء الاصطناعي التوليدي في صناعة المستقبل.',
          author: 'م. طارق المنصور',
          keywords: 'الذكاء الاصطناعي, تعلم الآلة, تقنية, شبكات عصبية',
          categoryId: catBySlug.get('programming-tech') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_ai_robotics_1795538778319.jpg',
          fileSizeBytes: 3145728,
          pageCount: 286,
          spineColor: '#0E3A6E',
          accentColor: '#FFD778',
          status: 'published',
          isFeatured: true,
          downloadCount: 2690,
          viewCount: 4980,
          publishedAt: new Date(now - 1000 * 60 * 60 * 5),
        },
        {
          slug: 'health-and-therapeutic-nutrition',
          titleAr: 'الصحة والتغذية',
          titleEn: 'Health and Therapeutic Nutrition',
          descriptionAr:
            'موسوعة عملية لفهم أسس التغذية السليمة وصحة القلب والمناعة، مع جداول غذائية متوازنة مبنية على أحدث الأبحاث الطبية.',
          author: 'د. سلمى الهاشمي',
          keywords: 'صحة, تغذية, طب, مناعة, قلب',
          categoryId: catBySlug.get('health-medicine') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_health_nutrition_1795538779965.jpg',
          fileSizeBytes: 1984000,
          pageCount: 224,
          spineColor: '#7A1624',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: true,
          downloadCount: 1520,
          viewCount: 2790,
          publishedAt: new Date(now - 1000 * 60 * 60 * 9),
        },
        {
          slug: 'learn-python-programming',
          titleAr: 'تعلم Python',
          titleEn: 'Learn Python Programming',
          descriptionAr:
            'منهج تطبيقي متدرج لتعلم لغة بايثون من الأساسيات وحتى بناء تطبيقات الويب وتحليل البيانات وأتمتة المهام.',
          author: 'أ. خالد العتيبي',
          keywords: 'بايثون, برمجة, Python, تحليل البيانات',
          categoryId: catBySlug.get('programming-tech') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_programming_python_1795538779463.jpg',
          fileSizeBytes: 2890000,
          pageCount: 340,
          spineColor: '#122E5C',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: true,
          downloadCount: 3120,
          viewCount: 5410,
          publishedAt: new Date(now - 1000 * 60 * 60 * 14),
        },
        {
          slug: 'history-of-ancient-egypt',
          titleAr: 'تاريخ مصر القديم',
          titleEn: 'History of Ancient Egypt',
          descriptionAr:
            'رحلة تاريخية موثقة عبر أسرار الحضارة المصرية القديمة وفنون العمارة والكتابة الهيروغليفية في وادي النيل.',
          author: 'د. شريف عبد العزيز',
          keywords: 'تاريخ, مصر القديمة, حضارات, أهرامات',
          categoryId: catBySlug.get('history') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_ancient_history_1795538780247.jpg',
          fileSizeBytes: 4210000,
          pageCount: 390,
          spineColor: '#2F4D27',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: true,
          downloadCount: 1390,
          viewCount: 2310,
          publishedAt: new Date(now - 1000 * 60 * 60 * 24),
        },
        {
          slug: 'cpp-systems-programming',
          titleAr: 'البرمجة ++C',
          titleEn: 'Modern C++ Systems Engineering',
          descriptionAr:
            'كتاب متقدم يشرح إدارة الذاكرة وهياكل البيانات والخوارزميات عالية الأداء باستخدام معايير C++ الحديثة.',
          author: 'م. عمر الشريف',
          keywords: 'برمجة, C++, خوارزميات, نظم',
          categoryId: catBySlug.get('programming-tech') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_cpp_systems_1795538781024.jpg',
          fileSizeBytes: 2740000,
          pageCount: 318,
          spineColor: '#3C1B57',
          accentColor: '#FFD778',
          status: 'published',
          isFeatured: false,
          downloadCount: 2180,
          viewCount: 3650,
          publishedAt: new Date(now - 1000 * 60 * 60 * 36),
        },
        {
          slug: 'time-management-mastery',
          titleAr: 'إدارة الوقت',
          titleEn: 'Mastery of Time Management',
          descriptionAr:
            'استراتيجيات عملية لرفع الإنتاجية وترتيب الأولويات وبناء العادات الذهنية الناجحة في الحياة العملية والأكاديمية.',
          author: 'د. ليلى الحربي',
          keywords: 'إدارة الوقت, إنتاجية, تطوير الذات, علوم اجتماعية',
          categoryId: catBySlug.get('social-sciences') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_time_management_1795538780884.jpg',
          fileSizeBytes: 1650000,
          pageCount: 196,
          spineColor: '#6E3B16',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: true,
          downloadCount: 2450,
          viewCount: 4120,
          publishedAt: new Date(now - 1000 * 60 * 60 * 48),
        },
        {
          slug: 'foundations-of-modern-physics',
          titleAr: 'أسس الفيزياء الحديثة',
          titleEn: 'Foundations of Modern Physics',
          descriptionAr:
            'استكشاف مبسط وعميق لقوانين النسبية وميكانيكا الكم والكونيات مع أمثلة تطبيقية واضحة لطلاب العلوم.',
          author: 'أ.د. مازن الجوهري',
          keywords: 'علوم, فيزياء, كم, نسبية',
          categoryId: catBySlug.get('science') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_ai_robotics_1795538778319.jpg',
          fileSizeBytes: 3320000,
          pageCount: 364,
          spineColor: '#113054',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: false,
          downloadCount: 980,
          viewCount: 1840,
          publishedAt: new Date(now - 1000 * 60 * 60 * 60),
        },
        {
          slug: 'modern-pedagogy-and-teaching',
          titleAr: 'مناهج التعليم الحديث',
          titleEn: 'Modern Pedagogy & Smart Teaching',
          descriptionAr:
            'دليل المعلمين والمربين لتصميم بيئات تعلم تفاعلية وتوظيف التقنيات الرقمية في تنمية التفكير النقدي.',
          author: 'د. نورة القحطاني',
          keywords: 'تعليم, تربية, مناهج, تدريس',
          categoryId: catBySlug.get('education') ?? categoryRows[0].id,
          coverUrl: '/src/assets/images/cover_time_management_1795538780884.jpg',
          fileSizeBytes: 1890000,
          pageCount: 245,
          spineColor: '#4E3119',
          accentColor: '#E8B94F',
          status: 'published',
          isFeatured: false,
          downloadCount: 1120,
          viewCount: 2050,
          publishedAt: new Date(now - 1000 * 60 * 60 * 72),
        },
      ])
      .onConflictDoNothing();
  }
}
