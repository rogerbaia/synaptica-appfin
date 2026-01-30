"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings, CreditCard, HelpCircle, Info, Menu, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import Link from 'next/link';
import { supabaseService } from '@/services/supabaseService';
import UpgradeModal from '@/components/Modals/UpgradeModal';
import NewsTicker from '@/components/Dashboard/NewsTicker';
import AureaLogo from './AureaLogo';

import { TIER_NAMES } from '@/config/subscriptionPlans';

interface HeaderProps {
    onMenuClick: () => void;
    onProfileClick?: () => void;
}

export default function Header({ onMenuClick, onProfileClick }: HeaderProps) {
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    // Using subscription context
    const { tier, triggerUpgrade } = useSubscription();

    const [userInitial, setUserInitial] = useState('U');

    useEffect(() => {
        if (user?.email) {
            const initial = user.email[0].toUpperCase();
            localStorage.setItem('synaptica_user_initial', initial);
            setUserInitial(initial);
        } else {
            // Fallback for Biometric/Bypassed session
            // Default to 'R' if nothing found (User Preference)
            const cached = localStorage.getItem('synaptica_user_initial');
            setUserInitial(cached || 'R');
        }
    }, [user]);

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = React.useRef<HTMLDivElement>(null);
    const profileRef = React.useRef<HTMLDivElement>(null);
    const notificationTimeoutRef = React.useRef<NodeJS.Timeout>(null);
    const profileTimeoutRef = React.useRef<NodeJS.Timeout>(null);

    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const txs = await supabaseService.getTransactions();
            const pendingCount = txs.filter(t => t.type === 'income' && t.payment_received === false).length;
            if (pendingCount > 0) {
                setNotifications([
                    {
                        id: 1,
                        text: `${t('lbl_pending_status')}: ${pendingCount} cobros pendientes`,
                        time: 'Alert',
                        read: false,
                        link: '/dashboard/pending'
                    }
                ]);
            } else {
                setNotifications([
                    { id: 1, text: t('lbl_all_caught_up'), time: 'Now', read: true }
                ]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Initial load and polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [user, t]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await signOut();
    };

    const handleSubscriptionClick = () => {
        setShowProfileMenu(false);
        triggerUpgrade(); // Opens global upgrade modal
    };

    const [isElectron, setIsElectron] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('synapticadesktop')) {
            setIsElectron(true);
        }
    }, []);

    // [APP DOWNLOAD LOGIC]
    const handleDownloadClick = () => {
        // ... logic ...
    };

    return (
        <header ...>
            {/* ... */}

            {/* Right Actions */}
            <div className="flex items-center gap-4">

                {/* [NEW] Download App Button (Hidden in Electron) */}
                {!isElectron && (
                    <div className="relative group">
                        <button
                            onClick={handleDownloadClick}
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                        >
                            <Download size={20} />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Descargar App
                        </div>
                    </div>
                )}

                {/* Notifications */}
                <div
                    className="relative"
                    ref={notificationRef}
                    onMouseEnter={() => {
                        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
                        if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
                        setShowProfileMenu(false);
                        setShowNotifications(true);
                    }}
                    onMouseLeave={() => {
                        notificationTimeoutRef.current = setTimeout(() => {
                            setShowNotifications(false);
                        }, 300);
                    }}
                >
                    <button
                        className={`p-2 rounded-full relative transition-colors focus:outline-none ${showNotifications ? 'bg-[var(--bg-color)] text-[var(--primary-color)]' : 'text-[var(--gray-color)] hover:bg-[var(--bg-color)]'}`}
                        onClick={() => setShowNotifications(!showNotifications)} // Keep click for mobile
                    >
                        <Bell size={20} />
                        {notifications.some(n => !n.read) && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                            <h3 className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">
                                Notificaciones
                            </h3>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.map(n => (
                                    <Link
                                        key={n.id}
                                        href={n.link || '#'}
                                        onClick={() => setShowNotifications(false)}
                                        className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{n.text}</p>
                                        <span className="text-xs text-gray-500 mt-1 block">{n.time}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div
                    className="relative"
                    ref={profileRef}
                    onMouseEnter={() => {
                        if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
                        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
                        setShowNotifications(false);
                        setShowProfileMenu(true);
                    }}
                    onMouseLeave={() => {
                        profileTimeoutRef.current = setTimeout(() => {
                            setShowProfileMenu(false);
                        }, 300);
                    }}
                >
                    <div
                        onClick={() => {
                            setShowProfileMenu(!showProfileMenu);
                            if (onProfileClick) onProfileClick();
                        }}
                        className={`flex items-center gap-2 p-1 rounded-full transition-transform active:scale-95 cursor-pointer touch-manipulation ${showProfileMenu ? 'ring-2 ring-[var(--primary-color)] ring-offset-2 dark:ring-offset-gray-900' : ''}`}
                    >
                        <div className="h-8 w-8 rounded-full bg-[var(--primary-color)] text-white flex items-center justify-center font-bold select-none pointer-events-none">
                            {userInitial}
                        </div>
                    </div>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.id}</p>
                            </div>

                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        alert("La búsqueda se abrirá aquí.");
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                >
                                    <Search size={16} />
                                    Buscar
                                </button>

                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setShowProfileMenu(false)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <Settings size={16} />
                                    {t('menu_settings')}
                                </Link>

                                <Link
                                    href="/dashboard/billing"
                                    onClick={() => setShowProfileMenu(false)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 text-left font-medium"
                                >
                                    <CreditCard size={16} />
                                    Suscripción
                                </Link>

                                <Link
                                    href="/dashboard/help"
                                    onClick={() => setShowProfileMenu(false)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                >
                                    <HelpCircle size={16} />
                                    Ayuda
                                </Link>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
