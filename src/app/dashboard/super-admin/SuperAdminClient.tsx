"use client";

import React, { useEffect, useState } from 'react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Shield, Users, CreditCard, TrendingUp, DollarSign, Clock, Calendar, CheckCircle, AlertCircle, PlusCircle } from 'lucide-react';

export default function SuperAdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading) {
            // Security Check
            if (!user) {
                router.push('/login');
                return;
            }
            if (user.email !== 'rogerbaia@hotmail.com') {
                router.push('/dashboard');
                return;
            }

            // Fetch Stats & Users
            Promise.all([
                supabaseService.getAdminStats(),
                supabaseService.getAdminUsers()
            ])
                .then(([statsData, usersData]) => {
                    setStats(statsData);
                    setUsers(usersData);
                    setFetching(false);
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    setFetching(false);
                });
        }
    }, [user, loading, router]);

    const handleExtendTrial = async (userId: string, days: number) => {
        setProcessingId(userId);
        await supabaseService.extendUserTrial(userId, days);

        // Optimistic Update
        setUsers(prev => prev.map(u => {
            if (u.id === userId) {
                const currentEnd = u.trial_ends ? new Date(u.trial_ends) : new Date();
                // Add days
                const newEnd = new Date(currentEnd.getTime() + (days * 86400000));
                return { ...u, trial_ends: newEnd.toISOString() };
            }
            return u;
        }));

        setProcessingId(null);
        alert(`¡Prueba extendida ${days} días exitosamente!`);
    };

    if (loading || fetching) return <div className="p-10 text-center text-slate-400">Cargando métricas...</div>;

    if (!stats) return <div className="p-10 text-center text-red-500">Error cargando datos.</div>;

    return (
        <div className="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
            <header className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg shadow-purple-900/20">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Super Admin</h1>
                    <p className="text-slate-500">Gestión Global y Extensiones</p>
                </div>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <span className="text-sm font-medium text-green-500 bg-green-50 px-2 py-1 rounded-full">
                            +{stats.users.new_this_month} este mes
                        </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.users.total}</div>
                    <p className="text-sm text-slate-500">Usuarios Totales</p>
                </div>

                {/* MRR */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-sm font-medium text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                            +{stats.revenue.growth}%
                        </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white">
                        ${stats.revenue.mrr.toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-500">MRR</p>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Distribución de Planes</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Platinum</span>
                                <span className="text-slate-500">{stats.tiers.platinum}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${(stats.tiers.platinum / stats.users.total) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Management & Extensions */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Gestión de Pruebas (Trials)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-sm">
                                <th className="pb-3 font-medium">Usuario</th>
                                <th className="pb-3 font-medium">Plan</th>
                                <th className="pb-3 font-medium">Registro</th>
                                <th className="pb-3 font-medium">Estado Prueba</th>
                                <th className="pb-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {users.map((u: any) => {
                                // Calculate Status
                                let statusNode = <span className="text-slate-400">N/A</span>;
                                let daysLeft = 0;
                                let isExpired = false;

                                if (u.plan === 'pro' || u.plan === 'platinum') {
                                    statusNode = <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> Activo</span>;
                                } else if (u.trial_ends) {
                                    const end = new Date(u.trial_ends);
                                    const now = new Date();
                                    const diff = end.getTime() - now.getTime();
                                    daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                                    isExpired = daysLeft <= 0;

                                    if (isExpired) {
                                        statusNode = <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> Expirado (hace {Math.abs(daysLeft)}d)</span>;
                                    } else {
                                        statusNode = (
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-purple-600 font-medium">Quedan {daysLeft} días</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500" style={{ width: `${(daysLeft / 7) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    }
                                }

                                return (
                                    <tr key={u.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-4 font-medium text-slate-800 dark:text-slate-200">{u.email}</td>
                                        <td className="py-4 capitalize text-slate-500">{u.plan}</td>
                                        <td className="py-4 text-slate-400 text-xs">{new Date(u.joined).toLocaleDateString()}</td>
                                        <td className="py-4">{statusNode}</td>
                                        <td className="py-4 text-right">
                                            {(u.plan === 'free' || isExpired) && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        disabled={processingId === u.id}
                                                        onClick={() => handleExtendTrial(u.id, 7)}
                                                        className="px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md text-xs font-medium border border-purple-200 transition-colors disabled:opacity-50"
                                                    >
                                                        +7 Días
                                                    </button>
                                                    <button
                                                        disabled={processingId === u.id}
                                                        onClick={() => handleExtendTrial(u.id, 30)}
                                                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium border border-blue-200 transition-colors disabled:opacity-50"
                                                    >
                                                        +1 Mes
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Payments Table */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Pagos Recientes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-sm">
                                <th className="pb-3 font-medium">Usuario</th>
                                <th className="pb-3 font-medium">Plan</th>
                                <th className="pb-3 font-medium">Monto</th>
                                <th className="pb-3 font-medium">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {stats.recent_payments.map((p: any, i: number) => (
                                <tr key={i} className="text-sm">
                                    <td className="py-4 font-medium text-slate-800 dark:text-slate-200">{p.user}</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${p.plan === 'Platinum' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}
                                        `}>
                                            {p.plan}
                                        </span>
                                    </td>
                                    <td className="py-4 text-emerald-600 font-medium">${p.amount}</td>
                                    <td className="py-4 text-slate-500">{p.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
