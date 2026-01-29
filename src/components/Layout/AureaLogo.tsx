import React from 'react';

interface AureaLogoProps {
    className?: string; // Allow custom sizing
    showText?: boolean;
}

export default function AureaLogo({ className = "w-10 h-10", showText = false }: AureaLogoProps) {
    // FINAL DESIGN: "Uniform Tricolor F"
    // Equidistant thickness (20px) for Vertical and Horizontal strokes.
    // Distinct Tricolor Gradient: Mint (Green) -> Sky (Blue) -> Violet (Purple).

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-md"
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }}
            >
                <defs>
                    {/* Diagonal Gradient with hard stops for distinct color spacing */}
                    <linearGradient id="aureaTricolor" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#10b981" />   {/* Emerald Start */}
                        <stop offset="25%" stopColor="#34d399" />  {/* Emerald End */}

                        <stop offset="45%" stopColor="#0ea5e9" />  {/* Sky Blue Start */}
                        <stop offset="60%" stopColor="#3b82f6" />  {/* Blue End */}

                        <stop offset="80%" stopColor="#8b5cf6" />  {/* Violet Start */}
                        <stop offset="100%" stopColor="#a855f7" /> {/* Purple End */}
                    </linearGradient>
                </defs>

                {/* 
                   Uniform Thickness "F" Path (20px width throughout)
                   Rounded corners (5px radius)
                */}
                <path
                    d="M 30 15 H 80 A 5 5 0 0 1 85 20 V 30 A 5 5 0 0 1 80 35 H 50 V 45 H 70 A 5 5 0 0 1 75 50 V 60 A 5 5 0 0 1 70 65 H 50 V 85 A 5 5 0 0 1 45 90 H 35 A 5 5 0 0 1 30 85 V 15 Z"
                    fill="url(#aureaTricolor)"
                />
            </svg>

            {showText && (
                <div className="flex flex-col justify-center">
                    <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
                        Aurea
                    </span>
                </div>
            )}
        </div>
    );
}
