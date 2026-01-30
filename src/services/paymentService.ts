import { supabaseService } from "./supabaseService";

export const paymentService = {
    /**
     * 1. Get Client Secret from Backend
     */
    async createPaymentIntent(amount: number): Promise<{ clientSecret?: string; error?: string }> {
        try {
            const res = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (data.error) return { error: data.error };
            return { clientSecret: data.clientSecret };
        } catch (e: any) {
            return { error: e.message || "Error de red" };
        }
    },

    /**
     * 2. On Success, upgrade user in DB
     */
    async upgradeUserTier(plan: 'pro' | 'platinum'): Promise<boolean> {
        try {
            await supabaseService.updateProfile({
                subscription_tier: plan,
                is_pro: true
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
};
