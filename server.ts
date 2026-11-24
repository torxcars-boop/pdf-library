import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import multer from 'multer';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  administrators,
  books,
  categories,
  downloads,
  mediaFiles,
  siteSettings,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import {
  hashPassword,
  signAdminToken,
  verifyPassword,
} from './src/lib/auth-utils.ts';
import { generateSampleBookPdf } from './src/lib/pdf-generator.ts';
import { AuthRequest, requireAdmin } from './src/middleware/auth.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function makeSlug(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  const rand = crypto.randomBytes(3).toString('hex');
  return base ? `${base}-${rand}` : `book-${rand}`;
}

function validateImageMagic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return true;
  // WebP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return true;
  return false;
}

function validatePdfMagic(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  // Per ISO 32000-1, %PDF- header may appear anywhere within the first 1024 bytes (e.g. after UTF-8 BOM)
  const head = buffer.subarray(0, Math.min(buffer.length, 1024));
  return head.includes('%PDF-');
}

async function getBookWithCategoryRows(condition?: any) {
  const query = db
    .select({
      id: books.id,
      slug: books.slug,
      titleAr: books.titleAr,
      titleEn: books.titleEn,
      descriptionAr: books.descriptionAr,
      author: books.author,
      keywords: books.keywords,
      categoryId: books.categoryId,
      categoryNameAr: categories.nameAr,
      categorySlug: categories.slug,
      coverUrl: books.coverUrl,
      coverMediaId: books.coverMediaId,
      pdfUrl: books.pdfUrl,
      pdfMediaId: books.pdfMediaId,
      fileSizeBytes: books.fileSizeBytes,
      pageCount: books.pageCount,
      spineColor: books.spineColor,
      accentColor: books.accentColor,
      status: books.status,
      isFeatured: books.isFeatured,
      downloadCount: books.downloadCount,
      viewCount: books.viewCount,
      publishedAt: books.publishedAt,
      createdAt: books.createdAt,
    })
    .from(books)
    .leftJoin(categories, eq(books.categoryId, categories.id));

  if (condition) {
    return query.where(condition);
  }
  return query;
}

// ==========================================
// PUBLIC LIBRARY API
// ==========================================

app.get('/api/bootstrap', async (_req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const [settingsRows, catRows, allPublished, countRows] = await Promise.all([
      db.select().from(siteSettings).where(eq(siteSettings.settingKey, 'main')).limit(1),
      db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select({
          id: books.id,
          slug: books.slug,
          titleAr: books.titleAr,
          titleEn: books.titleEn,
          descriptionAr: books.descriptionAr,
          author: books.author,
          keywords: books.keywords,
          categoryId: books.categoryId,
          categoryNameAr: categories.nameAr,
          categorySlug: categories.slug,
          coverUrl: books.coverUrl,
          coverMediaId: books.coverMediaId,
          pdfUrl: books.pdfUrl,
          pdfMediaId: books.pdfMediaId,
          fileSizeBytes: books.fileSizeBytes,
          pageCount: books.pageCount,
          spineColor: books.spineColor,
          accentColor: books.accentColor,
          status: books.status,
          isFeatured: books.isFeatured,
          downloadCount: books.downloadCount,
          viewCount: books.viewCount,
          publishedAt: books.publishedAt,
          createdAt: books.createdAt,
        })
        .from(books)
        .leftJoin(categories, eq(books.categoryId, categories.id))
        .where(eq(books.status, 'published'))
        .orderBy(desc(books.publishedAt), desc(books.id)),
      db
        .select({
          totalDownloads: sql<number>`coalesce(sum(${books.downloadCount}), 0)::int`,
        })
        .from(books)
        .where(eq(books.status, 'published')),
    ]);

    const categoryCounts = new Map<number, number>();
    for (const book of allPublished) {
      if (book.categoryId) {
        categoryCounts.set(book.categoryId, (categoryCounts.get(book.categoryId) ?? 0) + 1);
      }
    }

    const categoriesWithCounts = catRows.map((c) => ({
      ...c,
      bookCount: categoryCounts.get(c.id) ?? 0,
    }));

    const latestBooks = allPublished.slice(0, 12);
    const mostDownloadedBooks = [...allPublished]
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 12);
    const featuredBooks = allPublished.filter((b) => b.isFeatured).slice(0, 6);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      settings: settingsRows[0] ?? {
        siteNameAr: 'المكتبة الرقمية الفاخرة',
        siteSubtitleAr: 'مصدر معرفتك .. في مكان واحد',
        siteDescriptionAr: 'منصة عربية فاخرة للكتب الرقمية بصيغة PDF.',
        logoUrl: '/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg',
        contactEmail: 'torxcars@gmail.com',
        contactPhone: '+201115491611',
        aboutTextAr: 'منصة عربية متكاملة للكتب الرقمية.',
        footerTaglineAr: 'معاً نحو عالم المعرفة',
        socialTelegram: 'https://t.me/PDF_Library0',
        socialYoutube: '',
        socialFacebook: '',
      },
      categories: categoriesWithCounts,
      latestBooks,
      mostDownloadedBooks,
      featuredBooks,
      stats: {
        totalBooks: allPublished.length,
        totalCategories: catRows.length,
        totalDownloads: countRows[0]?.totalDownloads ?? 0,
      },
    });
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: 'تعذر تحميل بيانات المكتبة حالياً' });
  }
});

