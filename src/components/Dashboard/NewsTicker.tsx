"use client";

import React, { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabaseService';
import {
    CloudSun,
    DollarSign,
    AlertTriangle,
    Megaphone,
    Newspaper,
    AlertOctagon,
    Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type NewsItem = {
    id: number;
    type: 'ad' | 'news' | 'alert' | 'weather' | 'finance';
    icon: React.ReactNode;
    text: string;
    priority?: boolean;
};

const MOCK_NEWS = [
    { type: 'weather', icon: <CloudSun size={16} />, text: 'Clima: Soleado 25°C - Probabilidad de lluvia 10%' },
    { type: 'finance', icon: <DollarSign size={16} />, text: 'Dólar: Compra $17.50 / Venta $18.20' },
    { type: 'news', icon: <Newspaper size={16} />, text: 'Noticia del día: Nuevas regulaciones fiscales para 2026 anunciadas.' },
    { type: 'alert', icon: <AlertTriangle size={16} className="text-amber-500" />, text: 'Alerta Sísmica: Simulacro programado para hoy a las 11:00 AM.' },
    { type: 'alert', icon: <AlertOctagon size={16} className="text-red-500" />, text: 'Alerta Amber: Se busca a niño de 10 años, visto última vez en Centro.' },
];

const ADS = [
    { type: 'ad', icon: <Megaphone size={16} className="text-blue-500" />, text: 'Publicidad: ¡Suscríbete a Platinum y obtén reportes ilimitados!' },
    { type: 'ad', icon: <Megaphone size={16} className="text-blue-500" />, text: 'Publicidad: Nuevo curso de finanzas personales disponible en la academia.' }
];

export default function NewsTicker() {
    const { user } = useAuth();
    const [items, setItems] = useState<NewsItem[]>([]);

    useEffect(() => {
        const fetchBudgetAlerts = async () => {
            if (!user) return [];
            try {
                // Fetch budgets and calculate usage
                // This logic mirrors the Budgets page logic simplified
                const budgets = await supabaseService.getBudgets();
                const now = new Date();
                const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

                // We need aggregated expenses per category
                // For efficiency, we won't fetch ALL transactions every tick, just simulated or cached?
                // Or proper aggregation query. 
                // Since this runs once on mount/interval, fetching transactions is okay for small scale.
                const txs = await supabaseService.getTransactions();
                const currentMonthTxs = txs.filter(t =>
                    t.type === 'expense' &&
                    t.date >= startDate &&
                    t.date <= endDate
                );

                const alerts: NewsItem[] = [];

                budgets.forEach(b => {
                    const spent = currentMonthTxs
                        .filter(t => t.category === b.category)
                        .reduce((sum, t) => sum + t.amount, 0);

                    if (spent > b.amount) {
                        alerts.push({
                            id: Math.random(),
                            type: 'alert',
                            icon: <AlertTriangle size={16} className="text-red-600" />,
                            text: `ALERTA DE PRESUPUESTO: Has excedido tu límite en ${b.category} ($${spent} / $${b.amount})`,
                            priority: true
                        });
                    } else if (spent === b.amount) {
                        alerts.push({
                            id: Math.random(),
                            type: 'alert',
                            icon: <AlertOctagon size={16} className="text-orange-600" />,
                            text: `AVISO: Has llegado al límite de tu presupuesto en ${b.category}`,
                            priority: true
                        });
                    } else if (spent >= b.amount * 0.9) {
                        alerts.push({
                            id: Math.random(),
                            type: 'alert',
                            icon: <AlertTriangle size={16} className="text-orange-500" />,
                            text: `Cuidado: Estás al 90% de tu presupuesto en ${b.category}`,
                            priority: false
                        });
                    }
                });

                return alerts;

            } catch (err) {
                console.error("Error fetching budget alerts for ticker", err);
                return [];
            }
        };

        const generateTickerItems = async () => {
            const warnings = await fetchBudgetAlerts();

            // Interleave logic: Ad, News, Ad, News... 
            // Also prioritize alerts.
            const mixed: NewsItem[] = [];

            // Add priority alerts first? Or mixed in.
            // User asked to alternate.

            let adIdx = 0;
            let newsIdx = 0;
            const maxLen = Math.max(ADS.length, MOCK_NEWS.length); // simple loop

            // Use a specific pattern if desired
            // Flatten mock news and ads
            const availableNews = [...warnings, ...MOCK_NEWS];

            for (let i = 0; i < Math.max(availableNews.length, ADS.length * 2); i++) {
                // Push Ad
                if (ADS.length > 0) {
                    mixed.push({ ...ADS[i % ADS.length], id: Math.random() } as NewsItem);
                }
                // Push News/Alert
                if (availableNews.length > 0) {
                    mixed.push({ ...availableNews[i % availableNews.length], id: Math.random() } as NewsItem);
                }
            }

            setItems(mixed);
        };

        generateTickerItems();
        // Poll for budget updates every minute
        const interval = setInterval(generateTickerItems, 60000);
        return () => clearInterval(interval);

    }, [user]);

    if (items.length === 0) return null;

    return (
        <div className="w-full overflow-hidden bg-blue-50 dark:bg-blue-900/10 border-y border-blue-100 dark:border-blue-800 h-8 flex items-center relative">
            {/* Marquee Container */}
            <div className="animate-marquee flex items-center whitespace-nowrap">
                {items.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 pr-12">
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.text}</span>
                    </div>
                ))}
                {/* Duplicate for seamless loop */}
                {items.map((item, idx) => (
                    <div key={`dup-${item.id}-${idx}`} className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 pr-12">
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.text}</span>
                    </div>
                ))}
            </div>

            {/* Gradient masks for smooth fade */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-[var(--card-bg)] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-[var(--card-bg)] to-transparent z-10 pointer-events-none"></div>
        </div>
    );
}
