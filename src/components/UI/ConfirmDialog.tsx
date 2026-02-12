"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, X, Check, Trash2, Info } from "lucide-react";
import { createPortal } from "react-dom";

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info" | "success";
}

interface ConfirmDialogProps extends ConfirmOptions {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "warning",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 200); // Allow exit animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted) return null;

    // Do not unmount immediately to allow exit animation, but hide if !visible and !isOpen
    // Actually simpler: Render if visible is true.
    if (!visible && !isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case "danger": return <Trash2 className="text-red-500" size={24} />;
            case "warning": return <AlertTriangle className="text-amber-500" size={24} />;
            case "success": return <Check className="text-green-500" size={24} />;
            default: return <Info className="text-blue-500" size={24} />;
        }
    };

    const getColors = () => {
        switch (variant) {
            case "danger": return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
            case "success": return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
            default: return "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";
        }
    };

    const modalContent = (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal Card */}
            <div className={`
                relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 p-6
                transform transition-all duration-200 scale-100
                ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
            `}>
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        {title}
                    </h3>

                    <div className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed whitespace-pre-line">
                        {message}
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`w-full py-2.5 px-4 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 ${getColors()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
