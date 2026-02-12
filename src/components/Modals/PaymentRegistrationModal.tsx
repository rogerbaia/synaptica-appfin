"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Calendar, CreditCard, FileText, MessageSquare } from 'lucide-react';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

interface PaymentRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    pendingTransaction: any;
}

export default function PaymentRegistrationModal({ isOpen, onClose, onSuccess, pendingTransaction }: PaymentRegistrationModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Helper for Local Date (YYYY-MM-DD)
    const getLocalDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper for SAT Method Mapping
    const mapSatMethod = (satCodeOrMethod?: string) => {
        if (!satCodeOrMethod) return '';
        const lower = satCodeOrMethod.toLowerCase();
        // Check codes
        if (lower.includes('01') || lower.includes('efectivo')) return 'Efectivo';
        if (lower.includes('02') || lower.includes('cheque')) return 'Cheque';
        if (lower.includes('03') || lower.includes('transferencia')) return 'Transferencia';
        if (lower.includes('04') || lower.includes('tarjeta de crédito') || lower.includes('credito')) return 'Tarjeta Credito';
        if (lower.includes('28') || lower.includes('tarjeta de débito') || lower.includes('debito')) return 'Tarjeta Debito';
        return '';
    };

    // Initialize State from pendingTransaction
    const [paymentDate, setPaymentDate] = useState(getLocalDate());
    const [invoiceNumber, setInvoiceNumber] = useState(pendingTransaction.invoiceNumber || pendingTransaction.details?.folio || '');
    const [paymentMethod, setPaymentMethod] = useState(mapSatMethod(pendingTransaction.details?.method || pendingTransaction.details?.paymentForm || pendingTransaction.details?.payment_form));
    const [observation, setObservation] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Future Date Validation
        const today = getLocalDate();
        if (paymentDate > today) {
            toast.error("No puedes registrar un pago con una fecha futura.");
            return;
        }

        setLoading(true);

        try {
            // Updated Transaction Data
            // We are "paying" it, so we might move it from pending state logic if applicable, 
            // or just update fields. User said "registrar que recibi un pago".
            // Typically this means updating payment_received (if income) or status.
            // Wait, legacy app logic implies we might need to actually process this.
            // For now, let's assume we update the transaction row.

            const updates = {
                date: paymentDate,
                payment_received: true,
                invoice_number: invoiceNumber,
                details: {
                    ...pendingTransaction.details,
                    payment_method: paymentMethod,
                    observation: observation,
                    registered_at: new Date().toISOString()
                }
            };

            await supabaseService.updateTransaction(pendingTransaction.id, updates);

            toast.success('Pago registrado correctamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t('msg_error') || "Error al registrar el pago");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const maxDate = getLocalDate(); // Current day (Local)

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        Registrar Cobro
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                    <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {pendingTransaction.description}
                    </div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        ${pendingTransaction.amount?.toFixed(2)}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Date */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Depósito
                        </label>
                        <input
                            type="date"
                            required
                            max={maxDate}
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark]"
                        />
                        <p className="text-xs text-gray-500">No puede ser una fecha futura.</p>
                    </div>

                    {/* Invoice Number */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <FileText size={16} /> Número de Factura
                        </label>
                        <input
                            type="text"
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                            placeholder="Ej. A-12345"
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <CreditCard size={16} /> Método de Pago
                        </label>
                        <select
                            required
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Tarjeta Debito">Tarjeta Débito</option>
                            <option value="Tarjeta Credito">Tarjeta Crédito</option>
                        </select>
                    </div>

                    {/* Observation */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <MessageSquare size={16} /> Observación
                        </label>
                        <textarea
                            rows={3}
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white resize-none"
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? 'Registrando...' : (
                            <>
                                <Check size={20} />
                                Registrar Pago
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
