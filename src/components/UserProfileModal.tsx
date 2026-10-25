import React, { useState, useRef } from 'react';
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
  Sparkles,
  Camera,
  Upload,
  RefreshCw
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

const PRESET_AVATARS = [
  { label: 'طالب متفوق', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
  { label: 'طالبة متفوقة', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { label: 'شاب مهندس', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80' },
  { label: 'طبيبة المستقبل', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80' },
  { label: 'روبوت ذكي', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=scholar' },
  { label: 'باحث علمي', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
];

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
  const [name, setName] = useState(user.name);
  const [stage, setStage] = useState(user.academicStage || 'الصف الثالث الثانوي');
  const [avatar, setAvatar] = useState(user.avatar || PRESET_AVATARS[0].url);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const bookmarks = user.bookmarks || [];
  const filteredBookmarks = filterType === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.type === filterType);

  // Handle local device image file upload with client-side canvas compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }

    // Max 10MB file
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Resize to max 300x300 for optimal local/session storage speed
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressedDataUrl);
          setMessage('تم تحميل الصورة بنجاح! اضغط "حفظ التعديلات" لتثبيتها في حسابك.');
          setTimeout(() => setMessage(null), 4000);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
          name: name.trim(),
          academicStage: stage.trim(),
          avatar: avatar.trim(),
          password: newPassword || undefined,
        }),
      });
      const data = await res.json();
      
      const updatedUser: User = data.user || {
        ...user,
        name: name.trim(),
        academicStage: stage.trim(),
        avatar: avatar.trim(),
      };

      // Persist locally for instant seamless session maintenance
      localStorage.setItem('arm_current_user', JSON.stringify(updatedUser));
      onUpdateUser(updatedUser);
      setMessage('تم حفظ الصورة والبيانات بنجاح ومزامنتها مع حسابك! ✨');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      // Offline fallback: save locally
      const updatedUser: User = {
        ...user,
        name: name.trim(),
        academicStage: stage.trim(),
        avatar: avatar.trim(),
      };
      localStorage.setItem('arm_current_user', JSON.stringify(updatedUser));
      onUpdateUser(updatedUser);
      setMessage('تم حفظ الصورة والبيانات محلياً بنجاح!');
      setTimeout(() => setMessage(null), 3000);
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
        {/* Hidden File Input for Device Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6 mb-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-lg flex-shrink-0 bg-zinc-800">
              <img 
                src={avatar || user.avatar} 
                alt={user.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            {/* Quick Upload Hover Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-amber-300 text-[10px] font-bold"
              title="تغيير الصورة من جهازك"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              <span>تغيير</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-amber-200">{name || user.name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {user.role === 'moderator' || user.role === 'admin' ? 'مشرف المنصة' : 'طالب مسجل'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
              <span className="bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                🎓 {stage || user.academicStage || 'الصف الثالث الثانوي'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                انضم في: {new Date(user.createdAt || Date.now()).toLocaleDateString('ar-EG')}
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
            <span>الصورة والبيانات الشخصية</span>
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
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}

            {/* Profile Avatar Selection & Device Upload */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <label className="block text-xs font-bold text-zinc-200 mb-2">
                صورة الملف الشخصي للطالب:
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-md flex-shrink-0 bg-zinc-900">
                  <img src={avatar} alt="المعاينة" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-right">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-zinc-950 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>تحميل صورة من ملفات جهازك (كمبيوتر / هاتف)</span>
                  </button>
                  <p className="text-[11px] text-zinc-400">
                    يمكنك اختيار أي صورة شخصية خاصة بك من هاتفك أو جهازك، ويتم ضغطها وتثبيتها فوراً.
                  </p>
                </div>
              </div>

              {/* Quick Preset Avatars */}
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <span className="text-[11px] text-zinc-400 font-semibold block mb-2">أو اختر من الشخصيات التعليمية الجاهزة:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(p.url)}
                      className={`p-1 rounded-xl border flex flex-col items-center gap-1 transition ${
                        avatar === p.url 
                          ? 'border-amber-400 bg-amber-500/20' 
                          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-[10px] text-zinc-300 truncate w-full text-center">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">الاسم الكامل للطالب</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">المرحلة الدراسية والشعبة</label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="مثال: الصف الثالث الثانوي (علمي علوم / علمي رياضة / أدبي)"
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
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ الصورة والتعديلات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ الصورة والتعديلات في الحساب</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
