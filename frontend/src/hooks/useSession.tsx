import React, { createContext, useContext, useState, useEffect } from 'react';

// Declare google global object loaded from Google Identity Services script
declare global {
  interface Window {
    google?: any;
  }
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface AuthContextType {
  session: { user: User } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        setSession({ user: JSON.parse(userStr) });
        setStatus('authenticated');
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setStatus('unauthenticated');
      }
    } else {
      setStatus('unauthenticated');
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setSession({ user });
    setStatus('authenticated');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSession(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ session, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within an AuthProvider');
  }
  return {
    data: context.session,
    status: context.status,
    login: context.login,
    logout: context.logout,
  };
}
