import React, { useState, useEffect } from 'react';
import { X, Save, Percent, DollarSign, Church, TrendingUp, Heart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings, TitheConfig } from '@/context/SettingsContext';

interface TitheSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TitheSettingsModal({ isOpen, onClose }: TitheSettingsModalProps) {
    const { t } = useLanguage();
    const { titheConfig, setTitheConfig } = useSettings();

    // Local State
    const [config, setConfig] = useState<TitheConfig>(titheConfig);

    useEffect(() => {
        if (isOpen) {
            setConfig(titheConfig);
        }
    }, [isOpen, titheConfig]);

    const handleSave = () => {
        setTitheConfig(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Church size={20} />
                        <h3 className="text-lg font-bold">Configurar Diezmos</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

                    {/* 1. Tithe Percentage */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Percent size={16} />
                            Porcentaje de Diezmo
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[10, 13, 15].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => setConfig({ ...config, percentage: pct })}
                                    className={`py-2 rounded-lg font-bold text-sm transition-all ${config.percentage === pct
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                                        }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.percentage}
                                    onChange={(e) => setConfig({ ...config, percentage: parseFloat(e.target.value) || 0 })}
                                    className={`w-full py-2 pl-2 pr-1 text-center rounded-lg font-bold text-sm bg-gray-50 dark:bg-slate-800 border-2 outline-none ${![10, 13, 15].includes(config.percentage)
                                        ? 'border-purple-500 text-purple-600'
                                        : 'border-transparent'
                                        }`}
                                    placeholder="Otro"
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-500">%</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Offering */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Heart size={16} className="text-pink-500" />
                            Ofrenda
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={config.offeringType}
                                onChange={(e) => setConfig({ ...config, offeringType: e.target.value as 'percent' | 'fixed' })}
                                className="bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                            >
                                <option value="percent">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input
                                type="number"
                                value={config.offeringValue}
                                onChange={(e) => setConfig({ ...config, offeringValue: parseFloat(e.target.value) || 0 })}
                                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-pink-500 transition-colors"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* 3. Investment Fund */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" />
                            Fondo de Inversión
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={config.investmentType}
                                onChange={(e) => setConfig({ ...config, investmentType: e.target.value as 'percent' | 'fixed' })}
                                className="bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                            >
                                <option value="percent">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input
                                type="number"
                                value={config.investmentValue}
                                onChange={(e) => setConfig({ ...config, investmentValue: parseFloat(e.target.value) || 0 })}
                                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* 4. Destination */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Church size={16} className="text-blue-500" />
                            Destino del Diezmo
                        </label>
                        <input
                            type="text"
                            value={config.destination}
                            onChange={(e) => setConfig({ ...config, destination: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-purple-500 transition-colors"
                            placeholder="Ej. Iglesia Central, Fundación..."
                        />
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
}
