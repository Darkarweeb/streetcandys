'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'admin' | 'staff';
export type CountryCode = 'CO' | 'CR';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  countryCode: CountryCode | null;
  dateOfBirth: string | null;
  ageVerified: boolean;
  isActive: boolean;
  referralCode: string | null;
  createdAt: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  countryCode: CountryCode;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isEmailVerified: () => boolean;
  resendConfirmationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

const ALLOWED_COUNTRIES: CountryCode[] = ['CO', 'CR'];

// Module-level singleton — prevents new client instance on every render
// which would cause fetchProfile/useEffect to re-run infinitely
const supabase = createClient();

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role as UserRole,
        countryCode: data.country_code as CountryCode | null,
        dateOfBirth: data.date_of_birth,
        ageVerified: data.age_verified,
        isActive: data.is_active,
        referralCode: data.referral_code,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (mounted) setProfile(p);
      }
      // Always clear loading — even if profile fetch returned null
      if (mounted) setLoading(false);
    }).catch(() => {
      // getSession itself failed — still clear loading to avoid blank page
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch profile with a timeout guard — if it takes > 8s, clear loading anyway
        const profilePromise = fetchProfile(session.user.id);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
        const p = await Promise.race([profilePromise, timeoutPromise]);
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      // Always clear loading regardless of profile fetch outcome
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async ({ email, password, fullName, countryCode }: SignUpData) => {
    if (!ALLOWED_COUNTRIES.includes(countryCode)) {
      throw new Error('Street Candy solo está disponible en Colombia y Costa Rica.');
    }

    // User creation is handled server-side via the Admin API so that Supabase
    // never attempts its own email delivery (which caused HTTP 500
    // "Error sending confirmation email"). The server route:
    //   1. Creates the user with email_confirm: false
    //   2. Generates a confirmation link via generateLink
    //   3. Sends the welcome + confirmation email via Resend
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, countryCode }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Error al crear la cuenta.');
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Correo o contraseña incorrectos. Intenta de nuevo.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Debes verificar tu correo antes de iniciar sesión.');
      }
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'No se pudo enviar el correo de recuperación.');
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at != null;
  };

  const resendConfirmationEmail = async (email: string) => {
    // Call our unified welcome/verification endpoint which generates a fresh
    // Supabase verification link and sends it via Resend (not Supabase's own email).
    const res = await fetch('/api/email/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'No se pudo reenviar el correo de verificación.');
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const isCustomer = profile?.role === 'customer';

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isCustomer,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    isEmailVerified,
    resendConfirmationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
