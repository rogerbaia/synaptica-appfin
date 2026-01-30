"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpensesDonutProps {
    transactions: DBTransaction[];
}

export default function ExpensesDonut({ transactions }: ExpensesDonutProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    // const [dataTxs, setDataTxs] = useState<DBTransaction[]>([]); // Removed
    // const [loading, setLoading] = useState(true); // Removed
    const [chartType, setChartType] = useState<'income' | 'expense'>('expense');

    // No useEffect needed


    const { chartData, breakdown } = useMemo(() => {
        // if (loading) return ... 
        if (!transactions) return { chartData: null, breakdown: [] };

        const getLocalTime = (dateStr: string) => {
            if (!dateStr) return new Date();
            const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const filteredTxs = transactions.filter(e => {
            const d = getLocalTime(e.date);
            const cat = (e.category || '').toLowerCase();
            const desc = (e.description || '').toLowerCase();

            // Broad exclusion for any cancelled item
            const isCancelled =
                cat.includes('cancelada') ||
                cat.includes('oculto') ||
                cat.includes('cancelled') ||
                desc.includes('[cancelado]') ||
                desc.includes('(cancelado)');

            return e.type === chartType &&
                d.getMonth() === currentMonth &&
                d.getFullYear() === currentYear &&
                !isCancelled;
        });

        // Aggregate by category
        const catTotals: Record<string, number> = {};
        let totalAmount = 0;

        filteredTxs.forEach(e => {
            const cat = e.category || 'Sin categoría';
            catTotals[cat] = (catTotals[cat] || 0) + e.amount;
            totalAmount += e.amount;
        });

        // Sort and take top 5
        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const topCats = sortedCats.slice(0, 5);
        const otherSum = sortedCats.slice(5).reduce((sum, [, val]) => sum + val, 0);

        const labels = topCats.map(([k]) => k);
        const data = topCats.map(([, v]) => v);

        if (otherSum > 0) {
            labels.push('Otros');
            data.push(otherSum);
        }

        // Breakdown for list view
        const breakdownList = labels.map((label, i) => ({
            label,
            value: data[i],
            percentage: totalAmount > 0 ? ((data[i] / totalAmount) * 100).toFixed(1) : '0',
            color: [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
            ][i % 6]
        }));

        return {
            chartData: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: breakdownList.map(b => b.color),
                        borderWidth: 0,
                    },
                ],
            },
            breakdown: breakdownList
        };
    }, [transactions, chartType]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: false, // Custom legend via breakdown list
            },
        },
    };

    // if (loading) ... removed

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-[var(--primary-color)] dark:text-white">
                    {chartType === 'expense' ? t('menu_expenses') : t('menu_income')} por Categoría
                </h3>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setChartType('expense')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartType === 'expense'
                            ? 'bg-white dark:bg-gray-700 text-[var(--primary-color)] dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        Gastos
                    </button>
                    <button
                        onClick={() => setChartType('income')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartType === 'income'
                            ? 'bg-white dark:bg-gray-700 text-[var(--primary-color)] dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        Ingresos
                    </button>
                </div>
            </div>

            {chartData && chartData.labels?.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                    No hay datos este mes
                </div>
            ) : (
                <>
                    {/* Chart - Bigger */}
                    <div className="flex-1 w-full min-h-[220px] flex items-center justify-center relative">
                        {chartData && <Doughnut data={chartData} options={options} />}
                    </div>

                    {/* Breakdown List - Below */}
                    <div className="w-full mt-4 space-y-2">
                        <h4 className="font-bold text-[var(--dark-color)] dark:text-white mb-2 text-sm">Desglose</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {breakdown.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs w-full">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                        <span className="text-[var(--text-color)] dark:text-gray-200 truncate">{item.label}</span>
                                    </div>
                                    <span className="font-semibold text-[var(--gray-color)] dark:text-gray-400 flex-shrink-0">{item.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
