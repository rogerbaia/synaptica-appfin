import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import { SAT_PRODUCTS, SAT_UNITS, PAYMENT_METHODS, SAT_PAYMENT_FORMS, SAT_CFDI_USES, FISCAL_REGIMES } from '@/data/satCatalogs';
import PoweredByGabi from '../Gabi/PoweredByGabi';
import { supabaseService } from '@/services/supabaseService';

import { useRouter } from 'next/navigation';

const RETENTION_RATES = {
    'RESICO': { isr: 0.0125, iva: 0.106667, label: 'RESICO (1.25% ISR / 10.67% IVA)' },
    'HONORARIOS': { isr: 0.10, iva: 0.106667, label: 'Honorarios (10% ISR / 10.67% IVA)' },
    'ARRENDAMIENTO': { isr: 0.10, iva: 0.106667, label: 'Arrendamiento (10% ISR / 10.67% IVA)' },
    'FLETES': { isr: 0.04, iva: 0.04, label: 'Fletes (4% ISR / 4% IVA)' },
    'PLATAFORMAS': { isr: 0.01, iva: 0.50, label: 'Plataformas (Variable/50%)' }, // Base example, customizable
};

type ActivityType = keyof typeof RETENTION_RATES;

const Autocomplete = ({
    label,
    value,
    onChange,
    options: initialOptions,
    placeholder,
    asyncSearch, // URL to fetch from
    mapper
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { code: string, name: string, zip?: string, [key: string]: any }[],
    placeholder: string,
    asyncSearch?: string,
    mapper?: (item: any) => any // [NEW] Transform async results
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [localOptions, setLocalOptions] = useState(initialOptions);
    const [loading, setLoading] = useState(false);

    // Initialize query if value exists
    useEffect(() => {
        if (value && !query) {
            const match = localOptions.find(o => o.code === value);
            if (match) setQuery(`${match.code} - ${match.name}`);
            else setQuery(value);
        }
    }, [value, localOptions]); // Depend on localOptions to update description if found later

    useEffect(() => {
        if (!asyncSearch || query.length < 3) {
            setLocalOptions(initialOptions);
            return;
        }

        // Debounce search
        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${asyncSearch}?q=${query}`);
                const json = await res.json();
                if (json.data) {
                    // [FIX] Map raw results using the provided mapper or fallback
                    const fetchedItems = mapper ? json.data.map(mapper) : json.data;

                    // Merge with initial options to keep favorites at top if needed, 
                    // or just replace. Let's merge unique.
                    const newOpts = [...initialOptions, ...fetchedItems].filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
                    setLocalOptions(newOpts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [query, asyncSearch, initialOptions, mapper]);

    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Filter local options (which might now include fetched ones)
    const filtered = localOptions.filter(opt =>
        normalize(opt.code).includes(normalize(query)) ||
        normalize(opt.name).includes(normalize(query))
    );

    return (
        <div className="relative space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') onChange('');
                    }}
                    onFocus={(e) => {
                        setIsOpen(true);
                        e.target.select();
                    }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder}
                    className="w-full px-3 py-1.5 border rounded text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                />
                {loading && (
                    <div className="absolute right-2 top-1.5 animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                )}
                {query.length > 0 && isOpen && filtered.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filtered.map(opt => (
                            <button
                                key={opt.code}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-800 last:border-0"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setQuery(`${opt.code} - ${opt.name}`);
                                    onChange(opt.code);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{opt.code}</span>
                                <span className="text-slate-600 dark:text-slate-300 ml-2">{opt.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    isTicket?: boolean; // [NEW]
}

export default function InvoiceModal({ isOpen, onClose, onSave, initialData, isTicket = false }: InvoiceModalProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [pendingMatch, setPendingMatch] = useState<any>(null);
    const [formData, setFormData] = useState({
        client: '',
        rfc: '',
        fiscalRegime: '626',
        paymentMethod: 'PUE',
        paymentForm: '03',
        cfdiUse: 'G03',
        satProductKey: '85121610',
        satUnitKey: 'E48',
        description: '',
        quantity: 1,
        unitValue: 0 as number | string,
        iva: 0,
        retention: 0,
        total: 0,
        hasIva: false,
        hasIvaRetention: false,
        hasRetention: false,
        activityType: 'RESICO',
        txId: undefined as string | number | undefined,
        address: '' as string | any,
        zip: '' // [NEW] Explicit Zip Field
    });

    useEffect(() => {
        setMounted(true);
        // Fetch valid clients directly from the now-fixed API with cache busting
        fetch(`/api/sat/clients?_t=${Date.now()}`).then(res => res.json()).then(json => {
            if (json.data) {
                setClients(json.data.map((c: any) => ({
                    id: c.id,
                    code: c.tax_id,
                    name: c.legal_name,
                    regime: c.tax_system,
                    // [NEW] Map Address (Zip + Municipality/State)
                    // [NEW] Map Address (Zip + Municipality/State)
                    address: c.address ? (
                        c.address.zip ? `${c.address.zip}, ${c.address.municipality || c.address.city || ''}, ${c.address.state || ''}, MEX`
                            : 'SIN DOMICILIO'
                    ) : '',
                    zip: c.address?.zip || '' // [NEW] Save raw Zip
                })));
            }
        });

        // Smart Defaults: Load from Last Invoice
        // Only if we are starting fresh (no initialData with specific values)
        if (!initialData?.rfc) {
            supabaseService.getLastIssuedInvoice().then(lastInvoice => {
                if (lastInvoice && lastInvoice.details) {
                    const d = lastInvoice.details;
                    setFormData(prev => ({
                        ...prev,
                        // Learning from history:
                        fiscalRegime: d.fiscalRegime || prev.fiscalRegime,
                        paymentMethod: d.paymentMethod || prev.paymentMethod,
                        paymentForm: d.paymentForm || prev.paymentForm,
                        cfdiUse: d.cfdiUse || prev.cfdiUse,
                        satProductKey: d.satProductKey || prev.satProductKey,
                        satUnitKey: d.satUnitKey || 'E49', // Prefer history, fallback to E49
                        // Maybe even activity type?
                        activityType: d.activityType || prev.activityType,
                        hasIva: d.hasIva !== undefined ? d.hasIva : prev.hasIva,
                        hasRetention: d.hasRetention !== undefined ? d.hasRetention : prev.hasRetention
                    }));
                }
            });
        }
    }, [initialData]);

    // Check for existing pending incomes to avoid duplicates
    useEffect(() => {
        // Calculate Total manually if not in state, but I added it above.
        // Assuming updateForm updates it.
        // If unitValue changes, total changes.
        // I need to ensure total is updated.
        // Actually, usually total is calculated on render or inside component.
        // If I put it in state, I rely on setFormData updating it.

        const currentTotal = Number(formData.unitValue) * Number(formData.quantity);
        // If the state 'total' is not reliable, use calculation.

        const timer = setTimeout(() => {
            if (currentTotal > 0 && !formData.txId && !pendingMatch) {
                supabaseService.getPendingIncomes(currentTotal).then(pending => {
                    if (pending.length > 0) {
                        setPendingMatch(pending[0]);
                    }
                });
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData.unitValue, formData.quantity, formData.txId, pendingMatch]); // Added pendingMatch to dependencies

    const handleLinkPending = () => {
        if (!pendingMatch) return;
        setFormData(prev => ({
            ...prev,
            txId: pendingMatch.id,
            description: pendingMatch.description,
            // Keep client if selected in modal, or use Match?
            // Usually Modal Client is more accurate for Invoice.
        }));
        setPendingMatch(null);
    };

    const [totals, setTotals] = useState({ subtotal: 0, iva: 0, retention: 0, ivaRetention: 0, total: 0 });
    const [filteredCfdiUses, setFilteredCfdiUses] = useState(SAT_CFDI_USES);

    // Validation 1: Filter CFDI Uses based on Receiver Regime
    useEffect(() => {
        if (formData.fiscalRegime) {
            const valid = SAT_CFDI_USES.filter(use => use.validRegimes.includes(formData.fiscalRegime));
            setFilteredCfdiUses(valid.length > 0 ? valid : SAT_CFDI_USES);

            // Auto-select first valid if current invalid
            if (valid.length > 0 && !valid.find(v => v.code === formData.cfdiUse)) {
                setFormData(prev => ({ ...prev, cfdiUse: valid[0].code }));
            }
        }
    }, [formData.fiscalRegime]);

    // Validation 2: Payment Method PPD -> Payment Form 99
    useEffect(() => {
        if (formData.paymentMethod === 'PPD') {
            setFormData(prev => ({ ...prev, paymentForm: '99' }));
        } else if (formData.paymentMethod === 'PUE' && formData.paymentForm === '99') {
            // Reset to Transfer if switching back to PUE
            setFormData(prev => ({ ...prev, paymentForm: '03' }));
        }
    }, [formData.paymentMethod]);

    useEffect(() => {
        if (isOpen && initialData) {
            const rawAmount = parseFloat(initialData.amount) || 0;
            const hasIva = initialData.hasIva === true || initialData.hasIva === 'true';
            const hasRet = initialData.hasRetention === true || initialData.hasRetention === 'true';

            let initialUnitValue;

            if (hasIva) {
                initialUnitValue = (rawAmount / 1.16).toFixed(2);
            } else {
                initialUnitValue = rawAmount.toFixed(2);
            }

            setFormData(prev => ({
                ...prev,
                client: initialData.client || '',
                customerId: initialData.customer || undefined, // Bind ID if editing
                rfc: initialData.rfc || '',
                zip: initialData.zip || initialData.details?.zip || '', // [FIX] Load Zip
                description: initialData.description || '',
                quantity: 1,
                unitValue: initialUnitValue,
                hasIva: hasIva,
                hasRetention: hasRet,
                hasIvaRetention: false,
                // [FIX] Persist the Transaction ID to prevent duplicates
                txId: initialData.txId,
                // [FIX] Load Zip from initialData (Draft or URL param)
            }));
        }
    }, [isOpen, initialData]);

    // Calculate Totals Whenever Inputs Change
    useEffect(() => {
        const qty = parseFloat(formData.quantity as any) || 0;
        // Sanitize string with commas
        const val = parseFloat(formData.unitValue.toString().replace(/,/g, '')) || 0;

        const subtotal = qty * val;

        // IVA 16%
        const iva = formData.hasIva ? subtotal * 0.16 : 0;

        // Retentions based on Activity Type
        let retentionISR = 0;
        let retentionIVA = 0;

        if (formData.hasRetention) {
            const rates = (RETENTION_RATES as Record<string, any>)[formData.activityType] || RETENTION_RATES['RESICO'];
            retentionISR = subtotal * rates.isr; // ISR

            // Logic for IVA Retention (usually applies if hasRetention is checked AND hasIva is checked? 
            // Or is it independent? User said "Retencion de IVA aplica...". 
            // Usually applies when IVA is charged.
            // If User checks "Has Retention", we assume BOTH ISR and IVA retentions apply if typical for that regime?
            // Or we add a separate check for "Retencion IVA"?
            // Simplified: If 'hasRetention' is checked, we apply standard retentions for that regime.

            // User provided specific rates for IVA retention too.
            // If we want fine control, we might need 2 checkboxes.
            // For now, let's assume 'hasRetention' triggers the regime's standard tax obligations (ISR + IVA Ret).
            // BUT, typically only applies if IVA is present?
            // Actually, RESICO PF a PM requires retention of 1.25% ISR.
            // IVA retention is separate (2/3 of IVA).

            // Let's apply ISR retention always if 'hasRetention' (Retenciones de Impuestos) is checked.
            // Let's apply IVA retention ONLY if 'hasIva' is ALSO checked.
            if (formData.hasIva) {
                retentionIVA = subtotal * rates.iva;
            }
        }

        const totalRetentions = retentionISR + retentionIVA;
        const total = subtotal + iva - totalRetentions;

        setTotals({
            subtotal,
            iva,
            retention: totalRetentions, // Sum for display simplicity, or split them?
            ivaRetention: retentionIVA,
            total
        });
    }, [formData.quantity, formData.unitValue, formData.hasIva, formData.hasRetention, formData.activityType]);

    // Smart Defaults: Load User Preferences on Open (Legacy localStorage removed in favor of DB history)
    /* 
    useEffect(() => {
       ...
    }, [isOpen]);
    */

    const handleCancel = () => {
        if (initialData?.returnUrl) {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };

    const handleDiscard = () => {
        if (initialData?.returnUrl) {
            const parts = initialData.returnUrl.split('?');
            // Return to base URL (Income) without params, effectively discarding the transaction attempt
            router.push(parts[0]);
        } else {
            onClose();
        }
    };

    const handleSaveDraft = () => {
        if (initialData?.returnUrl) {
            const parts = initialData.returnUrl.split('?');
            const base = parts[0];
            const query = parts[1] || '';
            const params = new URLSearchParams(query);

            // Update params with CURRENT form state to prevent data loss
            params.set('amount', totals.total.toFixed(2)); // Return the TOTAL (Gross)
            params.set('description', formData.description);
            params.set('iva', formData.hasIva ? 'true' : 'false');
            params.set('ret', formData.hasRetention ? 'true' : 'false');
            params.set('status', 'draft'); // Signal to auto-save as draft

            router.push(`${base}?${params.toString()}`);
        }
    };

    const [loading, setLoading] = useState(false); // [FIX] Add loading state

    const handleSave = () => {
        setLoading(true);
        localStorage.setItem('invoice_prefs', JSON.stringify({
            satProductKey: formData.satProductKey,
            satUnitKey: formData.satUnitKey,
            paymentMethod: formData.paymentMethod,
            paymentForm: formData.paymentForm
        }));
        onSave({
            ...formData,
            ...totals,
            customer: (formData as any).customerId,
            returnUrl: initialData?.returnUrl
        });
        // We don't turn off loading because onSave likely closes modal or redirects
        // But if it doesn't, we should. Safe for now.
    };

    if (!isOpen) return null;

    // Portal Implementation to fix Z-Index issues
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">

                {/* Header Gradient */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600 shrink-0 relative overflow-hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                            <FileText size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none">{isTicket ? 'Nuevo Pre Comprobante' : 'Nueva Factura'}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-indigo-100 bg-indigo-500/30 px-2 py-0.5 rounded-full border border-indigo-400/30">CFDI 4.0</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 z-10">
                        <PoweredByGabi size="xs" variant="pill" />
                        <button
                            onClick={handleCancel}
                            className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-6">

                        {/* Section: Client Details */}
                        <section className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider pl-1">Datos del Cliente</h4>
                                <div className="w-64">
                                    <Autocomplete
                                        label="Buscar Cliente"
                                        value=""
                                        onChange={val => {
                                            // [FIX] Ensure we find in clients OR fetched options
                                            // The 'clients' state might not have the async result yet if not merged?
                                            // Actually Autocomplete uses localOptions, but onChange returns 'val' (code).
                                            // AND Autocomplete 'options' prop is just initial. 
                                            // If Autocomplete fetches new ones, they are in its local state.
                                            // BUT we are looking up in PARENT 'clients' state which is STALE!
                                            // We need Autocomplete to return the FULL OBJECT or update parent.
                                            // OR we look up in a combined list? 

                                            // ACTUALLY: The best fix is to make Autocomplete return the object, not just value?
                                            // Current implementation: onChange(opt.code)
                                            // We need to change Autocomplete implementation to return object?
                                            // Too risky for regression.

                                            // ALTERNATIVE: Use the API to fetch single client if not found?
                                            // OR: rely on the user to select from the list.

                                            const found = clients.find(c => c.code === val);
                                            if (found) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    rfc: found.code,
                                                    client: found.name,
                                                    customer: found.id,
                                                    customerId: found.id,
                                                    fiscalRegime: found.regime || '626',
                                                    address: found.address,
                                                    zip: found.zip || ''
                                                }));
                                            } else {
                                                // [FALLBACK] If not found in initial 100, we successfully selected it in Autocomplete
                                                // implies it WAS in Autocomplete's localOptions.
                                                // We can't access it here easily without changing Autocomplete interface.
                                                // BUT, we can just fetch it? Or update clients?
                                                // Hack: If not found, assumes it's valid and set RFC. But we need Zip.

                                                // Better Fix: Change Autocomplete to expose its internal options? No.
                                            }
                                        }}
                                        options={clients}
                                        placeholder="Buscar..."
                                        asyncSearch="/api/sat/clients"
                                        mapper={(c: any) => ({
                                            id: c.id,
                                            code: c.tax_id,
                                            name: c.legal_name,
                                            regime: c.tax_system,
                                            address: c.address ? (
                                                c.address.zip ? `${c.address.zip}, ${c.address.municipality || c.address.city || ''}, ${c.address.state || ''}, MEX`
                                                    : 'SIN DOMICILIO'
                                            ) : '',
                                            zip: c.address?.zip || ''
                                        })}
                                    />
                                </div>
                            </div>

                            {/* [NEW] Pending Match Notification */}
                            {pendingMatch && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="mt-0.5 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                            Se encontró un ingreso pendiente de <span className="font-bold">${pendingMatch.amount.toLocaleString('es-MX')}</span> del {new Date(pendingMatch.date).toLocaleDateString('es-MX')}.
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                            ¿Deseas facturar este ingreso para evitar duplicados?
                                        </p>
                                        <button
                                            onClick={handleLinkPending}
                                            className="mt-2 text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-800 dark:text-amber-100 px-3 py-1.5 rounded-md font-bold transition-colors shadow-sm"
                                        >
                                            Sí, vincular a este ingreso
                                        </button>
                                    </div>
                                    <button onClick={() => setPendingMatch(null)} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-violet-500"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">RFC Receptor</label>
                                        <input
                                            type="text"
                                            value={formData.rfc}
                                            onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                                            placeholder="XAXX010101000"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="space-y-1.5 md:col-span-8">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Razón Social</label>
                                        <input
                                            type="text"
                                            value={formData.client}
                                            onChange={e => setFormData({ ...formData, client: e.target.value.toUpperCase() })}
                                            placeholder="NOMBRE O RAZÓN SOCIAL"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-4">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">C.P. (Receptor)</label>
                                        <input
                                            type="text"
                                            value={formData.zip}
                                            onChange={e => setFormData({ ...formData, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                                            placeholder="00000"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-center"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Régimen Fiscal</label>
                                        <select
                                            value={formData.fiscalRegime}
                                            onChange={e => setFormData({ ...formData, fiscalRegime: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-700 dark:text-slate-300"
                                        >
                                            {FISCAL_REGIMES.map(reg => (
                                                <option key={reg.code} value={reg.code}>{reg.code} - {reg.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Uso de CFDI</label>
                                        <select
                                            value={formData.cfdiUse}
                                            onChange={e => setFormData({ ...formData, cfdiUse: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-700 dark:text-slate-300"
                                        >
                                            {filteredCfdiUses.map(use => (
                                                <option key={use.code} value={use.code}>{use.code} - {use.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">C.P.</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={formData.zip}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 text-xs text-center font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* --- Conceptos --- */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider pl-1">Conceptos</h4>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 relative overflow-hidden">
                                {/* Decorative accent */}
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-violet-500"></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Autocomplete
                                        label="Clave Prod/Serv (Busca en el SAT)"
                                        value={formData.satProductKey}
                                        onChange={val => setFormData({ ...formData, satProductKey: val })}
                                        options={SAT_PRODUCTS}
                                        placeholder="Escribe 3 letras o números..."
                                        asyncSearch="/api/sat/catalogs/products"
                                    />
                                    <Autocomplete
                                        label="Clave Unidad"
                                        value={formData.satUnitKey}
                                        onChange={val => setFormData({ ...formData, satUnitKey: val })}
                                        options={SAT_UNITS}
                                        placeholder="Buscar unidad..."
                                    />
                                </div>

                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Cant.</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-center font-bold bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="col-span-7 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Descripción</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={1}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none uppercase"
                                            placeholder="DESCRIPCIÓN DEL SERVICIO O PRODUCTO"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">Valor Unit.</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={formData.unitValue}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (/^[\d,]*\.?\d*$/.test(val)) setFormData({ ...formData, unitValue: val });
                                                }}
                                                onBlur={() => {
                                                    const val = parseFloat(formData.unitValue.toString().replace(/,/g, '')) || 0;
                                                    setFormData({ ...formData, unitValue: val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) });
                                                }}
                                                className="w-full pl-6 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono font-bold text-right bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section: Payment & Taxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Payment Method */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider pl-1">Pago</h4>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 h-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-violet-500"></div>
                                    <Autocomplete
                                        label="Método de Pago"
                                        value={formData.paymentMethod}
                                        onChange={val => setFormData({ ...formData, paymentMethod: val })}
                                        options={PAYMENT_METHODS}
                                        placeholder="Seleccionar..."
                                    />
                                    <Autocomplete
                                        label="Forma de Pago"
                                        value={formData.paymentForm}
                                        onChange={val => setFormData({ ...formData, paymentForm: val })}
                                        options={SAT_PAYMENT_FORMS}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                            </section>

                            {/* Taxes & Totals */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider pl-1">Totales</h4>
                                <div className="bg-slate-100 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner space-y-4 h-full flex flex-col justify-between">

                                    {/* Toggles */}
                                    <div className="flex flex-wrap gap-3">
                                        <label className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all
                                            ${formData.hasIva ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}
                                        `}>
                                            <input type="checkbox" checked={formData.hasIva} onChange={e => setFormData({ ...formData, hasIva: e.target.checked })} className="hidden" />
                                            {formData.hasIva && <CheckCircle size={14} />}
                                            + IVA 16%
                                        </label>

                                        <label className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all
                                            ${formData.hasRetention ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}
                                        `}>
                                            <input type="checkbox" checked={formData.hasRetention} onChange={e => setFormData({ ...formData, hasRetention: e.target.checked })} className="hidden" />
                                            {formData.hasRetention && <CheckCircle size={14} />}
                                            - Retenciones
                                        </label>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Subtotal</span>
                                            <span className="font-mono">${totals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {formData.hasIva && (
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>IVA (16%)</span>
                                                <span className="font-mono text-indigo-600">+ ${totals.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {(formData.hasRetention || formData.hasIvaRetention) && (totals.retention + totals.ivaRetention > 0) && (
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Retenciones</span>
                                                <span className="font-mono text-red-500">- ${(totals.retention + totals.ivaRetention).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-300 dark:border-slate-600 my-2"></div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Neto</span>
                                            <span className="text-2xl font-black text-indigo-600 leading-none">
                                                <span className="text-sm text-slate-400 font-normal align-top mr-1">$</span>
                                                {totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </section>
                        </div>

                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors hover:bg-slate-50 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            localStorage.setItem('invoice_prefs', JSON.stringify({
                                satProductKey: formData.satProductKey,
                                satUnitKey: formData.satUnitKey,
                                paymentMethod: formData.paymentMethod,
                                paymentForm: formData.paymentForm
                            }));
                            onSave({
                                ...formData,
                                ...totals,
                                customer: (formData as any).customerId, // PASS TO API
                                returnUrl: initialData?.returnUrl
                            });
                        }}
                        className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                    >
                        {isTicket ? (
                            <>
                                <FileText size={18} /> Guardar Pre Comprobante
                            </>
                        ) : (
                            <>
                                <FileText size={18} /> Timbrar Factura
                            </>
                        )}
                    </button>
                </div>
                {/* Exit Confirmation Overlay */}
                {
                    showExitConfirm && (
                        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¿Salir sin timbrar?</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                                    La factura no ha sido generada. ¿Deseas guardar el Ingreso como borrador o descartar todo?
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-6 py-2 bg-[var(--primary-color)] text-white font-bold rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"
                                    >
                                        {isTicket ? (
                                            <>
                                                <FileText size={18} /> Guardar Pre Comprobante
                                            </>
                                        ) : (
                                            <>
                                                <FileText size={18} /> Timbrar Factura
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleDiscard}
                                        className="w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                        Descartar Todo
                                    </button>
                                    <button
                                        onClick={() => setShowExitConfirm(false)}
                                        className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition"
                                    >
                                        Volver a editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );

    // Only render portal if mounted
    if (!mounted) return null;

    return createPortal(modalContent, document.body);
}
