"use client";

import React, { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, Tablet } from 'lucide-react';

export default function SmartDownloadBanner() {
    const [os, setOs] = useState<'windows' | 'android' | 'ios' | 'mac' | 'unknown'>('unknown');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();

        if (userAgent.includes('win')) setOs('windows');
        else if (userAgent.includes('android')) setOs('android');
        else if (userAgent.includes('iphone') || userAgent.includes('ipad')) setOs('ios');
        else if (userAgent.includes('mac')) setOs('mac');
        else setOs('unknown');
    }, []);

    if (!isVisible) return null;

    // Don't show if unknown or if explicitly dismissed (could add localstorage check)
    if (os === 'unknown') return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 border-t border-indigo-500/30 text-white p-4 z-[100] shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        {os === 'windows' && <Monitor size={24} className="text-cyan-300" />}
                        {os === 'android' && <Smartphone size={24} className="text-green-400" />}
                        {os === 'ios' && <Tablet size={24} className="text-slate-200" />}
                        {os === 'mac' && <Monitor size={24} className="text-slate-200" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">
                            {os === 'windows' && "Instalar Synaptica en Windows"}
                            {os === 'android' && "Instalar App Android"}
                            {os === 'ios' && "Instalar en iPhone"}
                            {os === 'mac' && "Instalar en Mac"}
                        </h3>
                        <p className="text-indigo-200 text-sm">
                            {os === 'windows' && "Obtén la mejor experiencia de escritorio."}
                            {os === 'android' && "Lleva tus finanzas a todos lados."}
                            {os === 'ios' && "Agrega a Inicio para acceso rápido."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-sm text-indigo-300 hover:text-white px-3 py-2 transition"
                    >
                        Ahora no
                    </button>

                    <button
                        onClick={() => {
                            // Logic to trigger download
                            // Using hypothetical paths for now
                            if (os === 'windows') window.open('https://drive.google.com/file/d/1-BGzO7FScGY8UWJ6tiedPzmpyVLsdBCK/view?usp=drive_link', '_blank');
                            if (os === 'android') window.location.href = '/downloads/app-release.apk';
                            if (os === 'ios') alert("En iOS: Pulsa el botón 'Compartir' y elige 'Agregar a Inicio'");
                        }}
                        className="flex-1 sm:flex-initial px-6 py-2.5 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Download size={18} />
                        {os === 'windows' ? 'Descargar .EXE' : 'Instalar'}
                    </button>
                </div>

            </div>
        </div>
    );
}
