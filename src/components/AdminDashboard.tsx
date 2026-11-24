import React, { useCallback, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BookPlus,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
import {
  AdminUserDTO,
  BookDTO,
  CategoryDTO,
  SiteSettingsDTO,
} from '../types/library';
import {
  formatBytesAr,
  formatDateAr,
  formatNumberAr,
  getCategoryIcon,
} from '../utils/formatters';

interface AdminDashboardProps {
  onBackToSite: () => void;
  onDataChanged: () => void;
  initialSettings: SiteSettingsDTO;
}

type AdminTab =
  | 'overview'
  | 'book-form'
  | 'books'
  | 'categories'
  | 'downloads'
  | 'settings'
  | 'admins';

interface OverviewData {
  stats: {
    totalBooks: number;
    publishedBooks: number;
    draftBooks: number;
    totalCategories: number;
    totalDownloads: number;
    totalViews: number;
  };
  recentBooks: BookDTO[];
  topBooks: BookDTO[];
  recentDownloadLogs: {
    id: number;
    actionType: string;
    downloadedAt: string;
    bookTitleAr: string;
    bookSlug: string;
  }[];
}

const SPINE_COLORS = [
  '#0E4B35',
  '#0E3A6E',
  '#7A1624',
  '#122E5C',
  '#2F4D27',
  '#3C1B57',
  '#6E3B16',
  '#1E293B',
];

const ICON_OPTIONS = [
  { value: 'BookOpenCheck', label: 'الدين الإسلامي' },
  { value: 'GraduationCap', label: 'التعليم' },
  { value: 'Atom', label: 'العلوم' },
  { value: 'HeartPulse', label: 'الصحة والتغذية' },
  { value: 'Code2', label: 'البرمجة والتقنية' },
  { value: 'Feather', label: 'الأدب' },
  { value: 'Landmark', label: 'التاريخ' },
  { value: 'Users', label: 'العلوم الاجتماعية' },
  { value: 'Sparkles', label: 'أخرى' },
];

function uploadWithProgress(
  file: File,
  fileType: 'pdf' | 'cover' | 'logo',
  headers: Record<string, string>,
  onProgress: (pct: number) => void
): Promise<{ mediaId: number; url: string; sizeBytes: number; originalName: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || 'فشل رفع الملف'));
        }
      } catch {
        reject(new Error('استجابة غير متوقعة من الخادم'));
      }
    };

    xhr.onerror = () => reject(new Error('تعذر الاتصال بالخادم أثناء الرفع'));

    const formData = new FormData();
    formData.append('fileType', fileType);
    formData.append('file', file);
    xhr.send(formData);
  });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToSite,
  onDataChanged,
  initialSettings,
}) => {
  const {
    admin,
    loading: authLoading,
    authError,
    clearError,
    loginWithPassword,
    setupFirstAdmin,
    logout,
    getAuthHeaders,
  } = useAuth();

  // Login screen state
  const [hasPasswordAdmin, setHasPasswordAdmin] = useState<boolean>(true);
  const [loginMode, setLoginMode] = useState<'login' | 'setup'>('login');
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [adminBooks, setAdminBooks] = useState<BookDTO[]>([]);
  const [adminCategories, setAdminCategories] = useState<CategoryDTO[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserDTO[]>([]);
  const [settingsForm, setSettingsForm] = useState<SiteSettingsDTO>(initialSettings);

  // Filters in Books tab
  const [bookSearch, setBookSearch] = useState('');
  const [bookStatusFilter, setBookStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [bookCatFilter, setBookCatFilter] = useState<number>(0);

  // Book Form state
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [bookTitleAr, setBookTitleAr] = useState('');
  const [bookTitleEn, setBookTitleEn] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookKeywords, setBookKeywords] = useState('');
  const [bookCategoryId, setBookCategoryId] = useState<number>(0);
  const [bookCoverUrl, setBookCoverUrl] = useState(
    '/src/assets/images/cover_islamic_tafsir_1795538778818.jpg'
  );
  const [bookCoverMediaId, setBookCoverMediaId] = useState<number | null>(null);
  const [bookPdfMediaId, setBookPdfMediaId] = useState<number | null>(null);
  const [bookPdfName, setBookPdfName] = useState<string>('');
  const [bookFileSize, setBookFileSize] = useState<number>(0);
  const [bookPageCount, setBookPageCount] = useState<number>(140);
  const [bookSpineColor, setBookSpineColor] = useState('#0E3A6E');
  const [bookFeatured, setBookFeatured] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [savingBook, setSavingBook] = useState(false);

  // Category Form state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catDescAr, setCatDescAr] = useState('');
  const [catIcon, setCatIcon] = useState('BookOpenCheck');
  const [catSortOrder, setCatSortOrder] = useState(1);
  const [catImageUrl, setCatImageUrl] = useState('');

  // Single admin password update state
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  useEffect(() => {
    setSettingsForm(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setHasPasswordAdmin(Boolean(d.hasPasswordAdmin));
        if (!d.hasPasswordAdmin) {
          setLoginMode('setup');
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchAdminData = useCallback(async () => {
    if (!admin) return;
    const headers = getAuthHeaders();

    try {
      const [ovRes, booksRes, catsRes, adminsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/books', { headers }),
        fetch('/api/admin/categories', { headers }),
        fetch('/api/admin/administrators', { headers }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (booksRes.ok) {
        const bData = await booksRes.json();
        setAdminBooks(bData.items || []);
      }
      if (catsRes.ok) {
        const cData = await catsRes.json();
        const list: CategoryDTO[] = cData.items || [];
        setAdminCategories(list);
        if (list.length > 0 && bookCategoryId === 0) {
          setBookCategoryId(list[0].id);
        }
      }
      if (adminsRes.ok) {
        const aData = await adminsRes.json();
        setAdminUsers(aData.items || []);
      }
    } catch {
      showToast('error', 'تعذر تحديث بيانات لوحة الإدارة');
    }
  }, [admin, getAuthHeaders, bookCategoryId]);

  useEffect(() => {
    if (admin) {
      fetchAdminData();
    }
  }, [admin, fetchAdminData]);

  const resetBookForm = () => {
    setEditingBookId(null);
    setBookTitleAr('');
    setBookTitleEn('');
    setBookDesc('');
    setBookAuthor('');
    setBookKeywords('');
    setBookCategoryId(adminCategories[0]?.id ?? 0);
    setBookCoverUrl('/src/assets/images/cover_islamic_tafsir_1795538778818.jpg');
    setBookCoverMediaId(null);
    setBookPdfMediaId(null);
    setBookPdfName('');
    setBookFileSize(0);
    setBookPageCount(140);
    setBookSpineColor('#0E3A6E');
    setBookFeatured(false);
    setPdfProgress(null);
    setCoverProgress(null);
  };

  const startEditBook = (b: BookDTO) => {
    setEditingBookId(b.id);
    setBookTitleAr(b.titleAr);
    setBookTitleEn(b.titleEn || '');
    setBookDesc(b.descriptionAr);
    setBookAuthor(b.author || '');
    setBookKeywords(b.keywords || '');
    setBookCategoryId(b.categoryId || adminCategories[0]?.id || 0);
    setBookCoverUrl(b.coverUrl);
    setBookCoverMediaId(b.coverMediaId);
    setBookPdfMediaId(b.pdfMediaId);
    setBookPdfName(b.pdfMediaId ? 'ملف PDF مرفق ومحفوظ' : '');
    setBookFileSize(b.fileSizeBytes);
    setBookPageCount(b.pageCount);
    setBookSpineColor(b.spineColor);
    setBookFeatured(b.isFeatured);
    setActiveTab('book-form');
  };

  const isUploadingMedia =
    (pdfProgress !== null && pdfProgress < 100) ||
    (coverProgress !== null && coverProgress < 100);

  const handlePdfUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('error', 'يرجى اختيار ملف بصيغة PDF صالحة');
      return;
    }
    try {
      setPdfProgress(5);
      // Best-effort client-side PDF page count detection
      try {
        const buffer = await file.arrayBuffer();
        const task = pdfjsLib.getDocument({ data: buffer });
        const pdfDoc = await task.promise;
        if (pdfDoc.numPages > 0) {
          setBookPageCount(pdfDoc.numPages);
        }
        task.destroy().catch(() => {});
      } catch {
        // Ignore if PDF metadata parse fails client-side; server still validates file
      }

      const res = await uploadWithProgress(file, 'pdf', getAuthHeaders(), setPdfProgress);
      setBookPdfMediaId(res.mediaId);
      setBookPdfName(res.originalName);
      setBookFileSize(res.sizeBytes);
      setPdfProgress(100);
      showToast('success', `تم رفع ملف PDF (${formatBytesAr(res.sizeBytes)}) بنجاح`);
    } catch (err: any) {
      setPdfProgress(null);
      showToast('error', err.message || 'فشل رفع ملف PDF');
    }
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      setCoverProgress(5);
      const res = await uploadWithProgress(file, 'cover', getAuthHeaders(), setCoverProgress);
      setBookCoverMediaId(res.mediaId);
      setBookCoverUrl(res.url);
      setCoverProgress(100);
      showToast('success', 'تم رفع صورة الغلاف بنجاح');
    } catch (err: any) {
      setCoverProgress(null);
      showToast('error', err.message || 'فشل رفع صورة الغلاف');
    }
  };

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const res = await uploadWithProgress(file, 'logo', getAuthHeaders(), () => {});
      setSettingsForm((prev) => ({ ...prev, logoUrl: res.url }));
      showToast('success', 'تم رفع الشعار الجديد، اضغط حفظ الإعدادات لتفعيله');
    } catch (err: any) {
      showToast('error', err.message || 'فشل رفع الشعار');
    }
  };

  const handleSaveBook = async (status: 'published' | 'draft') => {
    if (isUploadingMedia) {
      showToast('error', 'يرجى الانتظار حتى يكتمل رفع الملفات أولاً');
      return;
    }
    if (!bookTitleAr.trim() || !bookDesc.trim()) {
      showToast('error', 'يرجى إدخال عنوان الكتاب والوصف');
      return;
    }

    setSavingBook(true);
    try {
      const payload = {
        titleAr: bookTitleAr.trim(),
        titleEn: bookTitleEn.trim(),
        descriptionAr: bookDesc.trim(),
        author: bookAuthor.trim(),
        keywords: bookKeywords.trim(),
        categoryId: bookCategoryId || null,
        coverUrl: bookCoverUrl,
        coverMediaId: bookCoverMediaId,
        pdfMediaId: bookPdfMediaId,
        fileSizeBytes: bookFileSize,
        pageCount: bookPageCount,
        spineColor: bookSpineColor,
        isFeatured: bookFeatured,
        status,
      };

      const url = editingBookId
        ? `/api/admin/books/${editingBookId}`
        : '/api/admin/books';
      const method = editingBookId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حفظ الكتاب');
      }

      showToast(
        'success',
        editingBookId
          ? 'تم تحديث بيانات الكتاب ومزامنتها مع المكتبة'
          : status === 'published'
            ? 'تم نشر الكتاب بنجاح على الأرفف الثلاثية الأبعاد'
            : 'تم حفظ الكتاب كمسودة'
      );
      resetBookForm();
      await fetchAdminData();
      onDataChanged();
      setActiveTab('books');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (id: number, title: string) => {
    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'تعذر حذف الكتاب');
      }
      showToast('success', `تم حذف كتاب "${title}" من قاعدة البيانات`);
      await fetchAdminData();
      onDataChanged();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleBookStatus = async (book: BookDTO) => {
    const nextStatus = book.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchAdminData();
        onDataChanged();
        showToast(
          'success',
          nextStatus === 'published' ? 'تم نشر الكتاب' : 'تم تحويل الكتاب لمسودة'
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.error || 'تعذر تغيير حالة نشر الكتاب');
      }
    } catch {
      showToast('error', 'حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameAr.trim()) {
      showToast('error', 'يرجى إدخال اسم القسم');
      return;
    }

    const url = editingCatId
      ? `/api/admin/categories/${editingCatId}`
      : '/api/admin/categories';
    const method = editingCatId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        nameAr: catNameAr.trim(),
        nameEn: catNameEn.trim() || catNameAr.trim(),
        descriptionAr: catDescAr.trim(),
        iconName: catIcon,
        sortOrder: Number(catSortOrder) || 0,
        imageUrl: catImageUrl.trim() || null,
      }),
    });

    if (res.ok) {
      setEditingCatId(null);
      setCatNameAr('');
      setCatNameEn('');
      setCatDescAr('');
      setCatIcon('BookOpenCheck');
      setCatSortOrder(adminCategories.length + 1);
      setCatImageUrl('');
      await fetchAdminData();
      onDataChanged();
      showToast('success', 'تم حفظ بيانات القسم بنجاح');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast('error', data.error || 'تعذر حفظ القسم');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      await fetchAdminData();
      onDataChanged();
      showToast('success', 'تم حذف القسم');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(settingsForm),
    });
    if (res.ok) {
      onDataChanged();
      showToast('success', 'تم حفظ إعدادات الموقع والهوية بنجاح');
    } else {
      showToast('error', 'تعذر حفظ الإعدادات');
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword.length < 8) {
      showToast('error', 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      showToast('error', 'كلمتا المرور غير متطابقتين');
      return;
    }
    const res = await fetch('/api/admin/security/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ newPassword: newAdminPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      showToast('success', 'تم تحديث كلمة مرور المدير بنجاح');
    } else {
      showToast('error', data.error || 'تعذر تحديث كلمة المرور');
    }
  };

  // ==========================================
  // UN-AUTHENTICATED ADMIN LOGIN GATE
  // ==========================================
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#06152F] px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[#E8B94F]/35 bg-[#10274A]/80 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.85)] backdrop-blur-md">
          <div className="text-center space-y-3 mb-6">
            <div className="mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-[#E8B94F]">
              <img
                src={initialSettings.logoUrl}
                alt={initialSettings.siteNameAr}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              لوحة الإدارة الخاصة بالمالك
            </h1>
            <p className="text-xs text-slate-300">
              دخول حصري لمالك المنصة فقط لإدارة الكتب الرقمية والأقسام وإحصائيات المكتبة
            </p>
          </div>

          {authError && (
            <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/60 p-3 text-xs text-rose-200 text-center">
              {authError}
            </div>
          )}

          {!hasPasswordAdmin && (
            <div className="mb-4 flex rounded-lg bg-[#06152F] p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setLoginMode('setup');
                }}
                className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                  loginMode === 'setup'
                    ? 'bg-[#E8B94F] text-[#06152F]'
                    : 'text-slate-300'
                }`}
              >
                تعيين كلمة المرور الأولية
              </button>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setLoginMode('login');
                }}
                className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                  loginMode === 'login'
                    ? 'bg-[#E8B94F] text-[#06152F]'
                    : 'text-slate-300'
                }`}
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {loginMode === 'setup' && !hasPasswordAdmin ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await setupFirstAdmin('admin', loginPassword);
                if (ok) setHasPasswordAdmin(true);
              }}
              className="space-y-3.5"
            >
              <p className="text-xs text-[#FFD778]">
                عيّن كلمة المرور السرية لحساب المدير الوحيد (admin) لتأمين لوحة التحكم:
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-200">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value="admin"
                  className="w-full rounded-xl border border-[#E8B94F]/25 bg-[#06152F]/60 px-3.5 py-2.5 text-sm text-slate-300"
                />
              </div>
              <input
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="كلمة المرور (8 أحرف على الأقل)"
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] py-3 text-sm font-bold text-[#06152F] hover:brightness-105 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                <span>تفعيل الحساب والدخول</span>
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginWithPassword(loginUsername, loginPassword);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-200">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-200">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] py-3 text-sm font-bold text-[#06152F] hover:brightness-105 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                <span>دخول لوحة الإدارة</span>
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={onBackToSite}
            className="mt-6 flex w-full items-center justify-center gap-1.5 text-xs text-slate-300 hover:text-[#FFD778]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة إلى المكتبة الرئيسية</span>
          </button>
        </div>
      </div>
    );
  }

  // Filtered Books for Admin Table
  const filteredBooks = adminBooks.filter((b) => {
    if (bookStatusFilter !== 'all' && b.status !== bookStatusFilter) return false;
    if (bookCatFilter > 0 && b.categoryId !== bookCatFilter) return false;
    if (bookSearch.trim()) {
      const s = bookSearch.toLowerCase();
      return (
        b.titleAr.toLowerCase().includes(s) ||
        (b.titleEn || '').toLowerCase().includes(s) ||
        (b.author || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const navLinks: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'book-form', label: editingBookId ? 'تعديل كتاب' : 'إضافة كتاب جديد', icon: <BookPlus className="h-4 w-4" /> },
    { id: 'books', label: 'إدارة الكتب', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'categories', label: 'إدارة الأقسام', icon: <FolderKanban className="h-4 w-4" /> },
    { id: 'downloads', label: 'إحصائيات التحميل', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'settings', label: 'إعدادات الموقع', icon: <Settings className="h-4 w-4" /> },
    { id: 'admins', label: 'أمان الحساب الإداري', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#06152F] text-white flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-l border-[#E8B94F]/25 bg-[#040E21] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#E8B94F]/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[#E8B94F]" />
              <div>
                <h1 className="text-sm font-bold text-[#FFD778]">لوحة التحكم الأدمن</h1>
                <p className="text-xs text-slate-400 truncate max-w-[160px]">{admin.email}</p>
              </div>
            </div>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto">
            {navLinks.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'book-form' && activeTab !== 'book-form') {
                      resetBookForm();
                    }
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-gradient-to-l from-[#E8B94F] to-[#FFD778] text-[#06152F]'
                      : 'text-slate-200 hover:bg-[#10274A] hover:text-[#FFD778]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#E8B94F]/20 p-3 flex lg:flex-col gap-2">
          <button
            type="button"
            onClick={onBackToSite}
            className="flex items-center justify-center lg:justify-start gap-2 rounded-xl border border-[#E8B94F]/30 bg-[#10274A]/60 px-4 py-2.5 text-xs font-semibold text-[#FFD778] hover:bg-[#10274A]"
          >
            <ArrowRight className="h-4 w-4" />
            <span>معاينة المكتبة</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center justify-center lg:justify-start gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {notice && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              notice.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/60 text-rose-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice.text}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  مرحباً، {admin.name}
                </h2>
                <p className="text-sm text-slate-300">
                  ملخص حي ومباشر لإحصائيات المكتبة الرقمية الفاخرة
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetBookForm();
                  setActiveTab('book-form');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] px-5 py-2.5 text-sm font-bold text-[#06152F]"
              >
                <Plus className="h-4 w-4" />
                <span>رفع كتاب PDF جديد</span>
              </button>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-[#E8B94F]/25 bg-[#10274A]/60 p-5">
                <div className="text-xs text-slate-300">إجمالي الكتب</div>
                <div className="font-mono-num mt-2 text-3xl font-bold text-[#FFD778]">
                  {formatNumberAr(overview?.stats.totalBooks ?? 0)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {overview?.stats.publishedBooks ?? 0} منشور · {overview?.stats.draftBooks ?? 0} مسودة
                </div>
              </div>

              <div className="rounded-xl border border-[#E8B94F]/25 bg-[#10274A]/60 p-5">
                <div className="text-xs text-slate-300">الأقسام المعرفية</div>
                <div className="font-mono-num mt-2 text-3xl font-bold text-white">
                  {formatNumberAr(overview?.stats.totalCategories ?? 0)}
                </div>
                <div className="mt-1 text-xs text-slate-400">تصنيفات مفعلة</div>
              </div>

              <div className="rounded-xl border border-[#E8B94F]/25 bg-[#10274A]/60 p-5">
                <div className="text-xs text-slate-300">إجمالي التحميلات</div>
                <div className="font-mono-num mt-2 text-3xl font-bold text-[#FFD778]">
                  {formatNumberAr(overview?.stats.totalDownloads ?? 0)}
                </div>
                <div className="mt-1 text-xs text-slate-400">عمليات تحميل PDF</div>
              </div>

              <div className="rounded-xl border border-[#E8B94F]/25 bg-[#10274A]/60 p-5">
                <div className="text-xs text-slate-300">إجمالي المشاهدات</div>
                <div className="font-mono-num mt-2 text-3xl font-bold text-white">
                  {formatNumberAr(overview?.stats.totalViews ?? 0)}
                </div>
                <div className="mt-1 text-xs text-slate-400">زيارات صفحات الكتب</div>
              </div>
            </div>

            {/* Recent & Top Books */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E8B94F]/20 bg-[#10274A]/45 p-5">
                <h3 className="mb-4 text-base font-bold text-[#FFD778]">
                  أحدث الكتب المضافة
                </h3>
                <div className="divide-y divide-[#E8B94F]/15">
                  {(overview?.recentBooks || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={b.coverUrl}
                          alt={b.titleAr}
                          className="h-12 w-9 rounded object-cover border border-[#E8B94F]/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {b.titleAr}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {b.categoryNameAr || 'عام'} · {b.status === 'published' ? 'منشور' : 'مسودة'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const full = adminBooks.find((x) => x.id === b.id);
                          if (full) startEditBook(full);
                        }}
                        className="text-xs text-[#FFD778] hover:underline shrink-0"
                      >
                        تعديل
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8B94F]/20 bg-[#10274A]/45 p-5">
                <h3 className="mb-4 text-base font-bold text-[#FFD778]">
                  الكتب الأكثر تحميلاً
                </h3>
                <div className="divide-y divide-[#E8B94F]/15">
                  {(overview?.topBooks || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={b.coverUrl}
                          alt={b.titleAr}
                          className="h-12 w-9 rounded object-cover border border-[#E8B94F]/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {b.titleAr}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {b.categoryNameAr || 'عام'}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono-num text-sm font-bold text-[#FFD778] shrink-0">
                        {formatNumberAr(b.downloadCount)} تحميل
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD / EDIT BOOK */}
        {activeTab === 'book-form' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">
                {editingBookId ? 'تعديل بيانات الكتاب' : 'إضافة كتاب رقمي جديد (PDF)'}
              </h2>
              {editingBookId && (
                <button
                  type="button"
                  onClick={resetBookForm}
                  className="text-xs text-[#FFD778] hover:underline"
                >
                  إنشاء كتاب جديد بدلاً من ذلك
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
              <div className="xl:col-span-8 space-y-5 rounded-2xl border border-[#E8B94F]/25 bg-[#10274A]/50 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                      اسم الكتاب (بالعربية) *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookTitleAr}
                      onChange={(e) => setBookTitleAr(e.target.value)}
                      placeholder="مثال: أساسيات البرمجة بلغة بايثون"
                      className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                      العنوان بالإنجليزية (اختياري)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={bookTitleEn}
                      onChange={(e) => setBookTitleEn(e.target.value)}
                      placeholder="Python Programming Essentials"
                      className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                      القسم *
                    </label>
                    <select
                      value={bookCategoryId}
                      onChange={(e) => setBookCategoryId(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2.5 text-sm text-white focus:border-[#E8B94F] focus:outline-none"
                    >
                      {adminCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                      اسم المؤلف (اختياري)
                    </label>
                    <input
                      type="text"
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      placeholder="د. أحمد المنصور"
                      className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                      عدد الصفحات
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={bookPageCount}
                      onChange={(e) => setBookPageCount(Number(e.target.value) || 1)}
                      className="font-mono-num w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white focus:border-[#E8B94F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                    وصف الكتاب *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={bookDesc}
                    onChange={(e) => setBookDesc(e.target.value)}
                    placeholder="اكتب وصفاً مختصراً وواضحاً لمحتوى الكتاب وأهم محاوره..."
                    className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-200">
                    كلمات مفتاحية للبحث (مفصولة بفاصلة)
                  </label>
                  <input
                    type="text"
                    value={bookKeywords}
                    onChange={(e) => setBookKeywords(e.target.value)}
                    placeholder="برمجة, ذكاء اصطناعي, تعليم"
                    className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#E8B94F] focus:outline-none"
                  />
                </div>

                {/* File Uploads: PDF & Cover Image */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* PDF Upload */}
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E8B94F]/40 bg-[#06152F]/70 p-5 text-center hover:border-[#E8B94F] transition-colors">
                    <FileText className="mb-2 h-8 w-8 text-[#E8B94F]" />
                    <span className="text-sm font-bold text-white">
                      رفع ملف الكتاب (PDF)
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {bookPdfName || 'اسحب ملف PDF أو انقر للاختيار (حتى 30MB)'}
                    </span>
                    {pdfProgress !== null && (
                      <div className="mt-3 w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-[#E8B94F] transition-all"
                            style={{ width: `${pdfProgress}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] text-[#FFD778]">
                          {pdfProgress}%
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        handlePdfUpload(f);
                      }}
                    />
                  </label>

                  {/* Cover Upload */}
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E8B94F]/40 bg-[#06152F]/70 p-5 text-center hover:border-[#E8B94F] transition-colors">
                    <ImageIcon className="mb-2 h-8 w-8 text-[#E8B94F]" />
                    <span className="text-sm font-bold text-white">
                      رفع صورة غلاف مخصصة
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      PNG أو JPG أو WebP (أو استخدم الغلاف الافتراضي)
                    </span>
                    {coverProgress !== null && (
                      <div className="mt-3 w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-[#E8B94F] transition-all"
                            style={{ width: `${coverProgress}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] text-[#FFD778]">
                          {coverProgress}%
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        handleCoverUpload(f);
                      }}
                    />
                  </label>
                </div>

                {/* Spine Color & Featured Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E8B94F]/15 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      لون الغلاف/الكعب ثلاثي الأبعاد:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {SPINE_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setBookSpineColor(color)}
                          className={`h-6 w-6 rounded-full border-2 ${
                            bookSpineColor === color
                              ? 'border-[#FFD778] scale-110'
                              : 'border-white/20'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`اختر اللون ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={bookFeatured}
                      onChange={(e) => setBookFeatured(e.target.checked)}
                      className="h-4 w-4 accent-[#E8B94F]"
                    />
                    <span>تمييز الكتاب في الواجهة الرئيسية</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingBook || isUploadingMedia}
                    onClick={() => handleSaveBook('published')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] px-6 py-3 text-sm font-bold text-[#06152F] hover:brightness-105 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {isUploadingMedia
                        ? 'جاري رفع الملفات...'
                        : savingBook
                          ? 'جاري النشر...'
                          : editingBookId
                            ? 'حفظ ونشر التعديلات'
                            : 'نشر الكتاب الآن'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={savingBook || isUploadingMedia}
                    onClick={() => handleSaveBook('draft')}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#E8B94F]/40 bg-[#06152F] px-5 py-3 text-sm font-semibold text-[#FFD778] hover:bg-[#10274A] disabled:opacity-60"
                  >
                    <span>حفظ كمسودة</span>
                  </button>
                </div>
              </div>

              {/* Live 3D Book Preview */}
              <div className="xl:col-span-4 rounded-2xl border border-[#E8B94F]/25 bg-[#040E21] p-6 flex flex-col items-center justify-center text-center">
                <span className="mb-4 text-xs font-semibold text-[#FFD778]">
                  معاينة حية على الرف ثلاثي الأبعاد
                </span>
                <div className="book-stage w-48">
                  <div
                    className="book-3d relative h-72 w-full rounded-r-md rounded-l-xs shadow-[0_24px_40px_rgba(0,0,0,0.85)]"
                    style={{ backgroundColor: bookSpineColor }}
                  >
                    <div className="book-pages absolute top-1 bottom-1 left-0 w-4" />
                    <div
                      className="book-spine absolute top-0 bottom-0 right-0 w-6 border-l border-[#E8B94F]/40"
                      style={{ backgroundColor: bookSpineColor }}
                    />
                    <div className="relative h-full w-full overflow-hidden rounded-r-md border border-[#E8B94F]/50">
                      <img
                        src={bookCoverUrl}
                        alt="معاينة الغلاف"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/80" />
                      <div className="absolute inset-2 rounded border border-[#E8B94F]/40" />
                      <div className="absolute inset-x-3 top-4 text-center">
                        <div className="font-display text-lg font-bold text-white line-clamp-2">
                          {bookTitleAr || 'عنوان الكتاب يظهر هنا'}
                        </div>
                      </div>
                      <div className="absolute inset-x-3 bottom-3 flex justify-between text-[11px] text-[#FFD778]">
                        <span className="truncate">{bookAuthor || 'اسم المؤلف'}</span>
                        <span>PDF</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 h-3 w-56 rounded-full bg-gradient-to-b from-[#6e4223] to-[#2c1709] border-t border-[#E8B94F]/40" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE BOOKS */}
        {activeTab === 'books' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-white">
                إدارة الكتب ({formatNumberAr(filteredBooks.length)})
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetBookForm();
                  setActiveTab('book-form');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E8B94F] px-4 py-2 text-xs font-bold text-[#06152F]"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة كتاب</span>
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-3 rounded-xl border border-[#E8B94F]/20 bg-[#10274A]/45 p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8B94F]" />
                <input
                  type="search"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="بحث باسم الكتاب أو المؤلف..."
                  className="w-full rounded-lg border border-[#E8B94F]/25 bg-[#06152F] py-2 pr-9 pl-3 text-sm text-white focus:border-[#E8B94F] focus:outline-none"
                />
              </div>

              <select
                value={bookStatusFilter}
                onChange={(e) => setBookStatusFilter(e.target.value as any)}
                className="rounded-lg border border-[#E8B94F]/25 bg-[#06152F] px-3 py-2 text-sm text-white"
              >
                <option value="all">كل الحالات</option>
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
              </select>

              <select
                value={bookCatFilter}
                onChange={(e) => setBookCatFilter(Number(e.target.value))}
                className="rounded-lg border border-[#E8B94F]/25 bg-[#06152F] px-3 py-2 text-sm text-white"
              >
                <option value={0}>كل الأقسام</option>
                {adminCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Books Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#E8B94F]/20 bg-[#10274A]/40">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-[#E8B94F]/20 bg-[#040E21]/70 text-xs text-[#FFD778]">
                  <tr>
                    <th className="px-4 py-3.5">الكتاب</th>
                    <th className="px-4 py-3.5">القسم</th>
                    <th className="px-4 py-3.5">الحجم</th>
                    <th className="px-4 py-3.5">التحميلات</th>
                    <th className="px-4 py-3.5">الحالة</th>
                    <th className="px-4 py-3.5">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8B94F]/10">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-[#10274A]/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={book.coverUrl}
                            alt={book.titleAr}
                            className="h-12 w-9 rounded object-cover border border-[#E8B94F]/30 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{book.titleAr}</span>
                              {book.isFeatured && (
                                <Star className="h-3.5 w-3.5 fill-[#E8B94F] text-[#E8B94F]" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {book.author || 'بدون مؤلف'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {book.categoryNameAr || 'عام'}
                      </td>
                      <td className="px-4 py-3 font-mono-num text-xs text-slate-300">
                        {formatBytesAr(book.fileSizeBytes)}
                      </td>
                      <td className="px-4 py-3 font-mono-num font-bold text-[#FFD778]">
                        {formatNumberAr(book.downloadCount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleBookStatus(book)}
                          className={`text-xs font-semibold underline-offset-2 hover:underline ${
                            book.status === 'published'
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {book.status === 'published' ? 'منشور' : 'مسودة'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditBook(book)}
                            aria-label="تعديل"
                            className="rounded-lg border border-[#E8B94F]/30 bg-[#06152F] p-1.5 text-[#FFD778] hover:bg-[#E8B94F] hover:text-[#06152F]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <a
                            href={`/book/${book.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="معاينة"
                            className="rounded-lg border border-[#E8B94F]/30 bg-[#06152F] p-1.5 text-slate-200 hover:text-[#FFD778]"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(book.id, book.titleAr)}
                            aria-label="حذف"
                            className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-1.5 text-rose-300 hover:bg-rose-600 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form
              onSubmit={handleSaveCategory}
              className="lg:col-span-4 space-y-4 rounded-2xl border border-[#E8B94F]/25 bg-[#10274A]/50 p-5 h-fit"
            >
              <h2 className="font-display text-xl font-bold text-white">
                {editingCatId ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h2>
              <div>
                <label className="mb-1 block text-xs text-slate-200">الاسم بالعربية *</label>
                <input
                  type="text"
                  required
                  value={catNameAr}
                  onChange={(e) => setCatNameAr(e.target.value)}
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-200">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  dir="ltr"
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-200">الأيقونة</label>
                  <select
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-2.5 py-2 text-sm text-white"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-200">الترتيب</label>
                  <input
                    type="number"
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(Number(e.target.value))}
                    className="font-mono-num w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-200">وصف مختصر</label>
                <textarea
                  rows={2}
                  value={catDescAr}
                  onChange={(e) => setCatDescAr(e.target.value)}
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#E8B94F] py-2.5 text-sm font-bold text-[#06152F]"
                >
                  {editingCatId ? 'حفظ التعديل' : 'إضافة القسم'}
                </button>
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(null);
                      setCatNameAr('');
                      setCatNameEn('');
                      setCatDescAr('');
                    }}
                    className="rounded-xl border border-[#E8B94F]/30 px-4 py-2.5 text-xs text-slate-200"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-8 space-y-3">
              <h2 className="font-display text-xl font-bold text-white">
                الأقسام الحالية ({adminCategories.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {adminCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl border border-[#E8B94F]/20 bg-[#10274A]/45 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#06152F] text-[#FFD778]">
                        {getCategoryIcon(cat.iconName, 'h-5 w-5')}
                      </div>
                      <div>
                        <div className="font-bold text-white">{cat.nameAr}</div>
                        <div className="font-mono-num text-xs text-slate-400">
                          ترتيب #{cat.sortOrder} · {cat.bookCount ?? 0} كتاب
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatNameAr(cat.nameAr);
                          setCatNameEn(cat.nameEn);
                          setCatDescAr(cat.descriptionAr || '');
                          setCatIcon(cat.iconName);
                          setCatSortOrder(cat.sortOrder);
                          setCatImageUrl(cat.imageUrl || '');
                        }}
                        className="rounded-lg p-1.5 text-[#FFD778] hover:bg-[#06152F]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-950/60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DOWNLOAD STATS */}
        {activeTab === 'downloads' && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-white">
              إحصائيات التحميل والقراءة المباشرة
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[#E8B94F]/20 bg-[#10274A]/45">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-[#E8B94F]/20 bg-[#040E21]/70 text-xs text-[#FFD778]">
                  <tr>
                    <th className="px-4 py-3">الكتاب</th>
                    <th className="px-4 py-3">نوع العملية</th>
                    <th className="px-4 py-3">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8B94F]/10">
                  {(overview?.recentDownloadLogs || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        لم يتم تسجيل عمليات تحميل حديثة بعد. ستظهر هنا فور قيام الزوار بالتحميل.
                      </td>
                    </tr>
                  ) : (
                    overview?.recentDownloadLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 font-semibold text-white">
                          {log.bookTitleAr}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#FFD778]">
                          {log.actionType === 'download' ? 'تحميل PDF' : 'قراءة مباشرة'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          {formatDateAr(log.downloadedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SITE SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-3xl space-y-5 rounded-2xl border border-[#E8B94F]/25 bg-[#10274A]/50 p-6"
          >
            <h2 className="font-display text-2xl font-bold text-white">
              إعدادات الموقع والهوية البصرية
            </h2>

            <div className="flex flex-wrap items-center gap-4 border-b border-[#E8B94F]/20 pb-5">
              <img
                src={settingsForm.logoUrl}
                alt="شعار المكتبة"
                className="h-16 w-16 rounded-full border-2 border-[#E8B94F] object-cover"
              />
              <label className="cursor-pointer rounded-xl border border-[#E8B94F]/40 bg-[#06152F] px-4 py-2 text-xs font-semibold text-[#FFD778] hover:bg-[#10274A]">
                <span>تغيير الشعار الرسمي</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-200">اسم الموقع</label>
                <input
                  type="text"
                  value={settingsForm.siteNameAr}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, siteNameAr: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-200">الشعار اللفظي (Subtitle)</label>
                <input
                  type="text"
                  value={settingsForm.siteSubtitleAr}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, siteSubtitleAr: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-200">وصف الهيرو الرئيسي</label>
              <textarea
                rows={3}
                value={settingsForm.siteDescriptionAr}
                onChange={(e) =>
                  setSettingsForm((p) => ({ ...p, siteDescriptionAr: e.target.value }))
                }
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-200">نص من نحن (حول الموقع)</label>
              <textarea
                rows={3}
                value={settingsForm.aboutTextAr}
                onChange={(e) =>
                  setSettingsForm((p) => ({ ...p, aboutTextAr: e.target.value }))
                }
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-200">بريد التواصل</label>
                <input
                  type="email"
                  dir="ltr"
                  value={settingsForm.contactEmail}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, contactEmail: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-200">رقم الهاتف</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settingsForm.contactPhone}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, contactPhone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] px-6 py-3 text-sm font-bold text-[#06152F]"
            >
              حفظ الإعدادات
            </button>
          </form>
        )}

        {/* TAB 7: SINGLE ADMIN SECURITY */}
        {activeTab === 'admins' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form
              onSubmit={handleChangeAdminPassword}
              className="lg:col-span-5 space-y-4 rounded-2xl border border-[#E8B94F]/25 bg-[#10274A]/50 p-6 h-fit"
            >
              <h2 className="font-display text-xl font-bold text-white">
                تحديث كلمة مرور المدير (admin)
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                يُسمح بحساب مدير واحد فقط للمكتبة، والتسجيل العام معطل أمنياً. في حال ضبط متغير البيئة{' '}
                <code className="font-mono-num text-[#FFD778]">ADMIN_PASSWORD</code> على الخادم، تكون له الأولوية القصوى.
              </p>
              <input
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white"
              />
              <input
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={confirmAdminPassword}
                onChange={(e) => setConfirmAdminPassword(e.target.value)}
                placeholder="تأكيد كلمة المرور الجديدة"
                className="w-full rounded-xl border border-[#E8B94F]/30 bg-[#06152F] px-3.5 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-l from-[#E8B94F] to-[#FFD778] py-2.5 text-sm font-bold text-[#06152F]"
              >
                حفظ كلمة المرور الجديدة
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h2 className="font-display text-xl font-bold text-white">
                حساب مالك المنصة المصرح له
              </h2>
              <div className="space-y-3">
                {adminUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8B94F]/20 bg-[#10274A]/45 p-4"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {u.name} (اسم المستخدم: <span dir="ltr" className="text-[#FFD778]">admin</span>)
                      </div>
                      <div className="text-xs text-slate-300 mt-1" dir="ltr">
                        {u.email}
                      </div>
                      <div className="mt-1 text-[11px] text-[#FFD778]">
                        الدور: {u.role} · حماية معدل المحاولات مفعلة (Rate Limiting)
                      </div>
                    </div>
                    <span className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      نشط ومحمي
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
