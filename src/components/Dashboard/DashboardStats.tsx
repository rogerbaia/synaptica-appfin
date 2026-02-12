"use client";

import React, { useEffect, useState } from 'react';
import StatCard from './StatCard';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function DashboardStats({ externalStats, timeFrame }: { externalStats?: any, timeFrame?: string }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        income: 0,
        expense: 0,
        balance: 0,
        pending: 0,
        positiveBalance: true
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (externalStats) {
            setStats(externalStats);
            setLoading(false);
            return;
        }

        if (user) {
            supabaseService.getDashboardStats().then(data => {
                setStats({
                    income: data.income,
                    expense: data.expense,
                    balance: data.balance,
                    pending: data.pending,
                    positiveBalance: data.balance >= 0
                });
                setLoading(false);
            }).catch(err => {
                console.error("Failed to load stats", err);
                setLoading(false);
            });
        }
    }, [user, externalStats]);

    const format = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    if (loading) {
        return <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
        </div>;
    }

    const getLabel = () => {
        switch (timeFrame) {
            case 'year': return t('dash_summary_year');
            case 'month': return t('dash_summary_month');
            case 'week': return t('dash_summary_week');
            case 'day': return t('dash_summary_day');
            default: return t('dash_summary_year');
        }
    };

    // ... rest of code

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
            <StatCard
                label={t('dash_balance')}
                value={format(stats.balance)}
                icon={Wallet}
                colorClass={stats.positiveBalance ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]'}
                subtext={getLabel()} // Dynamic label
            />
            <StatCard
                label={t('dash_income_total')}
                value={format(stats.income)}
                icon={TrendingUp}
                colorClass="text-[var(--success-color)]"
                subtext={getLabel()}
            />
            <StatCard
                label={t('dash_expense_total')}
                value={format(stats.expense)}
                icon={TrendingDown}
                colorClass="text-[var(--danger-color)]"
                subtext={getLabel()}
            />
            <StatCard
                label={t('dash_pending')}
                value={format(stats.pending)}
                icon={PiggyBank}
                colorClass="text-[var(--warning-color)]"
                subtext={t('lbl_pending_status')}
            />
        </div>
    );
}
