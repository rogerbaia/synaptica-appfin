import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, Sparkles } from 'lucide-react';
import { gabiVisionService, ExtractedTicketData } from '@/services/gabiVisionService';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';

interface TicketUploaderProps {
    onScanComplete: (data: ExtractedTicketData, imageUrl: string) => void;
}

export default function TicketUploader({ onScanComplete }: TicketUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Por favor sube solo imágenes (JPG, PNG).');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            setPreview(base64);
            setIsProcessing(true);
            setError(null);

            try {
                const rawBase64 = base64.split(',')[1];
                const analysis = await gabiVisionService.analyzeTicket(rawBase64, file.type);

                // TODO: Upload to Supabase Storage if needed later, for now we just pass base64 locally
                // In production, we should upload to storage and save URL.
                // Assuming we just pass it up for now.

                onScanComplete(analysis, base64);
                setPreview(null); // Reset after success? or Keep it? Let parent handle it.
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error al analizar el ticket.');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="w-full">
            {isProcessing ? (
                <div className="h-32 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/10 animate-pulse">
                    <Loader2 size={24} className="text-indigo-500 animate-spin mb-2" />
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Gabi está leyendo tu ticket...</p>
                </div>
            ) : (
                <div
                    className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden px-4
                    ${isDragging
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                            : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />

                    {/* Powered by Gabi AI Badge */}
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 pointer-events-none">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Powered by Gabi AI
                        </span>
                    </div>

                    <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-full mb-2">
                        <Upload size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                        Arrastra o <span className="text-indigo-500">haz clic</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 text-center max-w-[200px] leading-tight">
                        Gabi detectará la URL automáticamente.
                    </p>

                    {error && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center text-red-500">
                            <p className="font-bold mb-2">Error</p>
                            <p className="text-xs px-4 text-center">{error}</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setError(null); }}
                                className="mt-4 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 rounded text-xs hover:bg-red-200"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
