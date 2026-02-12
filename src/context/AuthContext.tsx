"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string) => Promise<void>;
    verifyOtp: (email: string, token: string, type?: 'email' | 'magiclink') => Promise<void>;
    signInWithBiometrics: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Helper to robustly save session
    const saveSession = (session: Session) => {
        if (session.refresh_token) {
            console.log("Saving new refresh token:", session.refresh_token.substring(0, 10) + "...");
            localStorage.setItem('synaptica_backup_token', session.refresh_token);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Failsafe: Force loading false after 3s to prevent infinite splash screen
        const timer = setTimeout(() => {
            if (mounted) {
                console.warn("Auth check timed out - forcing app entry.");
                setLoading(prev => {
                    if (prev) return false;
                    return prev;
                });
            }
        }, 3000);

        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        }).catch(err => {
            console.error("Auth Session Check Error:", err);
            if (mounted) setLoading(false);
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                console.log("Auth State Change:", _event, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);

                // Only update loading if it's currently true (statup)
                // Actually, ensure we turn it off on any event
                setLoading(false);

                if (session) {
                    saveSession(session);
                }

                // Prevent infinite redirects by checking current path
                if (_event === 'SIGNED_IN' && window.location.pathname === '/login') {
                    router.push('/dashboard');
                } else if (_event === 'SIGNED_OUT') {
                    router.push('/login');
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, [router]);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        });
        if (error) console.error("Login error:", error);
    };

    const signInWithEmail = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    };

    const verifyOtp = async (email: string, token: string, type: 'email' | 'magiclink' = 'email') => {
        // Explicitly get session response to save it immediately
        // Supabase client auto-updates but we want 100% assurance
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type,
        });

        if (error) throw error;

        if (data.session) {
            console.log("Verify OTP Success: Saving Session Directly");
            saveSession(data.session);
        }
    };

    const signInWithBiometrics = async () => {
        const token = localStorage.getItem('synaptica_backup_token');
        console.log("Bio Login: Using token:", token ? (token.substring(0, 10) + "...") : "NONE");

        if (!token) throw new Error("No hay credenciales guardadas. Inicia con email primero.");

        const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });

        if (error || !data.session) {
            console.error("Bio Refresh Failed:", error);
            const msg = error?.message || "Token inválido";
            // If "Refresh Token Not Found", it means rotation happened without us knowing.
            throw new Error(`Tu sesión expiró (${msg}). Por favor inicia con email nuevamente.`);
        }

        // Success handled by onAuthStateChange logic or here
        if (data.session) {
            saveSession(data.session); // Update again just in case rotation happened on refresh
        }
    };

    const signOut = async () => {
        // BANKING STYLE LOGOUT (Soft Logout)
        // 1. We STOP calling supabase.auth.signOut() because that kills the token on the server.
        // 2. Instead, we manually clear the client-side state so the app THINKS it's logged out.
        // 3. This keeps the refresh_token valid on the server for the next biometric login.

        console.log("Soft Logout Executing...");

        // Clear Supabase Client Persistence manually
        // Supabase uses keys like "sb-<project-id>-auth-token"
        // We iterate and clear them.
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
            }
        });

        // Manually reset state
        setSession(null);
        setUser(null);

        // IMPORTANT: We do NOT clear 'synaptica_backup_token'
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithEmail, verifyOtp, signInWithBiometrics, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
