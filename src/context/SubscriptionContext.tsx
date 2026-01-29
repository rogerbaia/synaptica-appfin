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

    const checkSubscription = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const profile = await supabaseService.getProfile();
            // Map legacy is_pro to platinum if not explicit tier
            let currentTier: SubscriptionTier = 'free';

            if (profile?.subscription_tier) {
                currentTier = profile.subscription_tier as SubscriptionTier;
            } else if (profile?.is_pro) {
                // Legacy support
                currentTier = 'platinum';
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
            // These users get Lifetime Platinum Access automatically
            const OWNER_EMAILS = ['rogerbaia@hotmail.com', 'admin@synaptica.ai'];
            if (user.email && OWNER_EMAILS.includes(user.email)) {
                console.log("👑 God Mode Activated: Owner identified.");
                currentTier = 'platinum';
            }

            setTier(currentTier);
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

    const [folios, setFolios] = useState(91); // Initial demo balance

    const addFolios = (amount: number) => {
        setFolios(prev => prev + amount);
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
