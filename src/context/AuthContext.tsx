import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthenticatedAdmin {
  id: number;
  email: string;
  name: string;
  role: string;
  authMethod: 'password';
}

interface AuthContextValue {
  admin: AuthenticatedAdmin | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  clearError: () => void;
  loginWithPassword: (username: string, password: string) => Promise<boolean>;
  setupFirstAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const SESSION_TOKEN_KEY = 'luxury_library_admin_token';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AuthenticatedAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const verifyBackendToken = useCallback(async (bearerToken: string): Promise<AuthenticatedAdmin | null> => {
    try {
      const res = await fetch('/api/admin/auth/me', {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data.admin as AuthenticatedAdmin;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storedToken = readStoredToken();
    if (!storedToken) {
      setLoading(false);
      return;
    }

    verifyBackendToken(storedToken).then((verified) => {
      if (cancelled) return;
      if (verified) {
        setToken(storedToken);
        setAdmin(verified);
      } else {
        writeStoredToken(null);
        setToken(null);
        setAdmin(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [verifyBackendToken]);

  const loginWithPassword = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setAuthError(null);
      setLoading(true);
      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || 'بيانات الدخول غير صحيحة');
          setLoading(false);
          return false;
        }
        writeStoredToken(data.token);
        setToken(data.token);
        setAdmin({ ...data.admin, authMethod: 'password' });
        setLoading(false);
        return true;
      } catch {
        setAuthError('حدث خطأ أثناء الاتصال بالخادم');
        setLoading(false);
        return false;
      }
    },
    []
  );

  const setupFirstAdmin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setAuthError(null);
      setLoading(true);
      try {
        const res = await fetch('/api/admin/auth/setup-first', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || 'تعذر إعداد حساب المدير');
          setLoading(false);
          return false;
        }
        writeStoredToken(data.token);
        setToken(data.token);
        setAdmin({ ...data.admin, authMethod: 'password' });
        setLoading(false);
        return true;
      } catch {
        setAuthError('حدث خطأ أثناء إعداد الحساب');
        setLoading(false);
        return false;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    writeStoredToken(null);
    setToken(null);
    setAdmin(null);
    setAuthError(null);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        loading,
        authError,
        clearError: () => setAuthError(null),
        loginWithPassword,
        setupFirstAdmin,
        logout,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
