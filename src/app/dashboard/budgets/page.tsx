"use client";

import React, { useEffect, useState } from 'react';
import ProGuard from '@/components/auth/ProGuard';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { PieChart, Save, AlertCircle, CheckCircle, Lock, Info, Trash2 } from 'lucide-react';

interface BudgetData {
    categoryName: string;
    budgetLimit: number; // 0 means no budget
    spent: number;
}

export default function BudgetsPage() {
    return (
        <ProGuard
            title="Presupuestos Mensuales"
            description="Establece límites de gastos para tus categorías y mantén el control de tus finanzas. Esta función es exclusiva para usuarios Pro."
        >
            <BudgetsContent />
        </ProGuard>
    );
}

function BudgetsContent() {
    const { t } = useLanguage();
    const { features, triggerUpgrade } = useSubscription();
    const [loading, setLoading] = useState(true);
    const [budgetItems, setBudgetItems] = useState<BudgetData[]>([]);
    const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({}); // local edit state (string for input)
    const [saving, setSaving] = useState<string | null>(null); // category name currently saving

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [categories, budgets, stats] = await Promise.all([
                supabaseService.getCategories(),
                supabaseService.getBudgets(),
                supabaseService.getDashboardStats() // gets current month transactions potentially, we need to filter
            ]);

            // Filter expense categories
            const expenseCats = categories.filter(c => c.type === 'expense');

            // Calculate spent per category (Current Month)
            // Note: stats.transactions might be ALL transactions depending on getDashboardStats implementation?
            // Checking service: getDashboardStats calls getTransactions() which returns ALL.
            // But we want CURRENT MONTH spend.
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const monthlyExpenses = stats.transactions.filter(t =>
                t.type === 'expense' &&
                new Date(t.date).getMonth() === currentMonth &&
                new Date(t.date).getFullYear() === currentYear
            );

            const items: BudgetData[] = expenseCats.map(cat => {
                const b = budgets.find(b => b.category === cat.name);
                const spent = monthlyExpenses
                    .filter(t => t.category === cat.name)
                    .reduce((sum, t) => sum + t.amount, 0);

                return {
                    categoryName: cat.name,
                    budgetLimit: b ? b.amount : 0,
                    spent
                };
            });

            // SORTING LOGIC: 
            // 1. By Utilization % (Desc) - those closest to or over limit first
            // 2. By Name (Asc) - for those with same utilization
            items.sort(sortBudgetItems);
            setBudgetItems(items);
        } catch (error) {
            console.error("Error loading budget data:", error);
            alert("Error cargando datos: " + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (categoryName: string, amount: number) => {
        // Validation for limits
        const currentActiveBudgets = budgetItems.filter(b => b.budgetLimit > 0 && b.categoryName !== categoryName).length;

        // If user tries to set amount > 0 (activating budget)
        if (amount > 0) {
            // Check limits
            // If active + 1 > max, block.
            // Note: maxBudgets might be -1 (unlimited)
            if (features.maxBudgets !== -1 && (currentActiveBudgets + 1) > features.maxBudgets) {
                // Debug info for user
                const activeNames = budgetItems.filter(b => b.budgetLimit > 0 && b.categoryName !== categoryName).map(b => b.categoryName).join(', ');
                alert(`Has alcanzado el límite de ${features.maxBudgets} presupuestos activos. (Activos detectados: ${currentActiveBudgets}: ${activeNames}). Actualiza a Platinum para ilimitados.`);
                triggerUpgrade();
                return;
            }
        }

        setSaving(categoryName);
        try {
            await supabaseService.upsertBudget(categoryName, amount);
            // Update local state and RE-SORT
            setBudgetItems(prev => {
                const updated = prev.map(item =>
                    item.categoryName === categoryName ? { ...item, budgetLimit: amount } : item
                );
                return updated.sort(sortBudgetItems);
            });
            // Clear edit state for this one to default back to formatted display or standard
            setEditingBudgets(prev => {
                const temp = { ...prev };
                delete temp[categoryName];
                return temp;
            });
        } catch (error) {
            console.error(error);
            alert("Error al guardar el presupuesto: " + (error as any).message);
        } finally {
            setSaving(null);
        }
    };



    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                    <PieChart size={32} />
                    Presupuestos
                    {features.maxBudgets === -1 ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wide">Platinum</span>
                    ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">PRO</span>
                    )}
                </h1>
                <p className="text-[var(--gray-color)] text-sm mt-1">Define límites mensuales por categoría</p>
            </div>

            {features.maxBudgets !== -1 && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-center gap-3 border border-blue-100">
                    <Info size={18} className="text-blue-600 flex-shrink-0" />
                    <span>Tu plan <strong>Pro</strong> te permite {features.maxBudgets} presupuestos. Actualiza a <strong>Platinum</strong> para ilimitado.</span>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando presupuestos...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgetItems.map(item => (
                        <BudgetCard
                            key={item.categoryName}
                            item={item}
                            editingValue={editingBudgets[item.categoryName]}
                            onEdit={(val) => setEditingBudgets(prev => ({ ...prev, [item.categoryName]: val }))}
                            onSave={handleSave}
                            onDelete={() => handleSave(item.categoryName, 0)}
                            isSaving={saving === item.categoryName}
                        />
                    ))}
                </div>
            )}

            {budgetItems.length === 0 && (
                <div className="text-center p-10 text-gray-500 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    No hay categorías de gastos configuradas. Ve a Categorías para agregar algunas.
                </div>
            )}
        </div>
    );
}