app.get('/api/books', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const sort =
      typeof req.query.sort === 'string' ? req.query.sort.trim() : 'latest';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(books.status, 'published')];

    if (categorySlug && categorySlug !== 'all') {
      const cat = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      if (cat[0]) {
        conditions.push(eq(books.categoryId, cat[0].id));
      } else {
        return res.json({ items: [], total: 0, page, totalPages: 0 });
      }
    }

    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(books.titleAr, pattern),
          ilike(books.titleEn, pattern),
          ilike(books.author, pattern),
          ilike(books.keywords, pattern),
          ilike(books.descriptionAr, pattern)
        )
      );
    }

    const whereClause = and(...conditions);

    let orderByClause = [desc(books.publishedAt), desc(books.id)];
    if (sort === 'popular') {
      orderByClause = [desc(books.downloadCount), desc(books.id)];
    } else if (sort === 'alphabetical') {
      orderByClause = [asc(books.titleAr), desc(books.id)];
    }

    const [totalRes, rows] = await Promise.all([
      db.select({ total: count() }).from(books).where(whereClause),
      db
        .select({
          id: books.id,
          slug: books.slug,
          titleAr: books.titleAr,
          titleEn: books.titleEn,
          descriptionAr: books.descriptionAr,
          author: books.author,
          keywords: books.keywords,
          categoryId: books.categoryId,
          categoryNameAr: categories.nameAr,
          categorySlug: categories.slug,
          coverUrl: books.coverUrl,
          coverMediaId: books.coverMediaId,
          pdfUrl: books.pdfUrl,
          pdfMediaId: books.pdfMediaId,
          fileSizeBytes: books.fileSizeBytes,
          pageCount: books.pageCount,
          spineColor: books.spineColor,
          accentColor: books.accentColor,
          status: books.status,
          isFeatured: books.isFeatured,
          downloadCount: books.downloadCount,
          viewCount: books.viewCount,
          publishedAt: books.publishedAt,
          createdAt: books.createdAt,
        })
        .from(books)
        .leftJoin(categories, eq(books.categoryId, categories.id))
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalRes[0]?.total ?? 0;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      items: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List books error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء البحث عن الكتب' });
  }
});

app.get('/api/books/:slugOrId', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const raw = req.params.slugOrId;
    const numericId = /^\d+$/.test(raw) ? Number(raw) : null;

    const rows = await getBookWithCategoryRows(
      numericId !== null
        ? and(eq(books.id, numericId), eq(books.status, 'published'))
        : and(eq(books.slug, raw), eq(books.status, 'published'))
    );

    const book = rows[0];
    if (!book) {
      return res.status(404).json({ error: 'الكتاب غير موجود أو غير منشور' });
    }

    await db
      .update(books)
      .set({ viewCount: sql`${books.viewCount} + 1` })
      .where(eq(books.id, book.id));

    const relatedConditions = [eq(books.status, 'published'), ne(books.id, book.id)];
    if (book.categoryId) {
      relatedConditions.push(eq(books.categoryId, book.categoryId));
    }

    const related = await db
      .select({
        id: books.id,
        slug: books.slug,
        titleAr: books.titleAr,
        titleEn: books.titleEn,
        descriptionAr: books.descriptionAr,
        author: books.author,
        keywords: books.keywords,
        categoryId: books.categoryId,
        categoryNameAr: categories.nameAr,
        categorySlug: categories.slug,
        coverUrl: books.coverUrl,
        coverMediaId: books.coverMediaId,
        pdfUrl: books.pdfUrl,
        pdfMediaId: books.pdfMediaId,
        fileSizeBytes: books.fileSizeBytes,
        pageCount: books.pageCount,
        spineColor: books.spineColor,
        accentColor: books.accentColor,
        status: books.status,
        isFeatured: books.isFeatured,
        downloadCount: books.downloadCount,
        viewCount: books.viewCount,
        publishedAt: books.publishedAt,
        createdAt: books.createdAt,
      })
      .from(books)
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .where(and(...relatedConditions))
      .orderBy(desc(books.downloadCount))
      .limit(6);

    res.json({
      book: { ...book, viewCount: book.viewCount + 1 },
      relatedBooks: related,
    });
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'تعذر تحميل تفاصيل الكتاب' });
  }
});

