"use client";

import React, { useEffect, useState } from 'react';
import ProGuard from '@/components/auth/ProGuard';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';

export default function CalendarPage() {
    return (
        <ProGuard
            title="Calendario Financiero"
            description="Visualiza tus ingresos y gastos día a día. Planifica mejor tu mes con la vista de calendario. Exclusivo para Pro."
        >
            <CalendarContent />
        </ProGuard>
    );
}

function CalendarContent() {
    const { t } = useLanguage();
    const { tier } = useSubscription();
    const [date, setDate] = useState(new Date());
    const [transactions, setTransactions] = useState<DBTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<string | null>(null); // 'YYYY-MM-DD'

    useEffect(() => {
        fetchData();
    }, [date.getMonth(), date.getFullYear()]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch for the month. But our getTransactions() fetches ALL or filtered?
            // Service has getTransactions(month, year) but implementation just fetched ALL in previous read.
            // Let's check service again.
            // Service: getTransactions(month, year) -> fetches ALL. The args are ignored in the implementation I saw.
            // Wait, line 59: async getTransactions(month?: number, year?: number)
            // But line 63: .select('*').eq('user_id', user.id).order('date', ...)
            // It doesn't use month/year filtering in the implementation I read!
            // That's fine, we can filter client side.

            const allTxs = await supabaseService.getTransactions();

            // Filter client side (String-based to avoid Timezone Shift on Jan 1st -> Dec 31st)
            const monthTxs = allTxs.filter(t => {
                if (!t.date) return false;
                const [y, m] = t.date.split('T')[0].split('-');
                // Month in DB is 1-12, date.getMonth() is 0-11
                return parseInt(m) === (date.getMonth() + 1) && parseInt(y) === date.getFullYear();
            });

            setTransactions(monthTxs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        setDate(newDate);
        setSelectedDay(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
    };

    // Calendar Generation
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // 0 = Sunday, 1 = Monday, etc.
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const calendarCells = [];
    // Padding
    for (let i = 0; i < startDay; i++) {
        calendarCells.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarCells.push(new Date(year, month, i));
    }

    const getDayData = (day: Date) => {
        const dateStr = day.toISOString().split('T')[0]; // simple YYYY-MM-DD local check (be careful with timezones!)
        // Actually best to compare components
        const dayTxs = transactions.filter(t => {
            // Need to fix timezone offset or just string compare. 
            // DB stores YYYY-MM-DD usually.
            // Let's assume DB string is local.
            return t.date === dateStr;
            // If t.date is '2025-01-01', and our loop constructs local date 2025-01-01
            // toISOString might shift if UTC.
            // Safer:
            // const d = new Date(t.date); return d.getDate() === day.getDate() && ...
        });

        // Let's use string comparison construction
        const y = day.getFullYear();
        const m = String(day.getMonth() + 1).padStart(2, '0');
        const d = String(day.getDate()).padStart(2, '0');
        const compStr = `${y}-${m}-${d}`;

        const txs = transactions.filter(t => {
            if (!t.date) return false;
            // Robust check: Extract standard YYYY-MM-DD part
            const txDate = t.date.split('T')[0];
            return txDate === compStr;
        });

        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        return { income, expense, txs };
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <CalendarIcon size={32} />
                        Calendario
                        {tier === 'platinum' ? (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wide">Platinum</span>
                        ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">PRO</span>
                        )}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">Vista mensual de finanzas</p>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">
                        <ChevronLeft />
                    </button>
                    <span className="font-bold w-32 text-center text-lg">{monthNames[month]} {year}</span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">
                        <ChevronRight />
                    </button>
                </div>
            </div>

            {tier !== 'platinum' && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-center gap-3 border border-blue-100 mb-6">
                    <Info size={18} className="text-blue-600 flex-shrink-0" />
                    <span>Tu plan <strong>Pro</strong> incluye calendario básico. Actualiza a <strong>Platinum</strong> para acceso avanzado.</span>
                </div>
            )}

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full max-w-full">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 w-full min-w-0 max-w-full">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                        <div key={day} className="py-2 md:py-3 text-center text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 min-w-0 truncate">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(50px,1fr)] md:auto-rows-[minmax(100px,1fr)] divide-x divide-gray-200 dark:divide-gray-700 divide-y w-full min-w-0 max-w-full overflow-hidden">
                    {calendarCells.map((cellDate, idx) => {
                        if (!cellDate) return <div key={`empty-${idx}`} className="bg-gray-50/30 dark:bg-slate-900/30 min-w-0" />;

                        const { income, expense, txs } = getDayData(cellDate);
                        const isToday = new Date().toDateString() === cellDate.toDateString();
                        const isSelected = selectedDay === cellDate.toISOString().split('T')[0];

                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedDay(cellDate.toISOString().split('T')[0])}
                                className={`
                                    p-0.5 md:p-2 relative hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex flex-col items-center md:items-start min-w-0 overflow-hidden
                                    ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                    ${isSelected ? 'ring-1 md:ring-2 ring-inset ring-[var(--primary-color)]' : ''}
                                `}
                            >
                                <span className={`
                                    text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-[var(--primary-color)] text-white' : 'text-gray-700 dark:text-gray-300'}
                                `}>
                                    {cellDate.getDate()}
                                </span>

                                <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1 w-full relative">
                                    {income > 0 && (
                                        <div className="text-[9px] md:text-xs font-semibold text-green-600 dark:text-green-400 flex items-center justify-center md:justify-start gap-0.5 md:gap-1">
                                            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                            <span className="hidden md:inline">+{formatCurrency(income)}</span>
                                            <span className="md:hidden">{income >= 1000 ? (income / 1000).toFixed(0) + 'k' : income}</span>
                                        </div>
                                    )}
                                    {expense > 0 && (
                                        <div className="text-[9px] md:text-xs font-semibold text-red-500 dark:text-red-400 flex items-center justify-center md:justify-start gap-0.5 md:gap-1">
                                            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            <span className="hidden md:inline">-{formatCurrency(expense)}</span>
                                            <span className="md:hidden">{expense >= 1000 ? (expense / 1000).toFixed(0) + 'k' : expense}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Details Panel */}
            {selectedDay && (() => {
                // Re-calculate to show details
                const y = parseInt(selectedDay.split('-')[0]);
                const m = parseInt(selectedDay.split('-')[1]) - 1;
                const d = parseInt(selectedDay.split('-')[2]);
                const dateObj = new Date(y, m, d);
                // Fix timezone construct again or just use text match
                const { txs } = getDayData(dateObj);

                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <h3 className="font-bold text-lg">{dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {txs.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay transacciones este día.</p>
                        ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {txs.map(t => (
                                    <div key={t.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {t.type === 'income' ?
                                                <ArrowUpCircle size={18} className="text-green-500" /> :
                                                <ArrowDownCircle size={18} className="text-red-500" />
                                            }
                                            <div>
                                                <div className="font-medium">{t.description}</div>
                                                <div className="text-xs text-gray-400">{t.category}</div>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}
        </div>
    );
}
