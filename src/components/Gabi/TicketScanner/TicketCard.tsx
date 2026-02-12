import React, { useState, useRef } from 'react';
import { ExternalLink, Copy, Check, AlertTriangle, FileText, Trash2, FileEdit, Save, X, Camera, Upload, Loader2 } from 'lucide-react';
import { ExtractedTicketData, gabiVisionService } from '@/services/gabiVisionService';
import PoweredByGabi from '@/components/Gabi/PoweredByGabi';
import { useMerchantRules } from '@/hooks/useMerchantRules';

interface TicketCardProps {
    data: ExtractedTicketData;
    imageUrl: string;
    status?: string;
    onDelete: () => void;
    onUpdate: (newData: ExtractedTicketData) => void;
    onFacturar: () => void;
    onVerify: () => void;
    onImageUpload?: (base64: string, analysis?: ExtractedTicketData) => void;
}

export default function TicketCard({ data, imageUrl, status = 'pending', onDelete, onUpdate, onFacturar, onVerify, onImageUpload }: TicketCardProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState(data);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // [NEW] Check verification status
    const { rule, loading } = useMerchantRules({
        rfc: data.rfc,
        store_name: data.store_name,
        url: data.url
    });

    // Sync state if prop changes
    React.useEffect(() => {
        setEditValues(data);
    }, [data]);

    const handleSave = () => {
        onUpdate(editValues);
        setIsEditing(false);
    };

    // Smart Copy: Copies Ticket ID, Total and RFC to clipboard for easy pasting
    const handleSmartCopy = () => {
        const text = `Folio: ${data.ticket_number}\nMonto: ${data.total_amount}\nRFC: ${data.rfc}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGoToPortal = () => {
        if (data.url) {
            let url = data.url.trim();
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const copyField = (text: string | number | undefined, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text.toString());
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleImageUpload = async (file: File) => {
        if (!file || !onImageUpload) return;

        setIsProcessingImage(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                // Analyze logic
                try {
                    const rawBase64 = base64.split(',')[1];
                    const analysis = await gabiVisionService.analyzeTicket(rawBase64, file.type);
                    onImageUpload(base64, analysis);
                } catch (err) {
                    console.error("Analysis failed but image uploaded", err);
                    onImageUpload(base64); // Fallback: just upload image without analysis update if failed
                } finally {
                    setIsProcessingImage(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            setIsProcessingImage(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row gap-4 w-full max-w-full overflow-hidden transition-shadow hover:shadow-md">
            {/* Thumbnail or Camera Action */}
            <div className="w-full sm:w-20 h-32 sm:h-24 bg-gray-100 dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden relative group border border-slate-200 dark:border-slate-600 flex items-center justify-center self-start">
                {imageUrl && imageUrl.length > 10 ? (
                    <>
                        <img src={imageUrl} alt="Ticket" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => window.open(imageUrl, '_blank')}>
                            <ExternalLink size={16} className="text-white" />
                        </div>
                    </>
                ) : (
                    // [NEW] Camera/Upload Button for missing image
                    <div
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-colors group"
                        onClick={() => !isProcessingImage && fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        />
                        {isProcessingImage ? (
                            <Loader2 size={24} className="text-indigo-500 animate-spin" />
                        ) : (
                            <>
                                <Camera size={24} className="text-indigo-400 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 mb-1" />
                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-600 text-center leading-tight px-1">
                                    Subir Foto
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        {isEditing ? (
                            <div className="flex gap-2 w-full mr-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={editValues.store_name}
                                    placeholder="Comercio"
                                    onChange={(e) => setEditValues({ ...editValues, store_name: e.target.value })}
                                    className="font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-900 border border-indigo-300 rounded px-1.5 py-0.5 flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <input
                                    type="text"
                                    value={editValues.branch_name || ''}
                                    placeholder="Sucursal (ej. Madero)"
                                    onChange={(e) => setEditValues({ ...editValues, branch_name: e.target.value })}
                                    className="font-medium text-purple-700 bg-white dark:bg-slate-900 border border-purple-300 rounded px-1.5 py-0.5 w-1/3 focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate pr-1" title={data.store_name}>
                                    {data.store_name || "Comercio Desconocido"}
                                </h3>

                                {/* Verification Badge */}
                                {rule ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded border border-emerald-200 uppercase tracking-wide cursor-default flex-shrink-0">
                                        Verificado
                                    </span>
                                ) : (
                                    !loading && (
                                        <button
                                            onClick={onVerify}
                                            className="px-1.5 py-0.5 bg-amber-100 text-amber-700 hover:bg-amber-200 text-[9px] font-bold rounded border border-amber-200 hover:border-amber-300 uppercase tracking-wide transition-colors cursor-pointer animate-pulse flex-shrink-0"
                                            title="Comercio no verificado. Haz clic para verificar."
                                        >
                                            No Verificado
                                        </button>
                                    )
                                )}

                                {/* [NEW] Branch Badge */}
                                {data.branch_name && (
                                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[9px] font-bold rounded border border-purple-200 dark:border-purple-800 uppercase tracking-wide flex-shrink-0 max-w-[150px] truncate" title={data.branch_name}>
                                        {data.branch_name}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-5">
                            {/* Status Badge */}
                            <button
                                onClick={() => onUpdate({ ...data, status: status === 'facturado' ? 'pending' : 'facturado' } as any)}
                                className={`
                                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors hover:brightness-95
                                ${status === 'facturado'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}
                            `}
                                title="Clic para cambiar estado"
                            >
                                {status === 'facturado' ? 'PROCESADO' : 'PENDIENTE'}
                            </button>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleSave} className="text-green-500 hover:text-green-600 transition-colors p-1" title="Guardar Cambios">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => { setIsEditing(false); setEditValues(data); }} className="text-gray-400 hover:text-gray-500 transition-colors p-1" title="Cancelar">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Editar Info">
                                            <FileEdit size={16} />
                                        </button>
                                        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Eliminar Ticket">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1.5 text-sm">
                        {/* AMOUNT */}
                        <div
                            className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700 ${!isEditing && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-colors'}`}
                            onClick={() => !isEditing && copyField(data.total_amount, 'total')}
                            title="Clic para copiar monto"
                        >
                            <span className="text-xs uppercase tracking-wide opacity-70">Monto:</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={editValues.total_amount}
                                    onChange={(e) => setEditValues({ ...editValues, total_amount: parseFloat(e.target.value) || 0 })}
                                    className="w-20 bg-transparent border-b border-indigo-300 focus:border-indigo-500 outline-none text-emerald-600 font-semibold"
                                />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        ${data.total_amount?.toFixed(2) || '0.00'}
                                    </span>
                                    {copiedField === 'total' && <Check size={12} className="text-green-500 animate-in fade-in zoom-in" />}
                                </div>
                            )}
                        </div>

                        {/* FOLIO */}
                        <div
                            className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700 ${!isEditing && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-colors'}`}
                            onClick={() => !isEditing && copyField(data.ticket_number, 'folio')}
                            title="Clic para copiar folio"
                        >
                            <span className="text-xs uppercase tracking-wide opacity-70">Folio:</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValues.ticket_number}
                                    onChange={(e) => setEditValues({ ...editValues, ticket_number: e.target.value })}
                                    className="w-24 bg-transparent border-b border-indigo-300 focus:border-indigo-500 outline-none font-mono text-xs"
                                />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="font-mono truncate max-w-[100px]" title={data.ticket_number}>
                                        {data.ticket_number || '--'}
                                    </span>
                                    {copiedField === 'folio' && <Check size={12} className="text-green-500 animate-in fade-in zoom-in" />}
                                </div>
                            )}
                        </div>

                        {/* DATE */}
                        <div
                            className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700 ${!isEditing && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-colors'}`}
                            onClick={() => !isEditing && copyField(data.date, 'date')}
                            title="Clic para copiar fecha"
                        >
                            <span className="text-xs uppercase tracking-wide opacity-70">Fecha:</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValues.date || ''}
                                    placeholder="YYYY-MM-DD"
                                    onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                                    className="w-24 bg-transparent border-b border-indigo-300 focus:border-indigo-500 outline-none font-mono text-xs"
                                />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="font-mono truncate">
                                        {data.date ? data.date.substring(0, 10) : '--'}
                                    </span>
                                    {copiedField === 'date' && <Check size={12} className="text-green-500 animate-in fade-in zoom-in" />}
                                </div>
                            )}
                        </div>

                        {/* [NEW] SUCURSAL ALWAYS VISIBLE */}
                        <div
                            className={`flex items-center gap-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800 ${!isEditing && 'cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors'}`}
                            onClick={() => !isEditing && copyField(data.branch_name, 'branch')}
                            title="Clic para copiar sucursal"
                        >
                            <span className="text-xs uppercase tracking-wide opacity-70">Sucursal:</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValues.branch_name || ''}
                                    placeholder="Sucursal"
                                    onChange={(e) => setEditValues({ ...editValues, branch_name: e.target.value })}
                                    className="w-24 bg-transparent border-b border-purple-300 focus:border-purple-500 outline-none font-medium text-xs text-purple-700 dark:text-purple-300"
                                />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="font-medium truncate max-w-[120px]">
                                        {data.branch_name || '--'}
                                    </span>
                                    {copiedField === 'branch' && <Check size={12} className="text-green-500 animate-in fade-in zoom-in" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="mt-2 text-xs flex items-center gap-2">
                            <span className="opacity-70">URL:</span>
                            <input
                                type="text"
                                value={editValues.url || ''}
                                placeholder="https://facturacion..."
                                onChange={(e) => setEditValues({ ...editValues, url: e.target.value })}
                                className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="mt-2 flex items-center gap-3 text-xs w-full">
                            <div className="text-gray-500 line-clamp-1 flex-shrink min-w-0 flex-1" title={data.items_summary}>
                                {data.items_summary || "Ticket procesado por Gabi AI"}
                            </div>

                            {/* URL Feedback Positioned Here */}
                            {data.url ? (
                                <div className="flex items-center gap-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded flex-shrink-0 max-w-[40%]">
                                    <ExternalLink size={10} />
                                    <span className="truncate">{data.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                                    <AlertTriangle size={10} />
                                    <span className="text-[10px] font-medium">Sin URL</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <PoweredByGabi size="xs" className="mr-auto opacity-70" />

                    {/* Copy Data Button */}
                    <button
                        onClick={handleSmartCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-slate-600"
                        title="Copiar datos para pegar en el portal"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? '¡Copiado!' : 'Copiar Datos'}
                    </button>

                    {/* Go directly to Portal - ALWAYS VISIBLE, DISABLED IF MISSING */}
                    <button
                        onClick={onFacturar}
                        disabled={!data.url || !rule}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${(!data.url || !rule)
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed opacity-80'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:shadow-md'
                            }`}
                        title={!data.url ? "Falta la URL del portal" : !rule ? "Verifica el comercio primero" : "Facturar Ahora"}
                    >
                        {!data.url ? <AlertTriangle size={14} /> : <ExternalLink size={14} />}
                        Facturar Ahora
                    </button>
                </div>
            </div>
        </div>
    );
}
