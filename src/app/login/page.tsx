"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Fingerprint, Sparkles } from 'lucide-react';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import AureaLogo from '@/components/Layout/AureaLogo';

export default function LoginPage() {
    const router = useRouter();
    const { user, signInWithGoogle, signInWithEmail, verifyOtp, signInWithBiometrics } = useAuth();
    const [email, setEmail] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [showOtpInput, setShowOtpInput] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [showBiometric, setShowBiometric] = React.useState(false);

    React.useEffect(() => {
        const bioEnabled = localStorage.getItem('synaptica_bio') === 'true' || localStorage.getItem('synaptica_biometric') === 'true';
        setShowBiometric(bioEnabled);
    }, []);

    const handleBiometricLogin = async () => {
        setLoading(true);
        try {
            const result = await NativeBiometric.isAvailable();
            if (!result.isAvailable) {
                alert("La biometría no está disponible.");
                setLoading(false);
                return;
            }

            // 1. Race Condition Check (If user loaded in background)
            if (user) {
                router.push('/dashboard');
                return;
            }

            // 2. Verify Identity
            await NativeBiometric.verifyIdentity({
                reason: "Por favor autentícate",
                title: "Acceso Seguro Synaptica",
                subtitle: "Usa tu huella o rostro",
                description: "Confirma tu identidad"
            });

            // 3. Attempt Login via Context (which handles the token refresh)
            await signInWithBiometrics();

            // If we get here, it worked
            router.push('/dashboard');

        } catch (e: any) {
            console.error("Biometric Error:", e);
            alert(e.message || "Error de acceso biométrico");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmail(email);
            setMsg('¡Código enviado! Revisa tu correo.');
            setShowOtpInput(true);
        } catch (error: any) {
            console.error(error);
            let errorMessage = error.message || 'Error desconocido';
            if (errorMessage.includes('rate limit')) {
                errorMessage = 'Demasiados intentos. Espera 60s.';
            }
            setMsg(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const cleanInput = otp.trim();

        try {
            if (cleanInput.startsWith('http')) {
                let url = new URL(cleanInput);
                const nestedUrl = url.searchParams.get('url');
                if (nestedUrl) {
                    try { url = new URL(nestedUrl); } catch (e) { }
                }
                let token = url.searchParams.get('token');
                if (!token && url.hash) {
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    token = hashParams.get('token');
                }
                if (!token) throw new Error("Enlace inválido: no tiene token.");
                await verifyOtp(email.trim(), token, 'magiclink');
            } else {
                await verifyOtp(email.trim(), cleanInput, 'email');
            }
        } catch (error: any) {
            console.error(error);
            setMsg(error.message || 'Código o Enlace inválido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`h-screen bg-[var(--dark-color)] flex flex-col items-center justify-center p-4 ${showOtpInput ? 'pt-40' : 'pt-32'} pb-40 relative overflow-hidden transition-all duration-500 ease-in-out`}>
            <div className="absolute inset-0 z-0">
                <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-lg border border-white/20 px-6 py-4 rounded-2xl shadow-2xl w-full max-w-[340px] text-center">

                <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-white/50">
                    <img src="/logo-synaptica-original.png" alt="Synaptica" className="w-4 h-4 object-contain opacity-80" />
                    <span className="font-semibold tracking-wider uppercase">by Synaptica</span>
                </div>

                {user ? (
                    <div className="mb-6 text-center animate-fade-in-up">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl border-4 border-white/10">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">¡Hola de nuevo!</h2>
                        <p className="text-sm text-blue-200 mb-0 opacity-80">{user.email}</p>
                        <div className="mt-6">
                            <button
                                onClick={handleBiometricLogin}
                                className="w-full py-4 px-6 bg-white text-[var(--primary-color)] font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all flex items-center justify-center gap-3"
                            >
                                <Fingerprint size={24} />
                                <span>Desbloquear con Huella</span>
                            </button>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 text-xs text-white/40 hover:text-white underline"
                        >
                            No soy yo (Cerrar Sesión)
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 mt-[13px] flex justify-center">
                            <div className="w-24 h-24 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                                <AureaLogo className="w-full h-full" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-1 font-serif tracking-wide whitespace-nowrap">Aurea Financial</h1>
                        <p className="mb-8 font-medium tracking-wide text-sm flex items-center justify-center gap-2">
                            <Sparkles size={14} className="text-fuchsia-400" />
                            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 text-transparent bg-clip-text font-bold">
                                Powered by Gabi AI
                            </span>
                        </p>
                    </>
                )}

                {!user && (
                    <div className="space-y-4">
                        <button
                            onClick={signInWithGoogle}
                            className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl shadow-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-3 mb-6"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                            <span>Continuar con Google</span>
                        </button>

                        <div className="relative mb-0">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/20"></div>
                            </div>
                        </div>

                        <div className="h-1"></div>

                        <div className="flex justify-center text-sm text-white/50 mb-3">
                            <span>O inicia con Email</span>
                        </div>

                        {!showOtpInput ? (
                            <form onSubmit={handleEmailLogin} className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 text-white font-bold rounded-xl transition shadow-lg backdrop-blur-md disabled:opacity-50"
                                >
                                    {loading ? 'Enviando...' : 'Enviar Código de Acceso'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleOtpLogin} className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Código o Enlace"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-widest text-sm"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-green-600/30 hover:bg-green-600/40 border border-green-500/30 text-white font-bold rounded-xl transition shadow-lg backdrop-blur-md disabled:opacity-50"
                                >
                                    {loading ? 'Verificando...' : 'Entrar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowOtpInput(false)}
                                    className="w-full text-sm text-white/50 hover:text-white"
                                >
                                    Cancelar / Reenviar
                                </button>
                            </form>
                        )}
                        {msg && <p className="text-sm text-green-300 mt-2">{msg}</p>}

                        {showBiometric && (
                            <>
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                </div>
                                <button
                                    onClick={handleBiometricLogin}
                                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition flex items-center justify-center gap-3 active:bg-white/20"
                                >
                                    <Fingerprint size={20} />
                                    <span>Usar Huella Digital</span>
                                </button>
                            </>
                        )}
                    </div>
                )}

                <p className="mt-10 text-xs text-white/40">
                    &copy; 2026 Aurea. All rights reserved.
                </p>
            </div>
        </div>
    );
}
