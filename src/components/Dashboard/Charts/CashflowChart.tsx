"use client";

import React, { useMemo, useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Sparkles } from 'lucide-react'; // Keeping Sparkles if used elsewhere or remove if unused. It was used in signature.
import PoweredByGabi from '@/components/Gabi/PoweredByGabi';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface CashflowChartProps {
    transactions: DBTransaction[];
    activeTimeFrame: 'day' | 'week' | 'month' | 'year';
    onTimeFrameChange: (tf: 'day' | 'week' | 'month' | 'year') => void;
}

// Helper to prevent UTC offsets shifting dates
const getLocalTime = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Normalize to Noon to avoid Timezone shifts (e.g. UTC midnight -> Prev Day)
    const safeDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return new Date(safeDate);
};

export default function CashflowChart({ transactions, activeTimeFrame, onTimeFrameChange }: CashflowChartProps) {
    const { user } = useAuth();
    // Removed local state: const [timeFrame, setTimeFrame] = useState...
    const timeFrame = activeTimeFrame; // Alias for compatibility with existing logic

    const chartData = useMemo(() => {
        if (!transactions) return null;
        const data = transactions; // Alias for compatibility with existing logic

        const today = new Date();
        const labels: string[] = [];
        const incomeData: number[] = [];
        const expenseData: number[] = [];
        const forecastData: (number | null)[] = [];

        if (timeFrame === 'day') {
            // Last 30 days
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const day = d.getDate();
                const month = d.getMonth();
                const year = d.getFullYear();

                labels.push(`${day}/${month + 1}`);

                const dayIncome = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'income' && tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                const dayExpense = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'expense' && tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                incomeData.push(dayIncome);
                expenseData.push(dayExpense);
                forecastData.push(null);
            }
        } else if (timeFrame === 'week') {
            // Last 12 weeks
            for (let i = 11; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - (i * 7));

                const startOfWeek = new Date(d);
                startOfWeek.setDate(d.getDate() - d.getDay());

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                const label = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;
                labels.push(label);

                const weekIncome = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        tDate.setHours(0, 0, 0, 0);
                        const s = new Date(startOfWeek); s.setHours(0, 0, 0, 0);
                        const e = new Date(endOfWeek); e.setHours(23, 59, 59, 999);
                        return t.type === 'income' && tDate >= s && tDate <= e;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                const weekExpense = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        tDate.setHours(0, 0, 0, 0);
                        const s = new Date(startOfWeek); s.setHours(0, 0, 0, 0);
                        const e = new Date(endOfWeek); e.setHours(23, 59, 59, 999);
                        return t.type === 'expense' && tDate >= s && tDate <= e;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                incomeData.push(weekIncome);
                expenseData.push(weekExpense);
                forecastData.push(null);

                // --- FORECAST LOGIC (Current Week) ---
                if (i === 0) {
                    const now = new Date();
                    const dayOfWeek = now.getDay(); // 0-6
                    // If mid-week, project end of week
                    if (dayOfWeek < 6) {
                        const daysPassed = dayOfWeek + 1; // 1-7 scale for division
                        const projected = (weekExpense / daysPassed) * 7;

                        forecastData[forecastData.length - 1] = projected;
                        if (forecastData.length >= 2) {
                            forecastData[forecastData.length - 2] = expenseData[expenseData.length - 2];
                        }
                    }
                }
            }
        } else if (timeFrame === 'month') {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const month = d.getMonth();
                const year = d.getFullYear();

                const monthLabel = d.toLocaleString('es-ES', { month: 'short' }) + ' ' + String(year).slice(2);
                labels.push(monthLabel);

                const monthlyIncome = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'income' && tDate.getMonth() === month && tDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                const monthlyExpense = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'expense' && tDate.getMonth() === month && tDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                incomeData.push(monthlyIncome);
                expenseData.push(monthlyExpense);
                forecastData.push(null);

                // --- FORECAST LOGIC (Current Month) ---
                if (i === 0) {
                    const now = new Date();
                    const currentDay = now.getDate();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    if (currentDay < daysInMonth) {
                        const validDay = Math.max(1, currentDay);
                        const projected = (monthlyExpense / validDay) * daysInMonth;

                        forecastData[forecastData.length - 1] = projected;
                        if (forecastData.length >= 2) {
                            forecastData[forecastData.length - 2] = expenseData[expenseData.length - 2];
                        }
                    }
                }
            }
        } else if (timeFrame === 'year') {
            // Last 5 years
            for (let i = 4; i >= 0; i--) {
                const Year = today.getFullYear() - i;
                labels.push(String(Year));

                const yearlyIncome = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'income' && tDate.getFullYear() === Year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                const yearlyExpense = data
                    .filter(t => {
                        const tDate = getLocalTime(t.date);
                        return t.type === 'expense' && tDate.getFullYear() === Year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                incomeData.push(yearlyIncome);
                expenseData.push(yearlyExpense);
                forecastData.push(null);

                // --- FORECAST LOGIC (Current Year) ---
                if (i === 0) {
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

                    if (dayOfYear < 365) {
                        const validDay = Math.max(1, dayOfYear);
                        const projected = (yearlyExpense / validDay) * 365;

                        forecastData[forecastData.length - 1] = projected;
                        if (forecastData.length >= 2) {
                            forecastData[forecastData.length - 2] = expenseData[expenseData.length - 2];
                        }
                    }
                }
            }
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.35,
                    fill: true,
                },
                {
                    label: 'Gastos',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.35,
                    fill: true,
                },
                {
                    label: 'Proyección (Mes)',
                    data: forecastData,
                    borderColor: '#f87171', // Lighter red
                    borderDash: [5, 5],
                    backgroundColor: 'transparent',
                    tension: 0.35,
                    fill: false,
                    pointStyle: 'rectRot',
                    pointRadius: 6,
                    spanGaps: true // Important to connect over nulls if logic allows
                }
            ],
        };
    }, [transactions, timeFrame]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                }
            },
            x: {
                grid: {
                    display: false,
                }
            }
        }
    };

    // if (loading) return ... (Removed, prop driven)

    return (
        <div className="w-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
                <div>
                    <h3 className="font-bold text-lg text-[var(--primary-color)] dark:text-white flex items-center gap-2">
                        Flujo de Caja
                    </h3>
                    <PoweredByGabi size="xs" className="mt-1" />
                </div>
                <div className="flex gap-2 self-start md:self-auto overflow-x-auto max-w-full pb-1">
                    {[
                        { id: 'day', label: 'Diario' },
                        { id: 'week', label: 'Semana' },
                        { id: 'month', label: 'Mes' },
                        { id: 'year', label: 'Año' }
                    ].map((tf) => (
                        <button
                            key={tf.id}
                            onClick={() => onTimeFrameChange(tf.id as any)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap ${timeFrame === tf.id
                                ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                                : 'bg-transparent text-[var(--gray-color)] border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64 md:h-80 w-full relative">
                {chartData && <Line options={{
                    ...options, plugins: {
                        ...options.plugins, legend: {
                            display: false
                        }
                    }
                }} data={chartData} />}
            </div>

            {/* Custom Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-20 border-2 border-emerald-500"></div>
                    <span className="text-gray-600 dark:text-gray-300">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500 opacity-20 border-2 border-red-500"></div>
                    <span className="text-gray-600 dark:text-gray-300">Gastos</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-red-400 border-dashed transform rotate-45"></div>
                    <span className="text-gray-600 dark:text-gray-300">Proyección</span>
                </div>
            </div>
        </div>
    );
}
