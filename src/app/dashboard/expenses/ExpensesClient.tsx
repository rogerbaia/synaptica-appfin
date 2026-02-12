"use client";

import React, { useEffect, useState } from 'react';
import TransactionTable from '@/components/Transactions/TransactionTable';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { MinusCircle, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import TransactionModal from '@/components/Transactions/TransactionModal';

const mapDBToUI = (txs: DBTransaction[]) => txs.map(t => ({
    id: String(t.id),
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    paymentReceived: t.payment_received,
    recurring: t.recurring
}));

export default function ExpensesPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);

    const loadData = () => {
        setLoading(true);
        supabaseService.getTransactions().then(txs => {
            const expenseOnly = txs.filter(t => t.type === 'expense');
            setExpenses(mapDBToUI(expenseOnly));
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                loadData();
            } else {
                setLoading(false);
            }
        }
    }, [user, authLoading]);

    const handleEdit = (tx: any) => {
        setEditingTx({
            id: tx.id,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: tx.date,
            type: 'expense'
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: string | number) => {
        if (confirm(t('msg_confirm_delete'))) {
            await supabaseService.deleteTransaction(id);
            loadData();
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <TrendingDown size={32} />
                        {t('menu_expenses')}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">{t('lbl_expense_list')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTx(null);
                        setModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--danger-color)] text-white hover:bg-red-600 transition-colors shadow-md"
                >
                    <MinusCircle size={18} />
                    <span>{t('btn_new_expense')}</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500">Cargando transacciones...</div>
            ) : (
                <TransactionTable
                    data={expenses}
                    type="expense"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingTx(null);
                }}
                type="expense"
                initialData={editingTx}
                onSuccess={() => {
                    loadData();
                }}
            />
        </div>
    );
}
