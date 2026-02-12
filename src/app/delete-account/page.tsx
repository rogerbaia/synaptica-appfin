"use client";

import React from 'react';
import Link from 'next/link';
import AureaLogo from '@/components/Layout/AureaLogo';

export default function DeleteAccountPage() {
    return (
        <div className="h-screen bg-[var(--dark-color)] flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 border border-white/10">
                    <AureaLogo className="w-full h-full" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">Eliminación de Cuenta</h1>
            <p className="text-gray-300 max-w-md mb-8">
                Si deseas eliminar tu cuenta y todos tus datos personales de Synaptica, por favor ten en cuenta lo siguiente:
            </p>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-md w-full text-left space-y-4 mb-8">
                <div className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">•</span>
                    <p className="text-sm text-gray-300">Se eliminará tu perfil, historial de facturas (excepto lo requerido por ley del SAT) y métodos de pago.</p>
                </div>
                <div className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">•</span>
                    <p className="text-sm text-gray-300">Esta acción es irreversible una vez completada.</p>
                </div>
            </div>

            <p className="text-white mb-4">Para proceder, envía un correo desde tu cuenta registrada a:</p>

            <a
                href="mailto:privacy@synaptica.app?subject=Solicitud de Baja de Cuenta"
                className="text-2xl font-bold text-blue-400 hover:text-blue-300 underline mb-8 block transition"
            >
                privacy@synaptica.app
            </a>

            <Link href="/" className="text-white/50 hover:text-white text-sm transition">
                ← Volver al Inicio
            </Link>
        </div>
    );
}
