"use client";

import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Repeat, AlertTriangle, Crown, Camera, Sparkles } from 'lucide-react';
import SmartScanModal from '@/components/Gabi/SmartScanModal';
import { supabaseService, DBTransaction } from '@/services/supabaseService';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { SUBSCRIPTION_TIERS } from '@/config/subscriptionPlans';
import { useRouter, useSearchParams } from 'next/navigation';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Partial<DBTransaction>; // If present, we are editing
    type?: 'income' | 'expense'; // Pre-set type if creating new
}

export default function TransactionModal({ isOpen, onClose, onSuccess, initialData, type }: TransactionModalProps) {
    const { t } = useLanguage();
    const { tier, features } = useSubscription();
    const [loading, setLoading] = useState(false);

    // Integration Params
    const searchParams = useSearchParams();
    const router = useRouter();


    // Check for returning invoice data ONLY if modal is meant to be open
    // We might need to auto-open modal if params
    // Usually the parent component controls 'isOpen'.
    // If we redirected back, the parent page (e.g. /dashboard/income) needs to see valid params and open the modal.
    // For now, let's assume the user clicks "New Income" again or the page auto-opens it (which requires page level logic).
    // OR we assume the Modal is conditionally rendered.

    // Let's rely on standard isOpen but check params whenever it opens.
    useEffect(() => {
        if (isOpen) {
            const invoiceFolio = searchParams.get('invoiceFolio');
            const updatedAmount = searchParams.get('updatedAmount');
            const isRecover = searchParams.get('recover') === 'true';
            const status = searchParams.get('status');

            // HYDRATE DRAFT DATA (If returning from Invoice Page)
            if (isRecover) {
                const recAmount = searchParams.get('amount');
                const recDesc = searchParams.get('description');
                const recCat = searchParams.get('category');
                const recDate = searchParams.get('date');
                // Restore Tax Flags from URL
                const recIva = searchParams.get('iva') === 'true';
                const recRet = searchParams.get('ret') === 'true';

                if (recAmount) setAmount(recAmount);
                if (recDesc) setDescription(recDesc);
                if (recCat) setCategory(recCat);
                if (recDate) setDate(recDate);
                // Apply Tax Flags
                setIncludesIva(recIva);
                setHasRetention(recRet);
            }

            if (status === 'draft') {
                setShouldAutoSave(true);
            }

            if (invoiceFolio) {
                setHasInvoice(true);
                setInvoiceNumber(invoiceFolio);

                // If amount was updated (net total from invoice), ask or set it
                if (updatedAmount) {
                    setAmount(updatedAmount);
                }

                if (status === 'success') {
                    // Auto-Save Trigger
                    setShouldAutoSave(true);
                    // Do NOT clear params yet, wait for save logic
                } else {
                    toast.success(`✅ Folio ${invoiceFolio} asignado.`);
                }
            }
        }
    }, [isOpen, searchParams]);

    // Fix Date Offset: Initialize with Local Date, not UTC
    // new Date().toISOString() returns UTC, which might be tomorrow.
    // Use a helper to get YYYY-MM-DD in local time.
    const getLocalDate = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        const local = new Date(d.getTime() - offset);
        return local.toISOString().split('T')[0];
    };

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(getLocalDate());
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');
    const [categories, setCategories] = useState<{ id: string, name: string, type: 'income' | 'expense', parent_id?: string | null }[]>([]);
    const [isPaid, setIsPaid] = useState(false); // Default to Not Paid (Pending)

    // Recurring States
    const [isRecurring, setIsRecurring] = useState(false);
    const [dayOfMonth, setDayOfMonth] = useState<number>(new Date().getDate());
    const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly' | 'triweekly'>('monthly');
    const [dayOfWeek, setDayOfWeek] = useState<number>(new Date().getDay());
    const [recurringCount, setRecurringCount] = useState({ income: 0, expense: 0 });

    // Invoice States
    const [hasInvoice, setHasInvoice] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [includesIva, setIncludesIva] = useState(false);
    const [hasRetention, setHasRetention] = useState(false); // ISR 10%
    const [shouldAutoSave, setShouldAutoSave] = useState(false);

    // AI Scan State
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [scanSource, setScanSource] = useState<'camera' | 'photos'>('camera');

    const handleScanComplete = (data: { amount: number; merchant: string; date: string }) => {
        setAmount(data.amount.toFixed(2));
        setDescription(data.merchant);
        // Default category
        setCategory('Otros'); // Or leave empty? 'Otros' is better UX than empty

        // Date handling (Ensure noon local to avoid offset issues)
        // If data.date is ISO, just take the date part
        if (data.date) {
            setDate(data.date.split('T')[0]);
        }

        // Ensure type matches the intent (usually expense for tickets)
        // But if user opened "Income", we stay in Income unless they want otherwise?
        // Receipts are usually Expenses. 
        // If user is in "Income" mode and scans a receipt, it's weird.
        // User asked: "Cuando clico en nuevo ingreso... se abra para tomar foto al ticket"
        // Wait, "Nuevo Ingreso" with a Ticket? Maybe they mean "Income Receipt" or they confused "Income" with "Expense"?
        // Or maybe it's a "Comprobante de Depósito"?
        // Request says: "Nuevo Ingreso... ticket... rellene Monto, Descripcion... Powered by Gabi AI".
        // Use case: Scanning a deposit slip or payment proof.
        // I will respect the current `transType`. If they are in Income, it stays Income.
    };

    // References
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-Scroll Effect
    useEffect(() => {
        if (hasInvoice && bottomRef.current) {
            // Tiny delay to allow animation to start
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [hasInvoice]);

    const handleClose = () => {
        // Clear URL params to ensure next open is fresh
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());

        // Reset State to Defaults
        setAmount('');
        setDescription('');
        setCategory('');
        setIsRecurring(false);
        setHasInvoice(false);
        setInvoiceNumber('');
        setIncludesIva(false);
        setHasRetention(false);
        setDate(getLocalDate());
        if (!initialData) setTransType(type || 'expense');

        onClose();
    };

    // Auto-Save Effect
    useEffect(() => {
        if (shouldAutoSave && amount && category) {
            const executeAutoSave = async () => {
                await handleSubmit();
                // Clear params after successful save attempt
                router.replace(window.location.pathname);
                setShouldAutoSave(false);
            };
            executeAutoSave();
        }
    }, [shouldAutoSave, amount, category]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode
                setAmount(String(initialData.amount));
                setDescription(initialData.description || '');
                setCategory(initialData.category || '');
                setDate(initialData.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
                setTransType(initialData.type || 'expense');
                setIsPaid(initialData.payment_received !== false); // Default true if undefined, or strictly false

                // Load Invoice Data
                setHasInvoice(initialData.has_invoice || false);
                setInvoiceNumber(initialData.invoice_number || '');
                setIncludesIva(initialData.details?.includes_iva || false);
                setHasRetention(initialData.details?.has_retention || false);

                // Load Recurring
                setIsRecurring(initialData.recurring || false);
                // Try to guess day of month from date if not stored on tx? 
                // Tx doesn't store day_of_month, only date.
                const d = new Date(initialData.date || new Date().toISOString());
                setDayOfMonth(d.getDate());
            } else {
                // New Mode
                const params = new URLSearchParams(window.location.search);
                const isRecover = params.get('recover') === 'true';
                const invoiceFolio = params.get('invoiceFolio');
                const updatedAmount = params.get('updatedAmount');

                // Hydrate from URL if returning from Invoice, otherwise default
                setAmount((invoiceFolio && updatedAmount) ? updatedAmount : (isRecover ? (params.get('amount') || '') : ''));
                setDescription(isRecover ? (params.get('description') || '') : '');
                setCategory(isRecover ? (params.get('category') || '') : '');
                setDate(isRecover ? (params.get('date') || getLocalDate()) : getLocalDate());

                // Set Type
                if (isRecover && params.get('type')) {
                    setTransType(params.get('type') as any);
                } else {
                    setTransType(type || 'expense');
                }

                // Reset Recurring
                setIsRecurring(false);
                setDayOfMonth(new Date().getDate());

                // Reset Invoice Defaults or Hydrate
                if (invoiceFolio) {
                    setHasInvoice(true);
                    setInvoiceNumber(invoiceFolio);
                    // Restore Flags
                    setIncludesIva(params.get('iva') === 'true');
                    setHasRetention(params.get('ret') === 'true');
                } else {
                    setHasInvoice(false);
                    setInvoiceNumber('');
                    setIncludesIva(false);
                    setHasRetention(false);
                }
            }

            // Fetch recurring count on open
            supabaseService.getRecurringRules().then(rules => {
                const inc = rules.filter(r => r.type === 'income').length;
                const exp = rules.filter(r => r.type === 'expense').length;
                setRecurringCount({ income: inc, expense: exp });
            });
            supabaseService.getCategories().then(setCategories);
        }
    }, [isOpen, initialData, type]);

    // Derived Calculations for Display
    const getCalculatedTotals = () => {
        // Sanitize amount for calculation
        const val = parseFloat(amount.replace(/,/g, '')) || 0;
        let subtotal = 0;
        let iva = 0;
        let retention = 0;
        let total = 0;

        if (includesIva) {
            // Amount INCLUDES IVA (16%)
            // Total = Subtotal * 1.16
            // Subtotal = Total / 1.16
            subtotal = val / 1.16;
            iva = val - subtotal;
        } else {
            // Amount DOES NOT include IVA.
            // User requested NOT to add it automatically.
            // So Subtotal = Amount, IVA = 0.
            subtotal = val;
            iva = 0;
        }

        // ISR Retention is 1.25% of SUBTOTAL (RESICO)
        retention = hasRetention ? (subtotal * 0.0125) : 0;

        // Net Total = (Subtotal + IVA) - Retention
        // If includesIva, (Sub + IVA) = val.
        // If !includesIva, (Sub + IVA) = val.
        // So essentially: val - retention.
        total = (subtotal + iva) - retention;

        return {
            subtotal,
            iva,
            retention,
            total
        };
    };

    const totals = getCalculatedTotals();

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        // Sanitize Amount (remove commas)
        const cleanAmount = parseFloat(amount.replace(/,/g, ''));

        try {
            if (!cleanAmount || !description || !category) {
                toast.error(t('msg_fill_all'));
                setLoading(false);
                return;
            }

            const txData = {
                amount: cleanAmount,
                description,
                category,
                // Fix Date Offset: Save as Noon Local Time to prevent day shift on UTC conversion
                date: new Date(date + 'T12:00:00').toISOString(),
                type: transType,
                payment_received: isPaid,
                recurring: false,
                // Invoice Fields
                has_invoice: hasInvoice,
                invoice_number: hasInvoice ? invoiceNumber : undefined,
                details: {
                    includes_iva: includesIva,
                    has_retention: hasRetention,
                    calculated_iva: totals.iva,
                    calculated_retention: totals.retention
                }
            };

            // Resolve ID: Either from props (Edit Mode) or URL (Returning from Invoice)
            const targetId = initialData?.id || searchParams.get('txId');

            if (isRecurring && !targetId) {
                // Add Recurring Rule Instead
                await supabaseService.addRecurringRule({
                    type: transType,
                    amount: parseFloat(amount),
                    category,
                    description,
                    day_of_month: Number(dayOfMonth),
                    frequency,
                    day_of_week: dayOfWeek,
                    last_generated: new Date(date + 'T12:00:00').toISOString()
                } as any);
                // Also add immediate transaction? Usually yes first one.
                // Ideally backend handles it or we call addTransaction too.
                // For now, let's just add rule. User can manually add first one or wait for auto-gen?
                // Most apps add first one immediately if date matches or just add rule.
                // Let's add the transaction too so user sees it now.
                const txData = {
                    amount: parseFloat(amount),
                    description,
                    category,
                    // Use selected date for first instance
                    date: new Date(date + 'T12:00:00').toISOString(),
                    type: transType,
                    recurring: true,
                    // Invoice Fields
                    has_invoice: hasInvoice,
                    invoice_number: hasInvoice ? invoiceNumber : undefined,
                    details: {
                        includes_iva: includesIva,
                        has_retention: hasRetention,
                        calculated_iva: totals.iva,
                        calculated_retention: totals.retention
                    }
                };
                await supabaseService.addTransaction(txData);

            } else {
                if (targetId) {
                    // Update Existing
                    await supabaseService.updateTransaction(targetId, {
                        ...txData,
                        recurring: isRecurring // Explicitly set recurring status
                    });

                    // If switching FROM non-recurring TO recurring, create a rule
                    if (isRecurring && (!initialData || !initialData.recurring)) {
                        await supabaseService.addRecurringRule({
                            type: transType,
                            amount: cleanAmount,
                            category,
                            description,
                            day_of_month: Number(dayOfMonth),
                            frequency,
                            day_of_week: dayOfWeek,
                            last_generated: new Date(date + 'T12:00:00').toISOString()
                        } as any);
                    }
                } else {
                    // Create Regular
                    await supabaseService.addTransaction(txData);
                }
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t('msg_error'));
        } finally {
            setLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
                <div className="sticky top-0 z-10 bg-white dark:bg-[#1e293b] flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {initialData ? 'Editar Transacción' : (transType === 'income' ? t('btn_new_income_main') : t('btn_new_expense'))}

                        {!initialData && (
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScanSource('photos');
                                        setIsScanOpen(true);
                                    }}
                                    className="ml-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                    title="Subir foto de ticket"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScanSource('camera');
                                        setIsScanOpen(true);
                                    }}
                                    className="ml-1 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                    title="Escanear con Gabi AI"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>
                        )}
                    </h3>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('lbl_amount')}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                required
                                value={amount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow digits, dots, and commas
                                    if (/^[\d,]*\.?\d*$/.test(val)) {
                                        setAmount(val);
                                    }
                                }}
                                onBlur={() => {
                                    // Strip commas to parse, then format back
                                    const cleanVal = parseFloat(amount.replace(/,/g, '')) || 0;
                                    setAmount(cleanVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                }}
                                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('lbl_description')}</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                            placeholder="Ej. Salario, Renta, Comida..."
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('lbl_category')}</label>
                        <select
                            required
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white appearance-none"
                        >
                            <option value="">Seleccionar categoría...</option>
                            {/* Render Parents without children */}
                            {categories.filter(c => c.type === transType && !c.parent_id && !categories.some(child => child.parent_id === c.id)).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}

                            {/* Render Parents WITH children as OptGroups */}
                            {categories.filter(c => c.type === transType && !c.parent_id && categories.some(child => child.parent_id === c.id)).map(parent => (
                                <optgroup key={parent.id} label={parent.name}>
                                    {categories.filter(c => c.parent_id === parent.id).map(child => (
                                        <option key={child.id} value={child.name}>{child.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('lbl_date')}</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            disabled={isRecurring} // Disable date picker if recurring (relies on day of month)
                            className="w-full px-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark] disabled:opacity-50"
                        />
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPaid"
                            checked={isPaid}
                            onChange={e => setIsPaid(e.target.checked)}
                            className={`w-4 h-4 rounded border-gray-300 focus:ring-blue-500 bg-white dark:bg-slate-700 accent-green-600 ${isPaid ? 'text-green-600' : 'text-gray-400'}`}
                        />
                        <label htmlFor="isPaid" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer flex items-center gap-2">
                            {isPaid ? (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <Check size={16} />
                                    {transType === 'income' ? 'Cobrado' : 'Pagado'}
                                </span>
                            ) : (
                                <span className="text-gray-500">
                                    {transType === 'income' ? 'Por Cobrar (Pendiente)' : 'Por Pagar (Pendiente)'}
                                </span>
                            )}
                        </label>
                    </div>

                    {/* Recurring Option */}
                    <div className={`p-3 rounded-lg border transition-all ${isRecurring ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isRecurring"
                                    checked={isRecurring}
                                    onChange={(e) => {
                                        const isCheck = e.target.checked;
                                        // Check Limits
                                        if (isCheck) {
                                            const limit = transType === 'income' ? features.maxRecurringIncome : features.maxRecurringExpense;
                                            const current = transType === 'income' ? recurringCount.income : recurringCount.expense;

                                            if (limit !== -1 && current >= limit) {
                                                // Block
                                                toast.error(`Has alcanzado el límite de transacciones recurrentes (${limit}) para tu plan ${tier === 'free' ? 'Básico' : tier}. ¡Actualiza a Pro para ilimitados!`);
                                                return;
                                            }
                                        }
                                        setIsRecurring(isCheck);
                                        if (isCheck) {
                                            // Extract day from date
                                            const d = new Date(date + 'T12:00:00'); // safe parsing
                                            if (!isNaN(d.getDate())) setDayOfMonth(d.getDate());
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700 accent-indigo-600"
                                />
                                <label htmlFor="isRecurring" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                                    <Repeat size={16} className={isRecurring ? "text-indigo-500" : "text-gray-400"} />
                                    {transType === 'income' ? 'Es ingreso recurrente' : 'Es gasto recurrente'}
                                </label>
                            </div>

                            {/* Limit Counter */}
                            <div className="text-xs font-medium text-gray-500">
                                {transType === 'income'
                                    ? `${recurringCount.income} / ${features.maxRecurringIncome === -1 ? '∞' : features.maxRecurringIncome}`
                                    : `${recurringCount.expense} / ${features.maxRecurringExpense === -1 ? '∞' : features.maxRecurringExpense}`
                                }
                            </div>
                        </div>

                        {isRecurring && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-3">
                                {/* Frequency Selector */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Frecuencia</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-gray-200"
                                    >
                                        <option value="weekly">Semanal (Cada semana)</option>
                                        <option value="biweekly">Quincenal (Cada 2 semanas)</option>
                                        <option value="triweekly">Cada 3 semanas</option>
                                        <option value="monthly">Mensual (Cada mes)</option>
                                    </select>
                                </div>

                                {/* Dynamic Input based on Frequency */}
                                {frequency === 'monthly' ? (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                            Día del mes (1-31)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={dayOfMonth}
                                            onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold dark:text-white"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                                            Repetir el día:
                                        </label>
                                        <div className="flex justify-between gap-1">
                                            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setDayOfWeek(idx)}
                                                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${dayOfWeek === idx
                                                        ? 'bg-indigo-600 text-white shadow-md scale-110'
                                                        : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-[10px] text-gray-400 mt-1 text-center">
                                    {frequency === 'monthly'
                                        ? `Se generará el día ${dayOfMonth} de cada mes.`
                                        : `Se generará cada ${frequency === 'weekly' ? 'semana' : frequency === 'biweekly' ? '2 semanas' : '3 semanas'} el ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]}.`
                                    }
                                </p>
                            </div>
                        )}
                    </div>


                    {/* INVOICE SECTION (Only for Income) */}
                    {transType === 'income' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-2 border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hasInvoice"
                                    checked={hasInvoice}
                                    onChange={e => setHasInvoice(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 accent-blue-600"
                                />
                                <label htmlFor="hasInvoice" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Emitir Factura
                                </label>
                            </div>

                            {hasInvoice && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Invoice Number */}
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={invoiceNumber}
                                                onChange={e => setInvoiceNumber(e.target.value)}
                                                placeholder="Folio / UUID Factura"
                                                className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            {amount && (
                                                <button
                                                    type="button"
                                                    onClick={async (e) => {
                                                        e.preventDefault();

                                                        // Validate required fields for seamless return
                                                        if (!amount || !category || !description) {
                                                            toast.warning('⚠️ Por favor completa descripción y categoría antes de generar factura.');
                                                            return;
                                                        }

                                                        // Sanitize amount
                                                        const cleanVal = amount.replace(/,/g, '');

                                                        // [BUG FIX] Prevent Duplicates:
                                                        // We must resolve an ID *before* leaving.
                                                        // If it's new, we SAVE it now.
                                                        let currentId = initialData?.id || searchParams.get('txId');

                                                        if (!currentId) {
                                                            try {
                                                                setLoading(true);
                                                                // 1. Create the Transaction first
                                                                const newTx = await supabaseService.addTransaction({
                                                                    amount: parseFloat(cleanVal),
                                                                    description,
                                                                    category,
                                                                    date: new Date(date + 'T12:00:00').toISOString(),
                                                                    type: transType,
                                                                    recurring: false,
                                                                    has_invoice: false, // Not yet
                                                                    payment_received: isPaid // Use user selection
                                                                });
                                                                currentId = newTx.id;
                                                            } catch (err) {
                                                                console.error(err);
                                                                toast.error("Error guardando ingreso previo a facturar.");
                                                                setLoading(false);
                                                                return;
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }

                                                        // Construct Return URL with the ID
                                                        const returnParams = new URLSearchParams({
                                                            recover: 'true',
                                                            amount: cleanVal,
                                                            description: description || '',
                                                            category: category || '',
                                                            date: date || '',
                                                            type: transType,
                                                            iva: includesIva ? 'true' : 'false',
                                                            ret: hasRetention ? 'true' : 'false',
                                                            txId: String(currentId) // Guarantees Update on return
                                                        });
                                                        const returnUrl = `${window.location.pathname}?${returnParams.toString()}`;

                                                        const params = new URLSearchParams({
                                                            source: 'modal',
                                                            amount: cleanVal,
                                                            description: description || 'Ingreso',
                                                            txId: String(currentId), // Guarantees Update in Invoicing
                                                            returnUrl: returnUrl,
                                                            iva: includesIva ? 'true' : 'false',
                                                            ret: hasRetention ? 'true' : 'false'
                                                        });
                                                        router.push(`/dashboard/invoicing?${params.toString()}`);
                                                    }}
                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm whitespace-nowrap flex items-center gap-2"
                                                >
                                                    ⚡ Generar
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                            Tip: Si generas la factura aquí, regresaremos con el folio llenado.
                                        </p>
                                    </div>

                                    {/* Tax Options */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                id="includesIva"
                                                checked={includesIva}
                                                onChange={e => setIncludesIva(e.target.checked)}
                                                className="mt-1 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 accent-blue-600"
                                            />
                                            <label htmlFor="includesIva" className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                                                Monto incluye IVA (16%)
                                            </label>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                id="hasRetention"
                                                checked={hasRetention}
                                                onChange={e => setHasRetention(e.target.checked)}
                                                className="mt-1 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="hasRetention" className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                                                Retención ISR (1.25%)
                                            </label>
                                        </div>
                                    </div>

                                    {/* LIVE CALCULATIONS */}
                                    {amount && (
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                <span>Subtotal:</span>
                                                <span>${totals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                <span>IVA ({includesIva ? '16%' : '0%'}):</span>
                                                <span>${totals.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {hasRetention && (
                                                <div className="flex justify-between text-red-500 dark:text-red-400">
                                                    <span>- Retención ISR (1.25%):</span>
                                                    <span>-${totals.retention.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1 flex justify-between font-bold text-gray-800 dark:text-white">
                                                <span>Neto a Recibir:</span>
                                                <span className="text-green-600">${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Type Toggle (if needed) */}
                    {!initialData && (
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setTransType('expense')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${transType === 'expense'
                                    ? 'bg-white dark:bg-slate-600 text-red-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {t('btn_new_expense')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransType('income')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${transType === 'income'
                                    ? 'bg-white dark:bg-slate-600 text-green-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {t('btn_new_income_main')}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 ${transType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Check size={20} />
                                {initialData ? 'Actualizar' : 'Guardar Transacción'}
                            </>
                        )}
                    </button>
                    <div ref={bottomRef} />
                </form>
            </div >

            <SmartScanModal
                isOpen={isScanOpen}
                initialSource={scanSource}
                onClose={() => setIsScanOpen(false)}
                onSuccess={() => { }} // No-op logic since we use onScanComplete
                onScanComplete={handleScanComplete}
            />
        </div >
    );

    return mounted ? createPortal(modalContent, document.body) : null;
}
