export type SubscriptionTier = 'free' | 'pro' | 'platinum';

export interface TierFeatures {
    darkMode: boolean;
    biometricSecurity: boolean;
    familySync: boolean;
    maxBudgets: number; // -1 for unlimited
    maxRecurringIncome: number; // -1 for unlimited
    maxRecurringExpense: number; // -1 for unlimited
    maxBackups: number; // -1 for unlimited, 0 for none, 1 for monthly
    maxArchiveYears: number; // -1 for unlimited, 0 for none, 1 for single year
    maxExports: number; // -1 for unlimited, 0 for none, 1 for monthly
    exportReports: boolean; // Deprecated in favor of maxExports but kept for compat
    financialCalendar: boolean;
    pushNotifications: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierFeatures> = {
    free: {
        darkMode: false,
        biometricSecurity: false,
        familySync: false,
        maxBudgets: 0,
        maxRecurringIncome: 1, // 1 Recurring Income
        maxRecurringExpense: 3, // 3 Recurring Expenses
        maxBackups: 0, // No Backup
        maxArchiveYears: 0, // Blocked
        maxExports: 0, // No Exports
        exportReports: false,
        financialCalendar: false,
        pushNotifications: false
    },
    pro: {
        darkMode: true,
        biometricSecurity: true,
        familySync: true,
        maxBudgets: 3,
        maxRecurringIncome: -1, // Unlimited
        maxRecurringExpense: -1, // Unlimited
        maxBackups: 1, // 1 per month
        maxArchiveYears: 1, // 1 Year History
        maxExports: 1, // 1 per month
        exportReports: true,
        financialCalendar: true,
        pushNotifications: false
    },
    platinum: {
        darkMode: true,
        biometricSecurity: true,
        familySync: true,
        maxBudgets: -1,
        maxRecurringIncome: -1, // Unlimited
        maxRecurringExpense: -1, // Unlimited
        maxBackups: -1, // Unlimited
        maxArchiveYears: -1, // Unlimited
        maxExports: -1, // Unlimited
        exportReports: true,
        financialCalendar: true,
        pushNotifications: true
    }
};

export const TIER_NAMES: Record<SubscriptionTier, string> = {
    free: "Básico",
    pro: "Pro",
    platinum: "Platinum"
};
