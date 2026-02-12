import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabaseService } from '@/services/supabaseService';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pkg: { folios: number; price: number } | null;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, pkg, onSuccess }: PaymentModalProps) {
    const { checkSubscription } = useSubscription();
    const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setErrorMessage('');
        }
    }, [isOpen]);

    const handleConfirmPurchase = async () => {
        if (!pkg) return;
        setStep('processing');
        setErrorMessage('');

        try {
            // Get Session Token
            // explicit:
            const { data: { session: authSession } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());

            if (!authSession) throw new Error("No session found");

            const res = await fetch('/api/stripe/charge-saved-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession.access_token}`
                },
                body: JSON.stringify({
                    folios: pkg.folios,
                    amount: pkg.price // Sends MXN amount
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Payment failed');
            }

            // Success
            setStep('success');

            // Refresh Context Balance
            await checkSubscription();

            // Auto Close
            setTimeout(() => {
                onSuccess();
            }, 3000);

        } catch (error: any) {
            console.error("Purchase Failed:", error);
            setStep('error');
            setErrorMessage(error.message || "Error processing payment");
        }
    };

    if (!isOpen || !pkg) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Lock size={16} className="text-green-600" />
                        <span className="font-bold text-sm">Pago Seguro (Stripe)</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Order Summary */}
                    <div className="flex justify-between items-end mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Estás comprando</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                {pkg.folios} Folios
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total a pagar</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                ${pkg.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {step === 'form' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                                <CreditCard className="text-blue-600 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300">Método de Pago Guardado</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                        Se realizará el cargo a la tarjeta asociada a tu suscripción actual.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmPurchase}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all mt-4 flex items-center justify-center gap-2"
                            >
                                Confirmar Compra
                            </button>

                            <div className="text-center">
                                <p className="text-xs text-slate-400">
                                    Al confirmar, aceptas el cargo inmediato a tu método de pago por defecto.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                                <Loader2 size={48} className="text-blue-600 animate-spin relative z-10" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">Procesando pago...</h4>
                                <p className="text-sm text-slate-500">Contactando con el banco emisor</p>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-2xl text-slate-800 dark:text-white">¡Pago Exitoso!</h4>
                                <p className="text-slate-600 dark:text-slate-300 mt-2">
                                    Se han agregado <strong>{pkg.folios} folios</strong> a tu cuenta.
                                </p>
                            </div>
                            <div className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mt-4 text-left">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Referencia</span>
                                    <span className="font-mono">TX-{Math.floor(Math.random() * 1000000)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Fecha</span>
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                                <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xl text-slate-800 dark:text-white">Error en el Pago</h4>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-2 max-w-[280px] mx-auto">
                                    {errorMessage}
                                </p>
                            </div>
                            <button
                                onClick={() => setStep('form')}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
