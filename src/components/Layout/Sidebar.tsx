"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Clock,
    History,
    Tags,
    Settings,
    Archive,
    PieChart,
    Calendar,
    Menu,
    X,
    Lock,
    LifeBuoy,
    FileText,
    ChevronDown,
    ChevronRight,
    Camera,
    Sparkles,
    ChevronLeft,
    Shield,
    CreditCard,
    Download
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

import { TIER_NAMES } from '@/config/subscriptionPlans';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    // Track expanded menus (using labels as keys)
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null); // Default collapsed
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { features, tier } = useSubscription();
    const { user } = useAuth();

    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

    const toggleSubmenu = (label: string) => {
        setExpandedMenu(expandedMenu === label ? null : label);
    };

    const handleMouseEnter = (label: string) => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            setExpandedMenu(label);
        }, 300); // 300ms delay
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            setExpandedMenu(null);
        }, 300); // 300ms delay before closing
    };

    const handleNavigation = (path: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('synaptica_last_route', path);
        }
        onClose();
    };

    const menuItems = [
        { icon: LayoutDashboard, label: t('menu_dashboard'), href: '/dashboard' },
        { icon: TrendingUp, label: t('menu_income'), href: '/dashboard/income' },
        { icon: TrendingDown, label: t('menu_expenses'), href: '/dashboard/expenses' },
        { icon: PieChart, label: (t as any)('menu_budgets'), href: '/dashboard/budgets' },
        { icon: Calendar, label: (t as any)('menu_calendar'), href: '/dashboard/calendar' },
        { icon: Clock, label: t('menu_pending'), href: '/dashboard/pending' },
        { icon: History, label: t('menu_history'), href: '/dashboard/history' },
        { icon: Tags, label: t('menu_categories'), href: '/dashboard/categories' },
        // Settings removed from sidebar as per user request


        // Revised Invoicing Menu
        {
            icon: FileText,
            label: 'Facturación',
            // href is null because it's a parent
            subItems: [
                { label: 'Facturar Consumo', href: '/dashboard/invoicing?tab=tickets', icon: Camera },
                { label: 'Emitir CFDI', href: '/dashboard/invoicing?tab=issued', icon: FileText },
                { label: 'Mi Suscripción', href: '/dashboard/billing', icon: CreditCard }
            ]
        },

        { icon: Archive, label: t('menu_archive'), href: '/dashboard/archive', mt: true },
    ];

    // [ADMIN] Injection
    if (user?.email?.toLowerCase() === 'rogerbaia@hotmail.com') {
        menuItems.push({
            icon: Shield,
            label: 'Super Admin',
            href: '/dashboard/super-admin',
            mt: false // Can set to true if want separation
        } as any);
    }

    // [APP DOWNLOAD]
    const handleDownloadClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const userAgent = window.navigator.userAgent.toLowerCase();

        if (userAgent.includes('win')) {
            window.open('https://drive.google.com/file/d/1rN6XJIbYHfjbEZYDMB5FLtpW8Mk42VPn/view?usp=drive_link', '_blank');
        } else if (userAgent.includes('android')) {
            window.location.href = '/downloads/app-release.apk';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            if (confirm("Para instalar en iOS:\n1. Pulsa el botón 'Compartir' del navegador.\n2. Selecciona 'Agregar a Inicio'.")) {
                // Noop
            }
        } else if (userAgent.includes('mac')) {
            alert("Versión para Mac próximamente.");
        } else {
            alert("Selecciona tu versión:\n- Windows (.exe)\n- Android (.apk)");
        }
    };



    return (
        <>
            {/* Mobile Toggle Button REMOVED - Moved to Header */}

            <aside className={`
                fixed top-20 md:top-16 left-0 z-[40] h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] w-64 border-r transition-transform duration-300 ease-in-out
                bg-[var(--sidebar-bg)] border-[var(--border-color)] flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="pt-4 px-4 flex justify-end md:hidden shrink-0">
                    {/* Mobile Close Button (Arrow) */}
                    <button onClick={onClose} className="p-1 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]">
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
                    {menuItems.map((item, index) => {
                        let isLocked = false;
                        if (item.href === '/dashboard/budgets' && features.maxBudgets === 0) isLocked = true;
                        if (item.href === '/dashboard/calendar' && !features.financialCalendar) isLocked = true;
                        if (item.href === '/dashboard/archive' && features.maxArchiveYears === 0) isLocked = true;

                        // Check if parent or child is active
                        const currentTab = searchParams.get('tab');
                        const isActive = item.href === pathname || (item.subItems && item.subItems.some(sub => {
                            const params = new URLSearchParams(sub.href.split('?')[1]);
                            return pathname === sub.href.split('?')[0] && params.get('tab') === currentTab;
                        })) || (item.subItems && pathname.includes('invoicing'));

                        if (item.subItems) {
                            const isExpanded = expandedMenu === item.label;

                            return (
                                <div
                                    key={index}
                                    className={item.mt ? 'mt-8' : ''}
                                    onMouseEnter={() => handleMouseEnter(item.label)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <button
                                        onClick={() => toggleSubmenu(item.label)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors font-medium relative group
                                            ${isActive || isExpanded
                                                ? 'text-[var(--sidebar-text)]' // Keep text active color but bg transparent if expanded
                                                : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={20} />
                                            <span>{item.label}</span>
                                            {item.label === 'Facturación' && (
                                                <div className="absolute top-2 right-2">
                                                    <Sparkles size={10} className="text-purple-400 fill-purple-400 animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {/* Submenu */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                        <div className="pl-11 pr-2 space-y-1">
                                            {item.subItems.map((sub, subIndex) => (
                                                <Link
                                                    key={subIndex}
                                                    href={sub.href}
                                                    onClick={() => handleNavigation(sub.href)}
                                                    className={`
                                                        flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                                                        bg-opacity-50
                                                        ${(() => {
                                                            const subUrl = sub.href.split('?')[0];
                                                            const subParams = new URLSearchParams(sub.href.split('?')[1]);
                                                            const targetTab = subParams.get('tab');
                                                            // Active if Path matches AND (Tab matches OR (no tab in target AND no tab in current))
                                                            // Fallback: if target is 'issued' and currentTab is null, we count it as active
                                                            const isSubActive = pathname === subUrl && (
                                                                targetTab === currentTab ||
                                                                (targetTab === 'issued' && !currentTab)
                                                            );

                                                            return isSubActive
                                                                ? 'text-[var(--primary-color)] bg-[var(--sidebar-hover-bg)] font-semibold'
                                                                : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]';
                                                        })()
                                                        }
                                                    `}
                                                >
                                                    {sub.icon && <sub.icon size={14} className="opacity-70" />}
                                                    {sub.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={index}
                                href={item.href!}
                                className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium relative group
                        ${item.mt ? 'mt-8' : ''}
                        ${pathname === item.href
                                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text)]'
                                        : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]'
                                    }
                    `}
                                onClick={(e) => {
                                    if ((item as any).onClick) {
                                        (item as any).onClick(e);
                                    } else {
                                        handleNavigation(item.href!);
                                    }
                                }}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>

                                {/* AI Sparkle for specific items */}
                                {['/dashboard/budgets', '/dashboard/calendar', '/dashboard/categories'].includes(item.href!) && (
                                    <div className="absolute top-2 right-2">
                                        <Sparkles size={10} className="text-purple-400 fill-purple-400 animate-pulse" />
                                    </div>
                                )}

                                {isLocked && (
                                    <div className="absolute bottom-2 right-2 text-amber-500 bg-amber-50 dark:bg-amber-900/30 rounded-full p-0.5" title="Función Premium">
                                        <Lock size={12} strokeWidth={3} />
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="shrink-0 w-full p-4 border-t border-[#e5e7eb] dark:border-[#2d3748] bg-[var(--sidebar-bg)]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Online • v3.3
                            </span>
                        </div>
                        {/* System Clock */}
                        <ServerClock />
                    </div>
                </div>
            </aside >

            {/* Overlay */}
            {
                isOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 md:hidden"
                        onClick={onClose}
                    ></div>
                )
            }
        </>
    );
}

function ServerClock() {
    const [date, setDate] = useState<Date | null>(null);

    React.useEffect(() => {
        setDate(new Date());
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!date) return null;

    return (
        <span className="text-[10px] text-gray-400 font-mono pl-5">
            {date.toLocaleDateString('es-MX')} • {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
    );
}
