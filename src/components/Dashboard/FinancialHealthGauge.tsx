import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import PoweredByGabi from '@/components/Gabi/PoweredByGabi';

interface FinancialHealthGaugeProps {
    income: number;
    expenses: number;
}

export default function FinancialHealthGauge({ income, expenses }: FinancialHealthGaugeProps) {
    // Safe calculation to prevent NaN
    const safeIncome = income || 1;
    const savingsRate = Math.max((income - expenses) / safeIncome, -0.5); // Cap negative at -50% for visualization

    // Custom Score Logic:
    // Base 100
    // Lose points for high expense ratio
    // Spend 100% -> Score 30
    // Spend 50% -> Score 85
    // Spend >100% -> Score <30

    let score = 0;
    const expenseRatio = expenses / safeIncome;

    if (expenseRatio <= 0.5) {
        // 0% expense -> 100 score. 50% expense -> 90 score.
        score = 100 - (expenseRatio * 20);
    } else if (expenseRatio <= 0.9) {
        // 50% -> 90. 90% -> 60.
        score = 90 - ((expenseRatio - 0.5) * 75);
    } else {
        // 90% -> 60. 110% -> 0.
        score = Math.max(0, 60 - ((expenseRatio - 0.9) * 300));
    }

    // Format score
    const finalScore = Math.round(score);

    // Color & Label
    let color = 'text-red-500';
    let strokeColor = '#ef4444';
    let label = 'Crítico';
    let message = 'Tus gastos superan peligrosamente tus ingresos.';

    if (finalScore >= 90) {
        color = 'text-emerald-500';
        strokeColor = '#10b981';
        label = 'Excelente';
        message = '¡Tu salud financiera es impecable!';
    } else if (finalScore >= 70) {
        color = 'text-blue-500';
        strokeColor = '#3b82f6';
        label = 'Saludable';
        message = 'Tienes un buen control, sigue ahorrando.';
    } else if (finalScore >= 50) {
        color = 'text-yellow-500';
        strokeColor = '#eab308';
        label = 'Estable';
        message = 'Estás en equilibrio, pero cuidado con imprevistos.';
    } else if (finalScore >= 30) {
        color = 'text-orange-500';
        strokeColor = '#f97316';
        label = 'Riesgo';
        message = 'Tus gastos están consumiendo casi todos tus ingresos.';
    }

    // SVG Gauge Calculations
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    // We want a semi-circle (top half) -> 180 degrees.
    // Actually, let's do a 240 degree gauge for style.
    // But standard gauge usually starts -90 to +90?
    // Let's do a simple circle with offset.

    // Simplified: Circle radius 40. Circumference ~251.
    // Stroke Dasharray: [current, total]
    const c = 2 * Math.PI * 40;
    const offset = c - (finalScore / 100) * c;


    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Header */}
            {/* Header */}
            <div className="w-full flex flex-col items-start mb-2">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-700">Pulso Financiero</h3>
                </div>
                <div className="ml-6 mt-0.5">
                    <PoweredByGabi size="xs" />
                </div>
            </div>

            {/* Gauge Container */}
            <div className="relative mt-8 mb-2">
                <svg width="160" height="160" className="transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke={strokeColor}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={(2 * Math.PI * 70) * (1 - finalScore / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-extrabold ${color}`}>{finalScore}</span>
                    <span className="text-sm text-gray-400 font-medium">/ 100</span>
                </div>
            </div>

            {/* Label & Details */}
            <div className="text-center mt-2 z-10">
                <div className={`text-xl font-bold ${color} mb-1`}>{label}</div>
                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                    {message}
                </p>
            </div>

            {/* Decorative Background Blur */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl`} style={{ backgroundColor: strokeColor }}></div>
        </div>
    );
}
