import React, { useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookDTO } from '../types/library';
import { Book3DCard } from './Book3DCard';

interface Bookshelf3DProps {
  id?: string;
  title: string;
  subtitle?: string;
  books: BookDTO[];
  loading?: boolean;
  onSelectBook: (book: BookDTO) => void;
  onDownloadBook: (book: BookDTO) => void;
  emptyMessage?: string;
}

export const Bookshelf3D: React.FC<Bookshelf3DProps> = ({
  id,
  title,
  subtitle,
  books,
  loading = false,
  onSelectBook,
  onDownloadBook,
  emptyMessage = 'لا توجد كتب متاحة على هذا الرف حالياً.',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollShelf = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = 320;
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  return (
    <section id={id} className="relative py-6">
      {/* Section Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#E8B94F]" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
          )}
        </div>

        {/* Shelf Navigation Arrows */}
        {books.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollShelf('right')}
              aria-label="التمرير لليمين"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8B94F]/45 bg-[#10274A] text-[#FFD778] shadow-lg hover:bg-[#E8B94F] hover:text-[#06152F] transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollShelf('left')}
              aria-label="التمرير لليسار"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8B94F]/45 bg-[#10274A] text-[#FFD778] shadow-lg hover:bg-[#E8B94F] hover:text-[#06152F] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Physical Library Alcove Cabinet */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8B94F]/25 bg-gradient-to-b from-[#1e120a] via-[#150c06] to-[#0d0704] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
        {/* Warm Overhead Golden Spotlight Lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(255,215,120,0.22)_0%,rgba(232,185,79,0.06)_50%,transparent_80%)]"
        />

        {/* Subtle Wooden Backboard Vertical Paneling */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 2px, transparent 2px, transparent 140px)',
          }}
        />

        {/* Books Row */}
        <div className="relative z-10 px-4 pt-8 pb-5 sm:px-8">
          {loading ? (
            <div className="flex gap-6 overflow-hidden pb-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-64 w-44 shrink-0 animate-pulse rounded-md border border-[#E8B94F]/15 bg-[#10274A]/50"
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-[#E8B94F]/60" />
              <p className="text-base font-medium text-slate-300">{emptyMessage}</p>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="shelf-scroll flex items-end gap-6 sm:gap-8 overflow-x-auto pb-8 pt-2 px-2"
            >
              {books.map((book) => (
                <Book3DCard
                  key={book.id}
                  book={book}
                  onSelectBook={onSelectBook}
                  onDownloadBook={onDownloadBook}
                />
              ))}
            </div>
          )}
        </div>

        {/* Realistic Beveled Wooden & Gold-Accented Shelf Plank */}
        <div aria-hidden="true" className="relative z-20">
          {/* Top Wood Surface */}
          <div className="h-4 bg-gradient-to-b from-[#6e4223] via-[#532f17] to-[#3a1f0e] border-t border-[#d49a5a]/30" />
          {/* Front Beveled Gold-Trimmed Edge */}
          <div className="h-3.5 bg-gradient-to-b from-[#442511] to-[#241207] border-t border-[#E8B94F]/45 shadow-[0_10px_25px_rgba(0,0,0,0.9)]" />
        </div>
      </div>
    </section>
  );
};
