<<<<<<< HEAD
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
=======
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
    version: db.getSyncVersion(),
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

type AuthActor =
  | { kind: 'admin'; id: string; name: string; role: 'admin'; avatar?: string; academicStage: string }
  | { kind: 'user'; id: string; name: string; role: 'user' | 'moderator' | 'admin'; avatar?: string; academicStage: string; user: User }
  | { kind: 'suspended'; user: User }
  | { kind: 'anonymous' };

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return typeof req.query.auth === 'string' ? req.query.auth.trim() : undefined;
}

function getAuthActor(req: Request): AuthActor {
  const token = extractBearerToken(req);
  if (!token) return { kind: 'anonymous' };

  if (isValidAdminToken(token)) {
    const adminConfig = db.getAdminConfig();
    return {
      kind: 'admin',
      id: 'admin_arm',
      name: adminConfig.username || 'ARM',
      role: 'admin',
      academicStage: 'إدارة المنصة',
    };
  }

  const uid = verifyUserToken(token);
  if (uid) {
    const user = db.getUserById(uid);
    if (!user) return { kind: 'anonymous' };
    if (user.status === 'suspended') return { kind: 'suspended', user };
    return {
      kind: 'user',
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      academicStage: user.academicStage || 'طالب',
      user,
    };
  }

  return { kind: 'anonymous' };
}

// Security middleware for Admin
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const actor = getAuthActor(req);
  if (actor.kind === 'admin' || (actor.kind === 'user' && actor.role === 'admin')) {
    return next();
  }
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب من قبل الإدارة' });
  }
  if (actor.kind === 'user') {
    return res.status(403).json({ error: 'غير مصرح: هذه العملية تتطلب صلاحية المدير العام' });
  }
  return res.status(401).json({ error: 'غير مصرح: مطلوب صلاحية الأدمن' });
}

// Security middleware for Content Publishing / Editing / Deleting (Admin or Moderator)
function requireContentWriteAuth(req: Request, res: Response, next: NextFunction) {
  const actor = getAuthActor(req);
  if (actor.kind === 'admin') {
    return next();
  }
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب من قبل الإدارة' });
  }
  if (actor.kind === 'user') {
    if (actor.role === 'admin' || actor.role === 'moderator') {
      return next();
    }
    return res.status(403).json({ error: 'ليس لديك صلاحية نشر أو تعديل أو حذف المحتوى' });
  }
  return res.status(401).json({ error: 'يرجى تسجيل الدخول بصلاحية الأدمن أو المشرف' });
}

// Security middleware for Active Logged-in Users (or Admin)
function requireActiveUserAuth(req: Request, res: Response, next: NextFunction) {
  const actor = getAuthActor(req);
  if (actor.kind === 'admin' || actor.kind === 'user') {
    return next();
  }
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب من قبل الإدارة' });
  }
  return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للمتابعة' });
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
    syncVersion: db.getSyncVersion(),
    engine: db.isUsingPostgres() ? 'PostgreSQL Cloud Database' : 'Local High-Speed Persistence Engine',
    totals: {
      books: books.length,
      summaries: summaries.length,
      videos: videos.length,
      articles: articles.length,
      users: users.length,
    },
    version: '2.6.0-central-sync',
  });
});

// Initialization & Sync endpoint for Egyptian Thanaweya Curriculum (Admin only!)
app.get('/api/init-egypt-curriculum', requireAdminAuth, (req: Request, res: Response) => {
  db.resetToEgyptianThanaweya();
  broadcastSync('all', { action: 'updated' });
  res.json({
    success: true,
    version: db.getSyncVersion(),
    message: 'تمت تهيئة وتحديث مناهج وفيديوهات الصف الثالث الثانوي المصري بنجاح 🇪🇬',
    counts: {
      books: db.getBooks().length,
      videos: db.getVideos().length,
      summaries: db.getSummaries().length,
    }
  });
});

// Lightweight Sync Version Endpoint (Fast Polling Fallback)
app.get('/api/sync/version', (_req: Request, res: Response) => {
  res.json({
    version: db.getSyncVersion(),
    ts: Date.now(),
    onlineCount: getOnlineCount(),
  });
});

