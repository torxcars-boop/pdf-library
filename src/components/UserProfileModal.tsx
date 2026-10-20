import React, { useState } from 'react';
import { User, BookmarkItem } from '../types';
import { 
  X, 
  User as UserIcon, 
  Bookmark, 
  BookOpen, 
  FileText, 
  Image, 
  Video, 
  Trash2, 
  ExternalLink,
  Edit2,
  Check,
  Calendar,
  Sparkles
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  token: string;
  onUpdateUser: (updatedUser: User) => void;
  onRemoveBookmark: (item: BookmarkItem) => void;
  onOpenItem: (item: BookmarkItem) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  token,
  onUpdateUser,
  onRemoveBookmark,
  onOpenItem,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'settings'>('bookmarks');
  const [filterType, setFilterType] = useState<string>('all');

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [stage, setStage] = useState(user.academicStage || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const bookmarks = user.bookmarks || [];
  const filteredBookmarks = filterType === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.type === filterType);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          academicStage: stage,
          password: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');

      onUpdateUser(data.user);
      setIsEditing(false);
      setMessage('تم تحديث البيانات بنجاح!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'book': return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'article': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'summary': return <Image className="w-4 h-4 text-blue-400" />;
      case 'video': return <Video className="w-4 h-4 text-rose-400" />;
      default: return <Bookmark className="w-4 h-4 text-amber-400" />;
    }
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'book': return 'كتاب / منهج';
      case 'article': return 'مقال علمي';
      case 'summary': return 'ملخص بصري';
      case 'video': return 'شرح فيديو';
      default: return 'عنصر';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6 mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-lg flex-shrink-0">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-amber-200">{user.name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {user.role === 'moderator' ? 'مشرف المنصة' : 'طالب مسجل'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
              <span className="bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                🎓 {user.academicStage || 'غير محدد'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                انضم في: {new Date(user.createdAt).toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs: Bookmarks vs Settings */}
        <div className="flex gap-2 border-b border-zinc-800 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'bookmarks' 
                ? 'bg-amber-500 text-zinc-950 shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>المفضلة والمحفوظات ({bookmarks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'bg-amber-500 text-zinc-950 shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>إعدادات الحساب</span>
          </button>
        </div>

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' ? (
          <div className="flex-1 overflow-y-auto pr-1">
            {/* Filter tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'book', label: 'الكتب والمناهج' },
                { id: 'article', label: 'المقالات' },
                { id: 'summary', label: 'الملخصات البصرية' },
                { id: 'video', label: 'مقاطع الفيديو' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    filterType === f.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Bookmark className="w-10 h-10 mx-auto text-zinc-600 mb-2 stroke-[1.5]" />
                <p className="text-sm">لا توجد عناصر محفوظة في هذه القائمة حالياً.</p>
                <p className="text-xs text-zinc-600 mt-1">انقر على أيقونة النجمة ⭐ على أي كتاب أو مقال لإضافته إلى مفضلتك.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredBookmarks.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/30 transition group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex-shrink-0">
                        {getIconForType(item.type)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] text-amber-400 font-semibold block">
                          {getLabelForType(item.type)}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-300 transition">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                      <button
                        onClick={() => onOpenItem(item)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-400 text-xs font-bold border border-zinc-700 transition flex items-center gap-1"
                      >
                        <span>فتح</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemoveBookmark(item)}
                        className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition"
                        title="إزالة من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SETTINGS TAB */
          <form onSubmit={handleSaveProfile} className="space-y-4 flex-1 overflow-y-auto pr-1">
            {message && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                {message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">المرحلة الدراسية</label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="مثال: الصف الثالث الثانوي، كلية الهندسة..."
                className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">تغيير كلمة المرور (اختياري)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="اتركها فارغة إذا لم ترغب في التغيير"
                className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
