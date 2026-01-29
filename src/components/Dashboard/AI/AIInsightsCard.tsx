"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseService } from '@/services/supabaseService';

interface AIInsightsCardProps {
    refreshTrigger?: number;
}

export default function AIInsightsCard({ refreshTrigger = 0 }: AIInsightsCardProps) {
    const { t } = useLanguage();
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getFallbackAdvice = (currentAdvice: string | null) => {
        const negativeTips = [
            "Tus gastos superan tus ingresos. Identifica y corta gastos hormiga hoy mismo.",
            "Cuidado con el flujo de efectivo. Prioriza gastos esenciales esta semana.",
            "El balance es negativo. Evita usar tarjetas de crédito hasta recuperarte.",
            "Revisa tus gastos recurrentes, podrías estar pagando por algo que no usas.",
            "Es momento de austeridad. Pospon compras no esenciales para el próximo mes.",
            "Analiza tus categorías de mayor gasto y ponte un límite estricto esta semana."
        ];
        const positiveTips = [
            "Tienes superávit. ¿Qué tal si mueves el 10% a una cuenta de inversión?",
            "Buen trabajo. Es un momento ideal para adelantar pagos de deudas.",
            "Tu salud financiera se ve bien. Date un gusto pequeño, pero sigue ahorrando.",
            "Considera crear un fondo de emergencia con ese extra de este mes.",
            "Excelente disciplina. ¿Has pensado en aumentar tu aporte a retiro?",
            "Con este balance positivo, podrías planear tus próximas vacaciones sin deuda."
        ];
        const neutralTips = [
            "Registra cada movimiento. La claridad es el primer paso a la riqueza.",
            "Revisa tus suscripciones mensuales. ¿Realmente las usas todas?",
            "Establece una meta de ahorro para el próximo mes.",
            "La constancia es clave. Sigue registrando tus gastos diariamente.",
            "Dedica 5 minutos hoy a revisar tu presupuesto anual.",
            "Compara precios antes de tu próxima compra grande."
        ];

        let pool = neutralTips;
        // Need to calculate basic metrics again or pass them? 
        // For simplicity inside this helper, let's just pick randomly from mixed if no context, 
        // BUT we have state inside the component. Let's move this logic inside fetchAdvice or pass data.
        // Actually, easier to keep it inline but shared. 
        // Let's just define the function inside fetchAdvice with access to income/expenses.
        return "";
    };

    const fetchAdvice = async () => {
        setLoading(true);
        try {
            // 1. Get Financial Context
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

            const txsAll = await supabaseService.getTransactions();
            const txs = txsAll.filter((t: any) => {
                const d = new Date(t.date);
                return d >= new Date(startOfMonth) && d <= new Date(endOfMonth);
            });

            const income = txs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
            const expenses = txs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
            const balance = income - expenses;

            // Helper to generate unique advice
            const generateUniqueAdvice = () => {
                const negativeTips = [
                    "Tus gastos superan tus ingresos. Identifica y corta gastos hormiga hoy mismo.",
                    "Cuidado con el flujo de efectivo. Prioriza gastos esenciales esta semana.",
                    "El balance es negativo. Evita usar tarjetas de crédito hasta recuperarte.",
                    "Revisa tus gastos recurrentes, podrías estar pagando por algo que no usas.",
                    "Es momento de austeridad. Pospon compras no esenciales para el próximo mes.",
                    "Analiza tus categorías de mayor gasto y ponte un límite estricto esta semana."
                ];
                const positiveTips = [
                    "Tienes superávit. ¿Qué tal si mueves el 10% a una cuenta de inversión?",
                    "Buen trabajo. Es un momento ideal para adelantar pagos de deudas.",
                    "Tu salud financiera se ve bien. Date un gusto pequeño, pero sigue ahorrando.",
                    "Considera crear un fondo de emergencia con ese extra de este mes.",
                    "Excelente disciplina. ¿Has pensado en aumentar tu aporte a retiro?",
                    "Con este balance positivo, podrías planear tus próximas vacaciones sin deuda."
                ];
                const neutralTips = [
                    "Registra cada movimiento. La claridad es el primer paso a la riqueza.",
                    "Revisa tus suscripciones mensuales. ¿Realmente las usas todas?",
                    "Establece una meta de ahorro para el próximo mes.",
                    "La constancia es clave. Sigue registrando tus gastos diariamente.",
                    "Dedica 5 minutos hoy a revisar tu presupuesto anual.",
                    "Compara precios antes de tu próxima compra grande."
                ];

                let pool = neutralTips;
                if (expenses > income) pool = negativeTips;
                else if (income > expenses * 1.2) pool = positiveTips;

                let newAdvice = pool[Math.floor(Math.random() * pool.length)];
                let attempts = 0;
                while (newAdvice === advice && attempts < 5) {
                    newAdvice = pool[Math.floor(Math.random() * pool.length)];
                    attempts++;
                }
                return newAdvice;
            };

            // 2. Prepare Prompt with Randomization

            // Random contexts to force variety
            const contexts = [
                "ahorro agresivo", "inversión inteligente", "reducción de deuda",
                "control de gastos hormiga", "planificación a futuro", "felicidad financiera"
            ];
            const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
            const prompt = `
                Actúa como Gabi, una experta financiera amigable.
                Datos del usuario este mes:
                - Ingresos: $${income}
                - Gastos: $${expenses}
                - Balance: $${balance}
                
                Instrucción: Dame un consejo financiero ÚNICO, breve (max 20 palabras) y personalizado.
                Foco actual: ${randomContext}.
                Si el balance es negativo, sé cautelosa. Si es positivo, sugiere invertir o ahorrar.
                No uses saludos, ve directo al grano.
            `.trim();

            const savedKey = localStorage.getItem('synaptica_gemini_key');

            if (savedKey) {
                // REAL AI
                const model = 'gemini-1.5-flash';
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${savedKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    setAdvice(data.candidates[0].content.parts[0].text);
                } else {
                    // Fallback if API returns empty structure
                    setAdvice(generateUniqueAdvice());
                }
            } else {
                // No Key - Use Randomized Logic
                setAdvice(generateUniqueAdvice());
            }
        } catch (err) {
            console.error(err);
            // Error - Use Randomized Logic instead of static error
            // Check if we have income/expenses from scope, if not, careful. 
            // The catch block might happen before income/expenses are defined if getTransactions fails.
            // But usually getTransactions is stable. If it fails, we need safe defaults.
            // We'll define a safe generator or just set a generic random tip.
            const genericTips = [
                "Mantén tus finanzas bajo control revisando tus gastos diarios.",
                "Un pequeño ahorro hoy es una gran tranquilidad mañana.",
                "Revisa tu presupuesto regularmente para evitar sorpresas."
            ];
            setAdvice(genericTips[Math.floor(Math.random() * genericTips.length)]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdvice();
    }, [refreshTrigger]);

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={100} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Sparkles size={20} className="text-yellow-300" />
                        </div>
                        <h3 className="font-bold text-lg">Gabi AI</h3>
                    </div>
                    <button
                        onClick={fetchAdvice}
                        disabled={loading}
                        className={`p-2 hover:bg-white/10 rounded-full transition ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="flex gap-3">
                        <Lightbulb className="text-yellow-300 shrink-0 mt-1" size={24} />
                        <div>
                            {loading ? (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                                </div>
                            ) : (
                                <p className="text-white/90 text-md leading-relaxed font-medium">
                                    {advice}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex justify-end">
                    <span className="text-xs text-white/70 font-medium flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Sparkles size={12} className="text-yellow-300" /> Powered by Gabi AI
                    </span>
                </div>
            </div>
        </div>
    );
}