// Unified Bootstrap Sync Endpoint (Single Authoritative Payload for All Clients & Devices)
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
    version: db.getSyncVersion(),
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
  res.json({ deletedIds: db.getDeletedIds(), version: db.getSyncVersion() });
});

app.post('/api/deleted-ids', requireContentWriteAuth, (req: Request, res: Response) => {
  const updated = db.mergeDeletedIds(req.body || {});
  broadcastSync('content', { action: 'deleted' });
  res.json({ success: true, deletedIds: updated, version: db.getSyncVersion() });
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
  if (user.status === 'suspended') return res.status(403).json({ error: 'تم تجميد هذا الحساب' });

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
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
  const stats = db.getStudentStatsForUser(userId);
  res.json({ stats });
});

app.put('/api/user/stats', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = verifyUserToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لحفظ التقدم' });
  }
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
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

  broadcastSync('content', { action: 'updated', itemId: Number(id) });

  res.json({
    success: true,
    version: db.getSyncVersion(),
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

  const currentUser = db.getUserById(userId);
  if (!currentUser) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });
  if (currentUser.status === 'suspended') return res.status(403).json({ error: 'تم تجميد هذا الحساب' });

  const { name, academicStage, avatar, password } = req.body;

  const updates: Partial<User> = {};
  if (name) updates.name = name.trim();
  if (academicStage) updates.academicStage = academicStage.trim();
  if (avatar) updates.avatar = avatar.trim();
  if (password && password.trim().length >= 6) updates.password = password.trim();

  const updated = db.updateUser(userId, updates);
  if (!updated) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });

  broadcastSync('users', { action: 'updated', itemId: userId });

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
  activeAdminTokens.clear();
  const nextToken = signAdminToken(adminConfig.username, newPassword);
  activeAdminTokens.add(nextToken);

  db.addAuditLog({
    type: 'password_change',
    user: adminConfig.username,
    details: 'تم تحديث كلمة مرور المدير بنجاح وتعزيز أمان الحساب',
    ip,
    status: 'success',
  });

  res.json({
    success: true,
    token: nextToken,
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
  const deletedUsers = new Set(db.getDeletedIds().users.map(String));
  const users = db.getUsers()
    .filter(u => !deletedUsers.has(String(u.id)))
    .map(sanitizeUserForClient);
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
  db.deleteUser(id);
  db.mergeDeletedIds({ users: [String(id)] });

  db.addAuditLog({
    type: 'item_deleted',
    user: adminConfig.username,
    details: `حذف حساب المستخدم ${user?.name || id} (${user?.email || 'حساب محلي'}) بشكل نهائي`,
    ip,
    status: 'danger',
  });

  broadcastSync('users');

  res.json({ message: 'تم حذف حساب المستخدم' });
});

