import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import { Printer, Mail, Copy, Download, X, Edit, Zap, CheckCircle, FileText, ArrowLeft } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { numberToLetters } from '@/utils/numberToLetters';
import { SAT_CFDI_USES, FISCAL_REGIMES } from '@/data/satCatalogs';

interface InvoicePreviewProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // The draft invoice data
    onAction: (action: 'stamp' | 'edit' | 'print' | 'email' | 'duplicate' | 'download' | 'cancel') => void;
}

export default function InvoicePreview({ isOpen, onClose, data, onAction }: InvoicePreviewProps) {
    const [mounted, setMounted] = useState(false);
    const { tier } = useSubscription();

    useEffect(() => {
        setMounted(true);
        // Prevent background scrolling when open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen || !data) return null;

    // ... (rest of logic: issuer, details calculation)
    const issuer = {
        name: 'ROGERIO MARTINS BAIA',
        rfc: 'MABR750116P78',
        regime: '626 Régimen Simplificado de Confianza',
        address: 'MATAMOROS 514 MATAMOROS, MONTEMORELOS, NUEVO LEÓN. Mexico.',
        contact: 'Tel: 81 20227181 | rogerbaia@hotmail.com | Web: www.christianeyeclinic.com'
    };

    const details = data.details || {};
    // Robust check for stamped status: has UUID OR has a valid status (paid/pending/cancelled)
    // 'pending' here refers to PPD (Pending Payment), which IS stamped.
    const isStamped = !!data.uuid || ['paid', 'pending', 'cancelled'].includes(data.status);

    const subtotal = data.total / (details.iva ? 1.16 : 1);
    const finalSubtotal = details.subtotal || subtotal;
    const finalIva = details.iva || 0;
    const finalRetIsr = details.retention || 0;
    const finalTotal = data.total;

    // Helper to get Descriptions
    const getRegimeDesc = (code: string) => {
        if (!code) return '601';
        if (!FISCAL_REGIMES) return code; // Safety check
        const found = FISCAL_REGIMES.find(r => r.code === code);
        return found ? `${code} - ${found.name}` : code;
    };

    const getUseDesc = (code: string) => {
        if (!code) return 'G03';
        if (!SAT_CFDI_USES) return code; // Safety check
        const found = SAT_CFDI_USES.find(u => u.code === code);
        return found ? `${code} - ${found.name}` : code;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden animate-in fade-in duration-200">
            {/* Top Action Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm shrink-0 flex justify-center items-center print:hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide justify-center">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full shadow-sm transition transform active:scale-95 whitespace-nowrap"
                    >
                        <ArrowLeft size={18} /> Volver
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {!isStamped && (
                        <>
                            <button
                                onClick={() => onAction('stamp')}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-bold rounded-full shadow-md transition transform active:scale-95 whitespace-nowrap"
                            >
                                <Zap size={18} fill="currentColor" /> Activar / Sellar
                            </button>
                            <button
                                onClick={() => onAction('edit')}
                                className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-full shadow-sm transition transform active:scale-95 whitespace-nowrap"
                            >
                                <Edit size={17} /> Editar
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        </>
                    )}

                    <button
                        onClick={() => onAction('print')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full transition whitespace-nowrap"
                    >
                        <Printer size={17} /> Imprimir
                    </button>
                    <button
                        onClick={() => onAction('email')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full transition whitespace-nowrap"
                    >
                        <Mail size={17} /> Email
                    </button>
                    <button
                        onClick={() => onAction('download')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full transition whitespace-nowrap"
                    >
                        <Download size={17} /> PDF
                    </button>
                    <button
                        onClick={() => onAction('duplicate')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full transition whitespace-nowrap"
                    >
                        <Copy size={17} /> Duplicar
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <button
                        onClick={() => onAction('cancel')}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-full transition whitespace-nowrap"
                    >
                        <X size={18} /> Cancelar
                    </button>
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-100/50">
                <div className="bg-white text-slate-800 w-full max-w-[850px] shadow-2xl min-h-[1100px] relative flex flex-col mb-10 print:shadow-none print:w-full print:max-w-none">

                    {/* Status Ribbon (Screen Only) */}
                    <div className="bg-gradient-to-r from-slate-50 to-white p-3 border-b border-slate-100 print:hidden flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{isStamped ? 'Comprobante Fiscal Digital' : 'Vista Previa del CFDI 4.0'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {data.id}</span>
                    </div>

                    {/* INVOICE CONTENT */}
                    <div className="p-10 flex-1 flex flex-col font-sans">
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-1/3 pt-2">
                                {/* Logo Area */}
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white h-28 w-40">
                                    <img src="/logo-synaptica.png" alt="Synaptica Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            </div>

                            <div className="w-1/3 text-center space-y-1 pt-2">
                                <h2 className="font-bold text-base text-slate-900 uppercase tracking-wide">{issuer.name}</h2>
                                <p className="text-[10px] text-slate-500 font-medium">RFC: {issuer.rfc}</p>
                                <p className="text-[10px] text-slate-500 px-4 leading-tight">{issuer.address}</p>
                                <p className="text-[10px] text-slate-500 font-medium">C.P. 67510</p>
                                <p className="text-[10px] text-slate-500 font-medium">{issuer.contact.split('|')[0]}</p>
                                <div className="pt-2">
                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase">
                                        {issuer.regime.split(' ')[0]} - {issuer.regime.split(' ').slice(1).join(' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Invoice Folio Box */}
                            <div className="w-1/3 flex flex-col items-end">
                                <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-3 text-right min-w-[180px]">
                                    <h3 className="text-indigo-900 font-bold text-xs uppercase tracking-wider mb-1">
                                        {isStamped ? 'FACTURA ELECTRÓNICA' : 'PRE-COMPROBANTE'}
                                    </h3>
                                    <p className="text-red-500 font-bold text-2xl font-mono">{data.folio || '---'}</p>
                                    <div className="h-px bg-indigo-100 my-2"></div>
                                    <p className="text-[10px] text-slate-500">Fecha de Emisión</p>
                                    <p className="text-xs font-bold text-slate-700">{data.rawDate ? new Date(data.rawDate).toLocaleString('es-MX') : (data.date ? new Date(data.date).toLocaleString('es-MX') : new Date().toLocaleString('es-MX'))}</p>
                                </div>
                            </div>
                        </div>

                        {/* Client & Fiscal Data Grid (Side-by-Side) */}
                        <div className="rounded-lg border border-slate-200 overflow-hidden mb-8 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">

                                {/* LEFT COLUMN: Data del Receptor (Span 7) */}
                                <div className="col-span-1 md:col-span-7 flex flex-col">
                                    <div className="bg-slate-50 p-2 font-bold text-slate-800 uppercase tracking-wider text-center border-b border-slate-200">
                                        Datos del Receptor
                                    </div>
                                    <div className="p-4 bg-white space-y-2 flex-1">
                                        <div className="grid grid-cols-12 gap-2 border-b border-slate-50 pb-1">
                                            <div className="col-span-4 font-bold text-slate-600">Razón Social:</div>
                                            <div className="col-span-8 text-slate-800 uppercase font-semibold text-right md:text-left">{data.client || '---'}</div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2 border-b border-slate-50 pb-1">
                                            <div className="col-span-4 font-bold text-slate-600">RFC:</div>
                                            <div className="col-span-8 font-mono text-slate-700 text-right md:text-left">{data.rfc || '---'}</div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2 border-b border-slate-50 pb-1">
                                            <div className="col-span-4 font-bold text-slate-600">Régimen Fiscal:</div>
                                            <div className="col-span-8 text-slate-700 leading-tight text-right md:text-left">
                                                {getRegimeDesc(details?.fiscalRegime || '601')}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2 border-b border-slate-50 pb-1">
                                            <div className="col-span-4 font-bold text-slate-600">Domicilio:</div>
                                            <div className="col-span-8 text-slate-700 uppercase leading-tight text-right md:text-left">
                                                {typeof details?.address === 'object'
                                                    ? [
                                                        [details.address.street, details.address.exterior].filter(Boolean).join(' '),
                                                        details.address.colonia,
                                                        details.address.zip,
                                                        details.address.city,
                                                        details.address.state
                                                    ].filter(Boolean).join(', ') || 'DIRECCIÓN NO DISPONIBLE'
                                                    : (details?.address || (details?.zip ? `C.P. ${details.zip}` : ''))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-4 font-bold text-slate-600">Uso del CFDI:</div>
                                            <div className="col-span-8 text-slate-700 leading-tight text-right md:text-left">
                                                {getUseDesc(details?.cfdiUse || 'G03')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Fiscal Data (Span 5) */}
                                <div className="col-span-1 md:col-span-5 flex flex-col">
                                    <div className="bg-slate-50 p-2 font-bold text-slate-800 uppercase tracking-wider text-center border-b border-slate-200">
                                        Datos Fiscales
                                    </div>
                                    <div className="p-4 bg-slate-50/30 space-y-1.5 flex-1">
                                        <div className="flex justify-between gap-2">
                                            <span className="font-bold text-slate-600 whitespace-nowrap">Folio Fiscal:</span>
                                            <span className="font-mono text-slate-800 text-[10px] break-all text-right leading-tight">{data.uuid || (isStamped ? '---' : 'NO DISPONIBLE')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-600">Tipo CFDI:</span>
                                            <span className="text-slate-800">I - Ingreso</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-600">Versión:</span>
                                            <span className="text-slate-800">4.0</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-600">Lugar Exp.:</span>
                                            <span className="text-slate-800">{details?.expeditionPlace || '67510'}</span>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <span className="font-bold text-slate-600 whitespace-nowrap">Emisión:</span>
                                            <span className="text-slate-800">{data.rawDate ? new Date(data.rawDate).toLocaleString('es-MX') : (data.date ? new Date(data.date).toLocaleString('es-MX') : new Date().toLocaleString('es-MX'))}</span>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <span className="font-bold text-slate-600 whitespace-nowrap">Certificación:</span>
                                            <span className="text-slate-800">{details?.certDate ? new Date(details.certDate).toLocaleString('es-MX') : (data.rawDate ? new Date(data.rawDate).toLocaleString('es-MX') : '---')}</span>
                                        </div>
                                        <div className="flex justify-between flex-col border-t border-slate-100 pt-1 mt-1">
                                            <span className="font-bold text-slate-600 text-[10px]">Serie CSD Emisor:</span>
                                            <span className="font-mono text-slate-800 text-[10px]">{details?.certificateNumber || '30001000000500003421'}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Concepts Table */}
                        <div className="flex-1 mb-8">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-800 text-white">
                                        <th className="py-2.5 px-3 text-left w-16 rounded-tl-lg">Cant.</th>
                                        <th className="py-2.5 px-3 text-left w-20">Unidad</th>
                                        <th className="py-2.5 px-3 text-left w-24">Clave</th>
                                        <th className="py-2.5 px-3 text-left">Descripción</th>
                                        <th className="py-2.5 px-3 text-right w-28">Valor Unit.</th>
                                        <th className="py-2.5 px-3 text-right w-28 rounded-tr-lg">Importe</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-600">
                                    <tr className="border-b border-slate-100 hover:bg-slate-50 transition">
                                        <td className="py-4 px-3 align-top font-bold text-center">{details?.quantity || 1}</td>
                                        <td className="py-4 px-3 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">{details?.satUnitKey || 'E48'}</span>
                                                <span className="text-[9px] text-slate-400 uppercase">Unidad de servicio</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-3 align-top font-mono text-slate-500">{details?.satProductKey || '---'}</td>
                                        <td className="py-4 px-3 align-top">
                                            <p className="font-bold text-slate-800 uppercase mb-1">{data.description}</p>
                                            {(Number(details?.iva) > 0 || Number(details?.retention) > 0) && (
                                                <div className="flex gap-3 text-[9px] text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded">
                                                    {Number(details?.iva) > 0 && <span>Traslado IVA Base: ${Number(details?.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} Tasa: 0.160000</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-3 align-top text-right font-mono text-slate-700">${(details?.unitValue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="py-4 px-3 align-top text-right font-bold font-mono text-slate-900">${(details?.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Amount in Letters & Layout */}
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 space-y-4">


                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Importe con Letra</p>
                                    <p className="text-xs font-medium text-slate-700 uppercase">*** {numberToLetters(data.total)} *** {isStamped ? '' : '(Simulado)'}</p>
                                </div>



                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="font-bold text-slate-500 mb-1">Forma de Pago</p>
                                        <p className="text-slate-800">{details?.paymentForm || '03'} - {details?.paymentForm === '01' ? 'Efectivo' : details?.paymentForm === '02' ? 'Cheque' : details?.paymentForm === '03' ? 'Transferencia' : details?.paymentForm === '99' ? 'Por definir' : 'Otros'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="font-bold text-slate-500 mb-1">Método de Pago</p>
                                        <p className="text-slate-800">{details?.paymentMethod || 'PUE'} - {details?.paymentMethod === 'PPD' ? 'Parcialidades' : 'Una sola exhibición'}</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Zap size={14} />
                                        <span className="text-[10px] font-bold uppercase">Cadena Original del Timbre{isStamped ? '' : ' (Simulado)'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 border border-slate-100 rounded mt-1">
                                        <p className="text-[10px] text-slate-500 font-mono break-all leading-tight">
                                            {details?.originalChain || (isStamped ? '|| CADENA NO DISPONIBLE ||' : '||1.1|UUID|FECHA|SAT970701NN3|SELLO|CERT||')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Column */}
                            <div className="w-full md:w-64 bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Subtotal</span>
                                        <span className="font-mono">${(details?.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {details?.iva > 0 && (
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>(+ 002 IVA)</span>
                                            <span className="font-mono">${details.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {details?.retention > 0 && (
                                        <div className="flex justify-between text-xs text-red-500">
                                            <span>(- Ret. ISR)</span>
                                            <span className="font-mono">-${details.retention.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {details?.ivaRetention > 0 && (
                                        <div className="flex justify-between text-xs text-red-500">
                                            <span>(- Ret. IVA)</span>
                                            <span className="font-mono">-${details.ivaRetention.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-slate-200 my-2 pt-2"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-slate-800">Total</span>
                                        <span className="text-xl font-bold text-indigo-600 font-mono">${finalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Watermark */}
                        {!isStamped && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0 overflow-hidden">
                                <span className="text-[120px] font-bold uppercase text-slate-900 transform -rotate-45 leading-none whitespace-nowrap">Sin Validez Oficial</span>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