function BudgetCard({ item, editingValue, onEdit, onSave, onDelete, isSaving }: {
    item: BudgetData,
    editingValue: string | undefined,
    onEdit: (val: string) => void,
    onSave: (name: string, val: number) => void,
    onDelete: () => void,
    isSaving: boolean
}) {
    const limit = editingValue !== undefined ? Number(editingValue) : item.budgetLimit;
    // If editingValue is defined (user typed), use it. otherwise use item.budgetLimit.
    // wait, input value logic need to be careful.

    // Better: Local state initialized with prop? No, lifted state in parent is editingBudgets.
    // Display value: editingValue ?? item.budgetLimit.

    const displayLimit = editingValue !== undefined ? editingValue : (item.budgetLimit > 0 ? item.budgetLimit.toString() : '');

    // Progress
    const progress = item.budgetLimit > 0 ? Math.min((item.spent / item.budgetLimit) * 100, 100) : 0;
    const isOverBudget = item.budgetLimit > 0 && item.spent > item.budgetLimit;

    // Color
    let colorClass = "bg-blue-500";
    if (progress > 80) colorClass = "bg-yellow-500";
    if (progress >= 100) colorClass = "bg-red-500";

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{item.categoryName}</h3>
                <div className="text-right">
                    <span className={`text-sm font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-500'}`}>
                        {formatCurrency(item.spent)}
                    </span>
                    <span className="text-xs text-gray-400 block">gastado</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">Límite: $</span>
                <input
                    type="text"
                    value={displayLimit}
                    onFocus={() => {
                        // On focus, strip formatting to show raw number for editing
                        // limit is the raw value from props/state? No, displayLimit might be formatted.
                        // We want to convert "1,000.00" -> "1000.00"
                        if (displayLimit) {
                            const raw = displayLimit.replace(/,/g, '');
                            onEdit(raw);
                        }
                    }}
                    onChange={(e) => {
                        // Allow only numbers and one dot
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        // Prevent multiple dots? Simple regex might allow '1.2.3'
                        // Better: 
                        if ((val.match(/\./g) || []).length > 1) return;
                        onEdit(val);
                    }}
                    onBlur={() => {
                        if (displayLimit) {
                            const raw = parseFloat(displayLimit.replace(/,/g, ''));
                            if (!isNaN(raw)) {
                                const formatted = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(raw);
                                onEdit(formatted);
                            }
                        }
                    }}
                    placeholder="0.00"
                    className="w-24 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right"
                />
                <button
                    onClick={() => {
                        // Strip commas before converting to number
                        const cleanVal = displayLimit ? displayLimit.toString().replace(/,/g, '') : '0';
                        onSave(item.categoryName, Number(cleanVal));
                    }}
                    disabled={isSaving}
                    title="Guardar"
                    className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                </button>
                {item.budgetLimit > 0 && (
                    <button
                        onClick={onDelete}
                        disabled={isSaving}
                        title="Eliminar Presupuesto"
                        className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {item.budgetLimit > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                    <span className={`${progress >= 100 ? (item.spent > item.budgetLimit ? 'text-red-500 font-bold' : 'text-orange-500 font-bold') : ''}`}>
                        {item.spent > item.budgetLimit ? '¡Presupuesto Excedido!' : (item.spent === item.budgetLimit ? '¡Límite Alcanzado!' : `${progress.toFixed(0)}% del presupuesto`)}
                    </span>
                    <span>Restante: {formatCurrency(Math.max(item.budgetLimit - item.spent, 0))}</span>
                </div>
            )}
        </div>
    );
}

// Helper for sorting: Active > Inactive > Alphabetical
function sortBudgetItems(a: BudgetData, b: BudgetData) {
    const isActiveA = a.budgetLimit > 0;
    const isActiveB = b.budgetLimit > 0;

    // 1. Active first
    if (isActiveA && !isActiveB) return -1;
    if (!isActiveA && isActiveB) return 1;

    // 2. Alphabetical
    return a.categoryName.localeCompare(b.categoryName);
}