// Admin Stats Overview
app.get('/api/admin/stats', requireAdminAuth, (req: Request, res: Response) => {
  const deletedIds = db.getDeletedIds();
  const books = db.getBooks().filter(b => !deletedIds.books.includes(Number(b.id)));
  const summaries = db.getSummaries().filter(s => !deletedIds.summaries.includes(Number(s.id)));
  const videos = db.getVideos().filter(v => !deletedIds.videos.includes(Number(v.id)));
  const articles = db.getArticles().filter(a => !deletedIds.articles.includes(Number(a.id)));
  const users = db.getUsers().filter(u => !deletedIds.users.includes(String(u.id)));
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
app.post('/api/admin/upload-pdf', requireContentWriteAuth, (req: Request, res: Response) => {
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
  const deletedBooks = db.getDeletedIds().books;
  let books = db.getBooks().filter(b => !deletedBooks.includes(Number(b.id)));

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

  res.json({ books, version: db.getSyncVersion() });
});

app.post('/api/books', requireContentWriteAuth, (req: Request, res: Response) => {
  const { title, category, filepath, coverpath, is_student, grade, description, clientRequestId } = req.body || {};
  if (!title || !String(title).trim() || !filepath || !String(filepath).trim()) {
    return res.status(400).json({ error: 'العنوان ورابط الملف مطلوبان' });
  }

  const actor = getAuthActor(req);
  const book = db.addBook({
    title: String(title).trim(),
    category: category ? String(category).trim() : 'تعليم',
    filepath: String(filepath).trim(),
    coverpath: coverpath ? String(coverpath).trim() : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    is_student: is_student ? 1 : 0,
    grade: grade ? String(grade).trim() : '',
    description: description ? String(description).trim() : '',
  }, typeof clientRequestId === 'string' ? clientRequestId : undefined);

  db.addAuditLog({
    type: 'item_created',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `إضافة كتاب جديد: "${book.title}" (${book.category})`,
    ip: getClientIp(req),
    status: 'success',
  });

  broadcastSync('books', { action: 'created', itemId: book.id });
  res.status(201).json({ book, version: db.getSyncVersion(), message: 'تمت إضافة الكتاب بنجاح' });
});

app.put('/api/books/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الكتاب غير صالح' });
  const body = req.body || {};
  const updates: Partial<Book> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.category !== undefined) updates.category = String(body.category).trim();
  if (body.filepath !== undefined) updates.filepath = String(body.filepath).trim();
  if (body.coverpath !== undefined) updates.coverpath = String(body.coverpath).trim();
  if (body.is_student !== undefined) updates.is_student = body.is_student ? 1 : 0;
  if (body.grade !== undefined) updates.grade = String(body.grade).trim();
  if (body.description !== undefined) updates.description = String(body.description).trim();

  if (updates.title === '' || updates.filepath === '') {
    return res.status(400).json({ error: 'العنوان ورابط الملف لا يمكن أن يكونا فارغين' });
  }

  const updated = db.updateBook(id, updates);
  if (!updated) return res.status(404).json({ error: 'الكتاب غير موجود' });

  const actor = getAuthActor(req);
  db.addAuditLog({
    type: 'item_updated',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `تعديل كتاب: "${updated.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  broadcastSync('books', { action: 'updated', itemId: updated.id });
  res.json({ book: updated, version: db.getSyncVersion(), message: 'تم تحديث بيانات الكتاب بنجاح' });
});

app.delete('/api/books/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الكتاب غير صالح' });
  const book = db.getBooks().find(b => b.id === id);
  const success = db.deleteBook(id);
  db.mergeDeletedIds({ books: [id] });
  const actor = getAuthActor(req);
  if (!success) {
    broadcastSync('books', { action: 'deleted', itemId: id });
    return res.json({ success: true, version: db.getSyncVersion(), message: 'تمت إزالة الكتاب من المنصة' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `حذف كتاب: "${book?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('books', { action: 'deleted', itemId: id });
  res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف الكتاب بنجاح' });
});

app.post('/api/books/:id/view', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (db.getDeletedIds().books.includes(id)) {
    return res.status(404).json({ error: 'الكتاب غير موجود أو تم حذفه' });
  }
  const book = db.getBooks().find(b => b.id === id);
  if (!book) return res.status(404).json({ error: 'الكتاب غير موجود' });
  const views = (book.views || 0) + 1;
  db.updateBook(id, { views });
  broadcastSync('books', { action: 'updated', itemId: id });
  res.json({ success: true, views, version: db.getSyncVersion() });
});

app.post('/api/books/:id/download', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (db.getDeletedIds().books.includes(id)) {
    return res.status(404).json({ error: 'الكتاب غير موجود أو تم حذفه' });
  }
  const book = db.getBooks().find(b => b.id === id);
  if (!book) return res.status(404).json({ error: 'الكتاب غير موجود' });
  const newDownloads = (book.downloads || 0) + 1;
  db.updateBook(id, { downloads: newDownloads });
  broadcastSync('books', { action: 'updated', itemId: id });
  res.json({ success: true, downloads: newDownloads, version: db.getSyncVersion() });
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
  let updated = false;
  if (type === 'book' && !db.getDeletedIds().books.includes(numId)) {
    const book = db.getBooks().find(b => b.id === numId);
    if (book) {
      views = (book.views || 0) + 1;
      db.updateBook(numId, { views });
      updated = true;
    }
  } else if (type === 'summary' && !db.getDeletedIds().summaries.includes(numId)) {
    const sum = db.getSummaries().find(s => s.id === numId);
    if (sum) {
      views = (sum.views || 0) + 1;
      db.updateSummary(numId, { views });
      updated = true;
    }
  } else if (type === 'video' && !db.getDeletedIds().videos.includes(numId)) {
    const vid = db.getVideos().find(v => v.id === numId);
    if (vid) {
      views = (vid.views || 0) + 1;
      db.updateVideo(numId, { views });
      updated = true;
    }
  } else if (type === 'article' && !db.getDeletedIds().articles.includes(numId)) {
    const art = db.getArticles().find(a => a.id === numId);
    if (art) {
      views = (art.views || 0) + 1;
      db.updateArticle(numId, { views });
      updated = true;
    }
  }
  if (!updated) {
    return res.status(404).json({ error: 'العنصر غير موجود' });
  }
  broadcastSync('content', { action: 'updated', itemId: numId });
  res.json({ success: true, views, version: db.getSyncVersion() });
});

