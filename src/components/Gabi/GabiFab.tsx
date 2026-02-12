"use client";

import React from 'react';
import { Mic } from 'lucide-react';

interface GabiFabProps {
    onClick: () => void;
}

export default function GabiFab({ onClick }: GabiFabProps) {
    return (
        <div className="gabi-fab fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-6 z-40 flex items-center gap-3 flex-row-reverse">
            <button
                onClick={onClick}
                className="peer w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-300"
                title="Hablar con Gabi"
            >
                <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity" />
                <Mic size={24} className="animate-none hover:animate-pulse" />
            </button>

            {/* Hover Text */}
            <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium opacity-0 -translate-x-2 peer-hover:opacity-100 peer-hover:translate-x-0 transition-all duration-300 whitespace-nowrap hidden md:block select-none pointer-events-none">
                Habla con Gabi...
            </span>
        </div>
    );
}
