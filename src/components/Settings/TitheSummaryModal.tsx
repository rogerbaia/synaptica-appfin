import React, { useState, useEffect, useMemo } from 'react';
import { X, Church, TrendingUp, TrendingDown, DollarSign, Calculator, Calendar, ListChecks, Info } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { supabaseService, DBTransaction } from '@/services/supabaseService';

interface TitheSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PeriodFilter = 'month' | 'prev-month' | 'year' | 'all';

export default function TitheSummaryModal({ isOpen, onClose }: TitheSummaryModalProps) {
    const { t } = useLanguage();
    const { titheConfig } = useSettings();
    const [transactions, setTransactions] = useState<DBTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>('month');

    const prevMonthLabel = useMemo(() => {
        const today = new Date();
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const name = prev.toLocaleDateString('es-MX', { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error("Error loading transactions for tithe summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    // Math & Filtering Logic
    const calculations = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();

        // 1. Filter by period & is_tithe flag
        const filtered = transactions.filter(tx => {
            if (!tx.is_tithe) return false;
            if (tx.category === 'Factura Cancelada / Oculto' || tx.description?.includes('[cancelado]')) return false;

            const txDate = new Date(tx.date.includes('T') ? tx.date : `${tx.date}T12:00:00`);

            if (period === 'month') {
                return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            }
            if (period === 'prev-month') {
                return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
            }
            if (period === 'year') {
                return txDate.getFullYear() === currentYear;
            }
            return true; // 'all'
        });

        // 2. Separate Income & Expense
        const incomes = filtered.filter(tx => tx.type === 'income');
        const expenses = filtered.filter(tx => tx.type === 'expense');

        const totalIncomes = incomes.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const totalExpenses = expenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const netBase = Math.max(0, totalIncomes - totalExpenses);

        // 3. Compute Tithe
        const titheAmount = netBase * (titheConfig.percentage / 100);

        // 4. Compute Offering
        const offeringAmount = titheConfig.offeringType === 'percent'
            ? netBase * (titheConfig.offeringValue / 100)
            : titheConfig.offeringValue;

        // 5. Compute Investment Fund
        const investmentAmount = titheConfig.investmentType === 'percent'
            ? netBase * (titheConfig.investmentValue / 100)
            : titheConfig.investmentValue;

        // 6. Total Suggested Contribution
        const totalContribution = titheAmount + offeringAmount + investmentAmount;

        return {
            filtered,
            incomesCount: incomes.length,
            expensesCount: expenses.length,
            totalIncomes,
            totalExpenses,
            netBase,
            titheAmount,
            offeringAmount,
            investmentAmount,
            totalContribution
        };
    }, [transactions, period, titheConfig]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
        return new Date(safeDate).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10 shrink-0">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Church size={24} />
                        <h3 className="text-xl font-bold">Resumen de Diezmos y Ofrendas</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Period Filters */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 pl-2">Periodo de cálculo:</span>
                        <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-lg">
                            {(['month', 'prev-month', 'year', 'all'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${period === p
                                        ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {p === 'month' ? 'Este Mes' : p === 'prev-month' ? prevMonthLabel : p === 'year' ? 'Este Año' : 'Todo'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cargando y calculando...</span>
                        </div>
                    ) : (
                        <>
                            {/* Base Statistics (Incomes & Deductions) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl">
                                    <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        <TrendingUp size={14} />
                                        Ingresos Diezmables
                                    </div>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-500">{formatCurrency(calculations.totalIncomes)}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{calculations.incomesCount} transacciones</p>
                                </div>

                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                                    <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        <TrendingDown size={14} />
                                        Gastos Deducibles
                                    </div>
                                    <p className="text-2xl font-black text-red-600 dark:text-red-500">-{formatCurrency(calculations.totalExpenses)}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{calculations.expensesCount} transacciones</p>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        <DollarSign size={14} />
                                        Base Neta Diezmable
                                    </div>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-500">{formatCurrency(calculations.netBase)}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Base para el cálculo</p>
                                </div>
                            </div>

                            {/* Detailed Calculations */}
                            <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100/80 dark:border-purple-900/20 rounded-2xl p-6 space-y-4">
                                <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2 text-sm border-b dark:border-purple-900/30 pb-2">
                                    <Calculator size={18} />
                                    Cálculo de Aportaciones
                                </h4>

                                <div className="space-y-3">
                                    {/* Tithe */}
                                    <div className="flex justify-between items-center text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">Diezmo ({titheConfig.percentage}%)</span>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Porcentaje configurado sobre base neta</p>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(calculations.titheAmount)}</span>
                                    </div>

                                    {/* Offering */}
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-purple-100/50 dark:border-purple-900/20">
                                        <div>
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">Ofrenda</span>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {titheConfig.offeringType === 'percent'
                                                    ? `Calculada como ${titheConfig.offeringValue}% de la base`
                                                    : `Aportación fija configurada`
                                                }
                                            </p>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(calculations.offeringAmount)}</span>
                                    </div>

                                    {/* Investment */}
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-purple-100/50 dark:border-purple-900/20">
                                        <div>
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">Fondo de Inversión</span>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {titheConfig.investmentType === 'percent'
                                                    ? `Calculado como ${titheConfig.investmentValue}% de la base`
                                                    : `Aportación fija configurada`
                                                }
                                            </p>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(calculations.investmentAmount)}</span>
                                    </div>

                                    {/* Total Grand */}
                                    <div className="flex justify-between items-center text-base pt-4 border-t border-purple-200 dark:border-purple-800 font-extrabold text-purple-700 dark:text-purple-400">
                                        <div>
                                            <span>Monto Total Sugerido</span>
                                            {titheConfig.destination && (
                                                <p className="text-[10px] text-purple-500 dark:text-purple-400 font-medium">Destino: {titheConfig.destination}</p>
                                            )}
                                        </div>
                                        <span className="text-xl font-black">{formatCurrency(calculations.totalContribution)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Audit List of Matchings */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                                    <ListChecks size={18} className="text-purple-600" />
                                    Transacciones Incluidas ({calculations.filtered.length})
                                </h4>

                                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar bg-gray-50/30 dark:bg-slate-900/20 divide-y divide-gray-100 dark:divide-gray-800">
                                    {calculations.filtered.length > 0 ? (
                                        calculations.filtered.map(tx => {
                                            const isInc = tx.type === 'income';
                                            return (
                                                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tx.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-gray-400 font-medium">{formatDate(tx.date)}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{tx.category}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-extrabold ${isInc ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center gap-2">
                                            <Info size={16} />
                                            <span>No hay transacciones registradas o marcadas para el diezmo en este periodo.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-slate-900/35 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-purple-500/10 active:scale-95"
                    >
                        Entendido
                    </button>
                </div>

            </div>
        </div>
    );
}