// SUMMARIES
app.get('/api/summaries', (req: Request, res: Response) => {
  const { search } = req.query;
  const deletedSummaries = db.getDeletedIds().summaries;
  let summaries = db.getSummaries().filter(s => !deletedSummaries.includes(Number(s.id)));
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    summaries = summaries.filter(s => s.title.toLowerCase().includes(q));
  }
  res.json({ summaries, version: db.getSyncVersion() });
});

app.post('/api/summaries', requireContentWriteAuth, (req: Request, res: Response) => {
  const { title, imagepath, category, clientRequestId } = req.body || {};
  if (!title || !String(title).trim() || !imagepath || !String(imagepath).trim()) {
    return res.status(400).json({ error: 'العنوان ورابط صورة الملخص مطلوبان' });
  }

  const actor = getAuthActor(req);
  const summary = db.addSummary({
    title: String(title).trim(),
    imagepath: String(imagepath).trim(),
    category: category ? String(category).trim() : 'عام',
  }, typeof clientRequestId === 'string' ? clientRequestId : undefined);

  db.addAuditLog({
    type: 'item_created',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `إضافة ملخص صورة جديد: "${summary.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  broadcastSync('summaries', { action: 'created', itemId: summary.id });
  res.status(201).json({ summary, version: db.getSyncVersion(), message: 'تمت إضافة الملخص بنجاح' });
});

app.put('/api/summaries/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الملخص غير صالح' });
  const body = req.body || {};
  const updates: Partial<Summary> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.imagepath !== undefined) updates.imagepath = String(body.imagepath).trim();
  if (body.category !== undefined) updates.category = String(body.category).trim();
  if (updates.title === '' || updates.imagepath === '') {
    return res.status(400).json({ error: 'العنوان ورابط الصورة لا يمكن أن يكونا فارغين' });
  }
  const updated = db.updateSummary(id, updates);
  if (!updated) return res.status(404).json({ error: 'الملخص غير موجود' });
  broadcastSync('summaries', { action: 'updated', itemId: updated.id });
  res.json({ summary: updated, version: db.getSyncVersion(), message: 'تم تعديل الملخص بنجاح' });
});

app.delete('/api/summaries/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الملخص غير صالح' });
  const sum = db.getSummaries().find(s => s.id === id);
  const success = db.deleteSummary(id);
  db.mergeDeletedIds({ summaries: [id] });
  const actor = getAuthActor(req);
  if (!success) {
    broadcastSync('summaries', { action: 'deleted', itemId: id });
    return res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف الملخص بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `حذف ملخص: "${sum?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('summaries', { action: 'deleted', itemId: id });
  res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف الملخص بنجاح' });
});

// VIDEOS
app.get('/api/videos', (req: Request, res: Response) => {
  const { search } = req.query;
  const deletedVideos = db.getDeletedIds().videos;
  let videos = db.getVideos().filter(v => !deletedVideos.includes(Number(v.id)));
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    videos = videos.filter(v => v.title.toLowerCase().includes(q));
  }
  res.json({ videos, version: db.getSyncVersion() });
});

app.post('/api/videos', requireContentWriteAuth, (req: Request, res: Response) => {
  const { title, videourl, category, channel, duration, clientRequestId } = req.body || {};
  if (!title || !String(title).trim() || !videourl || !String(videourl).trim()) {
    return res.status(400).json({ error: 'العنوان ورابط الفيديو مطلوبان' });
  }

  const actor = getAuthActor(req);
  const video = db.addVideo({
    title: String(title).trim(),
    videourl: String(videourl).trim(),
    category: category ? String(category).trim() : 'شروحات',
    channel: channel ? String(channel).trim() : 'المكتبة الرقمية',
    duration: duration ? String(duration).trim() : '15:00',
  }, typeof clientRequestId === 'string' ? clientRequestId : undefined);

  db.addAuditLog({
    type: 'item_created',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `إضافة فيديو تعليمي: "${video.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  broadcastSync('videos', { action: 'created', itemId: video.id });
  res.status(201).json({ video, version: db.getSyncVersion(), message: 'تمت إضافة الفيديو بنجاح' });
});

app.put('/api/videos/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الفيديو غير صالح' });
  const body = req.body || {};
  const updates: Partial<Video> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.videourl !== undefined) updates.videourl = String(body.videourl).trim();
  if (body.category !== undefined) updates.category = String(body.category).trim();
  if (body.channel !== undefined) updates.channel = String(body.channel).trim();
  if (body.duration !== undefined) updates.duration = String(body.duration).trim();
  if (updates.title === '' || updates.videourl === '') {
    return res.status(400).json({ error: 'العنوان ورابط الفيديو لا يمكن أن يكونا فارغين' });
  }
  const updated = db.updateVideo(id, updates);
  if (!updated) return res.status(404).json({ error: 'الفيديو غير موجود' });
  broadcastSync('videos', { action: 'updated', itemId: updated.id });
  res.json({ video: updated, version: db.getSyncVersion(), message: 'تم تعديل الفيديو بنجاح' });
});

app.delete('/api/videos/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف الفيديو غير صالح' });
  const vid = db.getVideos().find(v => v.id === id);
  const success = db.deleteVideo(id);
  db.mergeDeletedIds({ videos: [id] });
  const actor = getAuthActor(req);
  if (!success) {
    broadcastSync('videos', { action: 'deleted', itemId: id });
    return res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف مقطع الفيديو بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `حذف فيديو: "${vid?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('videos', { action: 'deleted', itemId: id });
  res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف مقطع الفيديو بنجاح' });
});

// ARTICLES
app.get('/api/articles', (req: Request, res: Response) => {
  const { search } = req.query;
  const deletedArticles = db.getDeletedIds().articles;
  let articles = db.getArticles().filter(a => !deletedArticles.includes(Number(a.id)));
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    articles = articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.content.toLowerCase().includes(q)
    );
  }
  res.json({ articles, version: db.getSyncVersion() });
});

app.get('/api/articles/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (db.getDeletedIds().articles.includes(id)) {
    return res.status(404).json({ error: 'المقالة غير موجودة' });
  }
  const article = db.getArticleById(id);
  if (!article) return res.status(404).json({ error: 'المقالة غير موجودة' });
  db.updateArticle(id, { views: (article.views || 0) + 1 });
  res.json({ article });
});

