"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseService } from '@/services/supabaseService';
import { X, Calendar, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface YearEndModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function YearEndModal({ isOpen, onClose, onSuccess }: YearEndModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    useEffect(() => {
        if (isOpen && user) {
            loadSummary();
        }
    }, [isOpen, user]);

    const loadSummary = async () => {
        setLoading(true);
        const stats = await supabaseService.getDashboardStats();
        setSummary({
            income: stats.income, // This calculates correctly for current filtering context (usually current month/year)
            expense: stats.expense,
            balance: stats.balance
        });
        // Note: getDashboardStats in supabaseService currently filters by "current month" by default in the implementation provided.
        // Ideally we need "Whole Year Stats".
        // Let's rely on the user visually confirming the balance on the dashboard or we should implement getYearStats.
        // For now assuming getDashboardStats is sufficient or we modify it.
        // ... Actually, the service implementation filters by current month. We need a specific year calculator.
        // Let's just calculate logic here for safety.
        const allTxs = await supabaseService.getTransactions(); // Gets all sort by date
        const thisYearTxs = allTxs.filter(t => new Date(t.date).getFullYear() === currentYear);

        const inc = thisYearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = thisYearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        setSummary({ income: inc, expense: exp, balance: inc - exp });
        setLoading(false);
    };

    const handleCloseYear = async () => {
        setLoading(true);
        try {
            await supabaseService.closeYear(currentYear, summary.balance);
            setStep(2);
            setTimeout(() => {
                onSuccess();
                onClose();
                setStep(1);
            }, 2000);
        } catch (err) {
            console.error(err);
            alert(t('msg_error'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a2234] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Calendar size={24} /> {t('modal_year_end_title')}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <p className="text-[var(--text-color)] text-center">
                                Estás a punto de cerrar el año fiscal <strong>{currentYear}</strong>.
                                Esto creará un balance inicial para <strong>{nextYear}</strong>.
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-[var(--border-color)]">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--gray-color)]">{t('dash_income_total')}</span>
                                    <span className="font-semibold text-[var(--success-color)]">
                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(summary.income)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--gray-color)]">{t('dash_expense_total')}</span>
                                    <span className="font-semibold text-[var(--danger-color)]">
                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(summary.expense)}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span className="text-[var(--dark-color)]">{t('lbl_final_balance')}</span>
                                    <span className={summary.balance >= 0 ? 'text-blue-600' : 'text-red-500'}>
                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(summary.balance)}
                                    </span>
                                </div>
                            </div>

                            {summary.balance > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                                    <ArrowRight className="shrink-0 mt-0.5" size={16} />
                                    <p>
                                        El balance positivo de <strong>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(summary.balance)}</strong> se transferirá automáticamente al 1 de Enero de {nextYear}.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-[var(--gray-color)] justify-center">
                                <AlertTriangle size={12} />
                                <span>Esta acción no elimina tus datos, solo organiza el inicio del nuevo periodo.</span>
                            </div>

                            <button
                                onClick={handleCloseYear}
                                disabled={loading}
                                className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Procesando...' : t('btn_year_end')}
                            </button>
                        </div>
                    ) : (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--dark-color)]">¡Feliz Año Nuevo!</h3>
                            <p className="text-[var(--gray-color)]">
                                El año {currentYear} ha sido cerrado correctamente.
                                <br />Bienvenido al {nextYear}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
