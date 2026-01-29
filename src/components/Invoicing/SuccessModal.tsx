import React from 'react';
import { CheckCircle, X, Download, Mail, ArrowRight } from 'lucide-react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        folio: string;
        uuid: string;
        total: number;
        client: string;
    } | null;
    onDownload?: () => void;
    onEmail?: () => void;
}

export default function SuccessModal({ isOpen, onClose, data, onDownload, onEmail }: SuccessModalProps) {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 p-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-green-100 p-4 rounded-full ring-8 ring-green-50 dark:bg-green-900/30 dark:ring-green-900/10">
                        <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">¡Factura Timbrada!</h2>
                <p className="text-slate-500 text-sm mb-6">El comprobante ha sido generado y certificado por el SAT correctamente.</p>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Folio</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 font-mono text-lg">{data.folio}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">UUID</span>
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={data.uuid}>{data.uuid}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Total</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={onDownload}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition shadow-sm"
                    >
                        <Download size={18} />
                        <span>PDF / XML</span>
                    </button>
                    <button
                        onClick={onEmail}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition shadow-sm"
                    >
                        <Mail size={18} />
                        <span>Enviar</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>Entendido</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
