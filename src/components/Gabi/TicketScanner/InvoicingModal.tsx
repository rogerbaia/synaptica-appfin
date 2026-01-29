import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, FileText, Check, AlertCircle, ChevronRight, GripHorizontal, Brain, RotateCw, Crop, Search, Info, Hand, MousePointer2, ZoomIn, ZoomOut, Move, Edit2, ArrowRight, ExternalLink, Trash2, FileEdit, Tags, Globe } from 'lucide-react';
import { ExtractedTicketData } from '@/services/gabiVisionService';
import PoweredByGabi from '../PoweredByGabi';
import { useMerchantRules } from '@/hooks/useMerchantRules';
import TicketAnnotator from './TicketAnnotator';
import { cropImage } from '@/utils/imageProcessing';
import { gabiVisionService } from '@/services/gabiVisionService';

interface InvoicingModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ExtractedTicketData;
    imageUrl?: string; // Image for visual verification
    onUpdate: (newData: ExtractedTicketData) => void;
    mode?: 'invoicing' | 'verification';
}

export default function InvoicingModal({ isOpen, onClose, data, imageUrl, onUpdate, mode = 'invoicing' }: InvoicingModalProps) {
    const [externalWindow, setExternalWindow] = useState<Window | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic Fields State
    const [extraFields, setExtraFields] = useState<{ key: string, label: string }[]>([]);
    const [customFieldName, setCustomFieldName] = useState('');
    const [hiddenCoreFields, setHiddenCoreFields] = useState<string[]>([]);

    const CORE_FIELDS = [
        { key: 'store_name', label: 'Sucursal' },
        { key: 'ticket_number', label: 'Folio / Ticket' },
        { key: 'date', label: 'Fecha' },
        { key: 'total_amount', label: 'Monto Total' },
        { key: 'url', label: 'URL de Facturación' },
    ];

    const DEFAULT_PRESETS = [
        { key: 'terminal_id', label: 'Terminal / Caja' },
        { key: 'transaction_id', label: 'ID Transacción' },
        { key: 'auth_code', label: 'Código Autorización' },
        { key: 'store_id', label: 'No. Sucursal / Tienda' },
        { key: 'state', label: 'Estado' },
        { key: 'city', label: 'Ciudad' },
        { key: 'payment_method', label: 'Forma de Pago' },
        { key: 'cashier', label: 'Cajero / Operador' },
        { key: 'table', label: 'Mesa' },
        { key: 'tips', label: 'Propina' },
    ];

    // [GLOBAL INTELLIGENCE] Loaded from community rules
    const [availableFields, setAvailableFields] = useState<{
        key: string;
        label: string;
        isCommunity?: boolean
    }[]>(DEFAULT_PRESETS);

    useEffect(() => {
        // Load community fields on mount
        import('@/hooks/useMerchantRules').then(mod => {
            mod.getCommunityFields().then(communityFields => {
                if (communityFields.length > 0) {
                    setAvailableFields(prev => {
                        // Merge avoiding duplicates
                        const unique = [...prev];
                        communityFields.forEach(cf => {
                            if (!unique.find(p => p.key === cf.key)) {
                                unique.push({ ...cf, isCommunity: true });
                            }
                        });
                        return unique;
                    });
                }
            });
        });
    }, []);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState<ExtractedTicketData>(data);

    // Simplified Clean State
    const [ticketFormat, setTicketFormat] = useState<'full' | 'start' | 'end'>('start');

    // Teaching Mode
    const [isTeaching, setIsTeaching] = useState(false);
    const [teachUrl, setTeachUrl] = useState('');

    // Zoom/Pan State for Image (Leftover state for basic view if needed, but Annotator handles its own)
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Hook Integration
    const { rule, loading: loadingRule, saveRule, deleteRule } = useMerchantRules({
        rfc: data.rfc,
        store_name: data.store_name,
        url: data.url
    });

    // Validar si la regla ya se aplicó para no sobrescribir manual changes
    const [ruleApplied, setRuleApplied] = useState(false);
    const [hasAutoOpened, setHasAutoOpened] = useState(false);

    // [NEW] New Merchant Logic: If extracted RFC is new, FORCE manual entry ("Reverse Learning")
    // [NEW] New Merchant Logic: If extracted RFC is new, FORCE manual entry ("Reverse Learning")
    useEffect(() => {
        // ONLY IN VERIFICATION MODE WE FORCE CLEAR!
        // In Invoicing Mode, if rule is missing (maybe because sync delay), we still want to see the passed data from card.
        if (mode === 'verification' && !loadingRule && !rule && data.rfc && !hasAutoOpened && !ruleApplied && isOpen) {
            console.log("Nuevo comercio detectado. Limpiando datos para aprendizaje inverso.");
            // Clear fields to force user truth
            setEditValues(prev => ({
                ...prev,
                ticket_number: '',
                total_amount: undefined,
                date: '',
                store_name: '',
            }));
            setHasAutoOpened(true);
        }
    }, [rule, loadingRule, data.rfc, hasAutoOpened, ruleApplied, isOpen, mode]);

    // Auto-Apply Rule Effect
    useEffect(() => {
        if (rule) {
            console.log("Aplicando regla aprendida:", rule);
            if (rule.ticket_format_rule === 'start_10') setTicketFormat('start');
            else if (rule.ticket_format_rule === 'end_10') setTicketFormat('end');
            else setTicketFormat('full');

            // Hydrate Custom Fields from Rule
            if (rule.extraction_map) {
                const loadedExtras: { key: string, label: string }[] = [];
                Object.entries(rule.extraction_map).forEach(([key, val]) => {
                    // Check if it's a custom field definition
                    if (val && val.type === 'custom_field') {
                        loadedExtras.push({ key, label: val.label });
                    }
                });
                // Only update if different to avoid loops
                setExtraFields(prev => {
                    const prevStr = JSON.stringify(prev.map(f => f.key).sort());
                    const newStr = JSON.stringify(loadedExtras.map(f => f.key).sort());
                    if (prevStr !== newStr) return loadedExtras;
                    return prev;
                });
            }

            // Only update parent if we haven't applied this rule yet (and it wasn't just saved manually)
            if (!ruleApplied && !hasAutoOpened) {
                if (rule.invoicing_url && data.url !== rule.invoicing_url) {
                    onUpdate({ ...data, url: rule.invoicing_url });
                }
                setRuleApplied(true);
            }
        }
    }, [rule, ruleApplied, data, onUpdate, hasAutoOpened]);

    // Derived ticket value based on format
    const getFormattedTicket = () => {
        const raw = editValues.ticket_number || "";
        if (raw.length <= 10) return raw;
        if (ticketFormat === 'start') return raw.slice(0, 10);
        if (ticketFormat === 'end') return raw.slice(-10);
        return raw;
    };

    const finalTicket = getFormattedTicket();

    // Draggable Logic
    const handleDragStart = (e: React.DragEvent, text: string) => {
        e.dataTransfer.setData("text/plain", text);
        e.dataTransfer.effectAllowed = "copy";
    };

    // Sync state with props when modal opens/data changes
    // Sync state with props when modal opens/data changes (Only if RFC changes)
    // Sync state with props when modal opens/data changes
    // Sync state with props when modal opens/data changes (Only if RFC changes)
    // Sync state with props when modal opens/data changes
    useEffect(() => {
        if (isOpen) {
            setEditValues(prev => {
                // Only update if the RFC effectively changed or it's a fresh open
                if (data.rfc !== prev.rfc || data.ticket_number !== prev.ticket_number) {
                    return data;
                }
                return prev;
            });
        }
    }, [isOpen, data.rfc, data.ticket_number]);

    // Reset auto-open on RFC change
    useEffect(() => {
        setHasAutoOpened(false);
        setRuleApplied(false);
    }, [data.rfc]);

    if (!isOpen) return null;

    const url = data.url?.startsWith('http') ? data.url : `https://${data.url}`;
    const isNewMerchant = !rule && !loadingRule && !!data.rfc;

    // Sub-components helpers
    const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <div className={`text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 ${className || ''}`}>{children}</div>
    );

    const DraggableChip = ({ label, value, colorClass = "bg-white dark:bg-slate-800 border-indigo-100 hover:border-indigo-500", children }: any) => (
        <div className="space-y-1">
            <Label className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {label}
            </Label>
            {children ? children : (
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, value || "")}
                    className={`cursor-grab active:cursor-grabbing border-2 dark:border-slate-700 dark:hover:border-indigo-500 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group relative ${colorClass}`}
                >
                    <div className="font-mono font-bold text-slate-800 dark:text-white truncate pr-6">
                        {typeof value === 'number' || (value && !isNaN(Number(value))) ? Number(value).toFixed(2) : (value || "--")}
                    </div>
                    <div className="absolute right-3 top-3 text-slate-300 group-hover:text-indigo-500">
                        <GripHorizontal size={16} />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-slate-900 w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex-col md:flex-row relative max-w-[95vw] max-h-[90vh]`}>

                {/* [NEW] VISUAL TEACHING FULL SCREEN INTERFACE */}
                {isTeaching && (
                    <div className="absolute inset-0 z-[60] bg-slate-900 flex flex-col animate-in fade-in duration-300">
                        <TicketAnnotator
                            imageUrl={imageUrl || ""}
                            initialUrl={teachUrl}
                            initialMap={rule?.extraction_map}
                            onCancel={() => setIsTeaching(false)}
                            onSave={async ({ url }) => {
                                if (!data.rfc) {
                                    alert("Necesito un RFC para aprender.");
                                    return;
                                }

                                setIsTeaching(false);
                                if (url) setTeachUrl(url);

                                // 1. Save preferences immediately
                                const newData: Partial<ExtractedTicketData> = {
                                    ticket_number: editValues.ticket_number,
                                    total_amount: editValues.total_amount,
                                    date: editValues.date,
                                };
                                onUpdate(newData);

                                // 2. Save Rule (FULL FORMAT - No Refinements)
                                await saveRule({
                                    rfc: data.rfc,
                                    url: url,
                                    format: 'full',
                                    extractionMap: {}
                                });
                            }}
                        />
                    </div>
                )}


                {/* LEFT SIDEBAR */}
                <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 flex flex-col p-6 overflow-y-auto flex-shrink-0 z-10 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <PoweredByGabi size="sm" />
                        <button onClick={onClose} className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1">
                            Salir
                        </button>
                    </div>

                    {isNewMerchant ? (
                        /* --- NEW MERCHANT FLOW (Manual Entry & Field Builder) --- */
                        <div className="flex-1 flex flex-col space-y-2 animate-in fade-in slide-in-from-left-4 overflow-hidden h-full">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 shrink-0">
                                <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-2">
                                    <Brain size={14} /> Aprendizaje
                                </h3>
                                <p className="text-[10px] text-indigo-600 mt-0.5 leading-tight">
                                    Configura los campos que pide este portal.
                                </p>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {/* Core Fields */}
                                <Label>RFC Emisor (Clave)</Label>
                                <div className="p-2 bg-slate-100 rounded border font-mono text-xs text-slate-600">
                                    {data.rfc}
                                </div>

                                {/* Core Fields (Now optional) */}
                                {CORE_FIELDS.filter(f => !hiddenCoreFields.includes(f.key)).map(field => {
                                    // Custom rendering for specific types
                                    if (field.key === 'total_amount') {
                                        return (
                                            <div key={field.key} className="relative group animate-in slide-in-from-right-2 duration-300">
                                                <Label>{field.label}</Label>
                                                <div className="relative flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full p-2 pl-6 border rounded text-sm"
                                                            placeholder="0.00"
                                                            value={editValues.total_amount || ""}
                                                            onChange={e => setEditValues({ ...editValues, total_amount: parseFloat(e.target.value) })}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setHiddenCoreFields([...hiddenCoreFields, field.key])}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="Ocultar campo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (field.key === 'date') {
                                        return (
                                            <div key={field.key} className="relative group animate-in slide-in-from-right-2 duration-300">
                                                <Label>{field.label}</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="date"
                                                        className="w-full p-2 border rounded text-sm"
                                                        value={editValues.date ? editValues.date.substring(0, 10) : ""}
                                                        onChange={e => setEditValues({ ...editValues, date: e.target.value })}
                                                    />
                                                    <button
                                                        onClick={() => setHiddenCoreFields([...hiddenCoreFields, field.key])}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="Ocultar campo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    // Default string inputs
                                    return (
                                        <div key={field.key} className="relative group animate-in slide-in-from-right-2 duration-300">
                                            <Label>{field.label}</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className="w-full p-2 border rounded text-sm"
                                                    placeholder={`Ingresa ${field.label}`}
                                                    value={editValues[field.key] || ""}
                                                    onChange={e => setEditValues({ ...editValues, [field.key]: e.target.value })}
                                                    autoFocus={field.key === 'store_name'}
                                                />
                                                <button
                                                    onClick={() => setHiddenCoreFields([...hiddenCoreFields, field.key])}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                    title="Ocultar campo"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* DYNAMIC SUB-FIELDS */}
                                {/* These are added from the middle column */}
                                {extraFields.map((field) => (
                                    <div key={field.key} className="relative group animate-in slide-in-from-right-2 duration-300">
                                        <Label>{field.label}</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                className="w-full p-2 border rounded text-sm bg-purple-50 border-purple-200 focus:border-purple-500"
                                                placeholder={`Ingresa ${field.label}`}
                                                value={editValues[field.key] || ""}
                                                onChange={e => setEditValues({ ...editValues, [field.key]: e.target.value })}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newExtras = extraFields.filter(f => f.key !== field.key);
                                                    setExtraFields(newExtras);
                                                    // Optional: Clear value from editValues too?
                                                    const newValues = { ...editValues };
                                                    delete newValues[field.key];
                                                    setEditValues(newValues);
                                                }}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Eliminar campo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={async () => {
                                    if (!editValues.ticket_number || !editValues.total_amount || !editValues.date) {
                                        alert("Por favor completa los campos principales.");
                                        return;
                                    }

                                    // Construct Extraction Map with Extra Fields logic
                                    // We store them as meta-data so we know to render them next time
                                    const extractionMap: Record<string, any> = {};
                                    extraFields.forEach(f => {
                                        extractionMap[f.key] = { label: f.label, type: 'custom_field' };
                                    });

                                    // Prevent the Rule-Effect from overwriting our data
                                    setRuleApplied(true);

                                    // SAVE RULE
                                    await saveRule({
                                        rfc: data.rfc!,
                                        url: editValues.url || "",
                                        format: 'full',
                                        extractionMap: extractionMap
                                    });
                                    // Update parent
                                    onUpdate(editValues);
                                }}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-bold flex items-center justify-center gap-2 shrink-0 text-sm"
                            >
                                <Brain size={16} /> Memorizar y Guardar
                            </button>
                        </div>
                    ) : (
                        /* --- KNOWN MERCHANT FLOW (Draggable Chips) --- */
                        <div className="space-y-6 flex-1 animate-in fade-in">
                            <div className="mb-4">
                                <p className="text-sm text-slate-500">
                                    {ruleApplied
                                        ? <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={14} /> Datos verificados por Gabi</span>
                                        : "Arrastra los datos al portal."
                                    }
                                </p>
                            </div>

                            {/* Ticket / Folio Draggable (Format selector removed) */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Folio / Ticket
                                </Label>

                                <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, finalTicket)}
                                    className={`cursor-grab active:cursor-grabbing border-2 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group relative ${ruleApplied ? 'bg-white border-green-200 shadow-green-100' : 'bg-white border-indigo-100'}`}>
                                    <div className="font-mono font-bold text-slate-800 dark:text-white truncate">
                                        {finalTicket}
                                    </div>
                                    <div className="absolute right-3 top-3 text-slate-300 group-hover:text-indigo-500">
                                        <GripHorizontal size={16} />
                                    </div>
                                </div>
                            </div>
                            {/* Date Draggable */}
                            <DraggableChip label="Fecha" value={editValues.date ? editValues.date.substring(0, 10) : '--'}>
                                {editValues.date && (
                                    <div className="absolute right-3 top-3 text-emerald-500">
                                        <Check size={16} />
                                    </div>
                                )}
                            </DraggableChip>

                            {/* Amount Draggable */}
                            <DraggableChip label="Monto Total" value={editValues.total_amount?.toFixed(2)} />

                            {/* Optional: Branch/Store Name */}
                            <DraggableChip label="Sucursal / Tienda" value={editValues.store_name} />

                            {/* RFC Draggable (High Priority for identification) */}
                            {/* RFC Draggable (High Priority for identification) */}
                            <div className="pt-2">
                                <Label className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> RFC Emisor
                                    {ruleApplied ? (
                                        <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 uppercase tracking-wide">
                                            Verificado
                                        </span>
                                    ) : (
                                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded border border-amber-200 uppercase tracking-wide">
                                            No Verificado
                                        </span>
                                    )}
                                </Label>
                                <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, editValues.rfc || "")}
                                    className="cursor-grab active:cursor-grabbing bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-2 flex items-center justify-between group transition-all"
                                >
                                    <span className="font-mono text-xs font-bold text-slate-600">{editValues.rfc || "XAXX010101000"}</span>
                                    <GripHorizontal size={14} className="text-slate-300 group-hover:text-indigo-400" />
                                </div>
                            </div>

                            {/* Manual Edit Button - ONLY for Known Merchants */}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(!isEditing);
                                    }}
                                    className="w-full text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                                    <FileEdit size={12} /> {isEditing ? "Ocultar edición" : "Editar valores base"}
                                </button>

                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm("¿Estás seguro de olvidar la regla para este comercio? Volverá a pedirte los datos.")) {
                                            const success = await deleteRule();
                                            if (success) {
                                                // Reset local state if needed
                                            }
                                        }
                                    }}
                                    className="w-full text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors mt-2 font-medium">
                                    <Trash2 size={12} /> Olvidar aprendizaje de este comercio
                                </button>
                                {isEditing && (
                                    <div className="mt-2 space-y-2 p-2 bg-slate-100 rounded text-xs animate-in slide-in-from-top-2">
                                        {/* Standard Edit Inputs for Known Rule */}
                                        <Label>Folio Original</Label>
                                        <input
                                            className="w-full p-1 border rounded"
                                            value={editValues.ticket_number || ""}
                                            onChange={e => setEditValues({ ...editValues, ticket_number: e.target.value })}
                                        />
                                        <Label>Monto</Label>
                                        <input
                                            className="w-full p-1 border rounded"
                                            value={editValues.total_amount || ""}
                                            onChange={e => setEditValues({ ...editValues, total_amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* MIDDLE COLUMN - FIELD LIBRARY (Only for New Merchant Flow) */}
                {isNewMerchant && (
                    <div className="w-full md:w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col z-10 shadow-inner">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Tags size={12} /> Campos Disponibles
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {/* Hidden Core Fields (Restore) */}
                            {CORE_FIELDS.filter(f => hiddenCoreFields.includes(f.key)).map(field => (
                                <button
                                    key={field.key}
                                    onClick={() => setHiddenCoreFields(hiddenCoreFields.filter(k => k !== field.key))}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-between group border border-slate-200 dark:border-slate-700"
                                >
                                    {field.label}
                                    <span className="opacity-0 group-hover:opacity-100 text-indigo-500 font-bold">+</span>
                                </button>
                            ))}

                            {/* Preset List & Community Fields */}
                            {availableFields.filter(p => !extraFields.find(ef => ef.key === p.key)).map((preset: any) => (
                                <button
                                    key={preset.key}
                                    onClick={() => setExtraFields([...extraFields, { key: preset.key, label: preset.label }])}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-between group"
                                >
                                    <span className="flex items-center gap-2">
                                        {preset.isCommunity && <Globe size={10} className="text-indigo-400" />}
                                        {preset.label}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-100 text-indigo-500 font-bold">+</span>
                                </button>
                            ))}

                            {/* Custom Field Input */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 px-1">
                                <Label className="mb-2">Otro Campo</Label>
                                <div className="flex gap-1">
                                    <input
                                        className="h-8 w-full rounded border border-slate-200 text-xs px-2"
                                        placeholder="Nombre..."
                                        value={customFieldName}
                                        onChange={(e) => setCustomFieldName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && customFieldName.trim()) {
                                                const key = customFieldName.toLowerCase().replace(/\s+/g, '_');
                                                setExtraFields([...extraFields, { key, label: customFieldName }]);
                                                setCustomFieldName('');
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (customFieldName.trim()) {
                                                const key = customFieldName.toLowerCase().replace(/\s+/g, '_');
                                                setExtraFields([...extraFields, { key, label: customFieldName }]);
                                                setCustomFieldName('');
                                            }
                                        }}
                                        className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center hover:bg-indigo-200"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RIGHT SIDE - BROWSER HELP/IFRAME or VERIFICATION IMAGE */}
                <div ref={containerRef} className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center p-8 text-center border-l border-slate-200">
                    {mode === 'verification' ? (
                        <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
                            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center justify-center gap-2">
                                <FileText size={16} /> Referencia Visual
                            </h3>
                            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white relative group">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt="Ticket Ref"
                                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                        No imagen
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-3 max-w-xs mx-auto">
                                Confirma que los datos de la izquierda coincidan con la imagen. Al "Memorizar", Gabi recordará este comercio.
                            </p>
                        </div>
                    ) : (
                        !externalWindow || externalWindow.closed ? (
                            <div className="max-w-md space-y-6">
                                <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <ArrowRight size={32} className="text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Arrastrar y Soltar / Autofill</h3>
                                <p className="text-slate-600">
                                    Abre el portal a la derecha y usa el <strong>Bridge</strong> para pegar los datos automáticamente.
                                </p>
                                <button
                                    onClick={() => {
                                        // 1. Emit data for the Extension (The "Bridge")
                                        window.postMessage({
                                            type: "SYNAPTICA_BRIDGE_DATA",
                                            payload: {
                                                rfc: editValues.rfc || "XAXX010101000",
                                                ticket_number: finalTicket,
                                                total_amount: editValues.total_amount ? editValues.total_amount.toFixed(2) : "0.00",
                                                date: editValues.date ? editValues.date.substring(0, 10) : "", // YYYY-MM-DD strict
                                                store_name: editValues.store_name
                                            }
                                        }, "*");

                                        // 2. Open External Window
                                        let width = 1000;
                                        let height = 800;
                                        let left = 0;
                                        let top = 0;

                                        if (containerRef.current) {
                                            const rect = containerRef.current.getBoundingClientRect();
                                            // Aggressive trimming used to simulate window inside app
                                            width = rect.width - 50;
                                            // Subtracting title bar and status bar
                                            height = rect.height - 120;

                                            const browserChromeHeight = window.outerHeight - window.innerHeight;
                                            // Adjusted visual centering
                                            left = window.screenX + rect.left + 25;
                                            top = window.screenY + rect.top + browserChromeHeight + 10;
                                        } else {
                                            // Fallback to split screen
                                            width = Math.floor(window.screen.availWidth / 2);
                                            height = window.screen.availHeight;
                                            left = Math.floor(window.screen.availWidth / 2);
                                        }

                                        // Removed reiszable=yes to try forcing fixed size, added location=no
                                        const features = `width=${Math.floor(width)},height=${Math.floor(height)},left=${Math.floor(left)},top=${Math.floor(top)},popup=yes,toolbar=no,scrollbar=yes,resizable=yes`;

                                        let url = data.url?.trim();
                                        if (url && !url.startsWith('http')) url = 'https://' + url;
                                        if (!url) {
                                            alert("No hay URL detectada. Se abrirá Google.");
                                            url = "https://www.google.com";
                                        }

                                        const win = window.open(url, 'FacturacionExternal', features);
                                        if (win) {
                                            setExternalWindow(win);
                                        }
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-bold transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto">
                                    <ExternalLink size={18} /> Abrir Portal y Enviar Datos
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-50 duration-500">
                                <h3 className="text-lg font-bold text-slate-800 mb-8">Zona de Arrastre Activa</h3>

                                <div className="grid grid-cols-2 gap-8 opacity-50 pointer-events-none">
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 w-32 h-20 flex items-center justify-center bg-white">
                                        Synaptica
                                    </div>
                                    <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 w-32 h-20 flex items-center justify-center bg-indigo-50">
                                        Portal Web
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => { externalWindow.close(); setExternalWindow(null); }}
                                        className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                        Cerrar Ventana Externa
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div >
    );
}

