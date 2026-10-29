'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authService, type SignInInput, type SignUpInput } from '@/lib/authService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (input: SignInInput) => Promise<any>;
  signUp: (input: SignUpInput) => Promise<any>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (error) {
        console.error('Error al recuperar sesión Supabase:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (input: SignInInput) => {
    const res = await authService.signIn(input);
    setSession(res.session);
    setUser(res.user);
    return res;
  };

  const signUp = async (input: SignUpInput) => {
    const res = await authService.signUp(input);
    if (res.session) {
      setSession(res.session);
      setUser(res.user);
    }
    return res;
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    await authService.requestPasswordReset(email);
  };

  const updatePassword = async (password: string) => {
    await authService.updatePassword(password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider.');
  }
  return context;
}
