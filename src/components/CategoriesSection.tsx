import React from 'react';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { CategoryDTO } from '../types/library';
import { formatNumberAr, getCategoryIcon } from '../utils/formatters';

interface CategoriesSectionProps {
  categories: CategoryDTO[];
  selectedCategorySlug: string;
  onSelectCategory: (slug: string) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
}) => {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-2 inline-flex items-center gap-3 text-[#FFD778]">
          <span className="h-px w-10 bg-[#E8B94F]/50" />
          <LayoutGrid className="h-5 w-5 text-[#E8B94F]" />
          <span className="h-px w-10 bg-[#E8B94F]/50" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
          أقسام المكتبة
        </h2>
        <p className="mt-2 max-w-xl text-sm sm:text-base text-slate-300">
          تصفح الكتب الرقمية المصنفة بعناية في شتى فروع المعرفة والعلوم والآداب
        </p>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {categories.map((cat) => {
          const isSelected = selectedCategorySlug === cat.slug;
          return (
            <div
              key={cat.id}
              className={`group flex flex-col items-center justify-between rounded-2xl border p-4 text-center transition-all duration-200 ${
                isSelected
                  ? 'border-[#FFD778] bg-[#10274A] shadow-[0_0_24px_rgba(232,185,79,0.25)]'
                  : 'border-[#E8B94F]/25 bg-[#10274A]/55 hover:border-[#E8B94F]/65 hover:bg-[#10274A]/90'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#E8B94F]/30 bg-[#06152F] text-[#FFD778] transition-transform duration-200 group-hover:scale-105">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.nameAr}
                      referrerPolicy="no-referrer"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    getCategoryIcon(cat.iconName, 'h-6 w-6')
                  )}
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">
                  {cat.nameAr}
                </h3>

                <span className="mt-1 font-mono-num text-xs text-slate-300">
                  {formatNumberAr(cat.bookCount ?? 0)} كتاب
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={`mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#FFD778] text-[#06152F]'
                    : 'bg-gradient-to-l from-[#E8B94F] to-[#FFD778] text-[#06152F] hover:brightness-105'
                }`}
              >
                <span>عرض الكتب</span>
                <ArrowLeft className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
