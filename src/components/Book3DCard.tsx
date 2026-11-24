import React, { useState } from 'react';
import { BookOpen, Download, Eye } from 'lucide-react';
import { BookDTO } from '../types/library';
import { formatNumberAr } from '../utils/formatters';

interface Book3DCardProps {
  book: BookDTO;
  onSelectBook: (book: BookDTO) => void;
  onDownloadBook: (book: BookDTO) => void;
  compact?: boolean;
}

export const Book3DCard: React.FC<Book3DCardProps> = ({
  book,
  onSelectBook,
  onDownloadBook,
  compact = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const widthClass = compact ? 'w-36 sm:w-40' : 'w-44 sm:w-48';
  const heightClass = compact ? 'h-52 sm:h-56' : 'h-64 sm:h-72';

  return (
    <div
      className={`book-stage group relative shrink-0 select-none ${widthClass}`}
      tabIndex={0}
    >
      {/* Realistic 3D Book Volume */}
      <div
        onClick={() => onSelectBook(book)}
        role="button"
        aria-label={`عرض تفاصيل كتاب ${book.titleAr}`}
        className={`book-3d relative ${heightClass} w-full cursor-pointer rounded-r-md rounded-l-[3px] shadow-[0_18px_28px_-8px_rgba(0,0,0,0.85),0_4px_10px_rgba(0,0,0,0.6)] group-hover:shadow-[0_24px_38px_-8px_rgba(232,185,79,0.28),0_12px_24px_rgba(0,0,0,0.9)]`}
        style={{
          backgroundColor: book.spineColor || '#0E3A6E',
        }}
      >
        {/* 3D Left Page Thickness Edge */}
        <div
          aria-hidden="true"
          className="book-pages absolute top-1 bottom-1 left-0 w-4 rounded-l-xs opacity-95"
        />

        {/* 3D Right Leather Spine */}
        <div
          aria-hidden="true"
          className="book-spine absolute top-0 bottom-0 right-0 w-6 rounded-r-sm border-l border-[#E8B94F]/40"
          style={{
            background: `linear-gradient(90deg, ${book.spineColor || '#0E3A6E'} 0%, #050d1c 100%)`,
          }}
        />

        {/* Front Cover Surface */}
        <div className="relative h-full w-full overflow-hidden rounded-r-md rounded-l-[3px] border border-[#E8B94F]/45 bg-[#0B1D3B]">
          {!imgError && book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.titleAr}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
              style={{
                background: `linear-gradient(155deg, ${book.spineColor || '#10274A'} 0%, #06152F 100%)`,
              }}
            >
              <BookOpen className="mb-3 h-10 w-10 text-[#E8B94F]" />
            </div>
          )}

          {/* Spine Crease Highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-black/55 via-white/10 to-transparent"
          />

          {/* Ornate Inner Gold Frame */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded border border-[#E8B94F]/45"
          />

          {/* Top & Bottom Scrim for Crystal-Clear Book Title */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/85"
          />

          {/* Book Title Embossed on Cover */}
          <div className="absolute inset-x-3 top-3.5 text-center">
            <h3 className="font-display text-base sm:text-lg font-bold leading-snug text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] line-clamp-2">
              {book.titleAr}
            </h3>
          </div>

          {/* Subtle Bottom Author / PDF Marker */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-[11px] text-[#FFD778]/95">
            <span className="truncate max-w-[72%] font-medium">
              {book.author || book.categoryNameAr || 'كتاب رقمي'}
            </span>
            <span className="font-mono-num text-[10px] font-semibold tracking-wider text-white/90">
              PDF
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Glassmorphism Hover / Focus Details Card */}
      <div className="pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 absolute -bottom-2 left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl border border-[#E8B94F]/45 bg-[#06152F]/95 p-3.5 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#FFD778]">
            <span className="truncate font-semibold">
              {book.categoryNameAr || 'قسم عام'}
            </span>
            <span className="font-mono-num text-slate-300 shrink-0">
              {formatNumberAr(book.downloadCount)} تحميل
            </span>
          </div>
          <h4 className="font-display text-sm font-bold text-white line-clamp-1">
            {book.titleAr}
          </h4>
          <p className="text-xs leading-relaxed text-slate-300 line-clamp-2">
            {book.descriptionAr}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadBook(book);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#E8B94F] px-2.5 py-1.5 text-xs font-bold text-[#06152F] hover:bg-[#FFD778] transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تحميل</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBook(book);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E8B94F]/40 bg-[#10274A] px-2.5 py-1.5 text-xs font-semibold text-white hover:border-[#E8B94F] hover:text-[#FFD778] transition-colors whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>التفاصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
};
