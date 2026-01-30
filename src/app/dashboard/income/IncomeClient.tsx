"use client";

import React, { useEffect, useState } from 'react';
import TransactionTable from '@/components/Transactions/TransactionTable';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { PlusCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import TransactionModal from '@/components/Transactions/TransactionModal';
import { toast } from 'sonner';
import { useConfirm } from '@/context/ConfirmContext';
import { useSearchParams } from 'next/navigation';

const mapDBToUI = (txs: DBTransaction[]) => txs.map(t => ({
    id: String(t.id),
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    paymentReceived: t.payment_received,
    recurring: t.recurring,
    hasInvoice: t.has_invoice,
    invoiceNumber: t.invoice_number
}));

export default function IncomePage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { confirm: confirmAction } = useConfirm();
    const searchParams = useSearchParams();
    const [incomes, setIncomes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTx, setEditingTx] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Auto-Open Modal if returning from Invoice Sync
    useEffect(() => {
        if (searchParams.get('invoiceFolio') || searchParams.get('status')) {
            setModalOpen(true);
        }
    }, [searchParams]);

    const fetchTransactions = async () => {
        if (user) {
            // setLoading(true); // create flicker? Maybe only if loading was false? 
            // Better to just fetch and update.
            const txs = await supabaseService.getTransactions();
            const incomeOnly = txs.filter(t => t.type === 'income' && t.category !== 'Factura Cancelada / Oculto');
            setIncomes(mapDBToUI(incomeOnly));
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [user]);



    const handleEdit = (tx: any) => {
        // Map UI tx back to DB format partially or direct
        // Since we mapped mapDBToUI, let's keep it simple.
        // We know structure.
        setEditingTx({
            id: tx.id,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: tx.date,
            type: 'income',
            payment_received: tx.paymentReceived
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: string | number) => {
        const txToDelete = incomes.find(t => t.id === String(id));

        if (txToDelete?.hasInvoice) {
            const isConfirmed = await confirmAction({
                title: "⚠️ Precaución: Factura Asociada",
                message: `Este ingreso está asociado a la Factura Folio: ${txToDelete.invoiceNumber || 'S/N'}.\n\nSe eliminará de tu lista de Ingresos, PERO LA FACTURA NO SE CANCELARÁ ante el SAT.\n\nPara cancelar la factura, debes ir a la sección de "Facturación" > "Emitidas" y cancelarla manualmente.\n\n¿Deseas ocultar el ingreso de esta lista?`,
                confirmText: "Sí, eliminar ingreso",
                cancelText: "Cancelar",
                variant: "warning"
            });

            if (isConfirmed) {
                setLoading(true);
                // Soft Delete: Change status so it disappears from Income List but Invoice remains
                await supabaseService.softDeleteTransaction(id);
                // Refresh
                await supabaseService.softDeleteTransaction(id);
                // Refresh
                await fetchTransactions();
                toast.success("Ingreso eliminado correctamente");
            }
            return;
        }

        const isConfirmed = await confirmAction({
            title: "Eliminar Ingreso",
            message: t('msg_confirm_delete'),
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (isConfirmed) {
            setLoading(true);
            await supabaseService.deleteTransaction(id);
            // Refresh
            await fetchTransactions();
            toast.success("Ingreso eliminado");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <TrendingUp size={32} />
                        {t('menu_income')}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">{t('lbl_income_list')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTx(null);
                        setModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white hover:bg-[#2A476B] transition-colors shadow-md"
                >
                    <PlusCircle size={18} />
                    <span>{t('btn_new_income_main')}</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500">Cargando transacciones...</div>
            ) : (
                <TransactionTable
                    data={incomes}
                    type="income"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDataChange={fetchTransactions}
                />
            )}

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingTx(null);
                }}
                type="income"
                initialData={editingTx}
                onSuccess={() => {
                    setLoading(true);
                    fetchTransactions();
                }}
            />
        </div>
    );
}
