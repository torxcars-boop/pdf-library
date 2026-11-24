import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const administrators = pgTable('administrators', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('admin'),
  passwordHash: text('password_hash'),
  firebaseUid: text('firebase_uid'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar'),
  iconName: text('icon_name').notNull().default('BookOpen'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),
  storageKey: text('storage_key').notNull().unique(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  fileType: text('file_type').notNull(), // 'pdf' | 'cover' | 'logo'
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en'),
  descriptionAr: text('description_ar').notNull(),
  author: text('author'),
  keywords: text('keywords'),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  coverUrl: text('cover_url').notNull(),
  coverMediaId: integer('cover_media_id').references(() => mediaFiles.id, {
    onDelete: 'set null',
  }),
  pdfUrl: text('pdf_url'),
  pdfMediaId: integer('pdf_media_id').references(() => mediaFiles.id, {
    onDelete: 'set null',
  }),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  pageCount: integer('page_count').notNull().default(120),
  spineColor: text('spine_color').notNull().default('#0F3D2E'),
  accentColor: text('accent_color').notNull().default('#E8B94F'),
  status: text('status').notNull().default('published'),
  isFeatured: boolean('is_featured').notNull().default(false),
  downloadCount: integer('download_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  publishedAt: timestamp('published_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id')
    .references(() => books.id, { onDelete: 'cascade' })
    .notNull(),
  actionType: text('action_type').notNull().default('download'),
  userAgent: text('user_agent'),
  downloadedAt: timestamp('downloaded_at').defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  siteNameAr: text('site_name_ar').notNull().default('المكتبة الرقمية الفاخرة'),
  siteSubtitleAr: text('site_subtitle_ar')
    .notNull()
    .default('مصدر معرفتك .. في مكان واحد'),
  siteDescriptionAr: text('site_description_ar').notNull(),
  logoUrl: text('logo_url')
    .notNull()
    .default('/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg'),
  contactEmail: text('contact_email')
    .notNull()
    .default('info@luxury-library.com'),
  contactPhone: text('contact_phone').notNull().default('+966 50 000 0000'),
  aboutTextAr: text('about_text_ar').notNull(),
  footerTaglineAr: text('footer_tagline_ar')
    .notNull()
    .default('معاً نحو عالم المعرفة'),
  socialTelegram: text('social_telegram').default(''),
  socialYoutube: text('social_youtube').default(''),
  socialFacebook: text('social_facebook').default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  books: many(books),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.id],
  }),
  coverMedia: one(mediaFiles, {
    fields: [books.coverMediaId],
    references: [mediaFiles.id],
  }),
  pdfMedia: one(mediaFiles, {
    fields: [books.pdfMediaId],
    references: [mediaFiles.id],
  }),
  downloads: many(downloads),
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
  book: one(books, {
    fields: [downloads.bookId],
    references: [books.id],
  }),
}));
