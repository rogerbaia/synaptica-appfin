"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/context/ConfirmContext';
import ReactECharts from 'echarts-for-react';
import { Download, FileText, Search, Plus, Mail, CheckCircle, AlertCircle, Clock, FileEdit, Stamp, Trash2, DollarSign, Info, Settings, Store, Calendar, List, Camera, Sparkles, Upload } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import InvoiceModal from '@/components/Invoicing/InvoiceModal';
import InvoicePreview from '@/components/Invoicing/InvoicePreview';
import SuccessModal from '@/components/Invoicing/SuccessModal';
import FiscalClients from '@/components/Settings/FiscalClients';
import TicketUploader from '@/components/Gabi/TicketScanner/TicketUploader';
import TicketCard from '@/components/Gabi/TicketScanner/TicketCard';
import InvoicingModal from '@/components/Gabi/TicketScanner/InvoicingModal';
import { ExtractedTicketData } from '@/services/gabiVisionService';
import { supabaseService } from '@/services/supabaseService';
import PaymentRegistrationModal from '@/components/Invoicing/PaymentRegistrationModal';
import PoweredByGabi from '@/components/Gabi/PoweredByGabi';


// Mock Data for Chart
const CHART_OPTION = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']
    },
    yAxis: { type: 'value' },
    series: [
        {
            name: 'Facturas emitidas',
            type: 'line',
            smooth: true,
            lineStyle: { width: 3, color: '#0284c7' },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: 'rgba(2, 132, 199, 0.3)' }, { offset: 1, color: 'rgba(2, 132, 199, 0.05)' }]
                }
            },
            data: [2, 9, 3, 5, 9, 2, 3, 2, 10, 4]
        }
    ]
};

// Initial Data
// Initial Data
const INITIAL_DRAFTS: any[] = [];
const INITIAL_INVOICES: any[] = [];

