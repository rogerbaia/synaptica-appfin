import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Command, Camera } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import SmartScanModal from '@/components/Gabi/SmartScanModal';

interface MagicInputProps {
    onParse: (data: { amount: number; description: string; categoryName?: string }) => void;
    categories?: any[]; // Optional for smart matching
}

export default function MagicInput({ onParse, categories = [] }: MagicInputProps) {
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    const [preview, setPreview] = useState<{ amount: number; description: string, category: string } | null>(null);
    const [isScanOpen, setIsScanOpen] = useState(false);

    const handleScanComplete = (data: { amount: number; merchant: string; date: string }) => {
        // Natural Language Generation
        // "Gasto de [Monto] en [Comercio]"
        const text = `Gasto de ${data.amount} en ${data.merchant} `;
        setInput(text);

        // Improve UX: Maybe focus? (React state update usually triggers re-render, focus might be lost if modal was open)
        // State update is enough.
    };

    // Regex Patterns
    // 1. "Uber 200" -> Text + Number
    const patternTextNum = /^(.+?)\s+(\d+(\.\d+)?)$/;
    // 2. "200 Uber" -> Number + Text
    const patternNumText = /^(\d+(\.\d+)?)\s+(.+)$/;

    useEffect(() => {
        if (!input.trim()) {
            setPreview(null);
            return;
        }

        let amount = 0;
        let description = '';
        let category = '';

        const match1 = input.match(patternTextNum);
        const match2 = input.match(patternNumText);

        if (match1) {
            description = match1[1];
            amount = parseFloat(match1[2]);
        } else if (match2) {
            amount = parseFloat(match2[1]);
            description = match2[3];
        }

        if (amount > 0 && description) {
            // Simple string match for category
            // This is basic; distinct from full Gabi classification
            if (categories) {
                // Try to find a category that matches the description
                const lowerDesc = description.toLowerCase();
                // This is a placeholder logic. Real smarts would be fuzzy matching.
                // We will return the description as is, and let the parent handle category logic 
                // or simple substring check.

                // Check if any category name is in the description
                const found = categories.find(c => lowerDesc.includes(c.name.toLowerCase()));
                if (found) category = found.name;
            }

            setPreview({ amount, description, category });
        } else {
            setPreview(null);
        }

    }, [input, categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (preview) {
            onParse({
                amount: preview.amount,
                description: preview.description,
                categoryName: preview.category
            });
            setInput('');
            setPreview(null);
        }
    };

    return (
        <div className="w-full mb-6 relative z-20">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Sparkles className={`h - 5 w - 5 transition - colors ${preview ? 'text-purple-500 animate-pulse' : 'text-gray-400'} `} />
                </div>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="block w-full pl-12 pr-20 py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl leading-5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-300 text-lg text-gray-900 dark:text-white"
                    placeholder="✨ Magic Input: 'Cena 500' o 'Uber 120'"
                    autoComplete="off"
                />

                {preview && (
                    <div className="absolute right-2 top-2 bottom-2 flex items-center">
                        <button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-md"
                        >
                            <span>${preview.amount}</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* Camera Button */}
                {!preview && (
                    <div className="absolute right-2 top-2 bottom-2 flex items-center">
                        <button
                            type="button"
                            onClick={() => setIsScanOpen(true)}
                            className="h-full aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                            title="Escanear ticket con Gabi AI"
                        >
                            <Camera size={20} />
                        </button>
                    </div>
                )}
            </form>

            {/* Contextual Hint */}
            {preview && (
                <div className="absolute top-full mt-2 left-0 bg-gray-900 text-white text-xs px-3 py-1 rounded-md shadow-lg animate-fade-in-up flex items-center gap-2">
                    <span>Detectado:</span>
                    <span className="font-bold text-purple-300">{preview.description}</span>
                    <span className="border-l border-gray-700 mx-1 h-3 block"></span>
                    <span className="font-bold text-green-300">${preview.amount}</span>
                    {preview.category && (
                        <>
                            <span className="border-l border-gray-700 mx-1 h-3 block"></span>
                            <span className="text-gray-300">{preview.category}</span>
                        </>
                    )}
                </div>
            )}

            <SmartScanModal
                isOpen={isScanOpen}
                onClose={() => setIsScanOpen(false)}
                onSuccess={() => { }}
                onScanComplete={handleScanComplete}
            />
        </div>
    );
}
