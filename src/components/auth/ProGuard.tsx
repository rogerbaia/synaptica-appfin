"use client";

import React from 'react';
import { usePro } from '@/context/SubscriptionContext';
import { Lock } from 'lucide-react';

interface ProGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    title?: string;
    description?: string;
}

export default function ProGuard({
    children,
    fallback,
    title = "Función Premium",
    description = "Esta función está disponible solo para usuarios Pro. Actualiza tu plan para desbloquear presupuestos, reportes y más."
}: ProGuardProps) {
    const { isPro, triggerUpgrade, loading } = usePro();

    if (loading) return <div className="p-10 text-center text-gray-400">Verificando suscripción...</div>;

    if (!isPro) {
        if (fallback) return <>{fallback}</>;

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-6 shadow-sm">
                <div className="p-6 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-full text-orange-600 dark:text-orange-400 shadow-inner">
                    <Lock size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                        {description}
                    </p>
                </div>
                <button
                    onClick={triggerUpgrade}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2"
                >
                    Actualizar a Pro
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