function InvoicingContent() {
    const { tier } = useSubscription();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { confirm: confirmAction } = useConfirm(); // Hook usage

    const [activeTab, setActiveTab] = useState<'issued' | 'drafts' | 'clients' | 'tickets' | 'cancelled'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab === 'tickets') return 'tickets';
            if (tab === 'drafts') return 'drafts';
            if (tab === 'clients') return 'clients';
        }
        return 'issued';
    });
    const [invoices, setInvoices] = useState(INITIAL_INVOICES);

    const [paymentModalInvoice, setPaymentModalInvoice] = useState<any>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // [NEW] Refresh Trigger

    useEffect(() => {
        // Find the main scrollable container and scroll to top
        const main = document.querySelector('main');
        if (main) main.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'tickets') setActiveTab('tickets');
        else if (tab === 'issued' || tab === 'drafts' || tab === 'clients') setActiveTab(tab);
    }, [searchParams]);

    // Handle deep link actions (e.g. from Income Modal OR Client List)
    useEffect(() => {
        if (searchParams.get('source') === 'modal') {
            const amount = parseFloat(searchParams.get('amount') || '0');
            const description = searchParams.get('description') || '';
            const returnUrl = searchParams.get('returnUrl') || '';
            // Extract txId to prevent duplicates
            const txId = searchParams.get('txId');

            const includesIva = searchParams.get('iva') === 'true';
            const hasRetention = searchParams.get('ret') === 'true';

            // [NEW] Client Data
            const client = searchParams.get('client') || '';
            const rfc = searchParams.get('rfc') || '';
            const fiscalRegime = searchParams.get('fiscalRegime') || '626';

            setModalData({
                amount: amount.toString(), // Modal expects string
                description,
                returnUrl,
                txId: txId,
                hasIva: includesIva,
                hasRetention: hasRetention,
                // Pre-fill defaults if not provided
                quantity: 1,
                // [NEW]
                client,
                rfc,
                fiscalRegime,
                zip: searchParams.get('zip') || ''
            });
            setIsModalOpen(true);
        }
    }, [searchParams]);

    const [drafts, setDrafts] = useState(INITIAL_DRAFTS);
    const [tickets, setTickets] = useState<{ id: string, data: ExtractedTicketData, img: string, status?: string, created_at?: string }[]>([]);
    const [merchantRules, setMerchantRules] = useState<any[]>([]);
    // [NEW] Tabs for Ticket Section: 'pending' (Default), 'invoiced', 'merchants'
    const [ticketTab, setTicketTab] = useState<'pending' | 'invoiced' | 'merchants'>('pending');
    const [stampingId, setStampingId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    const [dbError, setDbError] = useState<boolean>(false);
    const [facturarTicket, setFacturarTicket] = useState<{ data: ExtractedTicketData, imageUrl: string, mode?: 'invoicing' | 'verification' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [ticketToDelete, setTicketToDelete] = useState<any>(null);
    const [deleteLinkedExpense, setDeleteLinkedExpense] = useState(true);

    // [NEW] Preview State
    const [previewInvoice, setPreviewInvoice] = useState<any>(null);
    const [successModalData, setSuccessModalData] = useState<any>(null);

    const handleDownloadXML = (invoice: any) => {
        if (invoice.xml) {
            const blob = new Blob([invoice.xml], { type: 'text/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.folio}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('El XML no está disponible para esta factura (Simulación).');
        }
    };

    const handlePreview = (invoice: any) => {
        setPreviewInvoice(invoice);
    };

    const loadMerchantRules = async () => {
        try {
            const rules = await supabaseService.getAllMerchantRules();
            setMerchantRules(rules);
        } catch (error) {
            console.error("Error loading rules", error);
        }
    };

    // Filtered Invoiced Tickets
    const invoicedTickets = tickets.filter(t => (!t.status || t.status === 'facturado'));
    const filteredInvoicedTickets = invoicedTickets.filter(ticket =>
        !searchTerm || (ticket.data?.store_name && ticket.data.store_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        // Load tickets from DB
        const loadTickets = async () => {
            try {
                setDbError(false);
                const dbTickets = await supabaseService.getUserTickets();
                setTickets(dbTickets.map(t => ({
                    id: t.id,
                    data: t.extracted_data,
                    img: t.image_path,
                    status: t.status,
                    created_at: t.created_at
                })));
            } catch (error: any) {
                console.error("Error loading tickets", error);
                // Check for "relation does not exist" error (code 42P01 in Postgres/Supabase)
                if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    setDbError(true);
                }
            }
        };

        if (activeTab === 'tickets') {
            loadTickets();
            if (ticketTab === 'merchants') {
                loadMerchantRules();
            }
        }
    }, [activeTab, ticketTab, refreshTrigger]);

    // [NEW] Load Invoices and Drafts from Real DB transactions
    useEffect(() => {
        const loadDocs = async () => {
            try {
                const txs = await supabaseService.getTransactions();

                // Process Drafts (Pre-CFDI)
                const dbDrafts = txs
                    .filter((t: any) => t.category?.includes('Pre-CFDI') || (t.type === 'income' && t.payment_received === false && t.category !== 'Salario' && !t.has_invoice))
                    .map((t: any) => ({
                        id: t.id,
                        folio: 'PRE-' + t.id,
                        date: new Date(t.date).toLocaleDateString('es-MX'), // Original format for table
                        // [NEW] Raw date for preview
                        rawDate: t.date,
                        client: t.description.split(' - ')[0] || 'Cliente',
                        rfc: t.details?.rfc || 'XAXX010101000',
                        total: t.amount,
                        // [FIX] Prioritize details description, then robust split, or fallback
                        description: t.details?.description || (t.description.includes(' - ') && t.description.split(' - ')[1].trim() ? t.description.split(' - ')[1].trim() : (t.description.includes(' - ') ? 'Honorarios Médicos' : t.description)),
                        // [NEW] Full Details for Preview
                        details: {
                            ...t.details,
                            quantity: t.details?.quantity || 1,
                            unitValue: t.details?.unitValue || (t.amount / (t.details?.hasIva ? 1.16 : 1)),
                            subtotal: t.details?.subtotal || (t.amount / (t.details?.hasIva ? 1.16 : 1)),
                            iva: t.details?.iva || (t.details?.hasIva ? t.amount - (t.amount / 1.16) : 0),
                            retention: t.details?.retention || 0,
                            ivaRetention: t.details?.ivaRetention || 0,
                            satProductKey: t.details?.satProductKey || '85121610',
                            satUnitKey: t.details?.satUnitKey || 'E48',
                            paymentMethod: t.details?.paymentMethod || 'PUE',
                            paymentForm: t.details?.paymentForm || '03',
                            cfdiUse: t.details?.cfdiUse || 'G03',
                            fiscalRegime: t.details?.fiscalRegime || '626',
                            originalChain: '|| Simulación de cadena original para pre-visualización ||'
                        },
                        status: 'draft' // Helper status
                    }));
                setDrafts(dbDrafts);

                // Helper for Timezone Safe Date
                const formatSafeDate = (dateString: string) => {
                    const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
                    return new Date(safeDate).toLocaleDateString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                };

                // Process Real Invoices
                const dbInvoices = txs
                    .filter((t: any) => t.has_invoice === true)
                    .map((t: any) => ({
                        id: t.id,
                        folio: t.invoice_number || t.details?.folio || `F-${new Date(t.date).getFullYear()}${t.id.toString().slice(-3)}`, // Preferred Folio Source
                        // [FIX] Use Emission Date (details.date) if available, otherwise Transaction Date
                        date: formatSafeDate(t.details?.date || t.date),
                        // [NEW] Raw Date for Preview (Timezone Safe) - Prioritize Stamp Date
                        rawDate: t.details?.date || (t.date.includes('T') ? t.date : `${t.date}T12:00:00`),
                        client: t.description.split(' - ')[0] || t.details?.client || 'Cliente',
                        rfc: t.details?.rfc || '',
                        total: t.amount,
                        // [FIX] Robust Description Parsing for Invoices
                        description: t.details?.description || (t.description.includes(' - ') && t.description.split(' - ')[1].trim() ? t.description.split(' - ')[1].trim() : (t.description.includes(' - ') ? 'Honorarios Médicos' : t.description)),
                        // If canceled income, show warning status? Or just keep original status but maybe flag it.
                        // User suggestion: "tener una tarja o un mensaje de pendiente cancelar factura"
                        // Or modify status to 'warning'?
                        status: (t.details?.status === 'cancelled')
                            ? 'cancelled'
                            : (t.type === 'void_income' ? 'cancel_required' : (t.payment_received ? 'paid' : 'pending')),
                        uuid: t.details?.uuid || '',
                        sent: false,
                        xml: t.details?.xml || '',
                        details: {
                            ...t.details,
                            // [FIX] Ensure Original Chain is mapped (Check all possible variants)
                            originalChain: t.details?.original_chain || t.details?.originalChain || t.details?.original_string || '|| CADENA NO DISPONIBLE ||',
                            certificateNumber: t.details?.certificate_number || t.details?.certificateNumber || '30001000000500003421',
                            expeditionPlace: t.details?.expedition_place || t.details?.expeditionPlace || '67510',
                            certDate: t.details?.certDate || t.details?.stamp?.date || t.details?.date || new Date().toISOString(),
                            // Ensure description is also in details for table
                            description: t.details?.description || (t.description.includes(' - ') && t.description.split(' - ')[1].trim() ? t.description.split(' - ')[1].trim() : (t.description.includes(' - ') ? 'Honorarios Médicos' : t.description))
                        },
                        isVoidedIncome: t.type === 'void_income' // Helper flag
                    }));

                setInvoices(dbInvoices);
            } catch (e) {
                console.error("Error loading invoicing data", e);
            }
        };

        if (activeTab === 'drafts' || activeTab === 'issued' || activeTab === 'cancelled') {
            loadDocs();
        }
    }, [activeTab, refreshTrigger]);


    const handleStamp = async (id: number) => {
        setStampingId(id);
        try {
            // 1. Fetch full transaction details
            const txs = await supabaseService.getTransactions();
            const draftTx = txs.find(t => t.id === id);

            if (!draftTx) throw new Error("Borrador no encontrado");

            // 2. Prepare Data for Stamping
            // Dynamic defaults based on current payment status
            const isAlreadyPaid = draftTx.payment_received; // Respect user's "Cobrado" toggle
            const defaultMethod = isAlreadyPaid ? 'PUE' : 'PPD';
            const defaultForm = defaultMethod === 'PPD' ? '99' : '03'; // 99 for PPD, 03 (Transfer) default for PUE

            const invoiceData = {
                client: draftTx.description.split(' - ')[0] || 'Cliente Público',
                rfc: draftTx.details?.rfc || 'XAXX010101000',
                fiscalRegime: draftTx.details?.fiscalRegime || '616',
                paymentMethod: draftTx.details?.paymentMethod || defaultMethod,
                paymentForm: draftTx.details?.paymentForm || defaultForm,
                cfdiUse: draftTx.details?.cfdiUse || 'S01',
                satProductKey: '85121600',
                satUnitKey: 'E48',
                description: draftTx.description.split(' - ')[1] || draftTx.description,
                quantity: 1,
                unitValue: draftTx.amount,
                subtotal: draftTx.amount / 1.16,
                iva: draftTx.details?.calculated_iva || (draftTx.amount - (draftTx.amount / 1.16)),
                retention: draftTx.details?.calculated_retention || 0,
                total: draftTx.amount
            };

            // Adjust calculations if stored details are missing (fallback)
            if (!draftTx.details?.calculated_iva) {
                // Recalculate basic
                const sub = Number(invoiceData.total) / 1.16;
                invoiceData.subtotal = sub;
                invoiceData.iva = Number(invoiceData.total) - sub;
            } else {
                invoiceData.subtotal = draftTx.amount - (draftTx.details.calculated_iva || 0);
            }

            console.log("Stamping Draft:", invoiceData);

            // 3. Call SAT Service (Real or Mock via Service)
            const satService = await import('@/services/satService').then(m => m.satService);
            const stamped = await satService.stampInvoice(invoiceData);

            // 4. Update Transaction in DB
            const isPUE = invoiceData.paymentMethod === 'PUE';

            await supabaseService.updateTransaction(id, {
                has_invoice: true,
                invoice_number: stamped.folio,
                details: {
                    ...draftTx.details,
                    ...stamped, // uuid, xml, seals
                    status: isPUE ? 'paid' : 'pending',
                    paymentMethod: invoiceData.paymentMethod, // Persist used method
                    paymentForm: invoiceData.paymentForm
                },
                payment_received: isPUE // Only mark paid if PUE
            });

            toast.success(`✅ Factura ${stamped.folio} timbrada exitosamente`);

            // 5. Refresh UI
            // Reload Invoices logic (simulated by triggering activeTab reload or specific function)
            // But we can just direct set state to avoid full reload delay or duplicate code
            // Actually simplest is to call loadDocs behavior.
            // I'll replicate the refresh logic:
            const updatedTxs = await supabaseService.getTransactions();
            const dbInvoices = updatedTxs
                .filter((t: any) => t.has_invoice === true)
                .map((t: any) => ({
                    id: t.id,
                    folio: t.invoice_number || t.details?.folio || `F-${new Date(t.date).getFullYear()}${t.id.toString().slice(-3)}`,
                    date: new Date(t.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    client: t.description.split(' - ')[0] || t.details?.client || 'Cliente',
                    rfc: t.details?.rfc || '',
                    total: t.amount,
                    status: (t.details?.status === 'cancelled') ? 'cancelled' : (t.payment_received ? 'paid' : 'pending'),
                    uuid: t.details?.uuid || '',
                    sent: false,
                    xml: t.details?.xml || '',
                    details: t.details || {},
                    isVoidedIncome: t.type === 'void_income'
                }));
            setInvoices(dbInvoices);

            // Update Drafts (Remove stamped one)
            // The drafts filter logic in useEffect is: t.category?.includes('Pre-CFDI') || (t.type === 'income' && t.payment_received === false ...)
            // Since we updated payment_received=true and has_invoice=true, it should fall out of drafts filter naturally.
            // We just need to re-run the drafts filter.
            const dbDrafts = updatedTxs
                .filter((t: any) => t.category?.includes('Pre-CFDI') || (t.type === 'income' && t.payment_received === false && t.category !== 'Salario' && !t.has_invoice))
                .map((t: any) => ({
                    id: t.id,
                    folio: 'PRE-' + t.id,
                    date: new Date(t.date).toLocaleDateString('es-MX'),
                    client: t.description.split(' - ')[0] || 'Cliente',
                    rfc: t.details?.rfc || 'XAXX010101000',
                    total: t.amount,
                    description: t.description.split(' - ')[1] || t.description
                }));
            setDrafts(dbDrafts);

            // Optionally switch tab to issued?
            setActiveTab('issued');

        } catch (error: any) {
            console.error("Error finalizing draft", error);
            toast.error(error.message || "Error al sellar el borrador");
        } finally {
            setStampingId(null);
        }
    };

    const handleDeleteDraft = async (id: number) => {
        const isConfirmed = await confirmAction({
            title: "Eliminar Borrador",
            message: "¿Estás seguro de eliminar este borrador?",
            confirmText: "Eliminar",
            cancelText: "Conservar",
            variant: "danger"
        });

        if (isConfirmed) {
            try {
                await supabaseService.deleteTransaction(id);
                setDrafts(prev => prev.filter(d => d.id !== id));
                toast.success("Borrador eliminado permanentemente");
            } catch (error) {
                console.error("Error deleting draft:", error);
                toast.error("Error al eliminar el borrador");
            }
        }
    };




    const handleRegisterPayment = (invoice: any) => {
        if (invoice.status === 'paid' || invoice.status === 'cancelled') return;
        setPaymentModalInvoice(invoice);
    };

    const handleFinalizePayment = async (data: { date: string; method: string; notes: string; reference?: string; generateRep?: boolean }) => {
        if (!paymentModalInvoice) return;

        try {
            // 1. Update Original Transaction to PAID
            await supabaseService.updateTransaction(paymentModalInvoice.id, {
                payment_received: true,
                details: {
                    ...paymentModalInvoice.details,
                    status: 'paid',
                    paymentDate: data.date,
                    paymentMethod: data.method,
                    paymentNotes: data.notes,
                    paymentReference: data.reference
                }
            });

            // 2. Generate REP if requested
            if (data.generateRep) {
                // Import dynamically to avoid circular deps if any
                const satService = await import('@/services/satService').then(m => m.satService);

                const repData = {
                    client: paymentModalInvoice.client,
                    rfc: paymentModalInvoice.rfc,
                    date: data.date,
                    amount: paymentModalInvoice.total,
                    paymentForm: data.method.split(' - ')[0], // Extract code e.g. "03" from "03 - Transferencia..."
                    relatedUuid: paymentModalInvoice.uuid,
                    relatedFolio: paymentModalInvoice.folio,
                    reference: data.reference
                };

                const stampedRep = await satService.stampPaymentSupplement(repData);

                // Save REP as a separate transaction/document record
                // Type: 'rep_issued' so it lists but doesn't sum to income (amount 0 fiscal, but represents payment)
                await supabaseService.createTransaction({
                    user_id: (await supabaseService.getCurrentUser())?.id,
                    amount: 0, // REP itself has 0 value, represents the flow
                    date: new Date().toISOString(),
                    description: `Complemento de Pago - ${paymentModalInvoice.client}`,
                    category: 'Complemento de Pago', // Special category
                    type: 'rep_issued', // New internal type
                    invoice_number: stampedRep.folio,
                    has_invoice: true,
                    payment_received: true,
                    details: {
                        ...stampedRep,
                        client: paymentModalInvoice.client,
                        rfc: paymentModalInvoice.rfc,
                        relatedTo: paymentModalInvoice.id
                    }
                });

                toast.success(`✅ Complemento ${stampedRep.folio} generado.`);
            }

            // 3. Update Local State
            // Reload query logic to see new REP? Or just update Invoice status locally.
            // If we generated a REP, we should probably fetch to show it in list, but optimistic update is faster.
            setInvoices(prev => prev.map(inv =>
                inv.id === paymentModalInvoice.id ? { ...inv, status: 'paid' } : inv
            ));

            if (!data.generateRep) toast.success("✅ Pago registrado correctamente.");
            setPaymentModalInvoice(null);

            // Trigger reload to show new REP in list if we are in 'issued' tab
            // Quick hack: toggle tab or just call effect logic? 
            // We can add the new REP to 'invoices' state if we want immediate feedback.
            // But let's let the user refresh or navigate for now, or use loadDocs if possible.
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al registrar el pago.");
        }
    };

    const handleModalSave = async (data: any) => {
        try {
            // 1. Show processing state (optional if we had a loading UI, but for now just close and optimistic update)
            // Ideally we should have a loading state in the modal, but the modal props uses onSave which closes it.
            // Let's rely on toast or global loading if available, or just proceed.

            // 2. STAMP with SatService
            console.log('Stamping Invoice...', data);

            // Temporarily show "Propcesando..."? 
            // We can keep modal open if we move this logic inside modal, but sticking to current contract:
            setIsModalOpen(false);

            // NOTE: In a real app we'd show a loader here. 
            // Since we closed the modal, let's at least show the user something happened or update list optimistically.

            const stamped = await import('@/services/satService').then(m => m.satService.stampInvoice({
                ...data,
                subtotal: data.subtotal,
                iva: data.iva,
                retention: data.retention,
                total: data.total
            }));

            // 3. Save to DB
            await supabaseService.createInvoice(data, stamped);

            // 4. Update UI
            // Reload Invoices
            const txs = await supabaseService.getTransactions();

            const realInvoices = txs
                .filter((t: any) => t.has_invoice === true)
                .map((t: any) => ({
                    id: t.id,
                    // [FIX] Use Emission Date
                    date: new Date((t.details?.date || (t.date.includes('T') ? t.date : t.date + 'T12:00:00'))).toLocaleDateString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    }),
                    // [FIX] Raw Date for Preview (Timezone Safe)
                    rawDate: typeof t.details?.date === 'object' ? new Date().toISOString() : (t.details?.date || (t.date.includes('T') ? t.date : `${t.date}T12:00:00`)),
                    // [SAFETY] Force String conversion to prevent Object Rendering Crash (Error #31)
                    client: typeof (t.description.split(' - ')[0] || t.details?.client) === 'object' ? 'Nombre Inválido' : (String(t.description.split(' - ')[0] || t.details?.client || 'Cliente')),
                    rfc: typeof t.details?.rfc === 'object' ? 'XAXX010101000' : (String(t.details?.rfc || '')),
                    folio: typeof (t.invoice_number || t.details?.folio) === 'object' ? 'ERR-OBJ' : (String(t.invoice_number || t.details?.folio || `F-${new Date(t.date).getFullYear()}${t.id.toString().slice(-3)}`)),

                    // [SAFETY] Force Number
                    total: typeof t.amount === 'number' ? t.amount : 0,

                    status: t.payment_received ? 'paid' : 'pending',
                    uuid: typeof t.details?.uuid === 'object' ? '' : (String(t.details?.uuid || '')),
                    sent: false,
                    xml: typeof t.details?.xml === 'object' ? '' : (t.details?.xml || ''),
                    details: {
                        ...t.details,
                        // [FIX] Ensure Original Chain is mapped (Check all possible variants)
                        originalChain: typeof (t.details?.original_chain || t.details?.originalChain || t.details?.original_string) === 'object' ? '|| CADENA NO DISPONIBLE ||' : (t.details?.original_chain || t.details?.originalChain || t.details?.original_string || '|| CADENA NO DISPONIBLE ||'),
                        certificateNumber: typeof (t.details?.certificate_number || t.details?.certificateNumber) === 'object' ? '30001000000500003421' : (t.details?.certificate_number || t.details?.certificateNumber || '30001000000500003421'),
                        expeditionPlace: typeof (t.details?.expedition_place || t.details?.expeditionPlace) === 'object' ? '67510' : (t.details?.expedition_place || t.details?.expeditionPlace || '67510'),
                        certDate: t.details?.certDate || t.details?.stamp?.date || t.details?.date || new Date().toISOString(),
                        // Description Fix & Safety
                        description: typeof (t.details?.description || t.description) === 'object' ? 'Descripción inválida' : (t.details?.description || (t.description.includes(' - ') && t.description.split(' - ')[1].trim() ? t.description.split(' - ')[1].trim() : (t.description.includes(' - ') ? 'Honorarios Médicos' : t.description)))
                    }
                }));

            setInvoices(realInvoices);

            setSuccessModalData({
                folio: stamped.folio || data.folio,
                uuid: stamped.uuid,
                total: data.total,
                client: data.client,
                // [FIX] Pass full details for the Preview
                details: {
                    ...data,
                    ...stamped, // Validation info (sello, chain, etc)
                    zip: data.zip, // [FIX] Restore Client Zip (Facturapi returns Expedition Zip at root)
                    address: data.address, // [FIX] Pass full address object/string
                    originalChain: stamped.originalChain || '|| CADENA NO DISPONIBLE ||',
                    // [FIX] Map Issuer CSD (Facturapi usually returns it as 'certificate_number' at root, or we check stamp)
                    certificateNumber: stamped.certificateNumber || '30001000000500003421',
                    expeditionPlace: '67510',
                    // [FIX] Map Certification Date from Stamp, fallback to Emission Date
                    certDate: stamped.date || new Date().toISOString(),
                    date: stamped.date || new Date().toISOString(),
                    paymentForm: data.paymentForm,
                    paymentMethod: data.paymentMethod,
                    cfdiUse: data.cfdiUse,
                    satProductKey: data.satProductKey,
                    satUnitKey: data.satUnitKey,
                    description: data.description,
                    unitValue: data.unitValue,
                    subtotal: data.subtotal,
                    iva: data.iva,
                    retention: data.retention,
                    xml: stamped.xml
                },
                returnUrl: data.returnUrl
            });

        } catch (e: any) {
            console.error('Error stamping', e);
            alert(`Error al timbrar: ${e.message || 'Intente nuevamente'}`);
        }
    };

    const sendEmail = async (invoice: any) => {
        // 1. Get Email
        const email = prompt("Ingrese el correo del cliente para enviar la factura:", "cliente@ejemplo.com");
        if (!email) return;

        const toastId = toast.loading("Enviando factura por correo...");
        try {
            const res = await fetch('/api/sat/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: invoice.uuid || invoice.details?.id || invoice.id,
                    email
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error al enviar');
            }

            toast.success("✅ Enviado al Cliente (y copia a ti)", { id: toastId });

            // Update State (Optimistic)
            setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, sent: true } : inv));

            // Persist
            await supabaseService.updateTransaction(invoice.id, {
                details: { ...invoice.details, sent: true }
            });

        } catch (error: any) {
            console.error(error);
            toast.error(`Error al enviar: ${error.message}`, { id: toastId });
        }
    };

    return (
        <div className="space-y-6 pb-20 relative overflow-x-hidden">
            {/* ... Modal Components ... */}
            <InvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={modalData}
                isTicket={activeTab === 'tickets' || activeTab === 'drafts' || modalData?.isDraft} // [NEW] Mode Prop + Explicit Flag
                onSave={async (data) => {
                    // If in 'tickets' or 'drafts' mode (Pre-Comprobante), skip stamping and just save draft/ticket
                    if (activeTab === 'tickets' || activeTab === 'drafts' || modalData?.isDraft) {
                        try {
                            // 1. Save as Pre-Computante (Draft Ticket)
                            const { error } = await supabaseService.createTransaction({
                                user_id: (await supabaseService.getCurrentUser())?.id,
                                amount: data.total,
                                date: new Date().toISOString(),
                                description: `${data.client} - ${data.description}`,
                                category: 'Pre-CFDI', // Special category for drafts/pre-receipts
                                type: 'income',
                                payment_received: false, // Pending payment usually
                                has_invoice: false, // Not stamped
                                details: {
                                    ...data,
                                    folio: `PRE-${Date.now().toString().slice(-6)}`, // Temp Folio
                                    status: 'pending' // Draft status
                                }
                            });

                            if (error) throw error;

                            toast.success("Pre-Comprobante guardado correctamente");
                            setIsModalOpen(false);
                            setRefreshTrigger(prev => prev + 1); // [NEW] Trigger Reload

                            // Refresh list
                            // Trigger re-fetch logic for drafts or tickets
                            // For now, we rely on the effect to reload on tab change or just close.
                            // Ideal: Update local state. 
                            // Because we are in 'tickets' tab, we might want to switch to 'drafts' or stay here?
                            // User said: "regresar a la lista de pre comprobantes". 
                            // Assuming 'tickets' tab IS 'pre comprobantes' or drafts tab? 
                            // If activeTab is 'tickets', we are viewing tickets. 
                            // Let's close and let the user see it in the list (if we refresh).
                            // We'll trigger a refresh by toggling tab slightly or calling a refresh function if we had one extracted.
                            // For now, simple close is okay as the main effect runs on tab change.
                        } catch (e: any) {
                            console.error(e);
                            toast.error("Error al guardar Pre-Comprobante");
                        }
                        return;
                    }

                    // Standard Stamping Flow
                    handleModalSave(data);
                }}
            />

            <InvoicePreview
                isOpen={!!previewInvoice}
                data={previewInvoice}
                onClose={() => setPreviewInvoice(null)}
                onAction={async (action) => {
                    if (action === 'download' || action === 'print') {
                        window.print();
                    } else if (action === 'cancel') {
                        const isConfirmed = await confirmAction({
                            title: "Cancelar Factura",
                            message: "⚠️ ¿Realmente deseas CANCELAR esta factura ante el SAT?\n\nEsta acción es irreversible y anulará el folio fiscal (UUID).",
                            confirmText: "Sí, Cancelar Factura",
                            cancelText: "No cancelar",
                            variant: "danger"
                        });

                        if (isConfirmed) {
                            try {
                                // 1. Cancel in DB (and SAT if connected)
                                // const reason = prompt('Motivo de cancelación (01, 02, 03, 04):', '02');

                                // Call Service (Mock implementation for "void" logic)
                                await supabaseService.updateTransaction(previewInvoice.id, {
                                    // Update details to remove UUID or mark invalid?
                                    // Or better, set type to 'void_income' or status 'cancelled' in a details field?
                                    // We don't have a status column in DB Transaction, we infer it.
                                    // Let's use the 'details' field to store JSON status.
                                    details: {
                                        ...previewInvoice.details,
                                        status: 'cancelled',
                                        cancellationDate: new Date().toISOString()
                                    }
                                });

                                toast.success('✅ Factura cancelada correctamente.');

                                // Refresh
                                const txs = await supabaseService.getTransactions();
                                // ... (Reuse mapping logic? Ideally refactor to loadInvoices function but for now just force reload by toggling tab or inline refresh)
                                // Let's just optimistic update locally and close
                                setInvoices(prev => prev.map(inv => inv.id === previewInvoice.id ? { ...inv, status: 'cancelled' } : inv));
                                setPreviewInvoice(null);

                            } catch (err) {
                                console.error(err);
                                toast.error('Error al cancelar.');
                            }
                        }
                    } else if (action === 'email') {
                        await sendEmail(previewInvoice);
                    }
                }}
            />








            {/* Header matches ArchivePage style */}
            <SuccessModal
                isOpen={!!successModalData}
                data={successModalData}
                onClose={() => setSuccessModalData(null)}
                onDownload={() => handlePreview(invoices.find(i => i.uuid === successModalData?.uuid))}
                onEmail={() => {
                    const inv = invoices.find(i => i.uuid === successModalData?.uuid);
                    if (inv) sendEmail(inv);
                }}
            />



            {/* Header matches ArchivePage style */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 w-full">
                        {activeTab === 'tickets' ? (
                            <Camera size={32} className="text-[var(--primary-color)] flex-shrink-0" />
                        ) : (
                            <FileText size={32} className="text-[var(--primary-color)] flex-shrink-0" />
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary-color)] flex flex-wrap items-center gap-2 leading-tight">
                            {activeTab === 'tickets'
                                ? (ticketTab === 'invoiced'
                                    ? (
                                        <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                                            <span>Historial Facturado</span>
                                            <span className="text-lg md:text-3xl font-normal text-gray-500 md:text-inherit md:font-bold capitalize">
                                                ({new Date().toLocaleString('es-ES', { month: 'long' })})
                                            </span>
                                        </div>
                                    )
                                    : `Buzón de Tickets`)
                                : 'Emitir CFDI'}
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wide self-start md:self-auto mt-1 md:mt-0">
                                {tier === 'platinum' ? 'Platinum' : 'PRO'}
                            </span>
                        </h1>
                        <Link href="/dashboard/settings#fiscal" className="ml-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition" title="Configuración">
                            <Settings size={20} />
                        </Link>
                    </div>
                    <p className="text-[var(--gray-color)] text-sm mt-1 ml-10">
                        {activeTab === 'tickets'
                            ? 'Organiza tus gastos y solicita facturas automáticamente'
                            : 'Gestiona tus Facturas CFDI y Administra tus clientes'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Only show tabs if NOT in tickets view */}
                    {activeTab !== 'tickets' && (
                        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button
                                onClick={() => setActiveTab('issued')}
                                className={`px-3 py-1.5 font-medium rounded-md text-sm transition ${activeTab === 'issued' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Emitidos
                            </button>
                            <button
                                onClick={() => setActiveTab('drafts')}
                                className={`px-3 py-1.5 font-medium rounded-md text-sm transition flex items-center gap-2 ${activeTab === 'drafts' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Borradores
                                {drafts.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 rounded-full">{drafts.length}</span>}
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`px-3 py-1.5 font-medium rounded-md text-sm transition flex items-center gap-2 ${activeTab === 'clients' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Clientes
                            </button>
                            <button
                                onClick={() => setActiveTab('cancelled')}
                                className={`px-3 py-1.5 font-medium rounded-md text-sm transition flex items-center gap-2 ${activeTab === 'cancelled' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Canceladas
                            </button>
                        </div>
                    )}
                </div>
            </div>


            {/* ... (Banner Info) ... */}

            {/* Content Switcher */}
            {
                (activeTab === 'issued' || activeTab === 'cancelled') ? (
                    // ISSUED VIEW (Chart + List)
                    <>
                        {/* ... (Chart & Cards) ... */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* ... (Keep existing Chart & Card content same) ... */}
                            {/* Chart Card */}
                            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Comprobantes emitidos (12 meses)</h3>
                                <div className="h-64 w-full">
                                    <ReactECharts
                                        option={{
                                            tooltip: { trigger: 'axis' },
                                            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                                            xAxis: {
                                                type: 'category',
                                                boundaryGap: false,
                                                data: Array.from({ length: 12 }, (_, i) => {
                                                    const d = new Date();
                                                    d.setMonth(d.getMonth() - (11 - i));
                                                    return d.toLocaleString('es-MX', { month: 'short', year: 'numeric' });
                                                })
                                            },
                                            yAxis: { type: 'value', minInterval: 1 },
                                            series: [{
                                                name: 'Facturas',
                                                type: 'line',
                                                smooth: true,
                                                lineStyle: { width: 3, color: '#0284c7' },
                                                areaStyle: {
                                                    color: {
                                                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                                        colorStops: [{ offset: 0, color: 'rgba(2, 132, 199, 0.3)' }, { offset: 1, color: 'rgba(2, 132, 199, 0.05)' }]
                                                    }
                                                },
                                                data: Array.from({ length: 12 }, (_, i) => {
                                                    const d = new Date();
                                                    d.setMonth(d.getMonth() - (11 - i));
                                                    const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
                                                    return invoices.filter(inv =>
                                                        inv.status !== 'cancelled' &&
                                                        (inv.date?.includes(monthKey) || new Date(inv.date.split('/').reverse().join('-')).toISOString().includes(monthKey))
                                                    ).length;
                                                })
                                            }]
                                        }}
                                        style={{ height: '100%', width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Notifications / Folios Card */}
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Folios Disponibles</h3>
                                    {(() => {
                                        const currentYear = new Date().getFullYear();
                                        const annualLimit = tier === 'platinum' ? 50 : 5; // 50 for Platinum, 5 for others/trial
                                        const usedThisYear = invoices.filter(inv =>
                                            inv.status !== 'cancelled' &&
                                            (inv.date.includes(currentYear.toString()) || inv.date.endsWith(currentYear.toString().slice(-2)))
                                        ).length;
                                        const remaining = Math.max(0, annualLimit - usedThisYear);
                                        const renewalDate = `01/Ene/${currentYear + 1}`;

                                        return (
                                            <div className={`border rounded-lg p-4 ${remaining < 5 ? 'bg-red-50 border-red-200' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                                                <p className={`text-sm ${remaining < 5 ? 'text-red-800' : 'text-green-800 dark:text-green-300'}`}>
                                                    Tienes <strong>{remaining} folios</strong> disponibles de tu plan anual ({annualLimit}).
                                                    <br />Se renuevan el <strong>{renewalDate}</strong>.
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    <button
                                        onClick={() => router.push('/dashboard/settings#folios')}
                                        className="w-full mt-4 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-semibold transition"
                                    >
                                        Comprar más folios
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setModalData({}); // Empty data for new
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full bg-indigo-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden group cursor-pointer hover:bg-indigo-700 transition text-left"
                                >
                                    <div className="absolute top-4 right-4 z-20">
                                        <PoweredByGabi size="xs" variant="pill" />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-lg mb-1">Nueva Factura</h3>
                                        <p className="text-indigo-100 text-sm mb-4">Emitir CFDI 4.0 manualmente.</p>
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                            <Plus size={24} />
                                        </div>
                                    </div>
                                    <FileText size={120} className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>

                        {/* Invoices List */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* ... (Table Header & Content from original file) ... */}
                            <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center ${activeTab === 'cancelled' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-sky-50 dark:bg-sky-900/10'}`}>
                                <div className="flex items-center gap-2">
                                    <h2 className={`font-bold ${activeTab === 'cancelled' ? 'text-red-800 dark:text-red-300' : 'text-sky-800 dark:text-sky-300'}`}>
                                        {activeTab === 'cancelled' ? 'Comprobantes Cancelados' : 'Comprobantes Emitidos'}
                                    </h2>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-initial">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="Buscar folio, RFC..." className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white dark:border-slate-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`${activeTab === 'cancelled' ? 'bg-red-600' : 'bg-sky-600'} text-white text-xs uppercase font-semibold tracking-wider transition-colors`}>
                                            <th className="px-4 py-3 rounded-tl-lg">Folio</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3">RFC</th>
                                            <th className="px-4 py-3">Cliente</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                            <th className="px-4 py-3 text-center rounded-tr-lg">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                        {invoices
                                            .filter(inv => activeTab === 'cancelled' ? inv.status === 'cancelled' : inv.status !== 'cancelled')
                                            .map((inv) => (
                                                <tr key={inv.id}
                                                    onClick={() => handlePreview(inv)}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors animate-in fade-in cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {inv.folio}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{inv.date}</td>
                                                    <td className="px-4 py-3 text-slate-500">honorarios</td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{inv.rfc}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{inv.client}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-white">
                                                        ${inv.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-2">
                                                            {inv.status === 'paid' && <span title="Timbrado y Pagado"><CheckCircle size={18} className="text-green-500" /></span>}
                                                            {inv.status === 'pending' && <span title="Timbrado (PPD - Por Cobrar)"><CheckCircle size={18} className="text-green-500" /></span>}
                                                            {inv.status === 'cancelled' && <span title="Cancelado"><AlertCircle size={18} className="text-red-500" /></span>}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRegisterPayment(inv); }}
                                                                disabled={inv.status === 'paid' || inv.status === 'cancelled'}
                                                                className={`transition p-1 rounded-full ${inv.status === 'paid' || inv.status === 'cancelled' ? 'cursor-default opacity-100' : 'cursor-pointer hover:bg-green-50 hover:text-green-600'}`}
                                                                title={inv.status === 'paid' ? "Pagado" : "Clic para Registrar Cobro"}
                                                            >
                                                                <DollarSign size={18} className={inv.status === 'paid' ? "text-green-600" : "text-slate-300 dark:text-slate-600"} />
                                                            </button>
                                                            <span className="text-slate-300">|</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePreview(inv); }}
                                                                className="text-slate-400 hover:text-red-500 transition" title="Descargar PDF">
                                                                <FileText size={18} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownloadXML(inv); }}
                                                                className="text-slate-400 hover:text-blue-500 transition" title="Descargar XML">
                                                                <Download size={18} />
                                                            </button>
                                                            <button className={`transition ${inv.sent ? 'text-blue-500' : 'text-slate-300 hover:text-blue-500'}`} title={inv.sent ? "Enviado por correo" : "Enviar por correo"}>
                                                                <Mail size={18} />
                                                            </button>
                                                            {/* [NEW] Delete Button for Cancelled Invoices */}
                                                            {inv.status === 'cancelled' && (
                                                                <>
                                                                    <span className="text-slate-300">|</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm('¿Eliminar este comprobante cancelado de la lista permanentemente?')) {
                                                                                supabaseService.deleteTransaction(inv.id).then(() => {
                                                                                    setInvoices(prev => prev.filter(i => i.id !== inv.id));
                                                                                    toast.success('Comprobante eliminado de la lista.');
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="text-slate-300 hover:text-red-600 transition"
                                                                        title="Eliminar de la lista"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Invoices List (Cards) */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                                {invoices
                                    .filter(inv => activeTab === 'cancelled' ? inv.status === 'cancelled' : inv.status !== 'cancelled')
                                    .map((inv) => (
                                        <div key={inv.id} className="p-4 bg-white dark:bg-slate-800 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{inv.folio}</span>
                                                    <span className="text-xs text-slate-400 border-l pl-2 border-slate-300">{inv.date}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-slate-800 dark:text-white block">${inv.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                                    {inv.client}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {/* Status Indicator */}
                                                    {inv.status === 'paid' && <CheckCircle size={18} className="text-green-500" />}
                                                    {inv.status === 'pending' && <Clock size={18} className="text-amber-500" />}

                                                    <div className="flex gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                        <button className="text-slate-400"><FileText size={18} /></button>
                                                        <button className={inv.sent ? 'text-blue-500' : 'text-slate-300'}><Mail size={18} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </>
                ) : activeTab === 'drafts' ? (
                    // DRAFTS VIEW (Pre-comprobantes)
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-left-4">
                        {/* ... (Drafts content from original file) ... */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-amber-50 dark:bg-amber-900/10">
                            <div className="flex items-center gap-2">
                                <FileEdit className="text-amber-600" />
                                <div>
                                    <h2 className="font-bold text-amber-800 dark:text-amber-300">Pre-comprobantes (Borradores)</h2>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Estos documentos aún no tienen validez fiscal.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setModalData({ isDraft: true }); // [FIX] Explicitly set Draft Mode
                                    setIsModalOpen(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Crear Nuevo Pre-comprobante
                            </button>
                        </div>

                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 text-xs uppercase font-semibold tracking-wider">
                                        <th className="px-4 py-3">Folio (Temp)</th>
                                        <th className="px-4 py-3">Fecha Creación</th>
                                        <th className="px-4 py-3">Cliente</th>
                                        <th className="px-4 py-3">Descripción</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {drafts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                                No hay pre-comprobantes pendientes.
                                            </td>
                                        </tr>
                                    ) : (
                                        drafts.map((draft) => (
                                            <tr key={draft.id}
                                                onClick={() => handlePreview(draft)} // [NEW] Open Preview
                                                className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                                                    {draft.folio}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{draft.date}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800 dark:text-white">{draft.client}</p>
                                                    <p className="text-xs text-slate-500">{draft.rfc}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 italic">
                                                    {draft.description}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-white font-bold">
                                                    ${draft.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => handleStamp(draft.id)}
                                                            disabled={stampingId === draft.id}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all
                                                            ${stampingId === draft.id
                                                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
                                                                }`}
                                                        >
                                                            <Stamp size={14} />
                                                            {stampingId === draft.id ? 'Sellando...' : 'SELLAR'}
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setModalData({
                                                                    clientName: draft.client,
                                                                    rfc: draft.rfc,
                                                                    amount: draft.total, // Modal expects 'amount'
                                                                    concept: draft.description,
                                                                    folio: draft.folio,
                                                                    isDraft: true, // Flag for modal context
                                                                    draftId: draft.id
                                                                });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="text-slate-400 hover:text-blue-500 transition"
                                                            title="Editar Borrador"
                                                        >
                                                            <FileEdit size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteDraft(draft.id)}
                                                            className="text-slate-400 hover:text-red-500 transition"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Drafts List (Cards) */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                            {drafts.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No hay borradores.
                                </div>
                            ) : (
                                drafts.map((draft) => (
                                    <div key={draft.id} className="p-4 bg-white dark:bg-slate-800 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{draft.folio}</span>
                                                    <span className="text-xs text-slate-400">{draft.date}</span>
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white mt-1 text-sm">{draft.client}</p>
                                                <p className="text-xs text-slate-500 italic">{draft.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-indigo-600 block">${draft.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <button
                                                onClick={() => handleStamp(draft.id)}
                                                disabled={stampingId === draft.id}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs shadow-sm transition-all
                                                            ${stampingId === draft.id
                                                        ? 'bg-gray-100 text-gray-400'
                                                        : 'bg-indigo-600 text-white active:scale-95'
                                                    }`}
                                            >
                                                <Stamp size={14} />
                                                {stampingId === draft.id ? 'Sellando...' : 'TIMBRAR'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setModalData({
                                                        clientName: draft.client,
                                                        rfc: draft.rfc,
                                                        amount: draft.total,
                                                        concept: draft.description,
                                                        folio: draft.folio,
                                                        isDraft: true,
                                                        draftId: draft.id
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-500"
                                            >
                                                <FileEdit size={18} />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteDraft(draft.id)}
                                                className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                ) : activeTab === 'tickets' ? (
                    // TICKETS SCANNER VIEW
                    <div className="animate-in fade-in space-y-6">
                        {/* Header & Tabs */}
                        {/* Header */}
                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                            <div className="relative z-10">
                                <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
                                    <Sparkles size={18} className="text-yellow-300" />
                                    Buzón de Tickets Inteligente
                                </h2>
                                <p className="text-indigo-100 max-w-lg text-sm mb-2">
                                    {ticketTab === 'pending' && "Sube fotos de tus tickets de compra. Gabi analizará el comercio, monto y folio, y te llevará directo al portal de facturación."}
                                    {ticketTab === 'invoiced' && "Consulta el historial de tus facturas generadas. Utiliza el buscador para filtrar por comercio y encontrar rápidamente tus comprobantes."}
                                    {ticketTab === 'merchants' && "Gestiona los comercios guardados. Edita los nombres o elimina reglas de extracción para personalizar tu experiencia."}
                                </p>
                                <div className="flex justify-end mt-2 md:mt-0 md:absolute md:bottom-3 md:right-4 z-20">
                                    <span className="text-xs text-white/90 font-medium flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10 shadow-sm">
                                        <Sparkles size={12} className="text-yellow-300" />
                                        Powered by Gabi AI
                                    </span>
                                </div>
                            </div>
                            <Camera size={140} className="absolute -right-6 -bottom-8 text-white/10 rotate-12" />
                        </div>

                        {/* Tabs & Controls */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                {ticketTab === 'pending' && <List className="text-orange-500" size={20} />}
                                {ticketTab === 'invoiced' && <CheckCircle className="text-green-500" size={20} />}
                                {ticketTab === 'merchants' && <Store className="text-blue-500" size={20} />}

                                {ticketTab === 'pending' && "Tickets Pendientes"}
                                {ticketTab === 'invoiced' && "Historial Facturado"}
                                {ticketTab === 'merchants' && "Gestión de Comercios"}
                            </h3>

                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar touch-pan-x">
                                <button
                                    onClick={() => setTicketTab('pending')}
                                    className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${ticketTab === 'pending'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm transform scale-100'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:shadow-sm'
                                        }`}
                                >
                                    <List size={16} />
                                    Pendientes
                                </button>
                                <button
                                    onClick={() => setTicketTab('invoiced')}
                                    className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${ticketTab === 'invoiced'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm transform scale-100'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:shadow-sm'
                                        }`}
                                >
                                    <CheckCircle size={16} />
                                    Facturados
                                </button>
                                <button
                                    onClick={() => setTicketTab('merchants')}
                                    className={`flex items-center gap-2 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${ticketTab === 'merchants'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm transform scale-100'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:shadow-sm'
                                        }`}
                                >
                                    <Store size={16} />
                                    Comercios
                                </button>
                            </div>
                        </div>

                        {dbError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 font-bold">
                                            Error de Configuración: Falta la tabla de base de datos.
                                        </p>
                                        <p className="text-sm text-red-600 mt-1">
                                            Los tickets no se están guardando. Por favor, ejecuta el comando SQL proporcionado en el editor SQL de Supabase para crear la tabla <code>user_tickets_queue</code>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {ticketTab === 'merchants' ? (
                            // MERCHANTS VIEW
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {merchantRules.map((rule, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                                    <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{rule.merchant_name_pattern || 'Sin Nombre'}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                                                            {rule.merchant_rfc}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <button
                                                onClick={async () => {
                                                    const newName = window.prompt("Editar nombre del comercio", rule.merchant_name_pattern);
                                                    if (newName && newName !== rule.merchant_name_pattern) {
                                                        try {
                                                            await supabaseService.updateMerchantRule(rule.merchant_rfc, { merchant_name_pattern: newName });
                                                            loadMerchantRules();
                                                        } catch (e) {
                                                            alert("Error al actualizar");
                                                        }
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <FileEdit size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`¿Eliminar comercio ${rule.merchant_name_pattern}?`)) {
                                                        try {
                                                            await supabaseService.deleteMerchantRule(rule.merchant_rfc);
                                                            setMerchantRules(prev => prev.filter(r => r.merchant_rfc !== rule.merchant_rfc));
                                                        } catch (e) {
                                                            alert("Error al eliminar");
                                                        }
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {merchantRules.length === 0 && (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-gray-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <Store className="w-12 h-12 text-slate-300 mb-3" />
                                        <p>No hay comercios guardados aún.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Upload Column - Always visible on Pending/Invoiced (or maybe specific to Pending?) 
                                    Let's keep it visible so user can always add.
                                */}
                                {/* Upload Column (Pending) OR Search (Invoiced) */}
                                <div className="lg:col-span-1 space-y-4">
                                    {ticketTab === 'pending' ? (
                                        <>
                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                                                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                    <Camera size={18} className="text-indigo-500" />
                                                    Escanear Nuevo Ticket
                                                </h3>
                                                <TicketUploader onScanComplete={async (data, img) => {
                                                    try {
                                                        const result = await supabaseService.saveUserTicket(data, img);
                                                        const newTicket = result.ticket;
                                                        const syncStatus = result.syncResult;

                                                        if (syncStatus === 'created') {
                                                            alert("✅ Ticket guardado y Gasto creado automáticamente (Pagado).");
                                                        } else if (syncStatus === 'duplicate') {
                                                            alert("ℹ️ Ticket guardado. No se creó Gasto porque ya existe uno idéntico.");
                                                        } else if (syncStatus === 'error') {
                                                            alert("⚠️ Ticket guardado, pero hubo un error al sincronizar el Gasto automatically.");
                                                        }

                                                        setTickets(prev => [{
                                                            id: newTicket.id,
                                                            data: newTicket.extracted_data,
                                                            img: newTicket.image_path,
                                                            status: 'pending',
                                                            created_at: newTicket.created_at
                                                        }, ...prev]);
                                                    } catch (e: any) {
                                                        console.error("Error saving ticket", e);
                                                        alert(`Error al guardar el ticket: ${e.message}`);
                                                        setTickets(prev => [{ id: Date.now().toString(), data, img, status: 'error' }, ...prev]);
                                                    }
                                                }} />
                                            </div>

                                            <div className="bg-indigo-50 dark:bg-slate-800/50 rounded-lg p-4 text-xs text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                                                <strong>Tip:</strong> Intenta que la foto sea clara y vertical. Gabi buscará el sitio web del comercio en el ticket.
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                                            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                <Search size={18} className="text-purple-500" />
                                                Buscar Comercio
                                            </h3>
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Ej. Starbucks, Oxxo..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* List Column */}
                                <div className="lg:col-span-2 space-y-4">
                                    {/* Empty State Check */}
                                    {tickets.filter(t => {
                                        const isUnprocessed = !t.status || t.status === 'pending';
                                        if (ticketTab === 'pending') {
                                            // Show PENDING tickets from CURRENT MONTH
                                            // And ANY Pending ticket regardless of date? Ideally yes, you don't want to lose old pending tickets.
                                            // User request: "Pendientes del mes en curso". 
                                            // Let's stick to strict request for now or default to all pending? 
                                            // Usually "Pending" implies a backlog. I will show ALL pending for now, or highlight current month.
                                            // The user explicitly said: "que alli esten los pendientes del mes en curso".
                                            // I will modify logic to prioritize current month but maybe show others below? Or strict filter?
                                            // Lets do strict filter for "Mes en curso" as requested.
                                            try {
                                                if (!isUnprocessed) return false;
                                                const d = new Date(t.created_at || Date.now());
                                                const now = new Date();
                                                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                            } catch (e) { return true; }
                                        }
                                        if (ticketTab === 'invoiced') {
                                            try {
                                                if (isUnprocessed) return false;
                                                const d = new Date(t.created_at || Date.now());
                                                const now = new Date();
                                                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                            } catch (e) { return true; }
                                        }
                                        return true;
                                    }).length === 0 ? (
                                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-gray-400">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                                <Camera size={32} className="opacity-50" />
                                            </div>
                                            <p className="font-medium text-lg">
                                                {ticketTab === 'pending' ? 'No tienes tickets pendientes este mes' : 'No has facturado tickets este mes'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-gray-700 dark:text-gray-200 capitalize">
                                                {ticketTab === 'pending'
                                                    ? `Pendientes (${new Date().toLocaleString('es-MX', { month: 'long' })})`
                                                    : `Facturados (${new Date().toLocaleString('es-MX', { month: 'long' })})`
                                                }
                                            </h3>
                                            {(ticketTab === 'invoiced' ? filteredInvoicedTickets : tickets.filter(t => {
                                                const isUnprocessed = !t.status || t.status === 'pending';
                                                if (ticketTab === 'pending') {
                                                    try {
                                                        if (!isUnprocessed) return false;
                                                        const d = new Date(t.created_at || Date.now());
                                                        const now = new Date();
                                                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                    } catch (e) { return true; }
                                                }
                                                return true;
                                            })).map((t) => (
                                                <TicketCard
                                                    key={t.id}
                                                    data={t.data}
                                                    imageUrl={t.img}
                                                    status={t.status as any}
                                                    onDelete={() => {
                                                        setTicketToDelete(t);
                                                        setDeleteLinkedExpense(true); // Reset to default true
                                                    }}
                                                    onUpdate={async (newData: any) => {
                                                        try {
                                                            if (newData.status && (newData.status === 'facturado' || newData.status === 'pending')) {
                                                                await supabaseService.updateTicketStatus(t.id, newData.status);
                                                                setTickets(prev => prev.map(ticket =>
                                                                    ticket.id === t.id ? { ...ticket, status: newData.status } : ticket
                                                                ));
                                                            } else {
                                                                await supabaseService.updateTicketData(t.id, newData);
                                                                setTickets(prev => prev.map(ticket =>
                                                                    ticket.id === t.id ? { ...ticket, data: newData } : ticket
                                                                ));
                                                            }
                                                        } catch (e) {
                                                            console.error("Error updating ticket", e);
                                                            alert("Error al actualizar el ticket. Intenta de nuevo.");
                                                        }
                                                    }}
                                                    onFacturar={() => setFacturarTicket({ data: t.data, imageUrl: t.img, mode: 'invoicing' })}
                                                    onVerify={() => setFacturarTicket({ data: t.data, imageUrl: t.img, mode: 'verification' })}
                                                    onImageUpload={async (base64, analysis) => {
                                                        try {
                                                            const updates: any = { image_path: base64 };
                                                            let newData = { ...t.data };

                                                            if (analysis) {
                                                                newData = { ...t.data, ...analysis };
                                                                if (!analysis.date && t.data.date) newData.date = t.data.date;
                                                                if (!analysis.total_amount && t.data.total_amount) newData.total_amount = t.data.total_amount;
                                                                updates.extracted_data = newData;
                                                            }

                                                            await supabaseService.updateTicket(t.id, updates);

                                                            setTickets(prev => prev.map(ticket =>
                                                                ticket.id === t.id ? {
                                                                    ...ticket,
                                                                    img: base64,
                                                                    data: analysis ? newData : ticket.data
                                                                } : ticket
                                                            ));
                                                        } catch (e) {
                                                            console.error("Image upload failed", e);
                                                            alert("Error al guardar la imagen.");
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // CLIENTS VIEW
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <FiscalClients />
                    </div>
                )
            }

            {/* Invoicing Split-View Modal */}
            {
                facturarTicket && (
                    <InvoicingModal
                        isOpen={!!facturarTicket}
                        onClose={() => setFacturarTicket(null)}
                        data={facturarTicket.data}
                        imageUrl={facturarTicket.imageUrl}
                        mode={facturarTicket.mode || 'invoicing'}
                        onUpdate={async (newData) => {
                            // Handle update from modal
                            // Workaround: We find the ticket in the list that matches the current data.
                            const ticketToUpdate = tickets.find(t => t.data === facturarTicket.data);

                            if (ticketToUpdate) {
                                try {
                                    await supabaseService.updateTicketData(ticketToUpdate.id, newData);
                                    setTickets(prev => prev.map(pt =>
                                        pt.id === ticketToUpdate.id ? { ...pt, data: newData } : pt
                                    ));
                                    setFacturarTicket({ ...facturarTicket, data: newData }); // Update local modal data
                                } catch (e) {
                                    console.error("Error updating from modal", e);
                                    alert("Error al guardar cambios.");
                                }
                            }
                        }}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            {
                ticketToDelete && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 relative">
                            {/* Powered by Gabi AI Badge - Top Right */}
                            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                <span className="text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    Powered by Gabi AI
                                </span>
                            </div>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="text-red-500" size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                    ¿Eliminar Ticket?
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    Estás a punto de eliminar este ticket permanentemente. Esta acción no se puede deshacer.
                                </p>

                                <div className="w-full bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6 text-left flex items-start gap-3 border border-slate-200 dark:border-slate-600">
                                    <div className="mt-0.5">
                                        <input
                                            type="checkbox"
                                            id="deleteExpense"
                                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            checked={deleteLinkedExpense}
                                            onChange={(e) => setDeleteLinkedExpense(e.target.checked)}
                                        />
                                    </div>
                                    <label htmlFor="deleteExpense" className="text-sm cursor-pointer select-none">
                                        <span className="font-medium text-slate-700 dark:text-slate-200 block mb-1">
                                            Eliminar también de mis gastos
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 text-xs block leading-relaxed">
                                            Si marcas esta opción, Gabi buscará y eliminará el gasto registrado en tu historial financiero que coincida con este ticket.
                                        </span>
                                    </label>
                                </div>


                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setTicketToDelete(null)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (deleteLinkedExpense) {
                                                    const result = await supabaseService.deleteTicketAndMatchingTransaction(
                                                        ticketToDelete.id,
                                                        ticketToDelete.data?.total_amount,
                                                        ticketToDelete.data?.date
                                                    );
                                                    if (result.expenseDeleted) {
                                                        alert("🗑️ Ticket y Gasto asociado eliminados correctamente.");
                                                    } else {
                                                        alert("🗑️ Ticket eliminado. No se encontró un gasto idéntico para borrar.");
                                                    }
                                                } else {
                                                    await supabaseService.deleteUserTicket(ticketToDelete.id);
                                                }
                                                setTickets(prev => prev.filter(x => x.id !== ticketToDelete.id));
                                                setTicketToDelete(null);
                                            } catch (e) {
                                                console.error("Error deleting", e);
                                                alert("Error al eliminar.");
                                            }
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <PaymentRegistrationModal
                isOpen={!!paymentModalInvoice}
                onClose={() => setPaymentModalInvoice(null)}
                invoice={paymentModalInvoice}
                onRegister={handleFinalizePayment}
            />
        </div >
    );
}

export default function InvoicingPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando módulo de facturación...</div>}>
            <InvoicingContent />
        </Suspense>
    );
}
