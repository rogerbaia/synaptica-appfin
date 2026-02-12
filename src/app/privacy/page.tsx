"use client";

import React from 'react';
import Link from 'next/link';
import AureaLogo from '@/components/Layout/AureaLogo';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[var(--dark-color)] flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-xl shadow-lg bg-black/20 backdrop-blur-sm p-3 border border-white/10">
                    <AureaLogo className="w-full h-full" />
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-4">Política de Privacidad</h1>
            <p className="text-gray-400 text-sm max-w-2xl mb-8">
                Última actualización: 06 de Febrero de 2026
            </p>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-3xl w-full text-left space-y-6 text-sm text-gray-300">
                <section>
                    <h2 className="text-white font-bold mb-2">1. Información que recolectamos</h2>
                    <p>Synaptica ("la Aplicación") recolecta información necesaria para la facturación electrónica y gestión financiera, incluyendo:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Información de identificación (Nombre, RFC, Correo electrónico).</li>
                        <li>Datos financieros (Facturas, recibos, situación fiscal).</li>
                        <li>Datos de uso y rendimiento de la aplicación.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">2. Uso de la información</h2>
                    <p>Utilizamos tu información exclusivamente para:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Procesar y timbrar tus facturas ante el SAT (vía PAC autorizado).</li>
                        <li>Proveer análisis financiero y reportes.</li>
                        <li>Autenticación y seguridad de tu cuenta.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">3. Compartir información</h2>
                    <p>No vendemos tu información a terceros. Solo compartimos datos con:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>El SAT (Servicio de Administración Tributaria) para fines de cumplimiento fiscal.</li>
                        <li>Proveedores de infraestructura (Google Cloud, Vercel, Supabase) bajo estrictos contratos de confidencialidad.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">4. Eliminación de datos</h2>
                    <p>Puedes solicitar la eliminación de tu cuenta en cualquier momento visitando <Link href="/delete-account" className="text-blue-400 underline">nuestra página de baja</Link>.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">5. Contacto</h2>
                    <p>Para dudas sobre privacidad, contáctanos en: <a href="mailto:privacy@synaptica.app" className="text-blue-400">privacy@synaptica.app</a></p>
                </section>
            </div>

            <div className="mt-8">
                <Link href="/" className="text-white/50 hover:text-white text-sm transition">
                    ← Volver al Inicio
                </Link>
            </div>
        </div>
    );
}