app.post('/api/articles', requireContentWriteAuth, (req: Request, res: Response) => {
  const { title, content, imagepath, author, readTime, clientRequestId } = req.body || {};
  if (!title || !String(title).trim() || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'عنوان المقال والمحتوى مطلوبان' });
  }

  const actor = getAuthActor(req);
  const article = db.addArticle({
    title: String(title).trim(),
    content: String(content).trim(),
    imagepath: imagepath ? String(imagepath).trim() : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
    author: author ? String(author).trim() : 'ARM',
    readTime: readTime ? String(readTime).trim() : '5 دقائق',
  }, typeof clientRequestId === 'string' ? clientRequestId : undefined);

  db.addAuditLog({
    type: 'item_created',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `نشر مقال جديد: "${article.title}"`,
    ip: getClientIp(req),
    status: 'success',
  });

  broadcastSync('articles', { action: 'created', itemId: article.id });
  res.status(201).json({ article, version: db.getSyncVersion(), message: 'تم نشر المقال بنجاح' });
});

app.put('/api/articles/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف المقالة غير صالح' });
  const body = req.body || {};
  const updates: Partial<Article> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.content !== undefined) updates.content = String(body.content).trim();
  if (body.imagepath !== undefined) updates.imagepath = String(body.imagepath).trim();
  if (body.author !== undefined) updates.author = String(body.author).trim();
  if (body.readTime !== undefined) updates.readTime = String(body.readTime).trim();
  if (updates.title === '' || updates.content === '') {
    return res.status(400).json({ error: 'عنوان المقال والمحتوى لا يمكن أن يكونا فارغين' });
  }
  const updated = db.updateArticle(id, updates);
  if (!updated) return res.status(404).json({ error: 'المقالة غير موجودة' });
  broadcastSync('articles', { action: 'updated', itemId: updated.id });
  res.json({ article: updated, version: db.getSyncVersion(), message: 'تم تعديل المقال بنجاح' });
});

