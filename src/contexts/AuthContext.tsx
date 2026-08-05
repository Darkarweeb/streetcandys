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

    console.log('[signUp] Before signUp', { email, fullName, countryCode });
    console.log('[signUp] Calling supabase.auth.signUp()');

    const rawResponse = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          country_code: countryCode,
          role: 'customer',
        },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`,
      },
    });

    const { data, error } = rawResponse;

    console.log('[signUp] After signUp');
    console.log('[signUp] RAW RESPONSE:', JSON.stringify(rawResponse, null, 2));

    if (error) {
      console.error('[signUp] ERROR DETAILS:');
      console.error('  error.message :', error.message);
      console.error('  error.code    :', (error as any).code);
      console.error('  error.status  :', (error as any).status);
      console.error('  error.name    :', error.name);
      console.error('  full error obj:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      throw error;
    }

    // If profile wasn't auto-created by trigger, create it manually
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          country_code: countryCode,
          role: 'customer',
          age_verified: false,
          is_active: true,
        }, { onConflict: 'id' });

      // Non-fatal: trigger may have already created it
      if (profileError && profileError.code !== '23505') {
        console.warn('Perfil no pudo crearse automáticamente:', profileError.message);
      }
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback?next=/nueva-contrasena`,
    });
    if (error) throw error;
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
