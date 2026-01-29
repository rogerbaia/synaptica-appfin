"use client";

import React, { useState } from 'react';
import { X, Check, CheckCircle2, Crown, Zap, Shield, Users, Sparkles, Activity } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabaseService } from '@/services/supabaseService';
import { TIER_NAMES } from '@/config/subscriptionPlans';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import CheckoutModal from './CheckoutModal';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
    const { tier, checkSubscription } = useSubscription();
    const [viewingDetails, setViewingDetails] = useState<'free' | 'pro' | 'platinum' | null>(null);
    const [checkoutData, setCheckoutData] = useState<{ plan: 'pro' | 'platinum', price: string } | null>(null);

    // Simulate upgrading logic
    const handleUpgrade = async (targetTier: 'free' | 'pro' | 'platinum') => {
        // Case 1: Degrade to Free (Instant)
        if (targetTier === 'free') {
            if (confirm(`¿Estás seguro de volver al Plan Básico? Perderás acceso a las funciones premium.`)) {
                try {
                    await supabaseService.updateProfile({
                        subscription_tier: 'free',
                        is_pro: false
                    });
                    await checkSubscription();
                    onClose();
                } catch (error) {
                    console.error(error);
                    alert("Error al actualizar plan");
                }
            }
            return;
        }

        // Case 2: Paid Upgrade -> Open Checkout
        // Determine price based on tier (hardcoded for now to match UI)
        const price = targetTier === 'platinum' ? '$15.00 / mes' : '$5.00 / mes';
        setCheckoutData({ plan: targetTier, price });

        // Close details if open
        setViewingDetails(null);
    };

    const planDetails = {
        free: {
            title: "Plan Básico",
            subtitle: "El punto de partida para tu salud financiera.",
            description: "Ideal si estás comenzando a tomar control de tus gastos. Te ofrece todas las herramientas esenciales para registrar diariamente tus movimientos y entender a dónde va tu dinero con un dashboard claro y conciso.",
            benefits: [
                {
                    title: "Registro Diario",
                    desc: "Anota cada gasto e ingreso al instante. Acceso al historial del año en curso."
                },
                {
                    title: "Dashboard Esencial",
                    desc: "Visualiza tus totales del mes y desglose por categorías en tiempo real."
                },
                {
                    title: "Soporte Estándar",
                    desc: "Acceso a nuestras guías de ayuda y comunidad."
                }
            ]
        },
        pro: {
            title: "Plan Pro",
            subtitle: "Sube de nivel tu organización.",
            description: "Diseñado para quienes necesitan estructura. El Plan Pro te permite planificar con presupuestos, ahorrar tiempo con pagos recurrentes y compartir la gestión con tu pareja.",
            benefits: [
                {
                    title: "Historial Extendido",
                    desc: "Consulta tus movimientos del año actual y todo el año anterior."
                },
                {
                    title: "3 Presupuestos",
                    desc: "Define límites para tus gastos más críticos (ej. Alimentos, Salidas, Transporte)."
                },
                {
                    title: "Sincronización Familiar",
                    desc: "Invita a 1 miembro (tu pareja) para gestionar las finanzas del hogar juntos."
                },
                {
                    title: "Exportación Mensual",
                    desc: "Descarga tus datos una vez al mes en PDF/Excel para tu cierre administrativo."
                },
                {
                    title: "Modo Oscuro",
                    desc: "Una interfaz más cómoda para tus ojos durante la noche."
                },
                {
                    title: "Facturación CFDI",
                    desc: "Emite facturas fiscales válidas ante el SAT (Costo adicional por paquete de folios)."
                }
            ]
        },
        platinum: {
            title: "Plan Platinum",
            subtitle: "Potencia Total con Inteligencia Artificial.",
            description: "La experiencia definiva de Synaptica. Desbloquea el poder de Gabi AI para tener una asesora financiera 24/7, predicciones automáticas y libertad total sin límites.",
            benefits: [
                {
                    title: "🤖 Gabi AI Completo",
                    desc: "Habla con Gabi por voz, envíale fotos de tickets y pídele análisis profundos."
                },
                {
                    title: "📈 Predicciones y Pulso",
                    desc: "Anticípate al futuro con la proyección de gastos y monitorea tu salud financiera en tiempo real."
                },
                {
                    title: "Presupuestos Ilimitados",
                    desc: "Crea tantos presupuestos como necesites para cada aspecto de tu vida."
                },
                {
                    title: "Historial Ilimitado",
                    desc: "Acceso total a todos tus registros históricos desde que empezaste a usar la app."
                },
                {
                    title: "Familia Ilimitada",
                    desc: "Agrega a toda tu familia (hijos, padres) sin restricciones."
                },
                {
                    title: "Soporte Prioritario",
                    desc: "Tu consultas pasan al frente de la fila para una atención inmediata."
                },
                {
                    title: "Facturación Incluida",
                    desc: "50 folios anuales incluidos para tus recibos de honorarios o facturas personales."
                },
                {
                    title: "Paleta de Colores",
                    desc: "Personaliza la interfaz con temas premium (Blue, Purple, Emerald, Rose)."
                }
            ]
        }
    };

    if (!isOpen) return null;

    if (viewingDetails) {
        const details = planDetails[viewingDetails];
        const isPurple = viewingDetails === 'platinum';
        const isBlue = viewingDetails === 'pro';

        return (
            <>
                <CheckoutModal
                    isOpen={!!checkoutData}
                    onClose={() => { setCheckoutData(null); onClose(); }} // Close both on success/close for smooth UX
                    plan={checkoutData?.plan || null}
                    price={checkoutData?.price || ''}
                />
                <div style={{ zIndex: 9999 }} className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setViewingDetails(null)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>

                        <div className={`p-8 text-white ${isPurple ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : isBlue ? 'bg-gradient-to-r from-blue-800 to-blue-600' : 'bg-gray-800'}`}>
                            <h2 className="text-3xl font-bold mb-2">{details.title}</h2>
                            <p className="text-white/80 text-lg">{details.subtitle}</p>
                        </div>

                        <div className="p-8">
                            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-8">
                                {details.description}
                            </p>

                            <div className="space-y-6">
                                {details.benefits.map((benefit, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPurple ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : isBlue ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">{benefit.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{benefit.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    onClick={() => setViewingDetails(null)}
                                    className="flex-1 py-3 px-6 rounded-xl font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition"
                                >
                                    Volver
                                </button>
                                {viewingDetails !== tier && (
                                    <button
                                        onClick={() => { handleUpgrade(viewingDetails); }}
                                        className={`flex-1 py-3 px-6 rounded-xl font-bold text-white shadow-lg transition hover:scale-[1.02] ${isPurple ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' : isBlue ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'}`}
                                    >
                                        {viewingDetails === 'free' ? 'Cambiar a Básico' : `Obtener ${details.title}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <CheckoutModal
                isOpen={!!checkoutData}
                onClose={() => { setCheckoutData(null); onClose(); }}
                plan={checkoutData?.plan || null}
                price={checkoutData?.price || ''}
            />
            <div style={{ zIndex: 9999 }} className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                <div className="bg-gray-50 dark:bg-zinc-950 rounded-2xl w-full max-w-6xl shadow-2xl overflow-y-auto relative border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-h-[90vh]">

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-50 shadow-sm"
                    >
                        <X size={16} />
                    </button>

                    {/* Plan 1: Básico */}
                    <PlanCard
                        title="Básico"
                        price="Gratis"
                        icon={<Shield size={32} className="text-gray-400" />}
                        features={[
                            "Registro de Ingresos y Gastos",
                            "Historial del Año en Curso",
                            "Dashboard Básico"
                        ]}
                        missing={[
                            "Modo Oscuro",
                            "Sincronización Familiar",
                            "Gabi AI (Asistente)",
                            "Presupuestos (0)",
                            "Exportación PDF"
                        ]}
                        current={tier === 'free'}
                        onAction={() => handleUpgrade('free')}
                        buttonText={tier === 'free' ? "Plan Actual" : "Degradar a Básico"}
                        disabled={tier === 'free'}
                        onReadMore={() => setViewingDetails('free')}
                    />

                    {/* Plan 2: Pro */}
                    <PlanCard
                        title="Pro"
                        price="$5 / mes"
                        highlight
                        icon={<Zap size={32} />} /* Removed hardcoded color class */
                        features={[
                            "Todo lo de Básico",
                            "Historial: Año Actual + 1 Anterior",
                            "Modo Oscuro / Claro",
                            "Sincronización Familiar +1",
                            "3 Presupuestos + 5 Pagos Recurrentes",
                            "Exportación (1 al mes)",
                            "Facturación (Costo extra)",
                            "Sin Publicidad"
                        ]}
                        missing={[
                            "Presupuestos Ilimitados",
                            "Gabi AI (Asistente Completo)",
                            "Predicción de Gastos",
                            "Exportación Ilimitada"
                        ]}
                        current={tier === 'pro'}
                        onAction={() => handleUpgrade('pro')}
                        buttonText={tier === 'pro' ? "Plan Actual" : (tier === 'platinum' ? "Degradar a Pro" : "Obtener Pro")}
                        disabled={tier === 'pro'}
                        color="pro" /* Updated prop */
                        onReadMore={() => setViewingDetails('pro')}
                    />

                    {/* Plan 3: Platinum */}
                    <PlanCard
                        title="Platinum"
                        price="$15 / mes"
                        icon={<Crown size={32} />} /* Removed hardcoded color class */
                        features={[
                            "Todo lo de Pro",
                            "Historial Ilimitado de Años",
                            "🎨 Paletas de Colores Premium",
                            "Sincronización Familiar Ilimitada",
                            "Presupuestos y Pagos Ilimitados", // Shortened to fit constraints
                            "Exportación PDF/Excel Ilimitada",
                            "Facturación (50 Folios/año)",
                            <span key="gabi" className="flex items-center gap-1.5"><Sparkles size={16} className="text-violet-500 dark:text-violet-400" /> Gabi AI con Voz y Visión</span>, /* Replaced Robot */
                            <span key="diag" className="flex items-center gap-1.5"><Activity size={16} className="text-zinc-500 dark:text-zinc-400" /> Diagnóstico y Predicción de Gastos</span>, /* Replaced Brain with Activity/Pulse */
                            "Soporte Prioritario"
                        ]}
                        current={tier === 'platinum'}
                        onAction={() => handleUpgrade('platinum')}
                        buttonText={tier === 'platinum' ? "Plan Actual" : "Obtener Platinum"}
                        disabled={tier === 'platinum'}
                        color="platinum" /* Updated prop */
                        popular
                        onReadMore={() => setViewingDetails('platinum')}
                    />
                </div>
            </div>
        </>
    );
}

function PlanCard({
    title, price, features, missing = [], current, onAction, buttonText, disabled, color = "gray", highlight = false, icon, headerBg, popular, onReadMore
}: any) {
    const isGray = color === 'gray';
    const isPro = color === 'blue' || color === 'pro'; // Support both for safety
    const isPlatinum = color === 'platinum';

    /* STYLING LOGIC */
    // PRO: Amber/Gold
    // PLATINUM: Zinc/Gray

    // Header Colors
    const titleColor = isPlatinum ? 'text-[#52525b] dark:text-[#a1a1aa]' : isPro ? 'text-amber-600 dark:text-amber-500' : 'text-gray-900 dark:text-white';

    // Icon Colors
    const iconClass = isPlatinum ? 'text-[#52525b] dark:text-[#a1a1aa]' : isPro ? 'text-amber-500' : 'text-gray-400';

    // Checkmark Colors
    const checkClass = isPlatinum ? 'text-[#52525b] dark:text-[#a1a1aa]' : isPro ? 'text-amber-500' : 'text-gray-400';

    // Container Background/Border (Highlight)
    const containerClasses = highlight
        ? 'bg-blue-50/50 dark:bg-blue-900/10 z-10 shadow-xl border border-blue-200 dark:border-blue-800'
        : 'bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-800';

    // Button Styles
    const buttonClasses = disabled
        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default'
        : isPlatinum
            ? 'bg-[#52525b] hover:bg-zinc-600 text-white shadow-lg hover:scale-[1.02]'
            : isPro
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:scale-[1.02]'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:scale-[1.02]';

    return (
        <div className={`
            flex-1 flex flex-col relative overflow-hidden h-full
            transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl active:scale-95 active:rotate-1 cursor-pointer
            ${containerClasses}
        `}>
            {popular && (
                <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400 text-white text-xs font-bold text-center py-1 uppercase tracking-wider z-20">
                    Recomendado
                </div>
            )}

            {/* Header Section */}
            <div className={`shrink-0 p-6 pb-2 ${headerBg ? '-mx-6 -mt-6 p-6 pt-10 mb-4' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-xl font-bold ${titleColor}`}>{title}</h3>
                        <div className={`text-2xl font-bold mt-1 ${titleColor}`}>{price}</div>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-white/5 rounded-lg">
                        {React.cloneElement(icon as React.ReactElement<any>, { className: iconClass, size: 32 })}
                    </div>
                </div>
            </div>

            {/* Scrollable Features Section - flex-1 pushes footer down */}
            <div className={`flex-1 px-6 py-2 ${headerBg ? '-mt-4' : ''}`}>
                <div className="space-y-4">
                    {features.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${checkClass}`} />
                            <span>{f}</span>
                        </div>
                    ))}
                    {missing.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-600 line-through decoration-gray-300 dark:decoration-gray-700">
                            <X size={16} className="shrink-0 mt-0.5" />
                            <span>{f}</span>
                        </div>
                    ))}
                    {/* Add spacer at bottom of list to prevent tight scrolling */}
                    <div className="h-4"></div>
                </div>
            </div>

            {/* Footer Section - Always pinned to bottom due to flex-1 above */}
            <div className="shrink-0 p-6 pt-2 mt-auto z-10">
                <div className="space-y-3">
                    <button
                        onClick={onAction}
                        disabled={disabled}
                        className={`
                            w-full py-3 rounded-xl font-bold transition-all
                            ${buttonClasses}
                        `}
                    >
                        {buttonText}
                    </button>

                    {onReadMore && (
                        <button
                            onClick={onReadMore}
                            className="w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition underline decoration-dotted"
                        >
                            Leer más sobre este plan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
