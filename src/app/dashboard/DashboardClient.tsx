"use client";

import React, { useState, useEffect } from 'react';
import DashboardStats from '@/components/Dashboard/DashboardStats';
import CashflowChart from '@/components/Dashboard/Charts/CashflowChart';
import ExpensesDonut from '@/components/Dashboard/Charts/ExpensesDonut';
import AIInsightsCard from '@/components/Dashboard/AI/AIInsightsCard';
import TransactionModal from '@/components/Transactions/TransactionModal';
import MagicInput from '@/components/Dashboard/MagicInput';
import FinancialHealthGauge from '@/components/Dashboard/FinancialHealthGauge';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
    const [magicData, setMagicData] = useState<Partial<DBTransaction> | undefined>(undefined);
    const [refreshing, setRefreshing] = useState(false);

    const [refreshKey, setRefreshKey] = useState(0);

    // Lift state for shared stats
    interface DashboardStatsState {
        income: number;
        expense: number;
        balance: number;
        pending: number;
        transactions: DBTransaction[];
        positiveBalance: boolean;
    }

    const [stats, setStats] = useState<DashboardStatsState>({
        income: 0,
        expense: 0,
        balance: 0,
        pending: 0,
        transactions: [],
        positiveBalance: true
    });

    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('year');

    const loadStats = async () => {
        if (user) {
            try {
                setRefreshing(true);
                // Ensure spinner shows for at least 800ms for "feeling" of work
                const [data] = await Promise.all([
                    supabaseService.getDashboardStats(),
                    new Promise(resolve => setTimeout(resolve, 800))
                ]);

                // Store ALL transactions raw
                setStats({
                    income: 0, // Calculated dynamically below
                    expense: 0,
                    balance: 0,
                    pending: data.pending,
                    transactions: data.transactions || [],
                    positiveBalance: true
                });
                setRefreshKey(prev => prev + 1);
            } catch (error) {
                console.error("Error refreshing dashboard:", error);
            } finally {
                setRefreshing(false);
            }
        }
    };

    // Filter Logic
    const getFilteredStats = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        // Helper for week
        const getWeekStart = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = date.getDate() - day; // Adjust to Sunday
            return new Date(date.setDate(diff));
        };
        const startOfWeek = getWeekStart(now);
        startOfWeek.setHours(0, 0, 0, 0);

        const filteredTxs = stats.transactions.filter(t => {
            // Safe date parsing
            const tDate = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);

            // Exclude cancelled
            if (t.category === 'Factura Cancelada / Oculto' || t.description?.includes('[cancelado]')) return false;

            if (timeRange === 'year') {
                return tDate.getFullYear() === currentYear;
            } else if (timeRange === 'month') {
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            } else if (timeRange === 'week') {
                return tDate >= startOfWeek;
            } else if (timeRange === 'day') {
                return tDate.getDate() === currentDay && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            }
            return true;
        });

        const inc = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const exp = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

        return {
            filteredTxs,
            income: inc,
            expense: exp,
            balance: inc - exp
        };
    };

    const { filteredTxs, income, expense, balance } = getFilteredStats();

    // Derived stats for UI
    const displayStats = {
        ...stats,
        income,
        expense,
        balance,
        positiveBalance: balance >= 0
    };

    useEffect(() => {
        loadStats();
    }, [user]);

    // Smart Resume: Redirect to last active page if user lands on Dashboard
    // Independent of user auth state to ensure immediate check
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const lastRoute = localStorage.getItem('synaptica_last_route');
            // Log for debugging
            console.log("Smart Resume Check:", lastRoute);

            if (window.location.pathname === '/dashboard' && lastRoute && lastRoute !== '/dashboard') {
                router.replace(lastRoute);
            }
        }
    }, []);

    // Check for Recovery/Invoice Return
    useEffect(() => {
        // Only run on client mount and if params exist
        if (searchParams) {
            const isRecover = searchParams.get('recover') === 'true';
            const hasInvoiceReturn = searchParams.get('invoiceFolio');

            if (isRecover || hasInvoiceReturn) {
                // Determine type from params if possible, default to income since invoicing is usually for income
                const type = searchParams.get('type') as 'income' | 'expense' || 'income';
                setModalType(type);
                setModalOpen(true);
            }
        }
    }, [searchParams]);

    const openModal = (type: 'income' | 'expense', data?: Partial<DBTransaction>) => {
        setModalType(type);
        setMagicData(data);
        setModalOpen(true);
    };

    const handleMagicParse = (data: { amount: number; description: string; categoryName?: string }) => {
        console.log("Magic Input Detected:", data);
        // Determine type based on category or logic? Default expense for now.
        // If description contains 'income' keywords maybe?
        const isIncome = ['nomina', 'sueldo', 'pago', 'deposito', 'venta'].some(k => data.description.toLowerCase().includes(k));

        openModal(isIncome ? 'income' : 'expense', {
            amount: data.amount,
            description: data.description,
            category: data.categoryName, // Modal needs to handle string matching
            type: isIncome ? 'income' : 'expense'
        });
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <LayoutDashboard size={32} />
                        Dashboard Financiero
                        <button
                            onClick={loadStats}
                            disabled={refreshing}
                            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--primary-color)] transition-all ${refreshing ? 'animate-spin' : ''}`}
                            title="Actualizar datos"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </h1>
                    <div className="text-sm text-[var(--gray-color)] mt-1">
                        Resumen de Actividad
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => openModal('income')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                    >
                        <span>+</span> {t('btn_new_income_main')}
                    </button>
                    <button
                        onClick={() => openModal('expense')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                    >
                        <span>-</span> {t('btn_new_expense')}
                    </button>
                </div>
            </div>

            {/* Magic Input (Pro Feature) */}
            <div className="w-full">
                <MagicInput onParse={handleMagicParse} />
            </div>

            {/* AI Advisor (Premium) */}
            <div className="w-full">
                <AIInsightsCard refreshTrigger={refreshKey} />
            </div>

            {/* Stats Cards */}
            <DashboardStats externalStats={displayStats} timeFrame={timeRange} />

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">

                {/* Cashflow Chart (Takes up 2 cols) */}
                <div className="lg:col-span-2 bg-white dark:bg-[var(--card-bg)] p-6 rounded-xl shadow-sm border border-[var(--border-color)]">
                    <CashflowChart
                        transactions={stats.transactions}
                        activeTimeFrame={timeRange}
                        onTimeFrameChange={setTimeRange}
                    />
                </div>

                {/* Right Column: Health Gauge + Donut */}
                <div className="space-y-6">
                    {/* Financial Pulse */}
                    <FinancialHealthGauge income={displayStats.income} expenses={displayStats.expense} />

                    {/* Expenses Donut */}
                    <div className="bg-white dark:bg-[var(--card-bg)] p-6 rounded-xl shadow-sm border border-[var(--border-color)]">
                        <ExpensesDonut transactions={filteredTxs} />
                    </div>
                </div>

            </div>

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setMagicData(undefined); }}
                type={modalType}
                initialData={magicData}
                onSuccess={() => {
                    loadStats();
                    // Redirect to specific tab/page as requested
                    if (modalType === 'income') {
                        router.push('/dashboard/income');
                    } else if (modalType === 'expense') {
                        router.push('/dashboard/expenses');
                    } else {
                        window.location.reload();
                    }
                }}
            />

        </div>
    );
}
