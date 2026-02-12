import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Crop, Hand, MousePointer2, ZoomIn, ZoomOut, RotateCw, Move } from 'lucide-react';

interface TicketAnnotatorProps {
    imageUrl: string;
    initialMap?: Record<string, { x: number, y: number, w: number, h: number, color: string }>;
    initialUrl?: string;
    onSave: (data: { url: string }) => Promise<void>;
    onCancel: () => void;
}

const FIELDS = [
    { key: 'total_amount', label: 'Venta Total', color: '#EAB308', bg: 'bg-yellow-500' },
    { key: 'store_name', label: 'Sucursal', color: '#DB2777', bg: 'bg-pink-600' },
    { key: 'ticket_number', label: 'Ticket / Folio', color: '#65A30D', bg: 'bg-lime-600' },
    { key: 'date', label: 'Fecha', color: '#0EA5E9', bg: 'bg-sky-500' },
];

type Tool = 'hand' | 'draw';
type Mode = 'cropping' | 'annotating';

export default function TicketAnnotator({ imageUrl, initialMap, initialUrl = '', onSave, onCancel }: TicketAnnotatorProps) {
    const [mode, setMode] = useState<Mode>('cropping');
    const [regions, setRegions] = useState<Record<string, any>>(initialMap || {});
    const [activeField, setActiveField] = useState<string | null>(null);
    const [url, setUrl] = useState(initialUrl);

    // [NEW] Aspect Ratio to fix viewport cropping
    const [aspectRatio, setAspectRatio] = useState(1); // H/W (Default to square until load)

    // --- CROP STATE ---
    const [cropRect, setCropRect] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [activeHandle, setActiveHandle] = useState<string | null>(null);

    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [cropStart, setCropStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [rotation, setRotation] = useState(0);

    // --- ANNOTATION STATE ---
    const [tool, setTool] = useState<Tool>('hand');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // Drawing State (Annotating)
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const cropViewRef = useRef<HTMLDivElement>(null);

    // --- HELPERS ---
    const getClientCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth && naturalHeight) {
            setAspectRatio(naturalHeight / naturalWidth);
        }
    };

    // Ensure aspect ratio is captured if image matches cache or loads fast
    useEffect(() => {
        if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth) {
            setAspectRatio(imageRef.current.naturalHeight / imageRef.current.naturalWidth);
        }
    }, []);

    // --- CROP HANDLERS ---
    const handleCropMouseDown = (e: React.MouseEvent) => {
        if (activeHandle) return;
        e.preventDefault();
        setIsDraggingCrop(true);
        const { x, y } = getClientCoords(e);
        setDragStart({ x, y });
        setCropStart({ ...cropRect });
    };

    const handleResizeStart = (handle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setActiveHandle(handle);
        const { x, y } = getClientCoords(e);
        setDragStart({ x, y });
        setCropStart({ ...cropRect });
    };

    const handleCropMouseMove = (e: React.MouseEvent) => {
        if ((!isDraggingCrop && !activeHandle) || !containerRef.current) return;
        const { x, y } = getClientCoords(e);

        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = ((x - dragStart.x) / rect.width) * 100;
        const deltaY = ((y - dragStart.y) / rect.height) * 100;

        const minS = 5;

        if (isDraggingCrop) {
            setCropRect({
                x: Math.max(0, Math.min(100 - cropStart.w, cropStart.x + deltaX)),
                y: Math.max(0, Math.min(100 - cropStart.h, cropStart.y + deltaY)),
                w: cropStart.w,
                h: cropStart.h
            });
            return;
        }

        if (activeHandle) {
            let newX = cropStart.x;
            let newY = cropStart.y;
            let newW = cropStart.w;
            let newH = cropStart.h;

            if (activeHandle.includes('w')) {
                const rightEdge = cropStart.x + cropStart.w;
                newX = Math.min(Math.max(0, cropStart.x + deltaX), rightEdge - minS);
                newW = rightEdge - newX;
            } else if (activeHandle.includes('e')) {
                newW = Math.min(Math.max(minS, cropStart.w + deltaX), 100 - cropStart.x);
            }

            if (activeHandle.includes('n')) {
                const bottomEdge = cropStart.y + cropStart.h;
                newY = Math.min(Math.max(0, cropStart.y + deltaY), bottomEdge - minS);
                newH = bottomEdge - newY;
            } else if (activeHandle.includes('s')) {
                newH = Math.min(Math.max(minS, cropStart.h + deltaY), 100 - cropStart.y);
            }

            setCropRect({ x: newX, y: newY, w: newW, h: newH });
        }
    };

    // --- ANNOTATION HANDLERS ---

    const handlePanStart = (e: React.MouseEvent) => {
        if (tool !== 'hand') return;
        e.preventDefault();
        setIsPanning(true);
        const { x, y } = getClientCoords(e);
        setDragStart({ x, y });
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (!isPanning || tool !== 'hand') return;
        const { x, y } = getClientCoords(e);
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x, y });
    };

    const handleDrawStart = (e: React.MouseEvent) => {
        if (tool !== 'draw' || !activeField || !cropViewRef.current) return;
        e.preventDefault();
        setIsDrawing(true);

        const rect = cropViewRef.current.getBoundingClientRect();
        // Calculate percentage relative to the VISIBLE CROP VIEW
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        setDrawStart({ x, y });
        setCurrentRect({ x, y, w: 0, h: 0 });
    };

    const handleDrawMove = (e: React.MouseEvent) => {
        if (!isDrawing || !cropViewRef.current) return;
        const rect = cropViewRef.current.getBoundingClientRect();

        const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        const x = Math.min(drawStart.x, currentX);
        const y = Math.min(drawStart.y, currentY);
        const w = Math.abs(currentX - drawStart.x);
        const h = Math.abs(currentY - drawStart.y);

        setCurrentRect({ x, y, w, h });
    };

    const handleDrawEnd = () => {
        if (isDrawing && currentRect && activeField) {
            if (currentRect.w > 1 && currentRect.h > 1) {
                const field = FIELDS.find(f => f.key === activeField);
                setRegions(prev => ({
                    ...prev,
                    [activeField]: { ...currentRect, color: field?.color }
                }));
                setActiveField(null);
                setTool('hand');
            }
        }
        setIsDrawing(false);
        setCurrentRect(null);
    };

    // Global Mouse Up
    useEffect(() => {
        const handleUp = () => {
            setIsDraggingCrop(false);
            setActiveHandle(null);
            setIsPanning(false);
            if (isDrawing) handleDrawEnd();
        };
        window.addEventListener('mouseup', handleUp);
        return () => window.removeEventListener('mouseup', handleUp);
    }, [isDrawing, currentRect, activeField]);


    // Coordinate Transformation for Check/Save
    const getFinalExtractionMap = () => {
        const finalMap: Record<string, any> = {};
        Object.entries(regions).forEach(([key, r]: [string, any]) => {
            finalMap[key] = {
                x: cropRect.x + (r.x * cropRect.w / 100),
                y: cropRect.y + (r.y * cropRect.h / 100),
                w: (r.w * cropRect.w / 100),
                h: (r.h * cropRect.h / 100),
                color: r.color
            };
        });
        return finalMap;
    };


    return (
        <div className="flex flex-col h-full bg-slate-900 text-white animate-in fade-in duration-300">
            {/* TOP BAR */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                        <span className={`w - 3 h - 3 rounded - full ${mode === 'cropping' ? 'bg-amber-500' : 'bg-green-500'} animate - pulse ring - 4 ring - white / 10`}></span>
                        {mode === 'cropping' ? 'Paso 1: Recortar y Enderezar' : 'Paso 2: Mapeo de Datos'}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 rounded text-sm hover:bg-slate-700 transition-colors">
                        Cancelar
                    </button>
                    {mode === 'cropping' ? (
                        <button
                            onClick={() => setMode('annotating')}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                            <Check size={16} /> Confirmar Recorte
                        </button>
                    ) : (
                        <button
                            onClick={() => onSave({ url })}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-bold text-sm shadow-lg shadow-green-500/20 flex items-center gap-2">
                            <Check size={16} /> Guardar Todo
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* CANVAS AREA */}
                <div
                    className="flex-1 overflow-hidden relative bg-black/80 select-none flex items-center justify-center cursor-default"
                >
                    {mode === 'cropping' ? (
                        /* CROP VIEW */
                        <div
                            ref={containerRef}
                            className="relative shadow-2xl inline-block max-h-[80vh] max-w-[80vw]"
                            onMouseMove={handleCropMouseMove}
                        >
                            <img
                                src={imageUrl}
                                onLoad={handleImageLoad} // CAPTURE ASPECT RATIO
                                style={{ transform: `rotate(${rotation}deg)` }}
                                className="max-h-[80vh] w-auto pointer-events-none opacity-50 select-none"
                                alt="Original"
                            />

                            {/* Draggable Crop Box */}
                            <div
                                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move group"
                                style={{
                                    left: `${cropRect.x}% `,
                                    top: `${cropRect.y}% `,
                                    width: `${cropRect.w}% `,
                                    height: `${cropRect.h}% `,
                                    touchAction: 'none'
                                }}
                                onMouseDown={handleCropMouseDown}
                            >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50 group-hover:text-white/90 transition-colors pointer-events-none">
                                    <Move size={32} />
                                </div>
                                <div onMouseDown={(e) => handleResizeStart('nw', e)} className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-slate-500 cursor-nw-resize z-10 hover:scale-125 transition-transform"></div>
                                <div onMouseDown={(e) => handleResizeStart('ne', e)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-slate-500 cursor-ne-resize z-10 hover:scale-125 transition-transform"></div>
                                <div onMouseDown={(e) => handleResizeStart('sw', e)} className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-slate-500 cursor-sw-resize z-10 hover:scale-125 transition-transform"></div>
                                <div onMouseDown={(e) => handleResizeStart('se', e)} className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-500 border border-white cursor-se-resize z-10 hover:scale-125 transition-transform"></div>
                                <div onMouseDown={(e) => handleResizeStart('n', e)} className="absolute -top-1 left-0 right-0 h-2 cursor-n-resize hover:bg-white/20"></div>
                                <div onMouseDown={(e) => handleResizeStart('s', e)} className="absolute -bottom-1 left-0 right-0 h-2 cursor-s-resize hover:bg-white/20"></div>
                                <div onMouseDown={(e) => handleResizeStart('w', e)} className="absolute top-0 -left-1 bottom-0 w-2 cursor-w-resize hover:bg-white/20"></div>
                                <div onMouseDown={(e) => handleResizeStart('e', e)} className="absolute top-0 -right-1 bottom-0 w-2 cursor-e-resize hover:bg-white/20"></div>
                            </div>
                        </div>
                    ) : (
                        /* ANNOTATION VIEW */
                        <div className="relative overflow-hidden w-full h-full bg-slate-900">
                            {/* Toolbar */}
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-700">
                                <button onClick={() => setTool('hand')} className={`p - 2 rounded - lg transition - all ${tool === 'hand' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'} `} title="Mover y Zoom"><Hand size={20} /></button>
                                <button onClick={() => setTool('draw')} className={`p - 2 rounded - lg transition - all ${tool === 'draw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'} `} title="Dibujar"><MousePointer2 size={20} /></button>
                                <div className="w-px bg-slate-600 mx-1"></div>
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 text-slate-400 hover:bg-slate-700 rounded"><ZoomOut size={18} /></button>
                                <span className="text-slate-300 text-xs font-mono py-2 w-12 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="p-2 text-slate-400 hover:bg-slate-700 rounded"><ZoomIn size={18} /></button>
                            </div>

                            {/* Viewport - JUST THE IMAGE */}
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                <img
                                    src={imageUrl}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                    alt="Ticket"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDEBAR */}
                <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col z-10 overflow-y-auto">
                    <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-indigo-500 rounded"></span> Portal
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">URL de Facturación</label>
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-slate-300 focus:border-indigo-500 focus:outline-none"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-4">
                        <div className="bg-indigo-900/20 p-4 rounded border border-indigo-500/30">
                            <h4 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                                Verificación Manual
                            </h4>
                            <p className="text-xs text-indigo-400/80">
                                La herramienta de recorte ha sido desactivada.
                                Por favor, verifica los campos extraídos y corrígelos manualmente si es necesario.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-800">
                        <div className="flex gap-2">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 px-4 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onSave({ url })}
                                className="flex-1 py-3 px-4 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