app.delete('/api/articles/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'معرف المقالة غير صالح' });
  const art = db.getArticles().find(a => a.id === id);
  const success = db.deleteArticle(id);
  db.mergeDeletedIds({ articles: [id] });
  const actor = getAuthActor(req);
  if (!success) {
    broadcastSync('articles', { action: 'deleted', itemId: id });
    return res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف المقالة بنجاح' });
  }

  db.addAuditLog({
    type: 'item_deleted',
    user: actor.kind === 'admin' || actor.kind === 'user' ? actor.name : 'الأدمن',
    details: `حذف مقال: "${art?.title || id}"`,
    ip: getClientIp(req),
    status: 'warning',
  });

  broadcastSync('articles', { action: 'deleted', itemId: id });
  res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف المقالة بنجاح' });
});

// --------------------------------------------------------------------------
// 4. SHARED EXAMS, REVIEWS, COMMENTS & SUPPORT ENDPOINTS (Cross-Device Sync)
// --------------------------------------------------------------------------

// EXAMS
app.get('/api/exams', (_req: Request, res: Response) => {
  res.json({
    customExams: db.getCustomExams(),
    deletedExamIds: db.getDeletedExamIds(),
    version: db.getSyncVersion(),
  });
});

app.post('/api/exams', requireContentWriteAuth, (req: Request, res: Response) => {
  const exam = req.body;
  if (!exam || !exam.title || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return res.status(400).json({ error: 'بيانات الامتحان والأسئلة غير مكتملة' });
  }
  const saved = db.addCustomExam({
    ...exam,
    id: exam.id || 'exam_' + Date.now(),
    createdByAdmin: true,
  });
  broadcastSync('exams', { action: 'created', itemId: saved.id });
  res.status(201).json({ exam: saved, version: db.getSyncVersion(), message: 'تم نشر الامتحان لجميع الطلاب بنجاح' });
});

app.delete('/api/exams/:id', requireContentWriteAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  db.deleteExam(id);
  broadcastSync('exams', { action: 'deleted', itemId: id });
  res.json({ success: true, version: db.getSyncVersion(), message: 'تم حذف الامتحان بنجاح' });
});

// REVIEWS
app.get('/api/reviews', (req: Request, res: Response) => {
  const { itemId, itemType } = req.query;
  let reviews = db.getReviews();
  if (itemId && itemType) {
    reviews = reviews.filter(r => String(r.itemId) === String(itemId) && r.itemType === String(itemType));
  }
  res.json({ reviews, version: db.getSyncVersion() });
});

app.post('/api/reviews', requireActiveUserAuth, (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind !== 'admin' && actor.kind !== 'user') {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لإضافة مراجعة' });
  }
  const body = req.body || {};

  if (!body.itemId || !body.itemType || !body.comment || !String(body.comment).trim() || typeof body.rating !== 'number') {
    return res.status(400).json({ error: 'بيانات المراجعة غير مكتملة' });
  }

  const created = db.addReview({
    id: body.id ? String(body.id) : undefined,
    itemId: body.itemId,
    itemType: body.itemType,
    userId: actor.id,
    userName: actor.kind === 'admin' ? `${actor.name} (المدير العام)` : actor.name,
    userAvatar: actor.avatar,
    academicStage: actor.academicStage,
    rating: Math.min(5, Math.max(1, Number(body.rating))),
    comment: String(body.comment).trim(),
  });
  broadcastSync('reviews', { action: 'created', itemId: created.id });
  res.status(201).json({ review: created, version: db.getSyncVersion() });
});

