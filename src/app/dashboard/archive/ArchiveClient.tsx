"use client";

import React, { Suspense } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Archive, Lock, Info } from 'lucide-react';
import ProGuard from '@/components/auth/ProGuard';
import { useSubscription } from '@/context/SubscriptionContext';

function ArchiveContent() {
    const { t } = useLanguage();
    const { features, tier } = useSubscription();

    const currentYear = new Date().getFullYear();
    let pastYears = [currentYear - 1, currentYear - 2, currentYear - 3];

    // Pro Limitation: Only show 1 year back
    if (tier === 'pro') {
        pastYears = [currentYear - 1];
    } else if (tier === 'platinum') {
        pastYears = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]; // Example for unlimited
    }
    // Free is blocked by ProGuard below

    return (
        <ProGuard
            title="Archivos Históricos"
            description="El acceso a años fiscales anteriores es una función Premium. Actualiza para consultar tu historial."
            fallback={
                <div className="space-y-6 opacity-50 pointer-events-none filter blur-sm">
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] mb-2 flex items-center gap-2">
                        <Archive size={32} />
                        {t('menu_archive')}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <Archive size={32} />
                        {t('menu_archive')}
                        {tier === 'platinum' ? (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wide">Platinum</span>
                        ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">PRO</span>
                        )}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">Consulta tus movimientos de años anteriores</p>
                </div>

                {tier === 'pro' && (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-4 text-sm flex items-center gap-3 border border-blue-100">
                        <Info size={18} className="text-blue-600 flex-shrink-0" />
                        <span>Tu plan <strong>Pro</strong> te permite ver 1 año de historial. Actualiza a <strong>Platinum</strong> para ilimitado.</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastYears.map(year => (
                        <div key={year} className="bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6 hover:shadow-md transition cursor-pointer group">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-[var(--text-color)]">{year}</h3>
                                {year < currentYear - 1 && tier === 'pro' && <Lock size={20} className="text-amber-500" />}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--gray-color)]">{t('dash_income_total')}</span>
                                    <span className="text-[var(--success-color)] font-semibold">$ ---</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--gray-color)]">{t('dash_expense_total')}</span>
                                    <span className="text-[var(--danger-color)] font-semibold">$ ---</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-color)] text-center text-sm text-[var(--primary-color)] font-medium group-hover:underline">
                                Ver Detalles
                            </div>
                        </div>
                    ))}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--gray-color)]">
                        <p className="text-sm">El cierre del año {currentYear} estará disponible el 31 de Diciembre.</p>
                    </div>
                </div>
            </div>
        </ProGuard>
    );
}

export default function ArchivePage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
            <ArchiveContent />
        </Suspense>
    );
}