app.get('/api/books/:id/pdf', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();

    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ error: 'معرف كتاب غير صالح' });
    }

    const bookRows = await db
      .select({
        id: books.id,
        slug: books.slug,
        titleAr: books.titleAr,
        titleEn: books.titleEn,
        descriptionAr: books.descriptionAr,
        author: books.author,
        pdfMediaId: books.pdfMediaId,
        pdfUrl: books.pdfUrl,
        pageCount: books.pageCount,
        status: books.status,
        categoryNameEn: categories.nameEn,
      })
      .from(books)
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .where(eq(books.id, bookId))
      .limit(1);

    const book = bookRows[0];
    if (!book || book.status !== 'published') {
      return res.status(404).json({ error: 'ملف PDF غير متاح' });
    }

    const isDownload = req.query.download === '1';
    const shouldTrack = isDownload || req.query.track === '1';

    if (shouldTrack) {
      await Promise.all([
        db
          .update(books)
          .set({ downloadCount: sql`${books.downloadCount} + 1` })
          .where(eq(books.id, book.id)),
        db.insert(downloads).values({
          bookId: book.id,
          actionType: isDownload ? 'download' : 'read',
          userAgent: (req.headers['user-agent'] || '').slice(0, 200),
        }),
      ]);
    }

    let pdfBuffer: Buffer | null = null;
    let filename = `${book.slug}.pdf`;

    if (book.pdfMediaId) {
      const mediaRows = await db
        .select()
        .from(mediaFiles)
        .where(eq(mediaFiles.id, book.pdfMediaId))
        .limit(1);
      if (mediaRows[0]) {
        pdfBuffer = Buffer.from(mediaRows[0].dataBase64, 'base64');
        filename = mediaRows[0].originalName || filename;
      }
    }

    if (!pdfBuffer) {
      pdfBuffer = await generateSampleBookPdf({
        titleAr: book.titleAr,
        titleEn: book.titleEn || book.slug,
        author: book.author || 'Luxury Digital Library',
        categoryNameEn: book.categoryNameEn || 'Digital Archive',
        descriptionAr: book.descriptionAr,
        pageCount: book.pageCount,
        slug: book.slug,
      });

      const storageKey = `seed-pdf-${book.id}-${crypto.randomBytes(4).toString('hex')}`;
      const insertedMedia = await db
        .insert(mediaFiles)
        .values({
          storageKey,
          originalName: filename,
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.length,
          fileType: 'pdf',
          dataBase64: pdfBuffer.toString('base64'),
        })
        .returning({ id: mediaFiles.id });

      if (insertedMedia[0]) {
        await db
          .update(books)
          .set({
            pdfMediaId: insertedMedia[0].id,
            fileSizeBytes: pdfBuffer.length,
          })
          .where(eq(books.id, book.id));
      }
    }

    const safeAsciiName = filename.replace(/[^\w.-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Serve PDF error:', err);
    return res.status(500).json({ error: 'تعذر تحميل ملف PDF' });
  }
});

app.get('/api/media/:id', async (req: Request, res: Response) => {
  try {
    const mediaId = Number(req.params.id);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).send('Invalid media ID');
    }

    const rows = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, mediaId))
      .limit(1);

    const media = rows[0];
    if (!media) {
      return res.status(404).send('Not found');
    }

    const buf = Buffer.from(media.dataBase64, 'base64');
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (err) {
    console.error('Media fetch error:', err);
    return res.status(500).send('Error serving media');
  }
});

// SEO: Dynamic Sitemap & Robots.txt
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const [catRows, bookRows] = await Promise.all([
      db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
      db
        .select({ slug: books.slug, updatedAt: books.updatedAt })
        .from(books)
        .where(eq(books.status, 'published')),
    ]);

    const urls = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...catRows.map(
        (c) =>
          `<url><loc>${baseUrl}/category/${encodeURIComponent(c.slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
      ...bookRows.map(
        (b) =>
          `<url><loc>${baseUrl}/book/${encodeURIComponent(b.slug)}</loc><lastmod>${(b.updatedAt || new Date()).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
      ),
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    );
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('');
  }
});

app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl =
    process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin/\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

// ==========================================
// ADMIN AUTHENTICATION API (SINGLE ADMIN + RATE LIMIT)
// ==========================================

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
    loginAttempts.set(ip, entry);
  }
}

function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

function constantTimeMatch(input: string, secret: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

app.get('/api/admin/auth/status', async (_req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const hasEnvPassword = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());
    const pwAdmins = await db
      .select({ id: administrators.id })
      .from(administrators)
      .where(isNotNull(administrators.passwordHash))
      .limit(1);

    res.json({
      hasPasswordAdmin: hasEnvPassword || pwAdmins.length > 0,
      registrationDisabled: true,
    });
  } catch (err) {
    console.error('Auth status error:', err);
    res.status(500).json({ error: 'تعذر التحقق من حالة الحساب الإداري' });
  }
});