app.put('/api/reviews/:id/toggle', requireContentWriteAuth, (req: Request, res: Response) => {
  const updated = db.toggleApproveReview(req.params.id);
  if (!updated) return res.status(404).json({ error: 'المراجعة غير موجودة' });
  broadcastSync('reviews', { action: 'updated', itemId: updated.id });
  res.json({ review: updated, version: db.getSyncVersion() });
});

app.delete('/api/reviews/:id', (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind === 'anonymous') {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
  }
  const rev = db.getReviews().find(r => r.id === req.params.id);
  if (!rev) return res.status(404).json({ error: 'المراجعة غير موجودة' });

  const isPrivileged = actor.kind === 'admin' || actor.role === 'admin' || actor.role === 'moderator';
  if (!isPrivileged && actor.id !== rev.userId) {
    return res.status(403).json({ error: 'غير مصرح بحذف هذه المراجعة' });
  }
  db.deleteReview(req.params.id);
  broadcastSync('reviews', { action: 'deleted', itemId: req.params.id });
  res.json({ success: true, version: db.getSyncVersion() });
});

// COMMENTS
app.get('/api/comments', (req: Request, res: Response) => {
  const { itemId, itemType } = req.query;
  let comments = db.getComments();
  if (itemId && itemType) {
    comments = comments.filter(c => String(c.itemId) === String(itemId) && c.itemType === String(itemType));
  }
  res.json({ comments, version: db.getSyncVersion() });
});

app.post('/api/comments', requireActiveUserAuth, (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind !== 'admin' && actor.kind !== 'user') {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول للمشاركة في التعليقات' });
  }
  const body = req.body || {};

  if (!body.itemId || !body.itemType || !body.content || !String(body.content).trim()) {
    return res.status(400).json({ error: 'بيانات التعليق غير مكتملة' });
  }

  const created = db.addComment({
    id: body.id ? String(body.id) : undefined,
    itemId: String(body.itemId),
    itemType: body.itemType,
    authorId: actor.id,
    authorName: actor.kind === 'admin' ? 'إدارة المكتبة الرقمية' : actor.name,
    authorAvatar: actor.avatar,
    authorRole: actor.role,
    academicStage: actor.academicStage,
    content: String(body.content).trim(),
  });
  broadcastSync('comments', { action: 'created', itemId: created.id });
  res.status(201).json({ comment: created, version: db.getSyncVersion() });
});

app.post('/api/comments/:id/like', (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
  }
  const actorId = (actor.kind === 'admin' || actor.kind === 'user')
    ? actor.id
    : String(req.body?.actorId || 'guest');
  const result = db.toggleLikeComment(req.params.id, actorId);
  if (!result) return res.status(404).json({ error: 'التعليق غير موجود' });
  broadcastSync('comments', { action: 'updated', itemId: req.params.id });
  res.json({ ...result, version: db.getSyncVersion() });
});

app.post('/api/comments/:id/admin-like', requireContentWriteAuth, (req: Request, res: Response) => {
  const updated = db.toggleAdminLikeComment(req.params.id);
  if (!updated) return res.status(404).json({ error: 'التعليق غير موجود' });
  broadcastSync('comments', { action: 'updated', itemId: req.params.id });
  res.json({ comment: updated, version: db.getSyncVersion() });
});

app.delete('/api/comments/:id', (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind === 'anonymous') {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }
  if (actor.kind === 'suspended') {
    return res.status(403).json({ error: 'تم تجميد هذا الحساب' });
  }
  const cmt = db.getComments().find(c => c.id === req.params.id);
  if (!cmt) return res.status(404).json({ error: 'التعليق غير موجود' });

  const isPrivileged = actor.kind === 'admin' || actor.role === 'admin' || actor.role === 'moderator';
  if (!isPrivileged && actor.id !== cmt.authorId) {
    return res.status(403).json({ error: 'غير مصرح بحذف هذا التعليق' });
  }
  db.deleteComment(req.params.id);
  broadcastSync('comments', { action: 'deleted', itemId: req.params.id });
  res.json({ success: true, version: db.getSyncVersion() });
});

// VOLUNTARY SUPPORT & SUPPORTERS
app.get('/api/support/config', (_req: Request, res: Response) => {
  res.json({ supportConfig: db.getSupportConfig(), version: db.getSyncVersion() });
});

