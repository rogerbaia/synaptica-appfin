"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabaseService';
// UpgradeModal removed to avoid circular dep
import { useAuth } from './AuthContext';
import { SubscriptionTier, SUBSCRIPTION_TIERS, TierFeatures } from '@/config/subscriptionPlans';

interface SubscriptionContextType {
    tier: SubscriptionTier;
    features: TierFeatures;
    isPro: boolean;       // True if tier is pro OR platinum
    isPlatinum: boolean;  // True only if tier is platinum
    loading: boolean;
    folios: number;
    addFolios: (amount: number) => void;
    checkSubscription: () => Promise<void>;
    triggerUpgrade: () => void;
    showUpgradeModal: boolean;
    setShowUpgradeModal: (v: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    tier: 'free',
    features: SUBSCRIPTION_TIERS.free,
    isPro: false,
    isPlatinum: false,
    loading: true,
    folios: 0,
    addFolios: () => { },
    checkSubscription: async () => { },
    triggerUpgrade: () => { },
    showUpgradeModal: false,
    setShowUpgradeModal: () => { },
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [tier, setTier] = useState<SubscriptionTier>('free');
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const [folios, setFolios] = useState(0);

    const addFolios = (amount: number) => {
        // Optimistic UI Update handled by context, but backend handles purchase validation usually
        setFolios(prev => prev + amount);
    };

    // [NEW] Enhanced Subscription Check
    const checkSubscription = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            // 1. Fetch Profile for Tier
            const profile = await supabaseService.getProfile();
            let currentTier: SubscriptionTier = 'free';

            if (profile?.subscription_tier) {
                currentTier = profile.subscription_tier as SubscriptionTier;
            } else if (profile?.is_pro) {
                currentTier = 'platinum'; // Legacy
            }

            // [TRIAL] Check for 7-Day Free Trial
            if (currentTier === 'free' && user.created_at) {
                const createdDate = new Date(user.created_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 7) {
                    console.log("🌟 User created < 7 days ago. Granting Platinum Trial.");
                    currentTier = 'platinum';
                }
            }

            // [GOD MODE] Owner Override
            const OWNER_EMAILS = ['rogerbaia@hotmail.com', 'admin@synaptica.ai'];
            const isGodMode = user.email && OWNER_EMAILS.includes(user.email);

            if (isGodMode) {
                console.log("👑 God Mode Activated.");
                currentTier = 'platinum';
                setFolios(99999); // Unlimited
                setTier(currentTier);
                setLoading(false);
                return; // SKIP Usage Check
            }

            // [MANUAL TRIAL] Check for Admin Granted Trial
            if (user.user_metadata?.manual_trial_active) {
                console.log("🎁 Manual Trial Active. Granting Platinum.");
                currentTier = 'platinum';
            }

            setTier(currentTier);

            // 2. Hybrid Folio Calculation (Plan Limit - Facturapi Usage)
            const satService = (await import('@/services/satService')).satService;

            // [V65] Real Folio Calculation: (Plan Limit + Purchased) - Used
            const extraFolios = parseInt(profile?.extra_folios || '0') || 0; // From User Metadata via getProfile override or direct metadata

            // Get raw usage from API (Truth Source)
            const invoicesList = await satService.getFacturapiInvoices();
            const currentYear = new Date().getFullYear();

            // Count invoices that consumed a folio (have UUID) in current year
            const usedCount = invoicesList.filter((inv: any) => {
                const isStamped = !!inv.uuid;
                const invYear = new Date(inv.date || inv.created_at).getFullYear();
                return isStamped && invYear === currentYear;
            }).length;

            const planLimit = (currentTier === 'platinum' || currentTier === 'pro') ? 50 : 5;
            const totalAvailable = planLimit + extraFolios;
            const remaining = Math.max(0, totalAvailable - usedCount);

            console.log(`[Subscription] Plan: ${planLimit} + Purchased: ${extraFolios} = ${totalAvailable}. Used: ${usedCount}. Remaining: ${remaining}`);
            setFolios(remaining);

        } catch (error) {
            console.error("Error checking subscription", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSubscription();
    }, [user]);

    const triggerUpgrade = () => {
        setShowUpgradeModal(true);
    };

    const features = SUBSCRIPTION_TIERS[tier];
    const isPro = tier === 'pro' || tier === 'platinum';
    const isPlatinum = tier === 'platinum';

    return (
        <SubscriptionContext.Provider value={{ tier, features, isPro, isPlatinum, loading, folios, addFolios, checkSubscription, triggerUpgrade, showUpgradeModal, setShowUpgradeModal }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

// Export a robust hook
// Export a robust hook
export const useSubscription = () => useContext(SubscriptionContext);

// Keep usePro for backward compatibility during refactor, but it now uses the new logic
export const usePro = () => {
    const { isPro, triggerUpgrade, loading, checkSubscription } = useContext(SubscriptionContext);
    return { isPro, triggerUpgrade, loading, checkProStatus: checkSubscription };
};
