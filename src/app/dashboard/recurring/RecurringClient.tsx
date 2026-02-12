"use client";

import React, { useEffect, useState } from 'react';
import { supabaseService } from '@/services/supabaseService';
import { useSubscription } from '@/context/SubscriptionContext';
import { Plus, Trash2, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface RecurringRule {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    day_of_month: number;
    last_generated?: string;
}

export default function RecurringPage() {
    const { features, triggerUpgrade, tier } = useSubscription();
    const [rules, setRules] = useState<RecurringRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        type: 'expense' as 'income' | 'expense',
        amount: '',
        category: '',
        description: '',
        day_of_month: 1
    });

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getRecurringRules();
            setRules(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        // Limit Check
        const currentIncome = rules.filter(r => r.type === 'income').length;
        const currentExpense = rules.filter(r => r.type === 'expense').length;

        if (newItem.type === 'income') {
            if (features.maxRecurringIncome !== -1 && currentIncome >= features.maxRecurringIncome) {
                alert(`Tu plan permite ${features.maxRecurringIncome} ingreso(s) recurrente(s). Actualiza a Pro/Platinum.`);
                triggerUpgrade();
                return;
            }
        } else {
            if (features.maxRecurringExpense !== -1 && currentExpense >= features.maxRecurringExpense) {
                alert(`Tu plan permite ${features.maxRecurringExpense} gasto(s) recurrente(s). Actualiza a Pro/Platinum.`);
                triggerUpgrade();
                return;
            }
        }

        try {
            await supabaseService.addRecurringRule({
                type: newItem.type,
                amount: Number(newItem.amount),
                category: newItem.category || (newItem.type === 'income' ? 'Ingreso Fijo' : 'Gasto Fijo'),
                description: newItem.description,
                day_of_month: Number(newItem.day_of_month)
            });
            setShowAdd(false);
            setNewItem({ type: 'expense', amount: '', category: '', description: '', day_of_month: 1 });
            loadRules();
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta regla recurrente?")) return;
        try {
            await supabaseService.deleteRecurringRule(id);
            loadRules(); // reload
        } catch (error) {
            console.error(error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--dark-color)] dark:text-white flex items-center gap-2">
                        <Clock className="text-blue-500" /> Transacciones Recurrentes
                    </h1>
                    <p className="text-[var(--gray-color)]">Gestiona tus ingresos y gastos fijos automáticos.</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg"
                >
                    <Plus size={20} />
                    Nueva Regla
                </button>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold mb-4 text-gray-800 dark:text-white">Nueva Transacción Recurrente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Tipo</label>
                            <select
                                value={newItem.type}
                                onChange={e => setNewItem({ ...newItem, type: e.target.value as any })}
                                className="w-full p-2 border rounded dark:bg-slate-900 border-gray-300 dark:border-gray-600"
                            >
                                <option value="income">Ingreso</option>
                                <option value="expense">Gasto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Monto</label>
                            <input
                                type="number"
                                value={newItem.amount}
                                onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                                placeholder="0.00"
                                className="w-full p-2 border rounded dark:bg-slate-900 border-gray-300 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Concepto / Categoría</label>
                            <input
                                type="text"
                                value={newItem.category}
                                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                placeholder="Ej. Renta, Netflix, Salario"
                                className="w-full p-2 border rounded dark:bg-slate-900 border-gray-300 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Día del mes (1-31)</label>
                            <input
                                type="number"
                                min="1" max="31"
                                value={newItem.day_of_month}
                                onChange={e => setNewItem({ ...newItem, day_of_month: Number(e.target.value) })}
                                className="w-full p-2 border rounded dark:bg-slate-900 border-gray-300 dark:border-gray-600"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-500 mb-1">Descripción (Opcional)</label>
                            <input
                                type="text"
                                value={newItem.description}
                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                placeholder="Detalles adicionales..."
                                className="w-full p-2 border rounded dark:bg-slate-900 border-gray-300 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                        <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="grid gap-4">
                {rules.map(rule => (
                    <div key={rule.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${rule.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {rule.type === 'income' ? <Plus size={24} /> : <Calendar size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg dark:text-white">{rule.category}</h3>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <Clock size={14} />
                                    <span>Se genera el día {rule.day_of_month} de cada mes</span>
                                </div>
                                {rule.last_generated && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        Última generación: {rule.last_generated}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className={`font-bold text-lg ${rule.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                {rule.type === 'income' ? '+' : '-'}{formatCurrency(rule.amount)}
                            </span>
                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                title="Eliminar regla"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && rules.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <Clock className="mx-auto text-gray-400 mb-2" size={48} />
                        <h3 className="text-gray-500 font-medium">No tienes transacciones recurrentes</h3>
                        <p className="text-gray-400 text-sm">Agrega tus gastos fijos (Renta, Netflix) o ingresos (Sueldo) aquí.</p>
                    </div>
                )}
            </div>

            {/* Limits Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                <AlertCircle className="shrink-0" size={20} />
                <div>
                    <span className="font-bold">Tu Plan: {tier.toUpperCase()}</span>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Ingresos Recurrentes: {features.maxRecurringIncome === -1 ? 'Ilimitados' : `${rules.filter(r => r.type === 'income').length} / ${features.maxRecurringIncome}`}</li>
                        <li>Gastos Recurrentes: {features.maxRecurringExpense === -1 ? 'Ilimitados' : `${rules.filter(r => r.type === 'expense').length} / ${features.maxRecurringExpense}`}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
