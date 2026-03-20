import { createContext, useContext, useState, useEffect } from 'react';
import { ROLES, hasPermission, canAccessRoute, getDefaultRoute, isValidRole } from '@/app/constants/roles';
import {
  API_ORIGIN,
  clearSession,
  getStoredUser,
  persistSession,
} from '@/app/config/runtime';

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const apiBase = API_ORIGIN;

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userData = getStoredUser();
    if (userData) setUser(userData);
  }, []);

  // Salvar usuário no localStorage quando mudar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    persistSession(user, undefined);
  }, [user]);

  const registerUser = async (userData, password) => {
    try {
      const resp = await fetch(`${apiBase.replace(/\/+$/, '')}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, password }),
      });
      let json = null;
      try { json = await resp.json(); } catch {}
      if (resp.ok) {
        if (!json?.requiresEmailVerification && !json?.requiresTwoFactor) {
          setUser(json.user);
          try {
            const key = 'admin_users';
            const raw = localStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            const next = list.some((u) => u.email === json.user.email)
              ? list.map((u) => (u.email === json.user.email ? json.user : u))
              : [...list, json.user];
            localStorage.setItem(key, JSON.stringify(next));
          } catch {}
        }
        return {
          ok: true,
          user: json.user,
          requiresEmailVerification: !!json?.requiresEmailVerification,
          requiresTwoFactor: !!json?.requiresTwoFactor,
          verification: json?.verification || null,
        };
      }
      console.error('API register error', json);
      return { ok: false, error: json?.error || 'Não foi possível criar a conta. Verifique os dados.' };
    } catch (err) {
      console.error('API register failed', err);
      return { ok: false, error: 'Servidor indisponível. Verifique se o backend está rodando.' };
    }
  };

  const loginWithCredentials = async (email, password, otp) => {
    try {
      const resp = await fetch(`${apiBase.replace(/\/+$/, '')}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp }),
      });
      const json = await resp.json();
      if (resp.ok) {
        setUser(json.user);
        persistSession(json.user, json.token || null);
        return { ok: true };
      }
      if (json?.error === 'otp_required') {
        return { ok: false, requires2fa: true };
      }
      if (json?.error === 'email_not_verified') {
        return { ok: false, emailNotVerified: true };
      }
      if (json?.error === 'otp_setup_required') {
        return { ok: false, requires2faSetup: true };
      }
      if (json?.error === 'invalid_otp') {
        return { ok: false, requires2fa: true, error: 'invalid_otp' };
      }
      return { ok: false, error: json?.error || 'invalid_credentials' };
    } catch (err) {
      console.error('API login failed', err);
      return { ok: false, error: 'server_unavailable' };
    }
  };

  const login = (userData) => {
    // Validar role antes de fazer login
    if (!userData.role) {
      userData.role = ROLES.STUDENT; // Role padrão
    }
    
    if (!isValidRole(userData.role)) {
      console.error('Role inválido:', userData.role);
      return false;
    }

    setUser(userData);
    persistSession(userData, null);
    return true;
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  const updateUser = (updates) => {
    if (user) {
      // Permitir definir role apenas se o usuário ainda não tiver um
      if (updates.role && user.role && updates.role !== user.role) {
        console.warn('Não é permitido mudar o role através de updateUser');
        delete updates.role;
      }
      setUser({ ...user, ...updates });
    }
  };

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const checkPermission = (permission) => {
    if (!user || !user.role) return false;
    return hasPermission(user.role, permission);
  };

  /**
   * Verifica se o usuário pode acessar uma rota
   */
  const checkRouteAccess = (route) => {
    if (!user || !user.role) return false;
    return canAccessRoute(user.role, route);
  };

  /**
   * Retorna a rota inicial do usuário baseada no seu role
   */
  const getHomeRoute = () => {
    if (!user || !user.role) return '/dashboard';
    return getDefaultRoute(user.role);
  };

  const value = {
    user,
    login,
    registerUser,
    loginWithCredentials,
    logout,
    updateUser,
    isAuthenticated: !!user,
    // Funções de permissão
    hasPermission: checkPermission,
    canAccessRoute: checkRouteAccess,
    getHomeRoute,
    // Informações do role
    userRole: user?.role || null,
    isStudent: user?.role === ROLES.STUDENT,
    isCompany: user?.role === ROLES.COMPANY,
    isMentor: user?.role === ROLES.MENTOR,
    isAdmin: user?.role === ROLES.ADMIN,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
