import React from 'react';
import { ShoppingCart, Star, Zap, Check } from 'lucide-react';

const PACKAGES = [50, 100, 250, 500, 1000, 2500];

// Interpolation Logic
const MIN_FOLIOS = 50;
const MAX_FOLIOS = 2500;
const MAX_PRICE = 6.80;
const MIN_PRICE = 2.40;

const calculateUnitPrice = (folios: number) => {
    // Custom overrides requested by user
    if (folios === 100) return MAX_PRICE * 0.97; // 3% discount
    if (folios === 250) return MAX_PRICE * 0.93; // 7% discount
    if (folios === 500) return MAX_PRICE * 0.85; // 15% discount
    if (folios === 1000) return MAX_PRICE * 0.68; // 32% discount

    if (folios <= MIN_FOLIOS) return MAX_PRICE;
    if (folios >= MAX_FOLIOS) return MIN_PRICE;

    // Linear Interpolation
    const slope = (MIN_PRICE - MAX_PRICE) / (MAX_FOLIOS - MIN_FOLIOS);
    const price = MAX_PRICE + slope * (folios - MIN_FOLIOS);
    return price;
};

import PaymentModal from '@/components/Modals/PaymentModal';


export default function FolioPackages() {
    const [selectedPackage, setSelectedPackage] = React.useState<{ folios: number; price: number; savings: number } | null>(null);
    const [showPayment, setShowPayment] = React.useState(false);
    const [wobbleId, setWobbleId] = React.useState<number | null>(null);

    const handleBuy = (folios: number, price: number, savings: number) => {
        setSelectedPackage({ folios, price, savings });
    };

    const handleWobble = (folios: number) => {
        setWobbleId(folios);
        setTimeout(() => setWobbleId(null), 600);
    };

    const proceedToPayment = () => {
        setShowPayment(true);
    };

    const handlePaymentSuccess = () => {
        setShowPayment(false);
        setSelectedPackage(null);
    };

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... (Header and Grid remain same) ... */}
            <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Zap size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recarga de Folios (CFDI 4.0)</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Paquetes con vigencia de 1 año. No acumulables.</p>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex flex-col gap-8 md:grid md:grid-cols-2 lg:grid-cols-6 md:gap-6">
                {PACKAGES.map((folios, index) => {
                    const isTop = folios === 100;
                    const unitPrice = calculateUnitPrice(folios);
                    const totalPrice = folios * unitPrice;
                    const savings = (MAX_PRICE - unitPrice) / MAX_PRICE * 100;
                    const isLast = index === PACKAGES.length - 1;

                    return (
                        <div
                            key={folios}
                            onClick={() => handleWobble(folios)}
                            style={{ animation: wobbleId === folios ? 'wobble3d 0.6s ease-in-out' : 'none' }}
                            className={`
                                group relative flex flex-col items-center bg-white dark:bg-slate-800
                                shadow-lg rounded-xl overflow-hidden cursor-pointer
                                border-2 border-blue-500 dark:border-blue-600
                                transform-style-3d
                                ${isTop ? 'z-10 shadow-blue-500/20' : ''}
                            `}
                        >
                            {/* Header Background */}
                            <div className={`w-full h-24 flex items-start justify-center pt-2 ${isTop ? 'bg-gradient-to-b from-blue-600 to-blue-500 shadow-inner' : 'bg-gradient-to-b from-blue-500 to-blue-400 opacity-90'}`}>
                                {isTop && (
                                    <div className="bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 mt-1 animate-pulse">
                                        <Star size={10} fill="currentColor" /> TOP
                                    </div>
                                )}
                            </div>

                            {/* Floating Circle */}
                            <div className="absolute top-10 w-24 h-24 bg-white dark:bg-slate-700 rounded-full shadow-lg flex flex-col items-center justify-center border-4 border-slate-50 dark:border-slate-800 z-10 transition-all duration-300 group-active:scale-110 group-active:shadow-[0_0_25px_rgba(59,130,246,0.6)] group-active:border-blue-400">
                                <span className={`text-2xl font-black ${isTop ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'} group-active:text-blue-600`}>
                                    {folios}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 group-active:text-blue-400">Folios</span>
                            </div>

                            {/* Body Content */}
                            <div className={`w-full flex-1 pt-14 pb-6 px-4 flex flex-col items-center justify-between text-center ${isTop ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-slate-50/30 dark:bg-slate-800'}`}>

                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                                        ${totalPrice.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        ${unitPrice.toFixed(2)} c/u
                                    </div>
                                </div>

                                <div className="h-6 mb-2">
                                    {savings > 0 && (
                                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold inline-block">
                                            Ahorras {savings.toFixed(0)}%
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3 w-full">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                        Vigencia de 1 año <br />o hasta agotar
                                        <br />(Lo que suceda primero)
                                    </p>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent card wobble when clicking buy
                                            handleBuy(folios, totalPrice, savings)
                                        }}
                                        className={`
                                            w-full py-2 px-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-1
                                            bg-blue-600 hover:bg-blue-700 text-white active:scale-95
                                        `}
                                    >
                                        <ShoppingCart size={14} />
                                        {isTop ? 'Comprar' : 'Comprar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal (Shows First) */}
            {selectedPackage && !showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-blue-600 p-6 text-center text-white">
                            <ShoppingCart size={48} className="mx-auto mb-2 opacity-90" />
                            <h3 className="text-2xl font-bold">Confirma tu Compra</h3>
                            <p className="text-blue-100 text-sm">Estás a un paso de recargar tus folios.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Paquete</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-white">{selectedPackage.folios} Folios</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        ${selectedPackage.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Precio Unitario</span>
                                    <span className="font-medium text-slate-900 dark:text-white">${(selectedPackage.price / selectedPackage.folios).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Ahorro Aplicado</span>
                                    <span className="font-bold text-green-600">{selectedPackage.savings.toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Total a Pagar (MXN)</span>
                                    <span className="font-bold text-slate-900 dark:text-white">${selectedPackage.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setSelectedPackage(null)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={proceedToPayment}
                                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition flex items-center justify-center gap-2"
                                >
                                    Confirmar <Check size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal (Overlay) */}
            <PaymentModal
                isOpen={showPayment}
                onClose={() => {
                    setShowPayment(false);
                    if (!showPayment) setSelectedPackage(null);
                }}
                pkg={selectedPackage}
                onSuccess={handlePaymentSuccess}
            />

        </div>
    );
}
