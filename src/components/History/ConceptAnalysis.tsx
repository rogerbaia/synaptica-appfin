"use client";

import React, { useState, useMemo } from 'react';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Tooltip, 
    Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
    Search, 
    TrendingUp, 
    TrendingDown, 
    Award, 
    Activity, 
    ListFilter, 
    DollarSign 
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { DBTransaction } from '@/services/supabaseService';

// Register ChartJS elements for the Bar chart
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ConceptAnalysisProps {
    transactions: DBTransaction[];
}

interface GroupedConcept {
    name: string;
    category: string;
    count: number;
    totalAmount: number;
    avgAmount: number;
}

export default function ConceptAnalysis({ transactions }: ConceptAnalysisProps) {
    const { t, language } = useLanguage();
    const [analysisType, setAnalysisType] = useState<'income' | 'expense'>('expense');
    const [sortBy, setSortBy] = useState<'frequency' | 'amount'>('frequency');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [period, setPeriod] = useState<'all' | 'month' | 'prev-month' | 'year'>('all');

    const prevMonthLabel = useMemo(() => {
        const today = new Date();
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const locale = language === 'es-419' ? 'es-MX' : language;
        const name = prev.toLocaleDateString(locale, { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    }, [language]);

    // 1. Process & group transactions dynamically
    const { groupedData, categories, totalTypeAmount, totalTypeCount } = useMemo(() => {
        if (!transactions) return { groupedData: [], categories: [], totalTypeAmount: 0, totalTypeCount: 0 };

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();

        // Pre-filter by type, period and remove cancelled/hidden CFDI tickets
        const preFiltered = transactions.filter(t => {
            if (t.type !== analysisType) return false;
            
            const cat = (t.category || '').toLowerCase();
            const desc = (t.description || '').toLowerCase();
            const isCancelled =
                cat.includes('cancelada') ||
                cat.includes('oculto') ||
                cat.includes('cancelled') ||
                desc.includes('[cancelado]') ||
                desc.includes('(cancelado)');
                
            if (isCancelled) return false;

            const txDate = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
            if (period === 'month') {
                if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return false;
            } else if (period === 'prev-month') {
                if (txDate.getMonth() !== prevMonth || txDate.getFullYear() !== prevYear) return false;
            } else if (period === 'year') {
                if (txDate.getFullYear() !== currentYear) return false;
            }

            return true;
        });

        // Group by normalized description (trim & lowercase)
        const groups: Record<string, { originalName: string; category: string; count: number; total: number }> = {};
        const catsSet = new Set<string>();
        let sumAmount = 0;

        preFiltered.forEach(t => {
            const rawDesc = (t.description || '').trim();
            if (!rawDesc) return;

            const normalizedKey = rawDesc.toLowerCase();
            const cat = t.category || 'Sin categoría';
            catsSet.add(cat);
            sumAmount += t.amount;

            if (!groups[normalizedKey]) {
                groups[normalizedKey] = {
                    originalName: rawDesc,
                    category: cat,
                    count: 0,
                    total: 0
                };
            }

            groups[normalizedKey].count += 1;
            groups[normalizedKey].total += t.amount;
        });

        // Map to array and calculate averages
        const mappedList: GroupedConcept[] = Object.values(groups).map(g => ({
            name: g.originalName,
            category: g.category,
            count: g.count,
            totalAmount: g.total,
            avgAmount: g.total / g.count
        }));

        // Get unique categories sorted alphabetically
        const uniqueCats = Array.from(catsSet).sort((a, b) => a.localeCompare(b));

        return {
            groupedData: mappedList,
            categories: uniqueCats,
            totalTypeAmount: sumAmount,
            totalTypeCount: preFiltered.length
        };
    }, [transactions, analysisType, period]);

    // 2. Filter & Sort final list
    const processedList = useMemo(() => {
        return groupedData
            .filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                if (sortBy === 'frequency') {
                    // Sort by count desc, then by total desc
                    if (b.count !== a.count) return b.count - a.count;
                    return b.totalAmount - a.totalAmount;
                } else {
                    // Sort by total amount desc, then by count desc
                    if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
                    return b.count - a.count;
                }
            });
    }, [groupedData, searchTerm, selectedCategory, sortBy]);

    // 3. Determine max values to build progress bars
    const { maxCount, maxAmount } = useMemo(() => {
        let maxC = 1;
        let maxA = 1;
        processedList.forEach(item => {
            if (item.count > maxC) maxC = item.count;
            if (item.totalAmount > maxA) maxA = item.totalAmount;
        });
        return { maxCount: maxC, maxAmount: maxA };
    }, [processedList]);

    // 4. Chart configuration (Top 7 concepts)
    const chartData = useMemo(() => {
        const topN = processedList.slice(0, 7);
        const labels = topN.map(item => item.name);
        
        const dataValues = topN.map(item => 
            sortBy === 'frequency' ? item.count : item.totalAmount
        );

        const datasetLabel = sortBy === 'frequency' ? t('lbl_frequency') : (analysisType === 'expense' ? t('lbl_total_spent') : t('lbl_total_received'));
        const activeColor = analysisType === 'expense' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        const activeBorder = analysisType === 'expense' ? '#ef4444' : '#10b981';

        return {
            labels,
            datasets: [
                {
                    label: datasetLabel,
                    data: dataValues,
                    backgroundColor: activeColor,
                    borderColor: activeBorder,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    barThickness: 16
                }
            ]
        };
    }, [processedList, sortBy, analysisType, t]);

    const chartOptions = {
        indexAxis: 'y' as const, // Makes the bar chart horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                titleFont: { size: 13, weight: 'bold' as const },
                bodyFont: { size: 12 },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: function(context: any) {
                        const val = context.raw;
                        if (sortBy === 'amount') {
                            return ` ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)}`;
                        }
                        return ` Repeticiones: ${val}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: { size: 10 }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    font: { size: 11, weight: 'bold' as const },
                    color: 'var(--gray-color)'
                }
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <div className="space-y-6">
            
            {/* Header controls card */}
            <div className="bg-white dark:bg-[var(--card-bg)] p-5 rounded-xl shadow-sm border border-[var(--border-color)] space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Type switch & Sort switch */}
                    <div className="flex flex-wrap gap-3">
                        {/* Income / Expense Toggle */}
                        <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1">
                            <button
                                onClick={() => {
                                    setAnalysisType('expense');
                                    setSelectedCategory('all');
                                }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${analysisType === 'expense'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                <TrendingDown size={14} />
                                {t('title_cat_expense') || 'Gastos'}
                            </button>
                            <button
                                onClick={() => {
                                    setAnalysisType('income');
                                    setSelectedCategory('all');
                                }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${analysisType === 'income'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                <TrendingUp size={14} />
                                {t('title_cat_income') || 'Ingresos'}
                            </button>
                        </div>

                        {/* Sort Switch */}
                        <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1 border border-gray-200/50 dark:border-slate-800">
                            <button
                                onClick={() => setSortBy('frequency')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${sortBy === 'frequency'
                                    ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {t('lbl_by_frequency') || 'Más Frecuentes'}
                            </button>
                            <button
                                onClick={() => setSortBy('amount')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${sortBy === 'amount'
                                    ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {t('lbl_by_amount') || 'Mayor Monto'}
                            </button>
                        </div>

                        {/* Period Filter Toggle */}
                        <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1 border border-gray-200/50 dark:border-slate-800">
                            <button
                                onClick={() => setPeriod('all')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === 'all'
                                    ? 'bg-[var(--success-color)] text-white shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {t('btn_all')}
                            </button>
                            <button
                                onClick={() => setPeriod('month')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === 'month'
                                    ? 'bg-[var(--info-color)] text-white shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {t('btn_this_month')}
                            </button>
                            <button
                                onClick={() => setPeriod('prev-month')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === 'prev-month'
                                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {prevMonthLabel}
                            </button>
                            <button
                                onClick={() => setPeriod('year')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === 'year'
                                    ? 'bg-[var(--warning-color)] text-white shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {t('btn_this_year')}
                            </button>
                        </div>
                    </div>

                    {/* Right: Category filter & Search Input */}
                    <div className="flex flex-wrap items-center gap-3 flex-1 md:justify-end">
                        
                        {/* Category Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="pl-3 pr-8 py-2 text-xs font-semibold bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg outline-none text-[var(--text-color)] focus:ring-2 focus:ring-[var(--primary-color)] appearance-none cursor-pointer"
                            >
                                <option value="all">📁 Todas las Categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ListFilter size={12} />
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-48 md:w-60">
                            <input
                                type="text"
                                placeholder="Buscar concepto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] outline-none dark:text-white placeholder-gray-400"
                            />
                            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                        </div>
                    </div>

                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--gray-color)] bg-purple-50/50 dark:bg-purple-950/10 p-3 rounded-lg border border-purple-100/30">
                    <Activity size={14} className="text-purple-500" />
                    <span>{t('lbl_repeating_info') || 'Encuentra gastos o ingresos repetidos para identificar dónde hay más movimiento.'}</span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left Side: Ranked Concepts List */}
                <div className="lg:col-span-3 bg-white dark:bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm flex flex-col space-y-4">
                    <h3 className="font-bold text-base text-[var(--dark-color)] dark:text-white flex items-center gap-2">
                        <span>📋</span> Escalafón de Conceptos
                        <span className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-semibold text-gray-500 dark:text-gray-400">
                            {processedList.length} conceptos
                        </span>
                    </h3>

                    {processedList.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">
                            No se encontraron conceptos para este filtro
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-color)] max-h-[500px] overflow-y-auto pr-1">
                            {processedList.map((item, index) => {
                                const rank = index + 1;
                                
                                // Determine progress width based on active sorting parameter
                                const relativeValue = sortBy === 'frequency' ? item.count : item.totalAmount;
                                const maxVal = sortBy === 'frequency' ? maxCount : maxAmount;
                                const percentWidth = `${Math.max(5, (relativeValue / maxVal) * 100)}%`;

                                // Color theme configurations
                                const barColor = analysisType === 'expense' 
                                    ? 'bg-red-500/10 dark:bg-red-950/20 text-red-600 border-red-500' 
                                    : 'bg-green-500/10 dark:bg-green-950/20 text-green-600 border-green-500';

                                return (
                                    <div key={item.name} className="py-3.5 group hover:bg-slate-50/50 dark:hover:bg-slate-800/10 rounded-lg px-2 transition-all">
                                        <div className="flex items-start gap-3">
                                            
                                            {/* Rank Badge */}
                                            <div className="shrink-0 pt-0.5">
                                                {rank === 1 ? (
                                                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border border-amber-300 text-amber-600 shadow-sm" title="Top 1">
                                                        <Award size={13} />
                                                    </div>
                                                ) : rank === 2 ? (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 text-slate-500 shadow-sm" title="Top 2">
                                                        <Award size={13} />
                                                    </div>
                                                ) : rank === 3 ? (
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center border border-orange-300 text-orange-600 shadow-sm" title="Top 3">
                                                        <Award size={13} />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-center text-xs font-semibold text-gray-500">
                                                        {rank}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Concept info and progress bars */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-[var(--text-color)] dark:text-gray-200 group-hover:text-[var(--primary-color)] transition-colors truncate">
                                                            {item.name}
                                                        </h4>
                                                        <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 text-[var(--gray-color)] px-2 py-0.5 rounded font-medium border border-gray-200/50 dark:border-slate-800 mt-0.5">
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="text-right">
                                                        <p className="font-extrabold text-sm text-[var(--text-color)] dark:text-white">
                                                            {formatCurrency(item.totalAmount)}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--gray-color)] mt-0.5">
                                                            {item.count} {item.count === 1 ? 'vez' : 'veces'} | Prom: <span className="font-semibold">{formatCurrency(item.avgAmount)}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Relative Progress Bar */}
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden mt-2">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${analysisType === 'expense' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`} 
                                                        style={{ width: percentWidth }}
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Side: Graph representation */}
                <div className="lg:col-span-2 bg-white dark:bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm flex flex-col space-y-4">
                    <div>
                        <h3 className="font-bold text-base text-[var(--dark-color)] dark:text-white">
                            📊 Visualización Gráfica
                        </h3>
                        <p className="text-xs text-[var(--gray-color)] mt-1">
                            Top conceptos según el filtro seleccionado
                        </p>
                    </div>

                    <div className="flex-1 w-full min-h-[300px] lg:min-h-0 relative flex items-center justify-center">
                        {processedList.length === 0 ? (
                            <div className="text-gray-400 text-sm">Sin datos para graficar</div>
                        ) : (
                            <div className="absolute inset-0">
                                <Bar data={chartData} options={chartOptions} />
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