app.post('/api/admin/auth/setup-first', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
      return res.status(403).json({
        error: 'التسجيل العام معطل؛ يرجى استخدام بيانات المدير المعتمدة',
      });
    }

    const existingPwAdmin = await db
      .select({ id: administrators.id })
      .from(administrators)
      .where(isNotNull(administrators.passwordHash))
      .limit(1);

    if (existingPwAdmin.length > 0) {
      return res.status(403).json({
        error: 'التسجيل العام معطل؛ يوجد حساب مدير مفعل بالفعل',
      });
    }

    const username = String(req.body?.username || 'admin').toLowerCase().trim();
    const password = String(req.body?.password || '');

    if (username !== 'admin') {
      return res.status(400).json({ error: 'اسم المستخدم الإداري الوحيد المسموح به هو admin' });
    }
    if (password.length < 8) {
      return res.status(400).json({
        error: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
      });
    }

    const passwordHash = hashPassword(password);
    const existingRows = await db.select().from(administrators).limit(1);

    let adminRow;
    if (existingRows[0]) {
      const updated = await db
        .update(administrators)
        .set({
          name: 'مدير المكتبة',
          passwordHash,
          role: 'super_admin',
          isActive: true,
          lastLoginAt: new Date(),
        })
        .where(eq(administrators.id, existingRows[0].id))
        .returning();
      adminRow = updated[0];
    } else {
      const inserted = await db
        .insert(administrators)
        .values({
          email: 'torxcars@gmail.com',
          name: 'مدير المكتبة',
          role: 'super_admin',
          passwordHash,
          isActive: true,
          lastLoginAt: new Date(),
        })
        .returning();
      adminRow = inserted[0];
    }

    const token = signAdminToken({
      adminId: adminRow.id,
      email: adminRow.email,
      role: adminRow.role,
    });

    res.status(201).json({
      token,
      admin: {
        id: adminRow.id,
        email: adminRow.email,
        name: adminRow.name,
        role: adminRow.role,
      },
    });
  } catch (err) {
    console.error('Setup first admin error:', err);
    res.status(500).json({ error: 'تعذر إعداد كلمة مرور المدير' });
  }
});

