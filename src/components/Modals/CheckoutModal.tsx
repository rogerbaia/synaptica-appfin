"use client";

import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { useSubscription } from '@/context/SubscriptionContext';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe-client';

// Initialize Stripe Promise
const stripePromise = getStripe();

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: 'pro' | 'platinum' | null;
    price: string;
}

export default function CheckoutModal(props: CheckoutModalProps) {
    if (!props.isOpen || !props.plan) return null;

    return (
        <div style={{ zIndex: 10000 }} className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <Elements stripe={stripePromise}>
                    <CheckoutForm {...props} />
                </Elements>
            </div>
        </div>
    );
}

function CheckoutForm({ onClose, plan, price }: CheckoutModalProps) {
    const stripe = useStripe();
    const elements = useElements();
    const { checkSubscription } = useSubscription();

    const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
    const [error, setError] = useState<string | null>(null);
    const [cardHolder, setCardHolder] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setStep('processing');
        setError(null);

        // 1. Create PaymentIntent on Server
        const amount = parseFloat(price.replace('$', '').replace('/ mes', '').trim().split(' ')[0]);
        const { clientSecret, error: backendError } = await paymentService.createPaymentIntent(amount);

        if (backendError || !clientSecret) {
            setError(backendError || "Error iniciando pago");
            setStep('form');
            return;
        }

        // 2. Confirm Card Payment
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: cardHolder,
                },
            },
        });

        if (stripeError) {
            setError(stripeError.message || "Pago fallido");
            setStep('form');
        } else if (paymentIntent?.status === 'succeeded') {
            // 3. Success! Update DB
            await paymentService.upgradeUserTier(plan!);
            await checkSubscription();
            setStep('success');
            setTimeout(onClose, 3500);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Close Button */}
            {step !== 'processing' && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition z-10"
                >
                    <X size={20} />
                </button>
            )}

            {step === 'success' ? (
                <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-2 animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¡Pago Exitoso!</h2>
                        <p className="text-slate-500 mt-2">Bienvenido al nivel <span className="capitalize font-bold text-slate-800 dark:text-white">{plan}</span>.</p>
                    </div>
                    <p className="text-sm text-slate-400 animate-pulse">Redirigiendo to Dashboard...</p>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Suscripción {plan === 'platinum' ? 'Platinum' : 'Pro'}</h3>
                            <span className="text-xl font-bold text-slate-900 dark:text-white">{price}</span>
                        </div>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <ShieldCheck size={14} className="text-green-500" />
                                <span>Pago seguro SSL</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 opacity-70">
                                Powered by <span className="text-slate-600 dark:text-slate-300 font-extrabold tracking-tight">stripe</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 relative">
                        {step === 'processing' && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                                <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Conectando con banco...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                                <X size={14} /> {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Titular</label>
                            <input
                                className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre como aparece en tarjeta"
                                value={cardHolder}
                                onChange={e => setCardHolder(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Datos de Tarjeta</label>
                            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <CardElement options={{
                                    style: {
                                        base: {
                                            fontSize: '16px',
                                            color: '#424770',
                                            '::placeholder': {
                                                color: '#aab7c4',
                                            },
                                        },
                                        invalid: {
                                            color: '#9e2146',
                                        },
                                    },
                                }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!stripe || step === 'processing'}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold mt-4 hover:shadow-lg transform active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {step === 'processing' ? 'Procesando...' : `Pagar ${price}`}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
