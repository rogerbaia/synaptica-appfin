"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userEmail: string;
    isProcessing: boolean;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
}

export default function DeleteUserModal({
    isOpen,
    onClose,
    onConfirm,
    userEmail,
    isProcessing,
    title = "Eliminar Usuario",
    description,
    confirmText = "Entiendo, eliminar este usuario"
}: DeleteUserModalProps) {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isMatch = inputValue === userEmail;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
                        <p className="font-semibold mb-1">Esta acción es irreversible.</p>
                        {description || (
                            <p>
                                Se eliminará permanentemente al usuario <span className="font-mono font-bold">{userEmail}</span> y todos sus datos asociados (transacciones, facturas, configuraciones).
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Escribe <span className="font-mono font-bold select-all">{userEmail}</span> para confirmar:
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-mono text-sm"
                            placeholder="nombre@ejemplo.com"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        disabled={isProcessing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch || isProcessing}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-red-500/20 active:scale-95 flex items-center gap-2"
                    >
                        {isProcessing ? 'Eliminando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