app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const ip = getClientIp(req);
    const rate = checkLoginRateLimit(ip);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({
        error: `تم تجاوز الحد الأقصى لمحاولات الدخول. يرجى الانتظار ${Math.ceil(
          rate.retryAfterSec / 60
        )} دقيقة والمحاولة مجدداً.`,
      });
    }

    const rawIdentifier = String(req.body?.username || req.body?.email || '')
      .toLowerCase()
      .trim();
    const password = String(req.body?.password || '');

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        error: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      });
    }

    // Fetch the single primary administrator account
    const rows = await db
      .select()
      .from(administrators)
      .orderBy(asc(administrators.id))
      .limit(1);

    const adminRow = rows[0];
    if (!adminRow || !adminRow.isActive) {
      recordFailedLogin(ip);
      return res.status(401).json({
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    const validUsername =
      rawIdentifier === 'admin' || rawIdentifier === adminRow.email.toLowerCase();

    if (!validUsername) {
      recordFailedLogin(ip);
      return res.status(401).json({
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
    let passwordMatches = false;

    if (envAdminPassword) {
      passwordMatches = constantTimeMatch(password, envAdminPassword);
    } else if (adminRow.passwordHash) {
      passwordMatches = verifyPassword(password, adminRow.passwordHash);
    }

    if (!passwordMatches) {
      recordFailedLogin(ip);
      return res.status(401).json({
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    clearLoginFailures(ip);

    await db
      .update(administrators)
      .set({ lastLoginAt: new Date() })
      .where(eq(administrators.id, adminRow.id));

    const token = signAdminToken({
      adminId: adminRow.id,
      email: adminRow.email,
      role: adminRow.role,
    });

    res.json({
      token,
      admin: {
        id: adminRow.id,
        email: adminRow.email,
        name: adminRow.name,
        role: adminRow.role,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

app.get('/api/admin/auth/me', requireAdmin, (req: AuthRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// ==========================================
// PROTECTED ADMIN MANAGEMENT API
// ==========================================

app.get('/api/admin/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await ensureSeeded();

    const [
      totalBooksRes,
      publishedBooksRes,
      draftBooksRes,
      totalCategoriesRes,
      totalDownloadsRes,
      totalViewsRes,
      recentBooks,
      topBooks,
      recentDownloadLogs,
    ] = await Promise.all([
      db.select({ total: count() }).from(books),
      db.select({ total: count() }).from(books).where(eq(books.status, 'published')),
      db.select({ total: count() }).from(books).where(eq(books.status, 'draft')),
      db.select({ total: count() }).from(categories),
      db.select({ sum: sql<number>`coalesce(sum(${books.downloadCount}), 0)::int` }).from(books),
      db.select({ sum: sql<number>`coalesce(sum(${books.viewCount}), 0)::int` }).from(books),
      db
        .select({
          id: books.id,
          slug: books.slug,
          titleAr: books.titleAr,
          author: books.author,
          status: books.status,
          downloadCount: books.downloadCount,
          createdAt: books.createdAt,
          categoryNameAr: categories.nameAr,
          coverUrl: books.coverUrl,
        })
        .from(books)
        .leftJoin(categories, eq(books.categoryId, categories.id))
        .orderBy(desc(books.createdAt), desc(books.id))
        .limit(6),
      db
        .select({
          id: books.id,
          slug: books.slug,
          titleAr: books.titleAr,
          downloadCount: books.downloadCount,
          viewCount: books.viewCount,
          categoryNameAr: categories.nameAr,
          coverUrl: books.coverUrl,
        })
        .from(books)
        .leftJoin(categories, eq(books.categoryId, categories.id))
        .orderBy(desc(books.downloadCount))
        .limit(6),
      db
        .select({
          id: downloads.id,
          actionType: downloads.actionType,
          downloadedAt: downloads.downloadedAt,
          bookTitleAr: books.titleAr,
          bookSlug: books.slug,
        })
        .from(downloads)
        .innerJoin(books, eq(downloads.bookId, books.id))
        .orderBy(desc(downloads.downloadedAt))
        .limit(15),
    ]);

    res.json({
      stats: {
        totalBooks: totalBooksRes[0]?.total ?? 0,
        publishedBooks: publishedBooksRes[0]?.total ?? 0,
        draftBooks: draftBooksRes[0]?.total ?? 0,
        totalCategories: totalCategoriesRes[0]?.total ?? 0,
        totalDownloads: totalDownloadsRes[0]?.sum ?? 0,
        totalViews: totalViewsRes[0]?.sum ?? 0,
      },
      recentBooks,
      topBooks,
      recentDownloadLogs,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'تعذر جلب إحصائيات لوحة التحكم' });
  }
});

app.post(
  '/api/admin/upload',
  requireAdmin,
  (req: AuthRequest, res: Response, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (30 ميجابايت)',
          });
        }
        return res.status(400).json({
          error: err.message || 'تعذر استقبال الملف المرفوع',
        });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const fileType = String(req.body?.fileType || 'pdf');
      if (!file) {
        return res.status(400).json({ error: 'لم يتم إرفاق أي ملف' });
      }

      if (fileType === 'pdf') {
        if (!validatePdfMagic(file.buffer)) {
          return res.status(400).json({
            error: 'الملف المرفوع ليس ملف PDF صالحاً',
          });
        }
      } else if (fileType === 'cover' || fileType === 'logo') {
        if (!validateImageMagic(file.buffer)) {
          return res.status(400).json({
            error: 'صيغة الصورة غير مدعومة (يرجى رفع PNG أو JPG أو WebP)',
          });
        }
      } else {
        return res.status(400).json({ error: 'نوع الملف غير معروف' });
      }

      const storageKey = `${fileType}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const inserted = await db
        .insert(mediaFiles)
        .values({
          storageKey,
          originalName: file.originalname || `${storageKey}.${fileType === 'pdf' ? 'pdf' : 'png'}`,
          mimeType:
            fileType === 'pdf'
              ? 'application/pdf'
              : file.mimetype || 'image/jpeg',
          sizeBytes: file.size,
          fileType,
          dataBase64: file.buffer.toString('base64'),
        })
        .returning({
          id: mediaFiles.id,
          sizeBytes: mediaFiles.sizeBytes,
          originalName: mediaFiles.originalName,
        });

      const created = inserted[0];
      res.status(201).json({
        mediaId: created.id,
        url: `/api/media/${created.id}`,
        sizeBytes: created.sizeBytes,
        originalName: created.originalName,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'فشل رفع الملف، يرجى المحاولة مجدداً' });
    }
  }
);

app.get('/api/admin/books', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status =
      typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const categoryId = Number(req.query.categoryId) || 0;

    const conditions: any[] = [];
    if (status === 'published' || status === 'draft') {
      conditions.push(eq(books.status, status));
    }
    if (categoryId > 0) {
      conditions.push(eq(books.categoryId, categoryId));
    }
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(books.titleAr, pattern),
          ilike(books.titleEn, pattern),
          ilike(books.author, pattern)
        )
      );
    }

    const rows = await db
      .select({
        id: books.id,
        slug: books.slug,
        titleAr: books.titleAr,
        titleEn: books.titleEn,
        descriptionAr: books.descriptionAr,
        author: books.author,
        keywords: books.keywords,
        categoryId: books.categoryId,
        categoryNameAr: categories.nameAr,
        categorySlug: categories.slug,
        coverUrl: books.coverUrl,
        coverMediaId: books.coverMediaId,
        pdfUrl: books.pdfUrl,
        pdfMediaId: books.pdfMediaId,
        fileSizeBytes: books.fileSizeBytes,
        pageCount: books.pageCount,
        spineColor: books.spineColor,
        accentColor: books.accentColor,
        status: books.status,
        isFeatured: books.isFeatured,
        downloadCount: books.downloadCount,
        viewCount: books.viewCount,
        publishedAt: books.publishedAt,
        createdAt: books.createdAt,
      })
      .from(books)
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(books.createdAt), desc(books.id));

    res.json({ items: rows });
  } catch (err) {
    console.error('Admin books list error:', err);
    res.status(500).json({ error: 'تعذر جلب قائمة الكتب' });
  }
});

app.post('/api/admin/books', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const titleAr = String(req.body?.titleAr || '').trim();
    const titleEn = String(req.body?.titleEn || '').trim() || null;
    const descriptionAr = String(req.body?.descriptionAr || '').trim();
    const author = String(req.body?.author || '').trim() || null;
    const keywords = String(req.body?.keywords || '').trim() || null;
    const categoryId = req.body?.categoryId ? Number(req.body.categoryId) : null;
    const coverUrl =
      String(req.body?.coverUrl || '').trim() ||
      '/src/assets/images/cover_islamic_tafsir_1795538778818.jpg';
    const coverMediaId = req.body?.coverMediaId ? Number(req.body.coverMediaId) : null;
    const pdfMediaId = req.body?.pdfMediaId ? Number(req.body.pdfMediaId) : null;
    const pdfUrl = String(req.body?.pdfUrl || '').trim() || null;
    const fileSizeBytes = Math.max(0, Number(req.body?.fileSizeBytes) || 0);
    const pageCount = Math.max(1, Number(req.body?.pageCount) || 120);
    const spineColor = String(req.body?.spineColor || '#0E3A6E').trim();
    const accentColor = String(req.body?.accentColor || '#E8B94F').trim();
    const status = req.body?.status === 'draft' ? 'draft' : 'published';
    const isFeatured = Boolean(req.body?.isFeatured);

    if (!titleAr || !descriptionAr) {
      return res.status(400).json({
        error: 'عنوان الكتاب والوصف مطلوبان',
      });
    }
    if (!isSafeUrl(coverUrl) || !isSafeUrl(pdfUrl)) {
      return res.status(400).json({ error: 'روابط الملفات غير صالحة' });
    }

    if (categoryId !== null) {
      const catCheck = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (!catCheck[0]) {
        return res.status(400).json({ error: 'القسم المحدد غير موجود' });
      }
    }

    let resolvedPdfMediaId = pdfMediaId;
    let resolvedFileSize = fileSizeBytes;
    if (resolvedPdfMediaId !== null) {
      const mediaCheck = await db
        .select({ id: mediaFiles.id, sizeBytes: mediaFiles.sizeBytes })
        .from(mediaFiles)
        .where(eq(mediaFiles.id, resolvedPdfMediaId))
        .limit(1);
      if (!mediaCheck[0]) {
        return res.status(400).json({ error: 'ملف PDF المرفق غير موجود، يرجى إعادة رفعه' });
      }
      if (resolvedFileSize <= 0) {
        resolvedFileSize = mediaCheck[0].sizeBytes;
      }
    }

    const slug = makeSlug(titleEn || titleAr);

    const inserted = await db
      .insert(books)
      .values({
        slug,
        titleAr,
        titleEn,
        descriptionAr,
        author,
        keywords,
        categoryId,
        coverUrl,
        coverMediaId,
        pdfUrl,
        pdfMediaId: resolvedPdfMediaId,
        fileSizeBytes: resolvedFileSize,
        pageCount,
        spineColor,
        accentColor,
        status,
        isFeatured,
        publishedAt: status === 'published' ? new Date() : null,
      })
      .returning();

    res.status(201).json({ book: inserted[0] });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ error: 'تعذر حفظ الكتاب الجديد' });
  }
});

app.put('/api/admin/books/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف كتاب غير صالح' });
    }

    const existing = await db.select().from(books).where(eq(books.id, id)).limit(1);
    if (!existing[0]) {
      return res.status(404).json({ error: 'الكتاب غير موجود' });
    }

    const titleAr = String(req.body?.titleAr ?? existing[0].titleAr).trim();
    const titleEn =
      req.body?.titleEn !== undefined
        ? String(req.body.titleEn || '').trim() || null
        : existing[0].titleEn;
    const descriptionAr = String(
      req.body?.descriptionAr ?? existing[0].descriptionAr
    ).trim();
    const author =
      req.body?.author !== undefined
        ? String(req.body.author || '').trim() || null
        : existing[0].author;
    const keywords =
      req.body?.keywords !== undefined
        ? String(req.body.keywords || '').trim() || null
        : existing[0].keywords;
    const categoryId =
      req.body?.categoryId !== undefined
        ? req.body.categoryId
          ? Number(req.body.categoryId)
          : null
        : existing[0].categoryId;
    const coverUrl = String(req.body?.coverUrl ?? existing[0].coverUrl).trim();
    const coverMediaId =
      req.body?.coverMediaId !== undefined
        ? req.body.coverMediaId
          ? Number(req.body.coverMediaId)
          : null
        : existing[0].coverMediaId;
    const pdfMediaId =
      req.body?.pdfMediaId !== undefined
        ? req.body.pdfMediaId
          ? Number(req.body.pdfMediaId)
          : null
        : existing[0].pdfMediaId;
    const fileSizeBytes =
      req.body?.fileSizeBytes !== undefined
        ? Math.max(0, Number(req.body.fileSizeBytes) || 0)
        : existing[0].fileSizeBytes;
    const pageCount =
      req.body?.pageCount !== undefined
        ? Math.max(1, Number(req.body.pageCount) || 1)
        : existing[0].pageCount;
    const spineColor = String(
      req.body?.spineColor ?? existing[0].spineColor
    ).trim();
    const status =
      req.body?.status === 'draft'
        ? 'draft'
        : req.body?.status === 'published'
          ? 'published'
          : existing[0].status;
    const isFeatured =
      req.body?.isFeatured !== undefined
        ? Boolean(req.body.isFeatured)
        : existing[0].isFeatured;

    if (!titleAr || !descriptionAr) {
      return res.status(400).json({ error: 'العنوان والوصف مطلوبان' });
    }
    if (!isSafeUrl(coverUrl)) {
      return res.status(400).json({ error: 'رابط الغلاف غير صالح' });
    }

    const updated = await db
      .update(books)
      .set({
        titleAr,
        titleEn,
        descriptionAr,
        author,
        keywords,
        categoryId,
        coverUrl,
        coverMediaId,
        pdfMediaId,
        fileSizeBytes,
        pageCount,
        spineColor,
        status,
        isFeatured,
        publishedAt:
          status === 'published'
            ? existing[0].publishedAt || new Date()
            : existing[0].publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning();

    res.json({ book: updated[0] });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: 'تعذر تحديث بيانات الكتاب' });
  }
});

app.delete('/api/admin/books/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف كتاب غير صالح' });
    }

    const deleted = await db
      .delete(books)
      .where(eq(books.id, id))
      .returning({ id: books.id });

    if (!deleted[0]) {
      return res.status(404).json({ error: 'الكتاب غير موجود' });
    }

    res.json({ deletedId: id });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'تعذر حذف الكتاب' });
  }
});

// Categories Management
app.get('/api/admin/categories', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [catRows, bookCounts] = await Promise.all([
      db
        .select()
        .from(categories)
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select({
          categoryId: books.categoryId,
          total: count(),
        })
        .from(books)
        .groupBy(books.categoryId),
    ]);

    const countMap = new Map<number, number>();
    for (const row of bookCounts) {
      if (row.categoryId) countMap.set(row.categoryId, row.total);
    }

    res.json({
      items: catRows.map((c) => ({
        ...c,
        bookCount: countMap.get(c.id) ?? 0,
      })),
    });
  } catch (err) {
    console.error('Admin categories list error:', err);
    res.status(500).json({ error: 'تعذر جلب الأقسام' });
  }
});

app.post('/api/admin/categories', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const nameAr = String(req.body?.nameAr || '').trim();
    const nameEn = String(req.body?.nameEn || nameAr).trim();
    const descriptionAr = String(req.body?.descriptionAr || '').trim() || null;
    const iconName = String(req.body?.iconName || 'BookOpen').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim() || null;
    const sortOrder = Number(req.body?.sortOrder) || 0;
    const isActive = req.body?.isActive !== false;

    if (!nameAr) {
      return res.status(400).json({ error: 'اسم القسم بالعربية مطلوب' });
    }
    if (!isSafeUrl(imageUrl)) {
      return res.status(400).json({ error: 'رابط صورة القسم غير صالح' });
    }

    const slug = makeSlug(nameEn);

    const inserted = await db
      .insert(categories)
      .values({
        slug,
        nameAr,
        nameEn,
        descriptionAr,
        iconName,
        imageUrl,
        sortOrder,
        isActive,
      })
      .returning();

    res.status(201).json({ category: inserted[0] });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'تعذر إضافة القسم' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف غير صالح' });
    }

    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!existing[0]) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }

    const nameAr = String(req.body?.nameAr ?? existing[0].nameAr).trim();
    const nameEn = String(req.body?.nameEn ?? existing[0].nameEn).trim();
    const descriptionAr =
      req.body?.descriptionAr !== undefined
        ? String(req.body.descriptionAr || '').trim() || null
        : existing[0].descriptionAr;
    const iconName = String(req.body?.iconName ?? existing[0].iconName).trim();
    const imageUrl =
      req.body?.imageUrl !== undefined
        ? String(req.body.imageUrl || '').trim() || null
        : existing[0].imageUrl;
    const sortOrder =
      req.body?.sortOrder !== undefined
        ? Number(req.body.sortOrder) || 0
        : existing[0].sortOrder;
    const isActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : existing[0].isActive;

    if (!nameAr) {
      return res.status(400).json({ error: 'اسم القسم مطلوب' });
    }
    if (!isSafeUrl(imageUrl)) {
      return res.status(400).json({ error: 'رابط صورة القسم غير صالح' });
    }

    const updated = await db
      .update(categories)
      .set({
        nameAr,
        nameEn,
        descriptionAr,
        iconName,
        imageUrl,
        sortOrder,
        isActive,
      })
      .where(eq(categories.id, id))
      .returning();

    res.json({ category: updated[0] });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'تعذر تحديث القسم' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'معرف غير صالح' });
    }

    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });

    if (!deleted[0]) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }

    res.json({ deletedId: id });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'تعذر حذف القسم' });
  }
});

// Site Settings Management
app.put('/api/admin/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const siteNameAr = String(req.body?.siteNameAr || 'المكتبة الرقمية الفاخرة').trim();
    const siteSubtitleAr = String(req.body?.siteSubtitleAr || '').trim();
    const siteDescriptionAr = String(req.body?.siteDescriptionAr || '').trim();
    const logoUrl = String(req.body?.logoUrl || '').trim();
    const contactEmail = String(req.body?.contactEmail || '').trim();
    const contactPhone = String(req.body?.contactPhone || '').trim();
    const aboutTextAr = String(req.body?.aboutTextAr || '').trim();
    const footerTaglineAr = String(req.body?.footerTaglineAr || '').trim();
    const socialTelegram = String(req.body?.socialTelegram || '').trim();
    const socialYoutube = String(req.body?.socialYoutube || '').trim();
    const socialFacebook = String(req.body?.socialFacebook || '').trim();

    if (!isSafeUrl(logoUrl)) {
      return res.status(400).json({ error: 'رابط الشعار غير صالح' });
    }

    const updated = await db
      .update(siteSettings)
      .set({
        siteNameAr,
        siteSubtitleAr,
        siteDescriptionAr,
        logoUrl,
        contactEmail,
        contactPhone,
        aboutTextAr,
        footerTaglineAr,
        socialTelegram,
        socialYoutube,
        socialFacebook,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.settingKey, 'main'))
      .returning();

    res.json({ settings: updated[0] });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'تعذر حفظ إعدادات الموقع' });
  }
});

// Single Administrator Security & Info (Public Registration Disabled)
app.get('/api/admin/administrators', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: administrators.id,
        email: administrators.email,
        name: administrators.name,
        role: administrators.role,
        passwordHash: administrators.passwordHash,
        firebaseUid: administrators.firebaseUid,
        isActive: administrators.isActive,
        lastLoginAt: administrators.lastLoginAt,
        createdAt: administrators.createdAt,
      })
      .from(administrators)
      .orderBy(asc(administrators.id))
      .limit(1);

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        hasPassword: Boolean(r.passwordHash) || Boolean(process.env.ADMIN_PASSWORD),
        hasGoogle: false,
        isActive: r.isActive,
        lastLoginAt: r.lastLoginAt,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('List administrators error:', err);
    res.status(500).json({ error: 'تعذر جلب بيانات حساب المدير' });
  }
});

app.post('/api/admin/administrators', requireAdmin, (_req: AuthRequest, res: Response) => {
  return res.status(403).json({
    error: 'إنشاء حسابات مشرفين إضافية معطل أمنياً؛ يُسمح بحساب مدير واحد فقط.',
  });
});

app.put('/api/admin/security/password', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
      return res.status(400).json({
        error: 'كلمة المرور تُدار عبر متغير البيئة ADMIN_PASSWORD في إعدادات الاستضافة.',
      });
    }

    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل',
      });
    }

    await db
      .update(administrators)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(administrators.id, req.admin!.id));

    res.json({ success: true });
  } catch (err) {
    console.error('Update admin password error:', err);
    res.status(500).json({ error: 'تعذر تحديث كلمة المرور' });
  }
});

app.delete('/api/admin/administrators/:id', requireAdmin, (_req: AuthRequest, res: Response) => {
  return res.status(403).json({
    error: 'لا يمكن حذف حساب المدير الوحيد.',
  });
});

// ==========================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC
// ==========================================

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Luxury Arabic Digital Library running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app };
export default app;

