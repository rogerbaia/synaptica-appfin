"use client";

import React, { useState, useEffect } from 'react';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'sonner';
import { History as HistoryIcon, Download, Trash2, Edit, FileText, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TransactionTable from '@/components/Transactions/TransactionTable';
import TransactionModal from '@/components/Transactions/TransactionModal';

// Helper to map DBTransaction to UI format if needed, or just use DBTransaction directly
// The Table expects DBTransaction now.

export default function HistoryPage() {
    const { t } = useLanguage();
    const { confirm: confirmAction } = useConfirm();
    const [transactions, setTransactions] = useState<DBTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DBTransaction | null>(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    const { features, triggerUpgrade } = useSubscription();

    const checkExportLimit = async () => {
        if (features.maxExports === 0) {
            triggerUpgrade();
            return false;
        }

        if (features.maxExports === -1) return true; // Unlimited

        // Check Monthly Limit
        const metadata = await supabaseService.getUserMetadata();
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        if (metadata.last_export_month === currentMonth) {
            toast.error(`Has alcanzado tu límite de ${features.maxExports} exportación al mes. Actualiza a Platinum para ilimitados.`);
            return false;
        }

        return true;
    };

    const recordExport = async () => {
        if (features.maxExports > 0) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            await supabaseService.updateUserMetadata({ last_export_month: currentMonth });
        }
    }

    const handleExportCSV = async () => {
        if (!(await checkExportLimit())) return;

        if (filteredTransactions.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const headers = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto", "Estado", "Recurrente"];
        const rows = filteredTransactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            `"${t.description.replace(/"/g, '""')}"`,
            t.category || "Sin categoría",
            t.type === 'income' ? "Ingreso" : "Gasto",
            t.amount.toString(),
            t.payment_received ? "Pagado" : "Pendiente",
            t.recurring ? "Si" : "No"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `synaptica_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await recordExport();
        setExportMenuOpen(false);
        toast.success("Exportación a CSV completada");
    };

    const handleExportPDF = async () => {
        if (!(await checkExportLimit())) return;

        if (filteredTransactions.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Reporte de Movimientos - Synaptica", 14, 22);
        doc.setFontSize(11);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30);

        // Table
        const tableColumn = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto", "Estado"];
        const tableRows: any[] = [];

        filteredTransactions.forEach(t => {
            const txData = [
                new Date(t.date).toLocaleDateString(),
                t.description,
                t.category || "N/A",
                t.type === 'income' ? "Ingreso" : "Gasto",
                `$${t.amount.toFixed(2)}`,
                t.payment_received ? "Pagado" : "Pendiente"
            ];
            tableRows.push(txData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        doc.save(`synaptica_report_${new Date().toISOString().split('T')[0]}.pdf`);

        await recordExport();
        setExportMenuOpen(false);
        toast.success("Exportación a PDF completada");
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleEdit = (item: DBTransaction) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleDelete = async (id: number | string) => {
        const isConfirmed = await confirmAction({
            title: "Eliminar Movimiento",
            message: t('msg_confirm_delete'),
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (isConfirmed) {
            const numId = Number(id);
            // Optimistic Update
            setTransactions(prev => prev.filter(t => t.id !== numId));

            try {
                await supabaseService.deleteTransaction(numId);
                toast.success("Movimiento eliminado correctamente");
            } catch (error) {
                console.error(error);
                toast.error(t('msg_error'));
                // Revert/Refresh on error
                fetchTransactions();
            }
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (t.category === 'Factura Cancelada / Oculto') return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                        <HistoryIcon size={32} />
                        {t('menu_history')}
                    </h1>
                    <p className="text-[var(--gray-color)] text-sm mt-1">Historial completo de movimientos</p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setExportMenuOpen(!exportMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Download size={18} />
                        Exportar
                        <ChevronDown size={14} />
                    </button>

                    {exportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-50 py-1">
                            <button
                                onClick={handleExportCSV}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-gray-200"
                            >
                                <FileText size={16} className="text-green-600" />
                                Exportar CSV (Excel)
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-gray-200"
                            >
                                <FileText size={16} className="text-red-500" />
                                Exportar PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg self-start">
                    {(['all', 'income', 'expense'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === type
                                ? 'bg-white dark:bg-slate-700 text-[var(--primary-color)] dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            {type === 'all' ? t('btn_all') : type === 'income' ? t('menu_income') : t('menu_expenses')}
                        </button>
                    ))}
                </div>

                <div className="flex-1">
                    <input
                        type="text"
                        placeholder={t('ph_select')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    />
                </div>
            </div>

            {/* Table Component */}
            <TransactionTable
                data={filteredTransactions}
                limit={100}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDataChange={fetchTransactions}
            />

            {/* Edit Modal */}
            <TransactionModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingItem(null);
                }}
                type={editingItem?.type || "expense"}
                initialData={editingItem || undefined}
                onSuccess={() => {
                    setModalOpen(false);
                    setEditingItem(null);
                    fetchTransactions();
                }}
            />
        </div>
    );
}
