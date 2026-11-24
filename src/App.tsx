import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoriesSection } from './components/CategoriesSection';
import { Bookshelf3D } from './components/Bookshelf3D';
import { SearchCatalogSection } from './components/SearchCatalogSection';
import { BookDetailsPage } from './components/BookDetailsPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import {
  BookDTO,
  BootstrapResponse,
  CategoryDTO,
  SiteSettingsDTO,
} from './types/library';

const DEFAULT_SETTINGS: SiteSettingsDTO = {
  siteNameAr: 'المكتبة الرقمية الفاخرة',
  siteSubtitleAr: 'مصدر معرفتك .. في مكان واحد',
  siteDescriptionAr:
    'منصة عربية راقية تجمع بين فخامة المكتبات الكلاسيكية وسهولة الوصول الرقمي، لتمنحك تجربة تصفح وقراءة وتحميل فوري لأهم الكتب والمراجع بصيغة PDF.',
  logoUrl: '/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg',
  contactEmail: 'torxcars@gmail.com',
  contactPhone: '+201115491611',
  aboutTextAr:
    'نسعى في المكتبة الرقمية الفاخرة إلى إثراء المحتوى العربي وإتاحة المعرفة الموثوقة في شتى المجالات العلمية والأدبية والتقنية والدينية ضمن واجهة عربية أنيقة وسريعة.',
  footerTaglineAr: 'معاً نحو عالم المعرفة',
  socialTelegram: 'https://t.me/PDF_Library0',
  socialYoutube: '',
  socialFacebook: '',
};

function LibraryAppShell() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [settings, setSettings] = useState<SiteSettingsDTO>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [latestBooks, setLatestBooks] = useState<BookDTO[]>([]);
  const [mostDownloadedBooks, setMostDownloadedBooks] = useState<BookDTO[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<BookDTO[]>([]);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalCategories: 0,
    totalDownloads: 0,
  });
  const [bootLoading, setBootLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'alphabetical'>('latest');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogBooks, setCatalogBooks] = useState<BookDTO[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data: BootstrapResponse = await res.json();
      setSettings(data.settings);
      setCategories(data.categories);
      setLatestBooks(data.latestBooks);
      setMostDownloadedBooks(data.mostDownloadedBooks);
      setFeaturedBooks(data.featuredBooks);
      setStats(data.stats);
    } catch (err) {
      console.error('Bootstrap load error:', err);
    } finally {
      setBootLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory,
        sort: sortBy,
        page: String(catalogPage),
        limit: '10',
      });
      const res = await fetch(`/api/books?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setCatalogBooks(data.items || []);
      setCatalogTotal(data.total || 0);
      setCatalogTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Catalog load error:', err);
    } finally {
      setCatalogLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, catalogPage]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  // Browser back/forward routing sync
  useEffect(() => {
    const onPopState = () => {
      const nextPath = window.location.pathname || '/';
      setPathname(nextPath);
      if (nextPath.startsWith('/category/')) {
        const slug = decodeURIComponent(nextPath.replace('/category/', ''));
        setSelectedCategory(slug || 'all');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string, sectionId?: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
      setPathname(nextPath);
    }

    if (nextPath === '/') {
      document.title = `${settings.siteNameAr} – ${settings.siteSubtitleAr}`;
      if (sectionId) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [settings.siteNameAr, settings.siteSubtitleAr]);

  const handleSelectBook = (book: BookDTO) => {
    navigate(`/book/${encodeURIComponent(book.slug)}`);
  };

  const handleSelectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setCatalogPage(1);
    navigate('/', 'library-catalog');
  };

  const handleDownloadBook = (book: BookDTO) => {
    const link = document.createElement('a');
    link.href = `/api/books/${book.id}/pdf?download=1`;
    link.download = `${book.slug}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      loadBootstrap();
      loadCatalog();
    }, 600);
  };

  const handleRefreshAll = () => {
    loadBootstrap();
    loadCatalog();
  };

  // Route: Admin Dashboard (/admin)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminDashboard
        onBackToSite={() => navigate('/')}
        onDataChanged={handleRefreshAll}
        initialSettings={settings}
      />
    );
  }

  // Route: Book Details Page (/book/:slug)
  const bookRouteMatch = pathname.match(/^\/book\/(.+)$/);

  return (
    <div className="min-h-screen flex flex-col bg-[#06152F] text-white">
      <Navbar
        settings={settings}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCatalogPage(1);
        }}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          setCatalogPage(1);
          navigate('/', 'library-catalog');
        }}
        onNavigate={navigate}
        currentPath={pathname}
      />

      {bookRouteMatch ? (
        <div className="flex-1">
          <BookDetailsPage
            slugOrId={decodeURIComponent(bookRouteMatch[1])}
            onBackHome={() => navigate('/')}
            onSelectBook={handleSelectBook}
            onSelectCategory={handleSelectCategory}
            onBookUpdated={handleRefreshAll}
          />
        </div>
      ) : (
        <main className="flex-1">
          <HeroSection
            settings={settings}
            featuredBooks={featuredBooks.length > 0 ? featuredBooks : latestBooks}
            stats={stats}
            onBrowseLibrary={() => navigate('/', 'latest-books')}
            onExploreCategories={() => navigate('/', 'categories')}
            onSelectBook={handleSelectBook}
          />

          <CategoriesSection
            categories={categories}
            selectedCategorySlug={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          {/* 3D Bookshelf 1: Latest Books */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Bookshelf3D
              id="latest-books"
              title="أحدث الكتب المضافة"
              subtitle="أحدث الإصدارات الرقمية المضافة إلى أرفف المكتبة بصيغة PDF"
              books={latestBooks}
              loading={bootLoading}
              onSelectBook={handleSelectBook}
              onDownloadBook={handleDownloadBook}
            />
          </div>

          {/* 3D Bookshelf 2: Most Downloaded Books */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
            <Bookshelf3D
              id="popular-books"
              title="الكتب الأكثر تحميلاً"
              subtitle="الأعمال المعرفية الأكثر طلباً وقراءة من زوار المكتبة"
              books={mostDownloadedBooks}
              loading={bootLoading}
              onSelectBook={handleSelectBook}
              onDownloadBook={handleDownloadBook}
            />
          </div>

          {/* Full Search, Filtering & Paginated 3D Library Catalog */}
          <SearchCatalogSection
            categories={categories}
            books={catalogBooks}
            total={catalogTotal}
            page={catalogPage}
            totalPages={catalogTotalPages}
            loading={catalogLoading}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCatalogPage(1);
            }}
            onCategoryChange={(slug) => {
              setSelectedCategory(slug);
              setCatalogPage(1);
            }}
            onSortChange={(s) => {
              setSortBy(s);
              setCatalogPage(1);
            }}
            onPageChange={setCatalogPage}
            onSelectBook={handleSelectBook}
            onDownloadBook={handleDownloadBook}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSortBy('latest');
              setCatalogPage(1);
            }}
          />
        </main>
      )}

      <Footer settings={settings} onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LibraryAppShell />
    </AuthProvider>
  );
}
