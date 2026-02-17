"use client";

import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckCircle, Crown, ShieldCheck, Download, Calendar, CreditCard, Zap, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { TIER_NAMES } from '@/config/subscriptionPlans';
import DeleteUserModal from '@/components/Modals/DeleteUserModal';
import { toast } from 'sonner';

export default function BillingPage() {
    const { tier, isPro, triggerUpgrade } = useSubscription();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    // Deletion State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        if (user?.email) setUserEmail(user.email);
    }, [user]);

    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsDeleting(true);
        try {
            await supabaseService.deleteMyAccount(user.id, user.email || '');
            toast.success('Cuenta eliminada correctamente.');
            await signOut(); // Use AuthContext signOut
            // Redirection is handled by signOut in AuthContext (usually) or we can force it
            // AuthContext signOut does router.push('/login')
        } catch (error: any) {
            console.error("Deletion Error:", error);
            toast.error(error.message || 'Error eliminando la cuenta');
            setIsDeleting(false);
        }
    };

    // Mock Invoices
    const invoices = [
        { id: 'inv_123456', date: '27 Ene 2026', amount: '$15.00', status: 'Pagado', plan: 'Platinum' },
        { id: 'inv_123455', date: '27 Dic 2025', amount: '$15.00', status: 'Pagado', plan: 'Platinum' },
        { id: 'inv_123454', date: '27 Nov 2025', amount: '$5.00', status: 'Pagado', plan: 'Pro' },
    ];

    const currentPlanName = TIER_NAMES[tier];
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30); // Mock +30 days

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CreditCard size={32} className="text-blue-600" />
                        Suscripción y Facturación
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gstiona tu plan, métodos de pago y facturas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Current Plan Card */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h2 className="font-bold text-slate-800 dark:text-white">Plan Actual</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                            ${tier === 'platinum' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                tier === 'pro' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
                        `}>
                            {tier === 'free' ? 'Activo' : 'Renovación Automática'}
                        </span>
                    </div>

                    <div className="p-8">
                        <div className="flex items-start gap-6">
                            <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center
                                ${tier === 'platinum' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/30' :
                                    tier === 'pro' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/30' :
                                        'bg-slate-100 text-slate-400 dark:bg-slate-800'}
                            `}>
                                {tier === 'platinum' ? <Crown size={32} /> : tier === 'pro' ? <Zap size={32} /> : <ShieldCheck size={32} />}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {currentPlanName}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    {tier === 'platinum' ? 'Acceso total a inteligencia artificial y sin límites.' :
                                        tier === 'pro' ? 'Herramientas avanzadas para presupuestos.' :
                                            'Funcionalidades básicas de registro.'}
                                </p>

                                {tier !== 'free' && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg w-fit">
                                        <Calendar size={16} className="text-slate-400" />
                                        Próximo cobro: <span className="font-semibold">{nextBillingDate.toLocaleDateString()}</span>
                                        <span className="text-slate-400">•</span>
                                        <span>{tier === 'platinum' ? '$15.00' : '$5.00'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button
                                onClick={triggerUpgrade}
                                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
                            >
                                {tier === 'free' ? 'Mejorar Plan' : 'Cambiar Plan'}
                            </button>
                            {tier !== 'free' && (
                                <button className="px-6 py-2.5 text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                    Cancelar Suscripción
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Benefits Summary Widget */}
                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <Crown size={32} className="mb-4 text-yellow-300" />
                    <h3 className="font-bold text-lg mb-2">Soporte Premium</h3>
                    <p className="text-white/80 text-sm mb-6">
                        ¿Tienes dudas con tu facturación? Nuestro equipo está listo para ayudarte.
                    </p>
                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition backdrop-blur-sm border border-white/10">
                        Contactar Soporte
                    </button>
                </div>
            </div>

            {/* Invoices History */}
            {tier !== 'free' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 dark:text-white">Historial de Pagos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Concepto</th>
                                    <th className="p-4">Monto</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Recibo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{inv.date}</td>
                                        <td className="p-4 text-slate-500">Suscripción {inv.plan}</td>
                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{inv.amount}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle size={12} /> {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                                <Download size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-6">
                <h3 className="text-red-700 dark:text-red-400 font-bold mb-2">Zona de Peligro</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Si eliminas tu cuenta, perderás acceso inmediatemente. Todos tus datos, facturas y configuraciones serán borrados permanentemente. Esta acción no se puede deshacer.
                </p>
                <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-600/20"
                >
                    Eliminar mi cuenta
                </button>
            </div>

            <DeleteUserModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
                userEmail={userEmail || ''}
                isProcessing={isDeleting}
                title="Eliminar Cuenta"
                description={
                    <p>
                        Estás a punto de eliminar tu cuenta permanentemente. <br />
                        Esto cancelará tu suscripción y borrará todos tus datos.
                    </p>
                }
                confirmText="Sí, eliminar mi cuenta"
            />
        </div>
    );
}
