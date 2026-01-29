import React from 'react';
import { Sparkles } from 'lucide-react';

interface PoweredByGabiProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md';
    variant?: 'default' | 'pill';
}

export default function PoweredByGabi({ className = '', size = 'sm', variant = 'default' }: PoweredByGabiProps) {
    const getSizeClasses = () => {
        switch (size) {
            case 'xs': return { text: 'text-[10px]', icon: 10, container: 'px-2 py-0.5' };
            case 'md': return { text: 'text-sm', icon: 16, container: 'px-3 py-1.5' };
            case 'sm':
            default: return { text: 'text-xs', icon: 14, container: 'px-2.5 py-1' };
        }
    };

    const { text, icon, container } = getSizeClasses();

    if (variant === 'pill') {
        return (
            <div className={`inline-flex items-center gap-1.5 font-medium select-none ${container} ${className}`} title="Impulsado por Gabi AI Intelligence">
                <Sparkles
                    size={icon}
                    className="text-yellow-300 animate-pulse"
                    style={{ animationDuration: '3s' }}
                />
                <span className={`text-indigo-50 tracking-wide ${text} drop-shadow-sm`}>
                    Powered by Gabi AI
                </span>
            </div>
        );
    }

    // Default Variant
    return (
        <div className={`inline-flex items-center gap-1.5 font-medium select-none ${className}`} title="Impulsado por Gabi AI Intelligence">
            <Sparkles
                size={icon}
                className="text-purple-600 dark:text-purple-400 animate-pulse"
                style={{ animationDuration: '3s' }}
            />
            <span className={`bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 bg-[length:200%_auto] animate-gradient ${text}`}>
                Powered by Gabi AI
            </span>
        </div>
    );
}
