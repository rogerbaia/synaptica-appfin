"use client";

import React, { useEffect, useRef } from 'react';
import { Mic, X, MoreHorizontal, Camera } from 'lucide-react';
import { GabiState } from '@/hooks/useGabi';

interface GabiInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    state: GabiState;
    transcript: string;
    response: string;
    conversation?: any; // We relax type here or import from hook if we export types
    onMicClick: () => void;
    onCameraClick: () => void;
    onCommand: (cmd: string) => void;
}

export default function GabiInterface({ isOpen, onClose, state, transcript, response, conversation, onMicClick, onCameraClick, onCommand }: GabiInterfaceProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of conversation if we were maintaining a history list
    // For now we just show current interaction state.

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-4 pb-24">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden border border-purple-100 dark:border-purple-900/50">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-b border-purple-100 dark:border-purple-900/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            G
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white">Gabi</h3>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                {conversation?.mode === 'CFDI_WIZARD' ? 'Asistente de Facturación' : 'Asistente Virtual'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 h-64 flex flex-col justify-end space-y-4">

                    {/* User Transcript */}
                    {transcript && (
                        <div className="flex justify-end">
                            <div className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
                                {transcript}
                            </div>
                        </div>
                    )}

                    {/* Gabi Response / State Indicator */}
                    <div className="flex justify-start">
                        <div className="bg-purple-50 dark:bg-indigo-900/30 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] text-sm shadow-sm border border-purple-100 dark:border-indigo-800/50">
                            {state === 'listening' && (
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Mic size={16} className="animate-pulse" />
                                    <span>Escuchando...</span>
                                </div>
                            )}
                            {state === 'processing' && (
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                    <MoreHorizontal size={16} className="animate-bounce" />
                                    <span>Procesando...</span>
                                </div>
                            )}
                            {state === 'speaking' && (
                                <p dangerouslySetInnerHTML={{ __html: response }} />
                            )}
                            {state === 'idle' && !response && (
                                <p>Hola, ¿en qué puedo ayudarte hoy?</p>
                            )}
                            {state === 'idle' && response && (
                                <p dangerouslySetInnerHTML={{ __html: response }} />
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer / Mic Button */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#151e2d]">
                    {/* Text Input */}
                    <form
                        action="javascript:void(0);"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const input = form.elements.namedItem('gabiText') as HTMLInputElement;
                            if (input.value.trim()) {
                                onCommand(input.value.trim());
                                input.value = '';
                            }
                            return false;
                        }}
                        className="mb-4 flex gap-2"
                    >
                        <input
                            type="text"
                            name="gabiText"
                            placeholder="Escribe algo..."
                            className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            autoComplete="off"
                        />
                        <button type="submit" className="w-10 h-10 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>

                    <div className="flex justify-center gap-4 items-center">
                        <button
                            onClick={onCameraClick}
                            className="p-3 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-gray-700"
                            title="Escanear ticket"
                        >
                            <Camera size={24} />
                        </button>

                        <div className="relative">
                            {state === 'listening' && (
                                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                            )}
                            <button
                                onClick={onMicClick}
                                className={`relative z-10 p-4 rounded-full transition-all duration-300 shadow-lg ${state === 'listening'
                                    ? 'bg-red-500 text-white scale-110 shadow-red-500/40' // Removed animate-pulse here to avoid double movement
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 shadow-purple-500/30'
                                    }`}
                            >
                                <Mic size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
