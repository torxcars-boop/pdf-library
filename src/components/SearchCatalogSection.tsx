import React from 'react';
import {
  ArrowDownWideNarrow,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
} from 'lucide-react';
import { BookDTO, CategoryDTO } from '../types/library';
import { formatNumberAr } from '../utils/formatters';
import { Book3DCard } from './Book3DCard';

interface SearchCatalogSectionProps {
  categories: CategoryDTO[];
  books: BookDTO[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'latest' | 'popular' | 'alphabetical';
  onSearchChange: (q: string) => void;
  onCategoryChange: (slug: string) => void;
  onSortChange: (sort: 'latest' | 'popular' | 'alphabetical') => void;
  onPageChange: (page: number) => void;
  onSelectBook: (book: BookDTO) => void;
  onDownloadBook: (book: BookDTO) => void;
  onResetFilters: () => void;
}

export const SearchCatalogSection: React.FC<SearchCatalogSectionProps> = ({
  categories,
  books,
  total,
  page,
  totalPages,
  loading,
  searchQuery,
  selectedCategory,
  sortBy,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onPageChange,
  onSelectBook,
  onDownloadBook,
  onResetFilters,
}) => {
  const hasFilters = Boolean(searchQuery.trim() || selectedCategory !== 'all');

  return (
    <section
      id="library-catalog"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      {/* Search & Filter Control Panel */}
      <div className="rounded-2xl border border-[#E8B94F]/25 bg-[#10274A]/45 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              فهرس المكتبة والبحث المتقدم
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              ابحث بعنوان الكتاب أو اسم المؤلف أو الكلمات المفتاحية وصفّ النتائج حسب القسم
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72 sm:flex-initial">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8B94F]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث بالعنوان، المؤلف، الموضوع..."
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2">
              <ArrowDownWideNarrow className="h-4 w-4 text-[#E8B94F]" />
              <select
                value={sortBy}
                onChange={(e) =>
                  onSortChange(
                    e.target.value as 'latest' | 'popular' | 'alphabetical'
                  )
                }
                aria-label="ترتيب النتائج"
                className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
              >
                <option value="latest" className="bg-[#06152F]">
                  الأحدث نشراً
                </option>
                <option value="popular" className="bg-[#06152F]">
                  الأكثر تحميلاً
                </option>
                <option value="alphabetical" className="bg-[#06152F]">
                  الترتيب الأبجدي
                </option>
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8B94F]/35 bg-[#06152F] px-3.5 py-2.5 text-xs font-semibold text-[#FFD778] hover:bg-[#10274A]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة تعيين</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Category Filter Bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 shelf-scroll">
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className={`shrink-0 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#E8B94F] text-[#06152F]'
                : 'bg-[#06152F]/70 text-slate-200 hover:text-[#FFD778]'
            }`}
          >
            جميع الأقسام
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.slug)}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? 'bg-[#E8B94F] text-[#06152F]'
                  : 'bg-[#06152F]/70 text-slate-200 hover:text-[#FFD778]'
              }`}
            >
              {cat.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mt-6 mb-4 flex items-center justify-between text-sm text-slate-300 px-1">
        <span>
          إجمالي النتائج:{' '}
          <strong className="font-mono-num text-[#FFD778]">
            {formatNumberAr(total)}
          </strong>{' '}
          كتاب
        </span>
        {totalPages > 1 && (
          <span className="font-mono-num text-xs">
            صفحة {page} من {totalPages}
          </span>
        )}
      </div>

      {/* 3D Bookshelf Grid Cabinet */}
      <div className="rounded-2xl border border-[#E8B94F]/25 bg-gradient-to-b from-[#1b1008] via-[#130b05] to-[#0b0603] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
        {loading ? (
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-64 w-44 animate-pulse rounded-md bg-[#10274A]/50"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <BookOpen className="mx-auto h-12 w-12 text-[#E8B94F]/60" />
            <h3 className="font-display text-xl font-bold text-white">
              لم يتم العثور على كتب مطابقة
            </h3>
            <p className="text-sm text-slate-300">
              جرب البحث بكلمات مختلفة أو تصفح جميع الأقسام المتاحة
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E8B94F] px-5 py-2 text-xs font-bold text-[#06152F]"
            >
              عرض جميع الكتب
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-y-12 gap-x-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-items-center">
            {books.map((book) => (
              <div key={book.id} className="flex flex-col items-center w-full">
                <Book3DCard
                  book={book}
                  onSelectBook={onSelectBook}
                  onDownloadBook={onDownloadBook}
                />
                {/* Individual Wooden Shelf Ledge on Multi-Row Grid */}
                <div
                  aria-hidden="true"
                  className="mt-2 h-2.5 w-full max-w-[220px] rounded-full bg-gradient-to-b from-[#6e4223] to-[#2c1709] border-t border-[#E8B94F]/40 shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-[#E8B94F]/20 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E8B94F]/35 bg-[#06152F] px-3 py-2 text-xs font-semibold text-[#FFD778] disabled:opacity-40 hover:bg-[#10274A]"
            >
              <ChevronRight className="h-4 w-4" />
              <span>السابق</span>
            </button>

            <span className="font-mono-num px-3 text-sm text-white">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E8B94F]/35 bg-[#06152F] px-3 py-2 text-xs font-semibold text-[#FFD778] disabled:opacity-40 hover:bg-[#10274A]"
            >
              <span>التالي</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
