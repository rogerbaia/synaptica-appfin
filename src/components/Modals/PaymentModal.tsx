import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pkg: { folios: number; price: number } | null;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, pkg, onSuccess }: PaymentModalProps) {
    const { addFolios } = useSubscription();
    const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

    // Form State
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setCardName('');
            setCardNumber('');
            setExpiry('');
            setCvc('');
        }
    }, [isOpen]);

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const resetVal = e.target.value;
        setCardNumber(formatCardNumber(resetVal));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('processing');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        setStep('success');

        // Add Balance
        if (pkg) {
            addFolios(pkg.folios);
        }

        // Auto Close
        setTimeout(() => {
            onSuccess(); // Triggers parent refresh/close
        }, 2000);
    };

    if (!isOpen || !pkg) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Lock size={16} className="text-green-600" />
                        <span className="font-bold text-sm">Pago Seguro (SSL)</span>
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
                        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titular de la tarjeta</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="COMO APARECE EN LA TARJETA"
                                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase text-sm"
                                    value={cardName}
                                    onChange={e => setCardName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de tarjeta</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        placeholder="0000 0000 0000 0000"
                                        maxLength={19}
                                        className="w-full pl-10 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        value={cardNumber}
                                        onChange={handleCardChange}
                                    />
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiración</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="MM/AA"
                                        maxLength={5}
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono text-sm"
                                        value={expiry}
                                        onChange={e => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                                            setExpiry(val);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CVC</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="123"
                                        maxLength={4}
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono text-sm"
                                        value={cvc}
                                        onChange={e => setCvc(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all mt-4 flex items-center justify-center gap-2"
                            >
                                Pagar ${pkg.price.toLocaleString('es-MX')} MXN
                            </button>

                            <div className="flex justify-center gap-2 pt-2">
                                {/* Mock trusted badges */}
                                <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded blur-[1px]"></div>
                                <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded blur-[1px]"></div>
                                <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded blur-[1px]"></div>
                            </div>
                        </form>
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
                </div>
            </div>
        </div>
    );
}
