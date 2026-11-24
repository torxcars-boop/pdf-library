import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { BookDTO, SiteSettingsDTO } from '../types/library';
import { formatNumberAr } from '../utils/formatters';

interface HeroSectionProps {
  settings: SiteSettingsDTO;
  featuredBooks: BookDTO[];
  stats: {
    totalBooks: number;
    totalCategories: number;
    totalDownloads: number;
  };
  onBrowseLibrary: () => void;
  onExploreCategories: () => void;
  onSelectBook: (book: BookDTO) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  featuredBooks,
  stats,
  onBrowseLibrary,
  onExploreCategories,
  onSelectBook,
}) => {
  const showcaseBooks = featuredBooks.slice(0, 3);

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-[#E8B94F]/20 bg-[#06152F]"
    >
      {/* Royal Library Atmospheric Backdrop */}
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src="/src/assets/images/hero_library_backdrop_1795538777740.jpg"
          alt=""
          className="h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#06152F] via-[#06152F]/85 to-[#06152F]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06152F] via-transparent to-[#06152F]/50" />
        {/* Warm Gold Ambient Glow */}
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#E8B94F]/12 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Right Column (RTL Primary Content) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            <div className="inline-flex items-center gap-3 text-[#FFD778]">
              <span className="h-px w-8 bg-[#E8B94F]/60" />
              <BookOpen className="h-5 w-5 text-[#E8B94F]" />
              <span className="h-px w-8 bg-[#E8B94F]/60" />
            </div>

            <div className="space-y-3">
              <h1
                className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
                style={{ textWrap: 'balance' }}
              >
                {settings.siteNameAr}
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-[#FFD778]">
                {settings.siteSubtitleAr}
              </p>
            </div>

            <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-200">
              {settings.siteDescriptionAr}
            </p>

            {/* Clean Unboxed Feature Highlights */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#E8B94F]" />
                <span>كتب متنوعة عالية الجودة</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#E8B94F]" />
                <span>قراءة فورية وتحميل سريع PDF</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#E8B94F]" />
                <span>أرفف ثلاثية الأبعاد فاخرة</span>
              </span>
            </div>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onBrowseLibrary}
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-l from-[#E8B94F] to-[#FFD778] px-7 py-3.5 text-base font-bold text-[#06152F] shadow-[0_10px_28px_rgba(232,185,79,0.35)] hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <span>تصفح المكتبة</span>
                <ArrowLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onExploreCategories}
                className="inline-flex items-center gap-2 rounded-full border border-[#E8B94F]/45 bg-[#10274A]/70 px-6 py-3.5 text-base font-semibold text-[#FFD778] backdrop-blur-sm hover:border-[#E8B94F] hover:bg-[#10274A] transition-colors whitespace-nowrap"
              >
                <span>استكشف الأقسام</span>
              </button>
            </div>

            {/* Live Database Stats Strip */}
            <div className="grid grid-cols-3 gap-4 border-t border-[#E8B94F]/20 pt-6 max-w-lg">
              <div>
                <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#FFD778]">
                  {formatNumberAr(stats.totalBooks)}+
                </div>
                <div className="text-xs sm:text-sm text-slate-300">كتاب متاح</div>
              </div>
              <div>
                <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#FFD778]">
                  {formatNumberAr(stats.totalCategories)}
                </div>
                <div className="text-xs sm:text-sm text-slate-300">أقسام معرفية</div>
              </div>
              <div>
                <div className="font-mono-num text-2xl sm:text-3xl font-bold text-[#FFD778]">
                  {formatNumberAr(stats.totalDownloads)}
                </div>
                <div className="text-xs sm:text-sm text-slate-300">عملية تحميل</div>
              </div>
            </div>
          </div>

          {/* Left Column: 3D Featured Books & PDF Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-md rounded-2xl border border-[#E8B94F]/30 bg-[#10274A]/55 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.75)] backdrop-blur-md">
              {/* Top Showcase Header */}
              <div className="mb-5 flex items-center justify-between border-b border-[#E8B94F]/20 pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FFD778]">
                  <Sparkles className="h-4 w-4 text-[#E8B94F]" />
                  <span>إصدارات مختارة للقراءة الفورية</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-mono-num text-rose-300">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </span>
              </div>

              {/* 3D Interactive Book Stack */}
              <div className="flex items-end justify-center gap-3 sm:gap-4 py-4">
                {showcaseBooks.map((book, idx) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => onSelectBook(book)}
                    className={`group relative overflow-hidden rounded-md border border-[#E8B94F]/50 bg-[#06152F] shadow-[0_18px_30px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-3 hover:border-[#FFD778] ${
                      idx === 1
                        ? 'z-20 h-56 w-36 sm:h-64 sm:w-40 scale-105'
                        : 'z-10 h-48 w-32 sm:h-52 sm:w-32 opacity-90 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={book.coverUrl}
                      alt={book.titleAr}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/70" />
                    <div className="absolute inset-x-2 top-2.5 text-center">
                      <span className="font-display text-xs sm:text-sm font-bold text-white drop-shadow line-clamp-2">
                        {book.titleAr}
                      </span>
                    </div>
                    <div className="absolute inset-x-2 bottom-2 text-center">
                      <span className="text-[10px] font-semibold text-[#FFD778]">
                        افتح الكتاب
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#E8B94F]/20 pt-3 text-xs text-slate-300">
                <span>انقر على أي كتاب لفتحه مباشرة</span>
                <span className="text-[#FFD778] font-semibold">جودة عالية</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
