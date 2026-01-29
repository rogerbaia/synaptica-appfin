import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, CreditCard, MessageSquare, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PaymentRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: {
        id: number | string;
        folio: string;
        client: string;
        total: number;
        rfc?: string;
    } | null;
    onRegister: (data: { date: string; method: string; notes: string; reference?: string; generateRep?: boolean }) => void;
}

export default function PaymentRegistrationModal({ isOpen, onClose, invoice, onRegister }: PaymentRegistrationModalProps) {
    const [date, setDate] = useState('');
    const [method, setMethod] = useState('');
    const [notes, setNotes] = useState('');
    const [reference, setReference] = useState('');
    const [generateRep, setGenerateRep] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen && invoice) {
            // Default to today
            setDate(new Date().toISOString().split('T')[0]);
            setReference(invoice.folio || '');
            setMethod('');
            setNotes('');
            // Auto-check REP if it's typical for PPD (assuming invoice data might indicate it, otherwise default false)
            // Ideally we check invoice.details?.paymentMethod === 'PPD' but we only have minimal invoice data here.
            // We'll verify in parent component or let user decide.
            setGenerateRep(true);
        }
    }, [isOpen, invoice]);

    if (!mounted || !isOpen || !invoice) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRegister({
            date,
            method,
            notes,
            reference,
            generateRep
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Registrar Cobro</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">

                    {/* Invoice Info Summary */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                        <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm mb-1 truncate">{invoice.client}</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* REP Option */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={generateRep}
                                onChange={e => setGenerateRep(e.target.checked)}
                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <div>
                                <span className="block text-sm font-semibold text-slate-800 dark:text-white">Generar Complemento de Pago (REP)</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Requerido para facturas PPD. Se generará un nuevo folio RP.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            Fecha de Depósito
                        </label>
                        <input
                            type="date"
                            required
                            max={new Date().toISOString().split('T')[0]} // Not future
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                        />
                        <p className="text-xs text-slate-400 mt-1 pl-1">No puede ser una fecha futura.</p>
                    </div>

                    {/* Reference / Invoice Number */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            Número de Operación / Referencia
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Ej. Transferencia 12345"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <CreditCard size={16} className="text-slate-400" />
                            Método de Pago
                        </label>
                        <select
                            required
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="03 - Transferencia electrónica">03 - Transferencia electrónica</option>
                            <option value="01 - Efectivo">01 - Efectivo</option>
                            <option value="02 - Cheque nominativo">02 - Cheque nominativo</option>
                            <option value="04 - Tarjeta de crédito">04 - Tarjeta de crédito</option>
                            <option value="28 - Tarjeta de débito">28 - Tarjeta de débito</option>
                            <option value="99 - Por definir">99 - Por definir</option>
                        </select>
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <MessageSquare size={16} className="text-slate-400" />
                            Observación
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detalles adicionales..."
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 transition transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            Registrar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
