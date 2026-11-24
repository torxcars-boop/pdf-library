export interface CategoryDTO {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  iconName: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  bookCount?: number;
}

export interface BookDTO {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string;
  author: string | null;
  keywords: string | null;
  categoryId: number | null;
  categoryNameAr?: string;
  categorySlug?: string;
  coverUrl: string;
  coverMediaId: number | null;
  pdfUrl: string | null;
  pdfMediaId: number | null;
  fileSizeBytes: number;
  pageCount: number;
  spineColor: string;
  accentColor: string;
  status: 'published' | 'draft';
  isFeatured: boolean;
  downloadCount: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string | null;
}

export interface SiteSettingsDTO {
  siteNameAr: string;
  siteSubtitleAr: string;
  siteDescriptionAr: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  aboutTextAr: string;
  footerTaglineAr: string;
  socialTelegram: string;
  socialYoutube: string;
  socialFacebook: string;
}

export interface AdminUserDTO {
  id: number;
  email: string;
  name: string;
  role: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface BootstrapResponse {
  settings: SiteSettingsDTO;
  categories: CategoryDTO[];
  latestBooks: BookDTO[];
  mostDownloadedBooks: BookDTO[];
  featuredBooks: BookDTO[];
  stats: {
    totalBooks: number;
    totalCategories: number;
    totalDownloads: number;
  };
}