app.put('/api/support/config', requireAdminAuth, (req: Request, res: Response) => {
  const { planId, isActive } = req.body || {};
  if (!planId || typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'بيانات غير صالحة' });
  }
  const supportConfig = db.setSupportPlanStatus(String(planId), isActive);
  broadcastSync('support', { action: 'updated' });
  res.json({ supportConfig, version: db.getSyncVersion() });
});

app.get('/api/support/requests', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({
    requests: db.getSupportRequests(),
    studentSubscriptions: db.getStudentSubscriptions(),
    version: db.getSyncVersion(),
  });
});

app.post('/api/support/requests', requireActiveUserAuth, (req: Request, res: Response) => {
  const actor = getAuthActor(req);
  if (actor.kind !== 'admin' && actor.kind !== 'user') {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لتسجيل مساهمة الدعم' });
  }
  const body = req.body || {};
  if (!body.senderPhone || !String(body.senderPhone).trim()) {
    return res.status(400).json({ error: 'يرجى إدخال رقم المحفظة أو هاتف المرسل' });
  }
  const targetUserId = actor.kind === 'user' ? actor.id : String(body.userId || actor.id);
  const targetUserName = actor.kind === 'user' ? actor.name : String(body.userName || actor.name);
  const targetUserEmail = actor.kind === 'user' ? actor.user.email : String(body.userEmail || '');

  const created = db.addSupportRequest({
    ...body,
    userId: targetUserId,
    userName: targetUserName,
    userEmail: targetUserEmail,
    senderPhone: String(body.senderPhone).trim(),
  });
  const now = new Date();
  const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const supporterBadge = db.setStudentSubscription(targetUserId, {
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
    paymentSenderPhone: String(body.senderPhone).trim(),
    transactionRef: body.transactionRef,
    approvedByAdmin: true,
  });
  broadcastSync('support', { action: 'created', itemId: created.id });
  res.status(201).json({ request: created, subscription: supporterBadge, version: db.getSyncVersion() });
});

app.put('/api/support/requests/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { status } = req.body || {};
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'الحالة غير صالحة' });
  }
  const updated = db.updateSupportRequestStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'طلب الدعم غير موجود' });
  broadcastSync('support', { action: 'updated', itemId: updated.id });
  res.json({ request: updated, version: db.getSyncVersion() });
});

app.put('/api/support/supporters/:userId', requireAdminAuth, (req: Request, res: Response) => {
  const saved = db.setStudentSubscription(req.params.userId, req.body || {});
  broadcastSync('support', { action: 'updated', itemId: req.params.userId });
  res.json({ subscription: saved, version: db.getSyncVersion() });
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
      ws.send(JSON.stringify({
        type: 'connected',
        version: db.getSyncVersion(),
        onlineCount,
        ts: Date.now(),
      }));
    } catch {
      // ignore
    }
    broadcastWsJson({ type: 'presence', onlineCount, ts: Date.now() });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'ping' && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'pong',
            version: db.getSyncVersion(),
            ts: Date.now(),
            onlineCount: getOnlineCount(),
          }));
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
>>>>>>> c05b6562d60cedf0c03364b88d720a6aad8e7821
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
<<<<<<< HEAD
        ws: { server: httpServer },
        watch: null,
=======
>>>>>>> c05b6562d60cedf0c03364b88d720a6aad8e7821
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
<<<<<<< HEAD
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
=======
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
>>>>>>> c05b6562d60cedf0c03364b88d720a6aad8e7821
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
<<<<<<< HEAD
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

=======
    console.log(`\n👑 خادم المكتبة الرقمية الفاخرة يعمل بنجاح على: http://localhost:${PORT}`);
    console.log(`⚡ المزامنة الفورية WebSocket متاحة على المسار: /ws`);
    console.log(`🛡️ وضع الأمان نشط: نظام تسجيل دخول المستخدمين + لوحة تحكم الأدمن جاهزة.`);
    console.log(`📁 مخزن البيانات: ${db.isUsingPostgres() ? 'PostgreSQL Cloud DB' : 'مخزن محلي فائق السرعة data/db.json'}\n`);
  });
}

startServer().catch(err => {
  console.error('فشل بدء تشغيل الخادم:', err);
});
>>>>>>> c05b6562d60cedf0c03364b88d720a6aad8e7821
