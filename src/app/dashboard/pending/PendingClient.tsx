"use client";

import React, { useEffect, useState } from 'react';
import TransactionTable from '@/components/Transactions/TransactionTable';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle, Clock, X } from 'lucide-react';
import PaymentRegistrationModal from '@/components/Modals/PaymentRegistrationModal';

const mapDBToUI = (txs: DBTransaction[]) => txs.map(t => ({
    id: String(t.id),
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    paymentReceived: t.payment_received
    // We need the full object for the modal typically, or at least enough info
    // The modal takes DBTransaction logic, so we might need to pass the raw object or ensure UI map is compatible if mapped back.
    // Actually Modal expects DBTransaction props pendingTransaction.
}));

export default function PendingPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [pendingIncomes, setPendingIncomes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const txs = await supabaseService.getTransactions();
            // Filter for Income AND Not Received
            const pending = txs.filter(t => t.type === 'income' && !t.payment_received);
            // We'll store the raw TX objects mixed with UI props if needed, or just raw for simplicity in this view
            // Actually mapDBToUI reduces fields. Let's start storing raw for the modal usage, 
            // but the table expects specific simple structure? 
            // The custom table below uses item.id, date, description, amount.
            // Let's store raw DBTransaction to pass to Modal easily.
            setPendingIncomes(pending);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterClick = (tx: any) => {
        setSelectedTx(tx);
        setShowModal(true);
    };

    const handleSuccess = () => {
        loadData(); // Refresh list
        setShowModal(false);
        setSelectedTx(null);
    };

    const formatDate = (dateString: string) => {
        const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
        return new Date(safeDate).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <Clock size={32} />
                        {t('menu_pending')}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">Gestiona tus ingresos pendientes de cobro</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--light-color)] dark:bg-gray-800 text-[var(--gray-color)] border-b border-[var(--border-color)]">
                            <tr>
                                <th className="px-6 py-3 font-semibold">{t('lbl_date')}</th>
                                <th className="px-6 py-3 font-semibold">{t('lbl_description')}</th>
                                <th className="px-6 py-3 font-semibold">{t('lbl_amount')}</th>
                                <th className="px-6 py-3 font-semibold text-center">Recurrente</th>
                                <th className="px-6 py-3 font-semibold text-right">{t('lbl_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr>
                            ) : pendingIncomes.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-[var(--gray-color)]">{t('lbl_all_caught_up')}</td></tr>
                            ) : (
                                pendingIncomes.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 text-[var(--text-color)]">{formatDate(item.date)}</td>
                                        <td className="px-6 py-4 font-medium text-[var(--text-color)]">{item.description}</td>
                                        <td className="px-6 py-4 font-bold text-[var(--success-color)]">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.recurring ? (
                                                <div className="flex justify-center">
                                                    <CheckCircle size={18} className="text-green-500" />
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <X size={18} className="text-gray-300" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRegisterClick(item)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors font-medium text-xs"
                                            >
                                                <CheckCircle size={14} />
                                                {t('lbl_paid')}?
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-[var(--border-color)]">
                    {loading ? (
                        <div className="p-6 text-center">Loading...</div>
                    ) : pendingIncomes.length === 0 ? (
                        <div className="p-6 text-center text-[var(--gray-color)]">{t('lbl_all_caught_up')}</div>
                    ) : (
                        pendingIncomes.map(item => (
                            <div key={item.id} className="p-4 flex flex-col gap-2 bg-white dark:bg-[var(--card-bg)]">
                                <div className="flex justify-between items-start">
                                    <div className="max-w-[70%]">
                                        <p className="font-medium text-[var(--text-color)] truncate">{item.description}</p>
                                        <p className="text-xs text-[var(--gray-color)] mt-0.5">{formatDate(item.date)}</p>
                                    </div>
                                    <div className="font-bold text-[var(--success-color)]">
                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.amount)}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2 w-full">
                                    <button
                                        onClick={() => handleRegisterClick(item)}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors font-medium text-xs w-full justify-center active:scale-95 transform duration-150"
                                    >
                                        <CheckCircle size={14} />
                                        Registrar Cobro
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedTx && (
                <PaymentRegistrationModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleSuccess}
                    pendingTransaction={selectedTx}
                />
            )}
        </div>
    );
}
