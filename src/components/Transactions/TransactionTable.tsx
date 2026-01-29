"use client";

import React, { useState, useMemo } from 'react';
import { FileEdit, Trash2, CheckCircle, Clock, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PaymentRegistrationModal from '@/components/Modals/PaymentRegistrationModal';
import { DBTransaction } from '@/services/supabaseService';

// Use a loose type for data items to accommodate both DBTransaction and Mock Transaction
// and to avoid "Property 'type' does not exist" errors if the interface is incomplete.
interface TransactionTableProps {
    data: any[];
    type?: 'income' | 'expense';
    limit?: number;
    onDelete?: (id: number | string) => void;
    onEdit?: (item: any) => void;
    onDataChange?: () => void;
}

export default function TransactionTable({ data, type, onDelete, onEdit, onDataChange }: TransactionTableProps) {
    const [filter, setFilter] = useState<'all' | 'month' | 'year' | 'pending' | 'recurring'>('all');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const { t } = useLanguage();

    const openPaymentModal = (transaction: any) => {
        setSelectedTransaction(transaction);
        setPaymentModalOpen(true);
    };

    // Filter Logic
    const filteredData = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        return data.filter(item => {
            const itemDate = new Date(item.date);

            if (filter === 'month') {
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            }
            if (filter === 'year') {
                return itemDate.getFullYear() === currentYear;
            }
            if (filter === 'pending' && type === 'income') {
                return (item.paymentReceived ?? item.payment_received) === false;
            }
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data, filter, type]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        // Fix Timezone Offset: If date string has no time (YYYY-MM-DD), append T12:00:00 to force noon local
        const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
        return new Date(safeDate).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const title = type === 'income' ? t('lbl_income_list') : type === 'expense' ? t('lbl_expense_list') : t('menu_history');

    return (
        <div className="bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">

            {/* Filters Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-2">
                <h3 className="text-lg font-bold text-[var(--text-color)] mr-4 flex items-center gap-2">
                    {title}
                </h3>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[var(--success-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                    >
                        {t('btn_all')}
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === 'month' ? 'bg-[var(--info-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                    >
                        {t('btn_this_month')}
                    </button>
                    <button
                        onClick={() => setFilter('year')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === 'year' ? 'bg-[var(--warning-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                    >
                        {t('btn_this_year')}
                    </button>
                    {type === 'income' && (
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--gray-color)]'}`}
                        >
                            {t('menu_pending')}
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--light-color)] dark:bg-gray-800 text-[var(--gray-color)] border-b border-[var(--border-color)]">
                        <tr>
                            <th className="px-6 py-3 font-semibold">{t('lbl_date')}</th>
                            <th className="px-6 py-3 font-semibold">{t('lbl_description')}</th>
                            <th className="px-6 py-3 font-semibold">{t('lbl_category')}</th>
                            <th className="px-6 py-3 font-semibold">{t('lbl_amount')}</th>
                            {(type === 'income' || !type) && <th className="px-6 py-3 font-semibold">{t('lbl_status')}</th>}
                            <th className="px-6 py-3 font-semibold text-center">Recurrente</th>
                            <th className="px-6 py-3 font-semibold text-right">{t('lbl_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredData.length > 0 ? (
                            filteredData.map((item) => {
                                // Determine styling based on specific item type or prop override
                                const rowType = type || item.type || 'expense';
                                const isIncome = rowType === 'income';
                                const isPaid = item.paymentReceived ?? item.payment_received; // Check both properties

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 text-[var(--text-color)]">{formatDate(item.date)}</td>
                                        <td className="px-6 py-4 font-medium text-[var(--text-color)]">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-[var(--gray-color)]">
                                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-600">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${isIncome ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                                        </td>
                                        {(type === 'income' || !type) && (
                                            <td className="px-6 py-4">
                                                {isIncome ? (
                                                    isPaid ? (
                                                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 px-2 py-1 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                                                            <CheckCircle size={12} /> {t('lbl_paid')}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            onClick={(e) => {
                                                                if (isIncome) {
                                                                    e.stopPropagation();
                                                                    openPaymentModal(item);
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-1 text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30 px-2 py-1 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                                            title="Clic para registrar pago"
                                                        >
                                                            <Clock size={12} /> {t('lbl_pending_status')}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                        )}
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
                                            <div className="flex items-center justify-end gap-2">
                                                {item.paymentReceived === false && type === 'income' && item.type === 'income' && (
                                                    <button
                                                        onClick={() => openPaymentModal(item)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                                                        title="Registrar Cobro"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(item)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <FileEdit size={18} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(item.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-[var(--gray-color)]">
                                    {t('msg_no_transactions')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-[var(--border-color)]">
                {filteredData.length > 0 ? (
                    filteredData.map((item) => {
                        const rowType = type || item.type || 'expense';
                        const isIncome = rowType === 'income';
                        const isPaid = item.paymentReceived ?? item.payment_received;

                        return (
                            <div key={item.id} className="p-4 flex flex-col gap-2 bg-white dark:bg-[var(--card-bg)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-[var(--text-color)] text-sm">{item.description}</p>
                                        <p className="text-xs text-[var(--gray-color)] mt-0.5">{formatDate(item.date)}</p>
                                    </div>
                                    <div className={`font-bold text-sm ${isIncome ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]'}`}>
                                        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-1">
                                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md text-[10px] font-medium border border-gray-200 dark:border-gray-600 truncate max-w-[120px]">
                                        {item.category}
                                    </span>

                                    <div className="flex gap-3">
                                        {/* Actions */}
                                        {item.paymentReceived === false && type === 'income' && item.type === 'income' && (
                                            <button onClick={() => openPaymentModal(item)} className="text-green-600 dark:text-green-400">
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        {onEdit && (
                                            <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-blue-600">
                                                <FileEdit size={18} />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-600">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {type === 'income' && item.type === 'income' && !isPaid && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openPaymentModal(item);
                                        }}
                                        className="text-[10px] text-orange-500 font-semibold flex items-center gap-1 mt-1 cursor-pointer hover:text-orange-600 active:scale-95 transition-transform w-fit"
                                    >
                                        <Clock size={10} /> Pendiente de pago
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="p-8 text-center text-[var(--gray-color)]">
                        {t('msg_no_transactions')}
                    </div>
                )}
            </div>

            {selectedTransaction && (
                <PaymentRegistrationModal
                    isOpen={paymentModalOpen}
                    onClose={() => {
                        setPaymentModalOpen(false);
                        setSelectedTransaction(null);
                    }}
                    pendingTransaction={selectedTransaction}
                    onSuccess={() => {
                        if (onDataChange) {
                            onDataChange();
                        } else {
                            window.location.reload();
                        }
                    }}
                />
            )}
        </div>
    );
}
