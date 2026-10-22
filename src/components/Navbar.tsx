import React, { useState } from 'react';
import { User } from '../types';
import { 
  Crown, 
  Search, 
  ShieldCheck, 
  User as UserIcon, 
  Bookmark, 
  LogOut, 
  Sparkles,
  BookOpen,
  FileText,
  Image,
  Video,
  Grid,
  Menu,
  GraduationCap,
  BarChart3,
  Volume2,
  Zap
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  bookmarksCount: number;
  onToggleSidebar?: () => void;
  onOpenSubscriptions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdmin,
  onLogout,
  searchTerm,
  onSearchChange,
  activeTab,
  onSelectTab,
  bookmarksCount,
  onToggleSidebar,
  onOpenSubscriptions,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="bg-zinc-950/85 backdrop-blur-xl sticky top-0 z-40 border-b border-amber-500/20 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo & Title & Sidebar Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-500/40 transition shadow-md group"
                title="فتح القائمة الجانبية للتنقل السريع"
              >
                <Menu className="w-5 h-5 group-hover:scale-110 transition" />
              </button>
            )}

            <div 
              onClick={() => onSelectTab('all')} 
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
                <Crown className="w-5 h-5 stroke-[2.2] text-zinc-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                    المكتبة الرقمية الفاخرة
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hidden sm:inline-block">
                    ARM PRO
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium hidden sm:block">
                  منصة المناهج الدراسية، الكتب، المقالات والملخصات الذكية
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Auth shortcut */}
          <div className="flex md:hidden items-center gap-2">
            {user ? (
              <button
                onClick={onOpenProfile}
                className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40"
              >
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold"
              >
                دخول
              </button>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl mx-auto w-full">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن مناهج دراسية، كتب، مقالات، خرائط ذهنية، أو فيديوهات..."
              className="w-full py-2.5 pr-11 pl-10 text-xs sm:text-sm bg-zinc-900/90 border border-zinc-800 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-zinc-100 placeholder:text-zinc-500 shadow-inner transition"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls: User Auth, Bookmarks, and Admin Portal */}
        <div className="hidden md:flex items-center gap-3">
          {/* Student Dashboard Quick Button */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition border ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-extrabold shadow-md'
                : 'bg-zinc-900 text-amber-300 border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-850'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>لوحة الطالب 📊</span>
          </button>

          {/* Subscription Plans Quick Button */}
          <button
            onClick={onOpenSubscriptions || (() => onSelectTab('pricing'))}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-md"
            title="باقات الاشتراك تبدأ من 50 ج.م لـ 2 امتحان أسبوعياً"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>باقات الاشتراك (50ج) ⚡</span>
          </button>

          {/* Admin Portal Quick Button */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/30 hover:border-amber-500 text-xs font-bold transition shadow-md"
            title="بوابة إدارة المحتوى والأمان"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">الأدمن 🛡️</span>
          </button>

          {/* User Section */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition group"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/30">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-200 group-hover:text-amber-400 transition flex items-center gap-1">
                    <span>{user.name}</span>
                    {user.role === 'moderator' && <span className="text-[9px] text-amber-400 bg-amber-500/20 px-1 rounded">مشرف</span>}
                  </div>
                  <div className="text-[10px] text-zinc-400">{user.academicStage || 'طالب مسجل'}</div>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div 
                  className="absolute left-0 mt-2 w-56 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                    <p className="text-xs font-bold text-zinc-200">{user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSelectTab('dashboard');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800 hover:text-amber-400 transition"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                      لوحة إحصائياتي
                    </span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (onOpenSubscriptions) onOpenSubscriptions();
                      else onSelectTab('pricing');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-amber-300 hover:bg-zinc-800 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      باقات الاشتراك (50ج - 200ج)
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                      {user.subscription?.status === 'active' ? user.subscription.planName.split(' ')[0] : 'جديد'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800 hover:text-amber-400 transition"
                  >
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5" />
                      الملف الشخصي وحسابي
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSelectTab('bookmarks');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800 hover:text-amber-400 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      مفضلتي ومحفوظاتي
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded-full">
                      {bookmarksCount}
                    </span>
                  </button>

                  <div className="border-t border-zinc-800 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-2xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <UserIcon className="w-4 h-4" />
              <span>تسجيل الدخول / حساب جديد</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
