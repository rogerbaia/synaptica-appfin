import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, X, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { gabiVisionService } from '@/services/gabiVisionService';

interface SmartScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (text: string) => void;
    onScanComplete?: (data: { amount: number; merchant: string; date: string }) => void;
    initialSource?: 'camera' | 'photos';
}

export default function SmartScanModal({ isOpen, onClose, onSuccess, onScanComplete, initialSource = 'camera' }: SmartScanModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ amount: number; merchant: string; date: string } | null>(null);
    const [duplicateTx, setDuplicateTx] = useState<any | null>(null);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    // Toggle Body Class for UI coordination (Hide FAB)
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('gabi-modal-open');
        } else {
            document.body.classList.remove('gabi-modal-open');
        }
        return () => {
            document.body.classList.remove('gabi-modal-open');
        };
    }, [isOpen]);

    // Camera/Gallery Logic
    useEffect(() => {
        if (isOpen && !image) {
            // If native, we launch the intent.
            if (isNative) {
                launchNativeCamera(initialSource === 'photos' ? CameraSource.Photos : CameraSource.Camera);
            } else {
                // WEB: If photos requested, we can't auto-launch native gallery.
                if (initialSource === 'photos') {
                    // Web Gallery Logic (Trigger hidden input)
                    setTimeout(() => document.getElementById('smart-scan-file-input')?.click(), 500);
                } else {
                    startCamera();
                }
            }
        } else {
            stopCamera();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => stopCamera();
    }, [isOpen, image, isNative, initialSource]);

    const launchNativeCamera = async (source: CameraSource = CameraSource.Camera) => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source,
                saveToGallery: false
            });

            if (image.dataUrl) {
                setImage(image.dataUrl);
                processImage(image.dataUrl);
            }
        } catch (e) {
            console.log('User cancelled or error', e);
        }
    };

    const startCamera = async () => {
        if (isNative) return;
        try {
            // Request High Resolution for clearer text
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("No se pudo acceder a la cámara. Revisa los permisos.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) return;

            // 1. Draw Original
            ctx.drawImage(video, 0, 0);

            // 2. Pre-process (Grayscale + High Contrast)
            // This helps Tesseract read faint thermal receipts significantly better
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const factor = 1.2; // Contrast factor

            for (let i = 0; i < data.length; i += 4) {
                // Grayscale (Luminosity method)
                const gray = 0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2];

                // Contrast
                let c = factor * (gray - 128) + 128;
                if (c < 0) c = 0; if (c > 255) c = 255;

                data[i] = c;     // R
                data[i + 1] = c; // G
                data[i + 2] = c; // B
            }

            ctx.putImageData(imgData, 0, 0);

            const imageData = canvas.toDataURL('image/png');
            setImage(imageData);
            stopCamera();
            processImage(imageData);
        }
    };

    const processImage = async (imageData: string) => {
        setProcessing(true);

        try {
            // Remove data:image/png;base64, prefix for Gemini
            const base64 = imageData.split(',')[1];

            // Use Gabi Vision (Gemini Flash)
            // This replaces the old Tesseract logic with high-intelligence AI
            const result = await gabiVisionService.analyzeTicket(base64);

            console.log("Gemini Result:", result);

            if (result) {
                setOcrResult({
                    amount: result.total_amount || 0,
                    merchant: result.store_name || "Comercio Desconocido",
                    date: result.date || new Date().toISOString()
                });
            } else {
                throw new Error("No se pudo extraer información del ticket.");
            }
            setProcessing(false);

        } catch (err: any) {
            console.error("Smart Scan Error:", err);

            const eMsg = (err.message || "").toLowerCase();

            if (eMsg.includes("api key") || eMsg.includes("invalid") || eMsg.includes("400") || eMsg.includes("403")) {
                const key = localStorage.getItem('synaptica_gemini_key') || "";
                const keyHint = key.length > 5 ? `...${key.slice(-4)}` : "???";

                alert(`⚠️ Revisar API Key (Termina en ${keyHint})\n\nGoogle rechaza la llave con el mensaje: "${err.message}".\n\nPosibles causas:\n1. Restricciones de Dominio (Referer) en Google Cloud (la app corre en ${window.location.hostname}).\n2. Espacios en blanco al copiar.\n3. Llave equivocada (Debe ser de AI Studio, no Vertex).`);
            } else {
                alert("Error al analizar (" + (err.message || "desconocido") + "). Intenta de nuevo.");
            }
            setProcessing(false);
        }
    };

    // Eager Duplicate Check
    useEffect(() => {
        const checkDup = async () => {
            if (ocrResult && ocrResult.amount > 0) {
                const dup = await supabaseService.checkDuplicateTransaction(ocrResult.amount, ocrResult.date);
                setDuplicateTx(dup);
            } else {
                setDuplicateTx(null);
            }
        };
        checkDup();
    }, [ocrResult]);

    const handleConfirm = async () => {
        if (!ocrResult) return;

        // Duplicate Blocking
        if (duplicateTx) {
            const merchantName = duplicateTx.description || "ese mismo comercio";
            const amountStr = `$${ocrResult.amount.toFixed(2)}`;
            const confirmDup = confirm(`⚠️ Detección de Duplicado\n\nYa existe un gasto idéntico por ${amountStr} en "${merchantName}" (Fecha: ${new Date(duplicateTx.date).toLocaleDateString()}).\n\n¿Estás SEGURO de que quieres registrarlo dos veces?`);
            if (!confirmDup) return;
        }

        // Mode 1: Form Fill (Return Data)
        if (onScanComplete) {
            onScanComplete(ocrResult);
            reset();
            onClose();
            return;
        }

        // Mode 2: Auto-Save (Direct DB)
        await supabaseService.addTransaction({
            amount: ocrResult.amount,
            type: 'expense', // Assume expense for receipts
            category: 'Otros', // We could try to classify merchant later
            description: ocrResult.merchant,
            date: new Date().toISOString(),
            recurring: false
        });

        onSuccess(`Ticket procesado. Gasto de $${ocrResult.amount} en ${ocrResult.merchant} registrado.`);
        reset();
        onClose();
    };

    const reset = () => {
        setImage(null);
        setOcrResult(null);
        setDuplicateTx(null);
        setProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative">

                {/* Branding */}
                <div className="absolute top-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/90 shadow-lg">
                        <Sparkles size={12} className="text-purple-400 animate-pulse" />
                        <span className="text-xs font-medium tracking-wide">Powered by Gabi AI</span>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-white bg-black/50 p-2 rounded-full hover:bg-black/70"
                >
                    <X size={24} />
                </button>

                <div className="relative aspect-[3/4] bg-black">
                    {!image ? (
                        !isNative ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 space-y-4 bg-gray-900">
                                <CameraIcon size={64} className="opacity-50" />
                                <p className="font-medium text-sm">Usa la cámara de tu dispositivo</p>
                                <button
                                    onClick={() => launchNativeCamera()}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-bold backdrop-blur-md transition"
                                >
                                    Abrir Cámara
                                </button>
                            </div>
                        )
                    ) : (
                        <img
                            src={image}
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />
                    )}

                    {!image && !isNative && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                            <button
                                onClick={captureImage}
                                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all"
                            >
                                <div className="w-12 h-12 bg-white rounded-full" />
                            </button>
                        </div>
                    )}

                    {processing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                            <Loader2 size={48} className="animate-spin mb-4 text-purple-500" />
                            <p className="font-medium animate-pulse">Leyendo ticket...</p>
                            <p className="text-xs text-gray-300 mt-2">Buscando monto y comercio</p>
                        </div>
                    )}
                </div>

                {/* Confirm Result */}
                {ocrResult && !processing && (
                    <div className="p-6 space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-bold dark:text-white">Resultado del Escaneo</h3>
                            <h3 className="text-lg font-bold dark:text-white">Resultado del Escaneo</h3>
                            <h3 className="text-lg font-bold dark:text-white">Resultado del Escaneo</h3>
                            <p className="text-sm text-gray-500">Verifica si los datos son correctos</p>
                        </div>

                        {/* Duplicate Warning */}
                        {duplicateTx && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-full shrink-0">
                                    <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                        ¡Posible Duplicado Detectado!
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Ya tienes un gasto de <b>${duplicateTx.amount}</b> en <b>{duplicateTx.description}</b> cargado hoy/ayer.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Duplicate Warning */}
                        {duplicateTx && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-full shrink-0">
                                    <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                        ¡Posible Duplicado Detectado!
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Ya tienes un gasto de <b>${duplicateTx.amount}</b> en <b>{duplicateTx.description}</b> cargado hoy.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl space-y-2 border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-sm">Comercio</span>
                                <span className="font-medium dark:text-gray-200">{ocrResult.merchant}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-sm">Monto</span>
                                <span className="font-bold text-green-600 dark:text-green-400 text-lg">${ocrResult.amount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={reset}
                                className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Reintentar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Confirmar
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Hidden File Input for Web Gallery */}
                <input
                    type="file"
                    id="smart-scan-file-input"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const result = ev.target?.result as string;
                                if (result) {
                                    setImage(result);
                                    processImage(result);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    }}
                />
            </div>

            {/* Version Indicator */}
            <div className="absolute bottom-4 right-4 text-white/30 text-[10px] font-mono pointer-events-none z-50">
                v3.0
            </div>
        </div>
    );
}
