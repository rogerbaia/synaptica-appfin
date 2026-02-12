"use client";

import React, { useState } from 'react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { User } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingModalProps {
    isOpen: boolean;
    onSuccess: () => void;
}

export default function OnboardingModal({ isOpen, onSuccess }: OnboardingModalProps) {
    const { user } = useAuth();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName.trim()) {
            toast.error("Por favor ingresa tu nombre completo.");
            return;
        }

        setLoading(true);
        try {
            await supabaseService.updateUserMetadata({ full_name: fullName.trim() });
            toast.success("¡Bienvenido, " + fullName.split(' ')[0] + "!");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar información.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-300">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        ¡Bienvenido a Aurea!
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Para personalizar tu experiencia, necesitamos conocerte un poco mejor.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nombre Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="Ej. Juan Pérez"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!fullName.trim() || loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                    >
                        {loading ? 'Guardando...' : 'Comenzar'}
                    </button>

                    <p className="text-xs text-center text-slate-400">
                        Solo te pediremos esto una vez.
                    </p>
                </form>
            </div>
        </div>
    );
}
