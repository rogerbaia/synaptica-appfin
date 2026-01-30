"use client";

import React from 'react';
import {
    LifeBuoy, Mic, Camera, Brain, Activity,
    TrendingUp, TrendingDown, Shield, CreditCard, LayoutDashboard, Tags, ChevronDown, Sparkles
} from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold flex items-center gap-3 mb-2">
                        <Sparkles size={24} className="text-yellow-300" />
                        Centro de Ayuda
                    </h1>
                    <p className="text-indigo-100 max-w-2xl text-base">
                        Domina Synaptica y toma el control total de tus finanzas. Aquí encontrarás guías sobre cómo usar a Gabi, gestionar tus presupuestos y entender tus métricas.
                    </p>
                </div>
                <LifeBuoy size={180} className="absolute -right-6 -bottom-10 text-white/10 rotate-12" />

                <div className="absolute bottom-4 right-4 z-20">
                    <span className="text-xs text-white/70 font-medium flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Sparkles size={12} className="text-yellow-300" />
                        Powered by Gabi AI
                    </span>
                </div>
            </div>

            {/* Gabi Guide Section */}
            <section className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Guía Maestra de Gabi</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tu asistente de IA personal</p>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Command Cheatsheet */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Mic size={18} /> Comandos de Voz / Texto
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <CommandItem
                                cmd="Registrar Gasto"
                                example='"Gasto de 200 en Cenas"'
                                desc="Crea una transacción rápida."
                            />
                            <CommandItem
                                cmd="Consultar Saldo"
                                example='"¿Cuánto gasté hoy?"'
                                desc="Te dice tu total del día/mes."
                            />
                            <CommandItem
                                cmd="Análisis"
                                example='"Analiza mis finanzas"'
                                desc="Gabi revisa tus tendencias."
                            />
                            <CommandItem
                                cmd="Enseñar"
                                example='"Aprende que Netflix es streaming"'
                                desc="Crea una regla automática."
                            />
                            <CommandItem
                                cmd="Duda General"
                                example='"¿Precio del dólar?"'
                                desc="Busca en Google si no sabe."
                            />
                        </div>
                    </div>

                    {/* Smart Features */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Camera size={18} /> Escaneo Inteligente
                        </h3>
                        <div className="bg-purple-50 dark:bg-slate-800/50 rounded-xl p-5">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                Usa el icono de cámara en Gabi para escanear tickets físicos.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <li className="flex gap-2">✅ Detecta el Total automáticamente.</li>
                                <li className="flex gap-2">✅ Identifica el comercio.</li>
                                <li className="flex gap-2">✅ Sugiere la categoría.</li>
                            </ul>
                        </div>

                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 pt-4">
                            <Shield size={18} /> Diagnóstico
                        </h3>
                        <p className="text-sm text-gray-500">
                            Si Gabi falla, di <b>"Diagnóstico Gemini"</b> para ver qué ocurre bajo el capó.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pro Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Financial Pulse */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="text-green-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Pulso Financiero</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Un indicador de salud del 0 al 100.
                    </p>
                    <ul className="text-xs space-y-2 text-gray-500">
                        <li><span className="text-green-500 font-bold">90-100:</span> Excelente (Gastas mucho menos de lo que ganas)</li>
                        <li><span className="text-blue-500 font-bold">70-89:</span> Saludable</li>
                        <li><span className="text-yellow-500 font-bold">50-69:</span> Cuidado (Gastos elevados)</li>
                        <li><span className="text-red-500 font-bold">0-49:</span> Peligro (Gastas más de lo que ingresas)</li>
                    </ul>
                </div>

                {/* Forecast */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="text-indigo-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white">Predicción de Gastos</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        La línea punteada en tu gráfica de flujo proyecta cómo cerrarás el mes si sigues gastando al ritmo actual.
                    </p>
                </div>

            </div>

            {/* Step-by-Step Guides */}
            <section className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <LayoutDashboard className="text-blue-500" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Guías Paso a Paso</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Domina las herramientas principales</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GuideCard
                        title="Cómo crear un Presupuesto"
                        icon={<TrendingDown size={20} className="text-red-500" />}
                        steps={[
                            "Ve a la sección 'Presupuestos' en el menú.",
                            "Toca el botón '+' o 'Nuevo Presupuesto'.",
                            "Selecciona una categoría (ej. Alimentación).",
                            "Define tu límite mensual.",
                            "¡Listo! La barra te avisará si te acercas al tope."
                        ]}
                    />
                    <GuideCard
                        title="Pagos Recurrentes"
                        icon={<div className="font-bold text-purple-500">∞</div>}
                        steps={[
                            "Al crear un gasto, activa el switch 'Recurrente'.",
                            "Elige la frecuencia (Mensual, Semanal).",
                            "Define la fecha de inicio.",
                            "El sistema creará la transacción automáticamente cada periodo."
                        ]}
                    />
                    <GuideCard
                        title="Organizar Categorías"
                        icon={<Tags size={20} className="text-indigo-500" />}
                        steps={[
                            "Entra a 'Categorías'.",
                            "Usa las pestañas Ingreso/Gasto.",
                            "Crea categorías padre (ej. Vivienda) y añade hijos (Luz, Agua).",
                            "Usa las 'Sugerencias Inteligentes' para autocompletar tu árbol."
                        ]}
                    />
                    <GuideCard
                        title="Exportar Reportes"
                        icon={<CreditCard size={20} className="text-green-500" />} // Using credit card as placeholder if FileText not imported
                        steps={[
                            "Ve a 'Configuración' o 'Historial'.",
                            "Busca el botón 'Exportar Datos'.",
                            "Selecciona el mes y formato (PDF o Excel).",
                            "La descarga iniciará en segundos."
                        ]}
                    />
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Preguntas Frecuentes</h2>
                <div className="space-y-4">
                    <FAQItem
                        q="¿Cómo cancelo mi suscripción?"
                        a="Puedes gestionar tu plan en la sección de Configuración > Membresía."
                    />
                    <FAQItem
                        q="¿Mis datos están seguros?"
                        a="Sí, toda la información se almacena en Supabase con seguridad de nivel empresarial."
                    />
                    <FAQItem
                        q="¿Gabi aprende sola?"
                        a="Sí y no. Gabi tiene conocimiento general, pero tú puedes 'enseñarle' reglas específicas diciéndole 'Aprende que X es categoría Y'."
                    />
                </div>
            </section>
        </div>
    );
}

function CommandItem({ cmd, example, desc }: { cmd: string, example: string, desc: string }) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-3 rounded-lg text-sm">
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-700 dark:text-gray-200">{cmd}</span>
                <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-purple-600 dark:text-purple-400 font-mono">
                    {example}
                </code>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        </div>
    );
}

function FAQItem({ q, a }: { q: string, a: string }) {
    return (
        <details className="group border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-slate-900/30">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium text-gray-700 dark:text-gray-200">
                {q}
                <span className="transition group-open:rotate-180">
                    <ChevronDown size={20} />
                </span>
            </summary>
            <p className="text-gray-600 dark:text-gray-400 mt-0 px-4 pb-4 animate-in fade-in slide-in-from-top-2 text-sm">
                {a}
            </p>
        </details>
    );
}

function GuideCard({ title, icon, steps }: { title: string, icon: React.ReactNode, steps: string[] }) {
    return (
        <div className="bg-gray-50 dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200">{title}</h3>
            </div>
            <ol className="space-y-2">
                {steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-bold text-blue-500/50 dark:text-blue-400/50">{i + 1}.</span>
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
