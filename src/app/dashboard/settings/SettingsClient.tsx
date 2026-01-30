"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Globe, Moon, Database, Shield, Bell, Church, Calendar, Repeat, Lock, Key, MapPin, Mic, Camera, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Language } from '@/lib/i18n/translations';
import YearEndModal from '@/components/Modals/YearEndModal';
import InviteMemberModal from '@/components/Family/InviteMemberModal';
import TitheSettingsModal from '@/components/Settings/TitheSettingsModal';
import { Users, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { COLOR_THEMES } from '@/config/themes';
import FiscalSettings from '@/components/Settings/FiscalSettings';


import { supabaseService } from '@/services/supabaseService';

export default function SettingsPage() {
    const { language, setLanguage, t } = useLanguage();
    const {
        theme, setTheme,
        colorTheme, setColorTheme,
        currency, setCurrency,
        biometricEnabled, setBiometricEnabled,
        country, setCountry,
        titheEnabled, setTitheEnabled,
        titheConfig,
        permissions, setPermissions,
        geminiApiKey, setGeminiApiKey
    } = useSettings();
    const { features, triggerUpgrade, tier } = useSubscription();
    const { requestPermission, isEnabled } = usePushNotifications();
    const router = useRouter();

    const [showYearEnd, setShowYearEnd] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showTitheModal, setShowTitheModal] = useState(false);

    // State to track the confirmed theme for revert on hover leave
    const [persistedTheme, setPersistedTheme] = useState(colorTheme);
    const [persistedMode, setPersistedMode] = useState<'light' | 'dark' | 'auto'>('light');

    // Permission Handlers
    const toggleGeo = () => {
        if (!permissions.geo) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // Success
                        setPermissions({ ...permissions, geo: true });
                    },
                    (error) => {
                        console.error("Error obtaining location", error);
                        alert("No se pudo obtener la ubicación. Verifique los permisos del navegador.");
                        setPermissions({ ...permissions, geo: false });
                    }
                );
            } else {
                alert("Geolocalización no soportada en este navegador.");
            }
        } else {
            setPermissions({ ...permissions, geo: false });
        }
    };

    const toggleMic = () => setPermissions({ ...permissions, mic: !permissions.mic });
    const toggleCamera = () => setPermissions({ ...permissions, camera: !permissions.camera });


    const handleBackup = async () => {
        if (features.maxBackups === 0) {
            triggerUpgrade();
            return;
        }

        try {
            if (features.maxBackups === 1) { // Pro Limit
                const metadata = await supabaseService.getUserMetadata();
                const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
                if (metadata.last_backup_month === currentMonth) {
                    alert("Has alcanzado tu límite de 1 respaldo mensual. Actualiza a Platinum para respaldos ilimitados.");
                    return;
                }
            }

            const transactions = await supabaseService.getTransactions();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `synaptica_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            if (features.maxBackups === 1) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                await supabaseService.updateUserMetadata({ last_backup_month: currentMonth });
            }
        } catch (error) {
            console.error(error);
            alert(t('msg_error'));
        }
    };

    const handleRestore = async () => {
        if (features.maxBackups === 0) {
            triggerUpgrade();
            return;
        }

        // Simpler check for restore for now
        alert("Función de restauración en desarrollo. (Validación de plan exitosa).");
    };

    const handleWipeData = async () => {
        const confirm = window.confirm("⚠️ ADVERTENCIA: ¿Estás seguro de que deseas BORRAR TODO?\n\nEsta acción eliminará permanentemente todos tus ingresos, gastos, categorías y configuraciones.\n\nNO SE PUEDE DESHACER.");
        if (!confirm) return;

        const doubleConfirm = window.confirm("¿Estás absolutamente seguro? Escribe 'BORRAR' mentalmente y dale aceptar.");
        if (!doubleConfirm) return;

        try {
            await supabaseService.clearAllData();
            alert("🧹 Todos los datos han sido eliminados. El sistema se reiniciará.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Error eliminando datos. Por favor intenta de nuevo.");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-3 mb-6">
                <Settings size={32} className="text-[var(--primary-color)]" />
                <h1 className="text-2xl font-bold text-[var(--dark-color)]">{t('settings_title')}</h1>
            </div>

            {/* 1. Automation */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10">
                    <Repeat size={20} className="text-indigo-600" />
                    <h2 className="font-bold text-[var(--text-color)]">Automatización</h2>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-[var(--text-color)]">Transacciones Recurrentes</p>
                            <p className="text-sm text-[var(--gray-color)]">Gestiona tus ingresos y gastos fijos automáticos.</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/recurring')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                        >
                            Gestionar
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Security */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10">
                    <Shield size={20} className="text-blue-600" />
                    <h2 className="font-bold text-[var(--text-color)]">{t('settings_security')}</h2>
                </div>
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                id="biometric"
                                checked={biometricEnabled}
                                onChange={(e) => {
                                    if (!features.biometricSecurity && e.target.checked) {
                                        triggerUpgrade();
                                        return;
                                    }
                                    setBiometricEnabled(e.target.checked);
                                }}
                                className="w-5 h-5 text-[var(--primary-color)] rounded focus:ring-[var(--primary-color)]"
                            />
                        </div>
                        <div>
                            <label htmlFor="biometric" className="font-semibold text-[var(--text-color)] block flex items-center gap-2">
                                {t('settings_biometric_label')}
                                {!features.biometricSecurity && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Pro</span>
                                )}
                            </label>
                            <p className="text-sm text-[var(--gray-color)] mt-1">{t('lbl_biometric_help')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Permissions */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
                    <Key size={20} className="text-gray-500" />
                    <h2 className="font-bold text-[var(--text-color)]">Permisos de Aplicación</h2>
                </div>
                <div className="p-6 space-y-4">

                    {/* Geolocation */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-color)]">Geolocalización</p>
                                <p className="text-sm text-[var(--gray-color)]">Permite sugerir comercios cercanos.</p>
                            </div>
                        </div>
                        <div
                            className="relative inline-flex items-center cursor-pointer"
                            onClick={toggleGeo}
                        >
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={permissions?.geo || false}
                                readOnly
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                    </div>

                    {/* Microphone */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
                                <Mic size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-color)]">Micrófono</p>
                                <p className="text-sm text-[var(--gray-color)]">Necesario para hablar con Gabi.</p>
                            </div>
                        </div>
                        <div
                            className="relative inline-flex items-center cursor-pointer"
                            onClick={toggleMic}
                        >
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={permissions?.mic || false}
                                readOnly
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                        </div>
                    </div>

                    {/* Camera */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400">
                                <Camera size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-color)]">Cámara</p>
                                <p className="text-sm text-[var(--gray-color)]">Usada para escanear tickets y recibos.</p>
                            </div>
                        </div>
                        <div
                            className="relative inline-flex items-center cursor-pointer"
                            onClick={toggleCamera}
                        >
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={permissions?.camera || false}
                                readOnly
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-4"></div>

                    {/* Gemini Integration */}
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-color)]">Integración con Gemini AI</p>
                                <p className="text-sm text-[var(--gray-color)]">Conecta el cerebro de Google para respuestas inteligentes.</p>
                            </div>
                        </div>
                        <input
                            type="password"
                            placeholder="Pega tu API Key de Google Gemini aquí..."
                            value={geminiApiKey || ''}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Obtén tu clave gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.
                        </p>
                    </div>

                </div>
            </div>

            {/* 4. Fiscal Settings (SAT) - Platinum */}
            <FiscalSettings />



            {/* 5. Data Management */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
                    <Database size={20} className="text-[var(--gray-color)]" />
                    <h2 className="font-bold text-[var(--text-color)]">{t('settings_data')}</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                        <div className="p-3 bg-[var(--light-color)] dark:bg-slate-800 border dark:border-gray-700 rounded-lg">
                            <p className="text-xs text-[var(--gray-color)] dark:text-gray-400 uppercase">{t('lbl_records')}</p>
                            <p className="font-bold text-lg text-[var(--text-color)] dark:text-white">1,245</p>
                        </div>
                        <div className="p-3 bg-[var(--light-color)] dark:bg-slate-800 border dark:border-gray-700 rounded-lg">
                            <p className="text-xs text-[var(--gray-color)] dark:text-gray-400 uppercase">{t('lbl_data_space')}</p>
                            <p className="font-bold text-lg text-[var(--text-color)] dark:text-white">245 KB</p>
                        </div>
                        <div className="p-3 bg-[var(--light-color)] dark:bg-slate-800 border dark:border-gray-700 rounded-lg">
                            <p className="text-xs text-[var(--gray-color)] dark:text-gray-400 uppercase">{t('lbl_pending_status')}</p>
                            <p className="font-bold text-lg text-[var(--warning-color)]">3</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button
                            onClick={handleBackup}
                            className="px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-lg hover:bg-blue-50 transition font-medium flex items-center justify-center gap-2"
                        >
                            {t('btn_backup')}
                            {features.maxBackups === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">Pro</span>}
                        </button>
                        <button
                            onClick={handleRestore}
                            className="px-4 py-2 border border-[var(--warning-color)] text-[var(--warning-color)] rounded-lg hover:bg-yellow-50 transition font-medium flex items-center justify-center gap-2"
                        >
                            {t('btn_restore')}
                            {features.maxBackups === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">Pro</span>}
                        </button>
                        <button
                            onClick={handleWipeData}
                            className="px-4 py-2 border border-[var(--danger-color)] text-[var(--danger-color)] rounded-lg hover:bg-red-50 transition font-medium"
                        >
                            {t('btn_wipe')}
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. Mobile Notifications */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10">
                    <Smartphone size={20} className="text-amber-500" />
                    <h2 className="font-bold text-[var(--text-color)]">Notificaciones Móviles</h2>
                    {!features.pushNotifications && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">Platinum</span>}
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-[var(--text-color)]">Alertas en Pantalla</p>
                            <p className="text-sm text-[var(--gray-color)]">Recibe recordatorios de pagos en tu dispositivo.</p>
                        </div>
                        <button
                            onClick={requestPermission}
                            disabled={isEnabled || !features.pushNotifications}
                            className={`px-4 py-2 rounded-lg font-bold transition ${isEnabled
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : features.pushNotifications
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : 'bg-gray-100 text-gray-400 cursor-pointer'
                                }`}
                        >
                            {isEnabled ? 'Activado' : (features.pushNotifications ? 'Activar' : 'Bloqueado')}
                        </button>
                    </div>
                    {!features.pushNotifications && (
                        <p className="text-xs text-amber-500 mt-2 cursor-pointer hover:underline" onClick={triggerUpgrade}>
                            Desbloquea notificaciones con Platinum.
                        </p>
                    )}
                </div>
            </div>

            {/* 6. Shared Finances */}
            <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 bg-pink-50 dark:bg-pink-900/10">
                    <Users size={20} className="text-pink-600" />
                    <h2 className="font-bold text-[var(--text-color)]">{t('settings_family') || "Finanzas Compartidas"}</h2>
                </div>
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-[var(--text-color)] font-medium mb-1">
                            {t('msg_family_status') || "Actualmente gestionas tus finanzas solo."}
                        </p>
                        <p className="text-sm text-[var(--gray-color)]">
                            {t('msg_family_desc') || "Invita a tu pareja para ver un tablero unificado y alcanzar metas juntos."}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (!features.familySync) {
                                triggerUpgrade();
                                return;
                            }
                            setShowInvite(true);
                        }}
                        className={`px-5 py-2.5 font-bold rounded-lg transition shadow-sm ${features.familySync ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800'}`}
                    >
                        {t('btn_invite_partner') || "Invitar Pareja"} {!features.familySync && '🔒'}
                    </button>
                    {!features.familySync && (
                        <p className="text-xs text-center md:text-right mt-1 md:mt-0 text-pink-500 w-full md:w-auto cursor-pointer hover:underline" onClick={triggerUpgrade}>
                            Gestiona tus finanzas en pareja con el Plan Pro. Haz clic para mejorar.
                        </p>
                    )}
                </div>
            </div>

            {/* 7. General & Appearance (Region, Language, Appearance) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language/Region */}
                <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
                    <div className="flex items-center gap-2 mb-4 text-[var(--primary-color)]">
                        <Globe size={20} />
                        <h3 className="font-bold">Región & Idioma</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--gray-color)] mb-1">País de Residencia</label>
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full p-2 border border-[var(--border-color)] rounded-lg bg-[var(--light-color)] dark:bg-slate-800 text-[var(--text-color)] dark:text-white focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                            >
                                <option value="MX">México 🇲🇽</option>
                                <option value="ES">España 🇪🇸</option>
                                <option value="US">Estados Unidos 🇺🇸</option>
                                <option value="BR">Brasil 🇧🇷</option>
                                <option value="AR">Argentina 🇦🇷</option>
                                <option value="CO">Colombia 🇨🇴</option>
                                <option value="CL">Chile 🇨🇱</option>
                                <option value="PE">Perú 🇵🇪</option>
                            </select>
                            <p className="text-xs text-[var(--gray-color)] mt-1">
                                {t('msg_country_hint') || "Usado para sugerencias locales e impuestos."}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--gray-color)] mb-1">{t('lbl_select_lang')}</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="w-full p-2 border border-[var(--border-color)] rounded-lg bg-[var(--light-color)] dark:bg-slate-800 text-[var(--text-color)] dark:text-white focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                            >
                                <option value="es-419">Español (Latinoamérica)</option>
                                <option value="es-ES">Español (España)</option>
                                <option value="en">English (US)</option>
                                <option value="pt">Português (Brasil)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
                    <div className="flex items-center gap-2 mb-4 text-[var(--primary-color)]">
                        <Moon size={20} />
                        <h3 className="font-bold">{t('settings_appearance')}</h3>
                    </div>
                    <div className="space-y-4">

                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-medium text-[var(--gray-color)]">Modo Automático</label>
                            <div
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${theme === 'auto' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                onClick={() => {
                                    if (theme === 'auto') {
                                        setTheme(persistedMode); // Revert to manual preference
                                    } else {
                                        setPersistedMode(theme); // Save current manual
                                        setTheme('auto');
                                    }
                                }}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${theme === 'auto' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>

                        <div
                            className="grid grid-cols-2 gap-4 mb-4"
                            onMouseLeave={() => {
                                // Revert if we were just previewing
                                if (theme !== 'auto' && persistedMode && persistedMode !== theme) {
                                    setTheme(persistedMode);
                                }
                            }}
                        >
                            {/* Light Mode Card */}
                            <button
                                onMouseEnter={() => {
                                    if (theme === 'auto') return;
                                    setTheme('light');
                                }}
                                onClick={() => {
                                    setTheme('light');
                                    setPersistedMode('light');
                                }}
                                className={`
                                    relative p-4 rounded-xl border-2 text-left transition-all
                                    ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300'}
                                    ${theme === 'auto' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                disabled={theme === 'auto'}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Claro</span>
                                    {theme === 'light' && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                </div>
                                <div className="h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                                    <div className="w-8 h-4 bg-white rounded shadow-sm"></div>
                                </div>
                            </button>

                            {/* Dark Mode Card */}
                            <button
                                onMouseEnter={() => {
                                    if (theme === 'auto') return;
                                    if (!features.darkMode) return;
                                    setTheme('dark');
                                }}
                                onClick={() => {
                                    if (theme === 'auto') return;
                                    if (!features.darkMode) {
                                        triggerUpgrade();
                                        return;
                                    }
                                    setTheme('dark');
                                    setPersistedMode('dark');
                                }}
                                className={`
                                    relative p-4 rounded-xl border-2 text-left transition-all overflow-hidden
                                    ${theme === 'dark' ? 'border-indigo-500 bg-slate-900' : 'border-slate-200 dark:border-slate-700 bg-slate-950 hover:border-indigo-300'}
                                    ${theme === 'auto' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                disabled={theme === 'auto'}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-white">Oscuro</span>
                                    {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                    {!features.darkMode && <Lock size={14} className="text-amber-500" />}
                                </div>
                                <div className="h-12 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
                                    <div className="w-8 h-4 bg-slate-600 rounded shadow-sm"></div>
                                </div>
                            </button>
                        </div>

                        {!features.darkMode && (
                            <p className="text-xs text-amber-600 mt-1 mb-3 flex items-center gap-1 cursor-pointer hover:underline" onClick={triggerUpgrade}>
                                <Shield size={10} />
                                Modo oscuro requiere Plan Pro. Mejorar.
                            </p>
                        )}

                        {/* Premium Color Themes */}
                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-[var(--gray-color)]">Paleta de Colores</label>
                                {tier !== 'platinum' && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-indigo-200">
                                        <Sparkles size={10} /> Platinum
                                    </span>
                                )}
                            </div>
                            <div
                                className="grid grid-cols-4 gap-2"
                                onMouseLeave={() => {
                                    // Revert to saved theme when leaving the grid
                                    if (persistedTheme && persistedTheme !== colorTheme) {
                                        setColorTheme(persistedTheme);
                                    }
                                }}
                            >
                                {COLOR_THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        onMouseEnter={() => {
                                            if (t.premium && tier !== 'platinum') return;
                                            setColorTheme(t.id);
                                        }}
                                        onClick={() => {
                                            if (t.premium && tier !== 'platinum') {
                                                triggerUpgrade();
                                                return;
                                            }
                                            setPersistedTheme(t.id);
                                            setColorTheme(t.id);
                                        }}
                                        className={`
                                            relative group w-full aspect-square rounded-lg border-2 transition-all overflow-hidden
                                            ${colorTheme === t.id ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)] ring-opacity-30 scale-105' : 'border-gray-200 dark:border-gray-700 hover:scale-105'}
                                            ${(t.premium && tier !== 'platinum') ? 'opacity-60' : 'cursor-pointer'}
                                        `}
                                        title={`${t.name} - ${t.description}`}
                                    >
                                        <div className="w-full h-full bg-gradient-to-br" style={{ backgroundImage: `linear-gradient(to bottom right, ${t.primary}, ${t.secondary})` }}></div>
                                        {(t.premium && tier !== 'platinum') && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                                <Lock size={12} className="text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-[var(--gray-color)] mt-2 italic">
                                {COLOR_THEMES.find(t => t.id === colorTheme)?.name}: {COLOR_THEMES.find(t => t.id === colorTheme)?.description}
                            </p>
                        </div>

                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--gray-color)] mb-1">{t('lbl_currency')}</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full p-2 border border-[var(--border-color)] rounded-lg bg-[var(--light-color)] dark:bg-slate-800 text-[var(--text-color)] dark:text-white"
                        >
                            <option value="MX$">Peso Mexicano (MX$)</option>
                            <option value="Dólar">Dólar ($)</option>
                            <option value="Euro">Euro (€)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 8. Tithe Settings */}
            <div className="bg-white dark:bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-all hover:shadow-md">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-purple-50 dark:bg-purple-900/10">
                    <div className="flex items-center gap-2">
                        <Church size={20} className="text-purple-600" />
                        <h2 className="font-bold text-[var(--text-color)]">{t('settings_tithe')}</h2>
                    </div>

                    {/* Master Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {titheEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                        <div
                            onClick={() => setTitheEnabled(!titheEnabled)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${titheEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${titheEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>

                <div className={`p-6 space-y-4 transition-opacity ${titheEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-color)]">{t('lbl_tithe_percent')}</p>
                            <p className="text-xs text-[var(--gray-color)]">
                                {titheConfig.destination ? `Destino: ${titheConfig.destination}` : t('lbl_tithe_auto')}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-2xl text-purple-600">{titheConfig.percentage}%</div>
                            {(titheConfig.offeringValue > 0 || titheConfig.investmentValue > 0) && (
                                <div className="text-xs text-gray-500 font-medium">
                                    + Ext.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => setShowTitheModal(true)}
                            disabled={!titheEnabled}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition w-full md:w-auto shadow-sm shadow-purple-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('settings_tithe_btn')}
                        </button>
                    </div>
                </div>
            </div>

            <TitheSettingsModal
                isOpen={showTitheModal}
                onClose={() => setShowTitheModal(false)}
            />

            {/* 9. Year End Section */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{t('btn_quick_year_end')}</h3>
                        <p className="text-white/80 text-sm">Prepara tu contabilidad para el próximo periodo fiscal.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowYearEnd(true)}
                    className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition shadow-md whitespace-nowrap"
                >
                    {t('btn_quick_year_end')}
                </button>
            </div>

            <YearEndModal
                isOpen={showYearEnd}
                onClose={() => setShowYearEnd(false)}
                onSuccess={() => console.log('Year closed')}
            />

            <InviteMemberModal
                isOpen={showInvite}
                onClose={() => setShowInvite(false)}
            />
        </div>
    );
}
