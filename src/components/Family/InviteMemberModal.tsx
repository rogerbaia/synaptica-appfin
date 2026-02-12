"use client";

import React, { useState } from 'react';
import { X, Mail, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    if (!isOpen) return null;

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');

        // Mock API call
        setTimeout(() => {
            if (email.includes('@')) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <UserPlus size={24} />
                        <h2 className="text-xl font-bold">{t('modal_invite_title') || "Invitar Familiar"}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {status === 'success' ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                {t('msg_invite_sent') || "¡Invitación Enviada!"}
                            </h3>
                            <p className="text-gray-500 text-sm mb-6">
                                {t('msg_invite_sent_desc') || "Hemos enviado un correo a tu pareja para unirse a tus finanzas."}
                            </p>
                            <button onClick={onClose} className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                                {t('btn_close') || "Cerrar"}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleInvite} className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                {t('msg_invite_help') || "Comparte tu tablero con tu pareja o familiar para gestionar los gastos juntos."}
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('lbl_email') || "Correo Electrónico"}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        placeholder="ejemplo@correo.com"
                                        required
                                    />
                                </div>
                            </div>

                            {status === 'error' && (
                                <p className="text-red-500 text-sm flex items-center gap-1">
                                    <AlertCircle size={14} /> Error al enviar invitación
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {status === 'sending' ? (
                                    <>Enviando...</>
                                ) : (
                                    <>{t('btn_send_invite') || "Enviar Invitación"}</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
