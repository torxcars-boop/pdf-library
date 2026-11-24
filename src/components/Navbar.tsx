import React, { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { SiteSettingsDTO } from '../types/library';

interface NavbarProps {
  settings: SiteSettingsDTO;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  onNavigate: (path: string, sectionId?: string) => void;
  currentPath: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onNavigate,
  currentPath,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'الرئيسية', path: '/', section: 'hero' },
    { label: 'الأقسام', path: '/', section: 'categories' },
    { label: 'أحدث الكتب', path: '/', section: 'latest-books' },
    { label: 'الأكثر تحميلاً', path: '/', section: 'popular-books' },
    { label: 'حول الموقع', path: '/', section: 'about-us' },
    { label: 'اتصل بنا', path: '/', section: 'contact-us' },
  ];

  const handleNavClick = (path: string, section?: string) => {
    setMobileOpen(false);
    onNavigate(path, section);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    onSearchSubmit(searchQuery);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8B94F]/20 bg-[#06152F]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Identity */}
        <button
          type="button"
          onClick={() => handleNavClick('/', 'hero')}
          className="flex items-center gap-3 text-right shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B94F] rounded-lg"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#E8B94F]/70 shadow-[0_0_16px_rgba(232,185,79,0.28)] transition-transform duration-200 group-hover:scale-105">
            <img
              src={settings.logoUrl || '/assets/aistudio/photo_6012469020994506717_c_09eff44c.jpg'}
              alt={settings.siteNameAr}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold tracking-wide text-white whitespace-nowrap shrink-0">
            {settings.siteNameAr}
          </span>
        </button>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-200">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavClick(item.path, item.section)}
              className={`whitespace-nowrap shrink-0 px-2 py-1.5 transition-colors duration-200 hover:text-[#FFD778] border-b-2 ${
                currentPath === '/' && item.section === 'hero'
                  ? 'border-[#E8B94F] text-[#FFD778]'
                  : 'border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Search Bar & Mobile Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <form onSubmit={handleSubmit} className="hidden md:flex items-center relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن كتاب أو مؤلف..."
              aria-label="ابحث عن كتاب أو مؤلف"
              className="w-56 lg:w-64 rounded-full border border-[#E8B94F]/30 bg-[#10274A]/80 py-2 pr-4 pl-10 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none focus:ring-1 focus:ring-[#E8B94F]/50 transition-all"
            />
            <button
              type="submit"
              aria-label="بحث"
              className="absolute left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#E8B94F] text-[#06152F] hover:bg-[#FFD778] transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="القائمة"
            className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8B94F]/30 bg-[#10274A] text-[#FFD778] hover:bg-[#10274A]/80"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[#E8B94F]/20 bg-[#06152F] px-4 py-4 space-y-4">
          <form onSubmit={handleSubmit} className="flex items-center relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن كتاب، مؤلف، أو موضوع..."
              className="w-full rounded-full border border-[#E8B94F]/30 bg-[#10274A] py-2.5 pr-4 pl-11 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
            />
            <button
              type="submit"
              aria-label="تنفيذ البحث"
              className="absolute left-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8B94F] text-[#06152F]"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.path, item.section)}
                className="rounded-lg border border-[#E8B94F]/15 bg-[#10274A]/60 px-3 py-2.5 text-right text-sm font-medium text-slate-100 hover:border-[#E8B94F]/50 hover:text-[#FFD778]"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
