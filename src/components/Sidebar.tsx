import React from 'react';
import { 
  Home, 
  BarChart3, 
  BookOpen, 
  GraduationCap, 
  Volume2, 
  FileText, 
  Video as VideoIcon, 
  Image as ImageIcon, 
  Bookmark, 
  ShieldCheck, 
  X, 
  ChevronLeft,
  Flame,
  Download,
  Sparkles,
  LogOut,
  User as UserIcon,
  Zap,
  CreditCard
} from 'lucide-react';
import { User, StudentStats } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  stats: StudentStats;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSubscriptions?: () => void;
  downloadedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
  stats,
  onOpenAdmin,
  onOpenAuth,
  onOpenProfile,
  onOpenSubscriptions,
  downloadedCount
}) => {
  if (!isOpen) return null;

  const navigationItems = [
    { id: 'all', label: 'الرئيسية (كافة المحتويات)', icon: Home, badge: null },
    { id: 'dashboard', label: 'لوحة تحكم وإحصائيات الطالب', icon: BarChart3, badge: 'إحصائياتك' },
    { id: 'pricing', label: 'باقات الاشتراك (تبدأ من 50ج)', icon: Zap, badge: '3 باقات 🔥' },
    { id: 'student-books', label: 'كتب ومناهج الطلاب', icon: BookOpen, badge: '3 إعدادي - 3 ثانوي' },
    { id: 'exams', label: 'بنك الامتحانات والاختبارات', icon: GraduationCap, badge: `${stats.totalExamsTaken} منجز` },
    { id: 'english-ai', label: 'معلم نطق الإنجليزية بالذكاء الاصطناعي', icon: Volume2, badge: 'AI جديد ✨' },
    { id: 'summaries', label: 'ملخصات وخرائط ذهنية', icon: ImageIcon, badge: null },
    { id: 'videos', label: 'شروحات وفيديوهات تفاعلية', icon: VideoIcon, badge: null },
    { id: 'articles', label: 'المقالات والنصائح الدراسية', icon: FileText, badge: null },
    { id: 'bookmarks', label: 'محفوظاتي والكتب المحملة', icon: Bookmark, badge: downloadedCount > 0 ? `${downloadedCount} كتاب` : null },
  ];

  const handleNavClick = (tabId: string) => {
    if (tabId === 'pricing' && onOpenSubscriptions) {
      onOpenSubscriptions();
      onClose();
      return;
    }
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Dark backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar drawer content (Right-to-Left slide) */}
      <aside 
        className="relative z-10 w-80 max-w-[85vw] bg-zinc-950 border-l border-zinc-800 p-5 flex flex-col justify-between shadow-2xl h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20">
                ARM
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-100">المكتبة الرقمية الفاخرة</h2>
                <p className="text-[10px] text-amber-400 font-semibold">منصة المناهج والامتحانات الذكية</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Student Status Summary Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 to-zinc-900 border border-amber-500/30 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎓</span>
                <span className="text-xs font-bold text-zinc-200 truncate">
                  {currentUser ? currentUser.name : 'طالب المنصة'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {currentUser?.academicStage || 'الثانوية'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-zinc-800/80 text-center">
              <div>
                <span className="text-xs font-black text-amber-400">{downloadedCount}</span>
                <span className="text-[9px] text-zinc-400 block">تحميلات</span>
              </div>
              <div>
                <span className="text-xs font-black text-emerald-400">{stats.averageScore}%</span>
                <span className="text-[9px] text-zinc-400 block">المعدل</span>
              </div>
              <div>
                <span className="text-xs font-black text-orange-400">{stats.streakDays} أيام 🔥</span>
                <span className="text-[9px] text-zinc-400 block">الالتزام</span>
              </div>
            </div>
          </div>

          {/* Navigation Links List */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-amber-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      isActive
                        ? 'bg-zinc-950/20 text-zinc-950'
                        : 'bg-zinc-900 text-amber-400 border border-zinc-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Admin Portal & User Actions */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-2 mt-6">
          <button
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>لوحة الإدارة والأمان</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition" />
          </button>

          {currentUser ? (
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 text-xs font-semibold flex items-center gap-2 transition"
            >
              <UserIcon className="w-4 h-4 text-zinc-400" />
              <span>ملفي الشخصي ({currentUser.name})</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/20 flex items-center justify-center gap-2 transition"
            >
              <span>تسجيل الدخول / إنشاء حساب جديد</span>
            </button>
          )}

          <p className="text-[10px] text-zinc-500 text-center pt-2">
            جميع الحقوق محفوظة © 2026 | ARM Platform
          </p>
        </div>
      </aside>
    </div>
  );
};
