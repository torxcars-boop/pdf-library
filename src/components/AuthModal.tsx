import React, { useState } from 'react';
import { User } from '../types';
import confetti from 'canvas-confetti';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  
  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStage, setRegStage] = useState('الثانوية العامة');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
  const [showRegPass, setShowRegPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff'],
      });
    } catch (e) {
      // safe fallback
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      triggerCelebration();
      setSuccessMsg(data.message || 'تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (regPassword.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          academicStage: regStage,
          avatar: regAvatar,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      triggerCelebration();
      setSuccessMsg(data.message || 'تم إنشاء الحساب بنجاح!');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo fill
  const handleQuickDemo = (type: 'student' | 'researcher') => {
    if (type === 'student') {
      setLoginEmail('student@example.com');
      setLoginPassword('user123');
    } else {
      setLoginEmail('sara@example.com');
      setLoginPassword('user123');
    }
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center text-zinc-950 shadow-lg mb-3">
            {mode === 'login' ? <LogIn className="w-6 h-6 stroke-[2.2]" /> : <UserPlus className="w-6 h-6 stroke-[2.2]" />}
          </div>
          <h2 className="text-xl font-bold text-amber-200">
            {mode === 'login' ? 'تسجيل دخول المستفيد' : 'إنشاء حساب جديد في المنصة'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login' 
              ? 'سجّل دخولك للوصول إلى مفضلتك، تحميل الكتب، وتتبع قراءاتك'
              : 'انضم لآلاف الطلاب والباحثين واستمتع بمميزات المكتبة الرقمية'}
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'login' 
                ? 'bg-amber-500 text-zinc-950 shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'register' 
                ? 'bg-amber-500 text-zinc-950 shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 pr-10 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول إلى حسابي 🚀'}
            </button>

            {/* Quick Demo Logins for easy testing */}
            <div className="pt-3 border-t border-zinc-800/80">
              <p className="text-[11px] text-zinc-400 mb-2 text-center">أو تسجيل سريع بنقرة واحدة (حسابات تجريبية):</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold rounded-lg border border-zinc-700 transition"
                >
                  🎓 طالب تجريبي
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('researcher')}
                  className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold rounded-lg border border-zinc-700 transition"
                >
                  🔬 باحث أكاديمي
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">الاسم الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <UserIcon className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">المرحلة الدراسية / الاهتمام</label>
              <div className="relative">
                <select
                  value={regStage}
                  onChange={(e) => setRegStage(e.target.value)}
                  className="w-full py-2.5 pr-10 pl-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="الثانوية العامة">الثانوية العامة</option>
                  <option value="المرحلة الجامعية">المرحلة الجامعية</option>
                  <option value="المرحلة الإعدادية">المرحلة الإعدادية</option>
                  <option value="معلم / أكاديمي">معلم / أكاديمي</option>
                  <option value="باحث ومطور">باحث ومطور</option>
                  <option value="قارئ عام">قارئ عام</option>
                </select>
                <GraduationCap className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">كلمة المرور (6 خانات على الأقل)</label>
              <div className="relative">
                <input
                  type={showRegPass ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 pr-10 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowRegPass(!showRegPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Avatar picker */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">اختر صورة الحساب:</label>
              <div className="flex gap-2">
                {sampleAvatars.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRegAvatar(av)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition ${
                      regAvatar === av ? 'border-amber-400 scale-105' : 'border-zinc-800 opacity-60'
                    }`}
                  >
                    <img src={av} alt="avatar option" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد 🎓'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
