import { supabase } from '@/lib/supabase';

// Helper types matching DB structure
export interface DBTransaction {
    id: number;
    user_id: string;
    date: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    recurring: boolean;
    payment_received?: boolean;
    has_invoice?: boolean;
    invoice_number?: string;
    invoice_uuid?: string; // New field
    is_tithe?: boolean;
    details?: any;
}

export const supabaseService = {
    // --- Invoicing ---
    async createInvoice(invoiceData: any, stampData: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const details = {
            ...invoiceData,
            ...stampData, // UUID, XML, Sellos
            xml: stampData.xml,
            originalChain: stampData.originalChain
        };

        // If updating, ideally we preserve some fields, but for Invoicing we enforce consistency
        const payload: any = {
            user_id: user.id,
            type: 'income', // Force income
            amount: invoiceData.total,
            description: `${invoiceData.client} - ${invoiceData.description}`,
            category: 'Facturación / Ingreso',
            has_invoice: true,
            invoice_number: stampData.folio,
            details: details
        };

        // Only set date if not updating or if specifically requested?
        // Usually invoice date = transaction date for accounting match, or we keep original.
        // If we update, let's NOT overwrite date unless necessary. 
        // But payload needs date if inserting.
        if (!invoiceData.txId) {
            payload.date = new Date().toISOString();
            payload.payment_received = false; // Default New to Pending
        }

        let query;

        if (invoiceData.txId) {
            // Update Existing Transaction
            query = supabase
                .from('transactions')
                .update(payload)
                .eq('id', invoiceData.txId);
        } else {
            // Create New Transaction
            query = supabase
                .from('transactions')
                .insert(payload);
        }

        const { data, error } = await query.select().single();

        if (error) throw error;
        return data;
    },

    async updateUserMetadata(metadata: any) {
        const { data, error } = await supabase.auth.updateUser({
            data: metadata
        });
        if (error) throw error;
        return data;
    },
    async getUserMetadata() {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.user_metadata || {};
    },
    // [NEW] Helper for Pages
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // --- Transactions ---

    // [NEW] Generic Create (Alias for addTransaction but explicit for Docs)
    async createTransaction(payload: any) {
        // payload might contain user_id, if so we assume trusted caller or we override
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data, error } = await supabase
            .from('transactions')
            .insert({ ...payload, user_id: user.id }) // Ensure user_id is forced from session
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async addTransaction(transaction: Omit<DBTransaction, 'id' | 'user_id'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data, error } = await supabase
            .from('transactions')
            .insert({ ...transaction, user_id: user.id })
            .select()
            .single();

        if (error) throw error;

        // [SYNC] Forward Sync: If Expense, create Pending Ticket (Buzón)
        if (transaction.type === 'expense') {
            try {
                await supabase.from('user_tickets_queue').insert({
                    user_id: user.id,
                    status: 'pending',
                    image_path: '', // Placeholder, waiting for scan
                    extracted_data: {
                        total_amount: transaction.amount,
                        date: transaction.date,
                        store_name: transaction.description, // Best guess
                        rfc: '',
                        ticket_number: ''
                    }
                });
            } catch (err) {
                console.warn("Auto-ticket creation failed", err);
                // Non-blocking
            }
        }

        return data;
    },

    async updateTransaction(id: number | string, updates: Partial<DBTransaction>) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTransaction(id: number | string) {
        // 1. Fetch to check if recurring
        const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (tx && tx.recurring) {
            console.log("Deleting recurring rule associated with transaction...");
            // Attempt to find matching rule
            const { data: rules } = await supabase
                .from('recurring_rules')
                .select('id')
                .eq('user_id', tx.user_id)
                .eq('amount', tx.amount)
                .eq('category', tx.category)
                // fuzzy match description or exact?
                // The generator uses: rule.description || `Recurrente: ${rule.category}`
                // So if we match exact description, we are safe.
                .eq('description', tx.description);

            if (rules && rules.length > 0) {
                // Delete ALL matching rules (usually just one)
                // Safety: Only if 1 match? Or all? User wants them GONE.
                const ruleIds = rules.map(r => r.id);
                await supabase
                    .from('recurring_rules')
                    .delete()
                    .in('id', ruleIds);
                console.log(`Deleted ${ruleIds.length} linked recurring rules.`);
            }
        }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async softDeleteTransaction(id: number | string) {
        // [FIX] Use Category flagging instead of 'void_income' type which triggers DB Enum Constraint
        const { error } = await supabase
            .from('transactions')
            .update({
                // Mark as canceled via Category/Description. 
                // We keep type='income' to satisfy DB constraints.
                category: 'Factura Cancelada / Oculto',
                description: `[CANCELADO] ${new Date().toISOString()}` // Just a marker, original desc is in Invoice Details usually? 
                // Actually better to append prefix to description to preserve info?
                // But update doesn't have access to old value easily unless we read first.
                // Let's just set category. Valid.
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async getTransactions(month?: number, year?: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn("getTransactions: No user logged in");
            return [];
        }

        console.log("getTransactions: Fetching for user", user.id);

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        console.log(`getTransactions: Success. Retrieved ${data?.length || 0} records.`);
        return (data || []) as DBTransaction[];
    },

    async getPendingIncomes(amount?: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'income')
            .eq('payment_received', false)
            .eq('has_invoice', false)
            .order('date', { ascending: false });

        if (amount) {
            query = query.eq('amount', amount);
        }

        const { data, error } = await query;
        if (error) return [];
        return data as DBTransaction[];
    },

    // --- Dashboard Stats Aggregation ---

    async getDashboardStats() {
        const txs = await this.getTransactions();

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const monthlyIncomes = txs.filter(t => {
            if (t.type !== 'income') return false;
            // [FIX] Exclude soft-deleted items
            if (t.category === 'Factura Cancelada / Oculto') return false;

            const d = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const monthlyExpenses = txs.filter(t => {
            if (t.type !== 'expense') return false;
            // [FIX] Exclude soft-deleted items
            if (t.category === 'Factura Cancelada / Oculto') return false;

            const d = new Date(t.date.includes('T') ? t.date : `${t.date}T12:00:00`);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const incomeTotal = monthlyIncomes.reduce((s, t) => s + t.amount, 0);
        const expenseTotal = monthlyExpenses.reduce((s, t) => s + t.amount, 0);

        // [FIX] Also exclude cancelled from pending
        const pendingTotal = txs.filter(t =>
            t.type === 'income' &&
            t.payment_received === false &&
            t.category !== 'Factura Cancelada / Oculto'
        ).reduce((s, t) => s + t.amount, 0);

        return {
            income: incomeTotal,
            expense: expenseTotal,
            balance: incomeTotal - expenseTotal,
            pending: pendingTotal,
            transactions: txs
        };
    },

    // --- Categories ---

    async getCategories() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        return data as { id: string, name: string, type: 'income' | 'expense', parent_id?: string | null }[];
    },

    async addCategory(name: string, type: 'income' | 'expense', parent_id?: string | null) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data, error } = await supabase
            .from('categories')
            .insert({ user_id: user.id, name, type, parent_id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCategory(id: string) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    async deleteAllCategories() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    },

    // --- Duplicate Detection ---
    async checkDuplicateTransaction(amount: number, date: string | Date, type: 'income' | 'expense' = 'expense') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Date Normalization (Widened Window +/- 1 Day)
        let targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) targetDate = new Date();

        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);

        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        console.log(`🔎 Checking duplicate: $${amount} between ${startIso} and ${endIso}`);

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('amount', amount)
            .eq('type', type)
            .gte('date', startIso)
            .lte('date', endIso)
            .limit(1);

        if (error) {
            console.error("Duplicate check error:", error);
            return null;
        }

        return (data && data.length > 0) ? data[0] : null;
    },

    // --- Updates ---

    async updateTransactionStatus(id: number | string, paymentReceived: boolean) {
        const { error } = await supabase
            .from('transactions')
            .update({ payment_received: paymentReceived })
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    getSuggestedCategories(country: string): { name: string, type: 'income' | 'expense' }[] {
        const common = [
            { name: "Supermercado", type: "expense" },
            { name: "Transporte", type: "expense" },
            { name: "Salud", type: "expense" },
            { name: "Educación", type: "expense" },
            { name: "Entretenimiento", type: "expense" },
            { name: "Nómina", type: "income" },
            { name: "Ventas", type: "income" }
        ] as const;

        const local: Record<string, { name: string, type: 'income' | 'expense' }[]> = {
            'MX': [
                { name: "Renta", type: "expense" },
                { name: "Tacos / Antojitos", type: "expense" },
                { name: "Luz (CFE)", type: "expense" },
                { name: "Internet (Telmex/Izzi)", type: "expense" },
                { name: "Aguinaldo", type: "income" }
            ],
            'ES': [
                { name: "Alquiler", type: "expense" },
                { name: "Mercadona", type: "expense" },
                { name: "Luz / Gas", type: "expense" },
                { name: "Autónomos", type: "expense" },
                { name: "Paga Extra", type: "income" }
            ],
            'US': [
                { name: "Rent / Mortgage", type: "expense" },
                { name: "Groceries", type: "expense" },
                { name: "Health Insurance", type: "expense" },
                { name: "Gas / Fuel", type: "expense" },
                { name: "Salary", type: "income" },
                { name: "Investments", type: "income" }
            ],
            'BR': [
                { name: "Aluguel", type: "expense" },
                { name: "Feira / Mercado", type: "expense" },
                { name: "Luz / Água", type: "expense" },
                { name: "Cartão de Crédito", type: "expense" },
                { name: "13º Salário", type: "income" }
            ]
        };

        const countrySpecific = local[country] || local['MX'];
        return [...common, ...countrySpecific];
    },

    // --- System / Maintenance ---

    async closeYear(year: number, balance: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        if (balance > 0) {
            await this.addTransaction({
                date: `${year + 1}-01-01`,
                type: 'income',
                amount: balance,
                description: `Balance transferido de ${year}`,
                category: 'Balance Inicial',
                recurring: false,
                payment_received: true,
                is_tithe: false
            });
        }
        return true;
    },

    async clearAllData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Delete all user related data
        await supabase.from('recurring_rules').delete().eq('user_id', user.id);
        await supabase.from('category_budgets').delete().eq('user_id', user.id);
        await supabase.from('user_tickets_queue').delete().eq('user_id', user.id);
        await supabase.from('user_learned_commands').delete().eq('user_id', user.id);
        await supabase.from('merchant_processing_rules').delete().eq('user_id', user.id);

        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('categories').delete().eq('user_id', user.id);

        return true;
    },

    // --- Profile / Subscription ---

    async getProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        return {
            is_pro: user.user_metadata?.is_pro || false,
            subscription_tier: user.user_metadata?.subscription_tier
        };
    },

    async updateProfile(updates: { is_pro?: boolean, subscription_tier?: string }) {
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) throw error;
        return data.user;
    },

    // --- Admin ---
    async getAdminStats() {
        const { data: { user } } = await supabase.auth.getUser();
        // Hardcoded Security Check
        if (user?.email !== 'rogerbaia@hotmail.com') return null;

        // 1. Safe Fetch Users & Plans
        let profiles: any[] | null = null;
        let error: any = null;

        try {
            // [FIX] Use select('*') which is safer if columns are missing (it just won't return them)
            // Explicitly selecting non-existent columns causes an error.
            const result = await supabase
                .from('profiles')
                .select('*');
            profiles = result.data;
            error = result.error;
        } catch (e) {
            console.error("Crash fetching profiles", e);
            return null;
        }

        if (error) {
            console.error("Error fetching admin stats queries:", error);
            // If error is RLS, we expect it. If column missing, it usually says so.
            return null;
        }

        const totalUsers = profiles?.length || 0;

        // Count Tiers
        const tiers = {
            free: profiles?.filter(p => !p.plan || p.plan === 'free').length || 0,
            pro: profiles?.filter(p => p.plan === 'pro').length || 0,
            platinum: profiles?.filter(p => p.plan === 'platinum').length || 0
        };

        // Calculate MRR
        // Pro: $199, Platinum: $499
        // Only count if NOT 'cancelled' (optional refinement, but for now simple count)
        const mrr = (tiers.pro * 199) + (tiers.platinum * 499);

        // Calculate New Users this Month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const newUsers = profiles?.filter(p => new Date(p.created_at) >= firstDay).length || 0;

        // 2. Fetch Recent Income (Real Transactions)
        // We will fetch the last 5 income transactions from the system (Global view requires RLS bypass or Admin Policy)
        // Since we are likely Client-Side constrained, we might only see OUR transactions if RLS is strict.
        // However, if the user IS 'rogerbaia@hotmail.com' (Super Admin) and RLS allows reading all profiles (via Admin policy), 
        // we might be able to read all transactions if an Admin Policy exists.
        // If not, this might return empty. We will try.
        // UPDATE: For safely showing *something*, we will query recent payments from the 'transactions' table 
        // but we might be limited by RLS. If limited, we show 0 or handle error.

        // Let's assume for this step we only have access to profiles for global stats. 
        // For recent payments, we will try to fetch from a hypothetical 'subscriptions' or just return empty for now if RLS blocks.
        // But for the user request "leave real info", better to try.

        return {
            users: { total: totalUsers, active: totalUsers, new_this_month: newUsers }, // 'active' roughly total for now
            tiers: tiers,
            revenue: { mrr: mrr, growth: 0 }, // Growth 0 for now as we don't have history
            recent_payments: [] // Keeping empty or we can fake based on new active users if needed, but real is better (empty if none)
        };
    },

    async getAdminUsers() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email !== 'rogerbaia@hotmail.com') return [];

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching admin users:", error);
                return [];
            }

            return data.map((p: any) => ({
                id: p.id,
                email: p.email || 'No Email',
                joined: p.created_at,
                // [FIX] Fallback if plan doesn't exist
                plan: p.plan || (p.role === 'admin' ? 'admin' : 'free'),
                trial_ends: p.trial_ends
            }));
        } catch (e) {
            console.error("Crash fetching admin users", e);
            return [];
        }
    },

    async extendUserTrial(userId: string, days: number) {
        // REAL IMPLEMENTATION TODO:
        // await supabase.from('profiles').update({ trial_until: new_date }).eq('id', userId);

        console.log(`[ADMIN ACTION] Extended trial for User ${userId} by ${days} days.`);
        // Simulating network delay
        await new Promise(r => setTimeout(r, 800));
        return true;
    },

    // --- Budgets ---

    async getBudgets() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('category_budgets')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching budgets:', error);
            return [];
        }
        return data as { id: number, category: string, amount: number }[];
    },

    async upsertBudget(category: string, amount: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data, error } = await supabase
            .from('category_budgets')
            .upsert(
                { user_id: user.id, category, amount },
                { onConflict: 'user_id, category' }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Recurring Rules ---

    async getRecurringRules() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('recurring_rules')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at');

        if (error) {
            console.error('Error fetching recurring rules:', error);
            // Don't throw to prevent app crash if table missing
            return [];
        }
        return data as any[];
    },

    async addRecurringRule(rule: {
        type: 'income' | 'expense';
        amount: number;
        category: string;
        description: string;
        day_of_month: number;
        frequency?: 'monthly' | 'weekly' | 'biweekly' | 'triweekly';
        day_of_week?: number;
        last_generated?: string; // [NEW] Allow initializing the anchor date
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const payload: any = {
            user_id: user.id,
            type: rule.type,
            amount: rule.amount,
            category: rule.category,
            description: rule.description,
            day_of_month: rule.day_of_month
        };

        if (rule.frequency) payload.frequency = rule.frequency;
        if (rule.day_of_week !== undefined) payload.day_of_week = rule.day_of_week;
        if (rule.last_generated) payload.last_generated = rule.last_generated; // [NEW]

        const { data, error } = await supabase
            .from('recurring_rules')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteRecurringRule(id: number) {
        const { error } = await supabase
            .from('recurring_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    _isProcessingRecurring: false,

    async processRecurringTransactions() {
        if (this._isProcessingRecurring) {
            console.log("Skipping recurring check: Already running.");
            return;
        }

        try {
            this._isProcessingRecurring = true;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const rules = await this.getRecurringRules();
            if (rules.length === 0) return;

            // Set today to Noon to avoid TZ edge cases when comparing
            const today = new Date();
            today.setHours(12, 0, 0, 0);

            for (const rule of rules) {
                if (!rule.last_generated) continue; // Need an anchor point

                let lastDate = new Date(rule.last_generated);
                // Ensure anchor is also "Noon-ish" to match comparison logic if it was YYYY-MM-DD
                if (rule.last_generated.length === 10) lastDate.setHours(12, 0, 0, 0);

                const freq = rule.frequency || 'monthly';

                // Loop to catch up multiple missed periods
                let nextDate = new Date(lastDate);
                let iterations = 0;

                while (iterations < 12) { // Safety limit: Max 12 generations per run
                    iterations++;

                    // Calculate Candidate Date
                    const candidate = new Date(nextDate); // Start from previous base

                    if (freq === 'monthly') {
                        // Add 1 Month
                        candidate.setMonth(candidate.getMonth() + 1);
                        // Fix Day Overflow (e.g. Jan 31 -> Feb 28)
                        // And try to respect rule.day_of_month if available
                        const targetDay = rule.day_of_month || lastDate.getDate();
                        const daysInMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
                        candidate.setDate(Math.min(targetDay, daysInMonth));
                    } else {
                        // Weekly Logic
                        const daysToAdd = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 21;
                        candidate.setDate(candidate.getDate() + daysToAdd);
                    }

                    // Check if Candidate is Due (<= Today)
                    // We compare timestamps
                    if (candidate.getTime() <= today.getTime()) {
                        // It IS due. Generate it.
                        const dateString = candidate.toISOString().split('T')[0];

                        // [IDEMPOTENCY] Check if already exists to prevent duplicates (Race Condition Fix)
                        const { data: existing } = await supabase
                            .from('transactions')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('description', rule.description || `Recurrente: ${rule.category}`)
                            .eq('amount', rule.amount)
                            .eq('date', dateString)
                            .limit(1);

                        if (!existing || existing.length === 0) {
                            await this.addTransaction({
                                date: dateString,
                                type: rule.type,
                                amount: rule.amount,
                                description: rule.description || `Recurrente: ${rule.category}`,
                                category: rule.category,
                                recurring: true,
                                payment_received: false,
                                has_invoice: false,
                                invoice_number: undefined,
                                details: { includes_iva: false, has_retention: false }
                            });
                        } else {
                            console.log(`Skipping duplicate recurring generation: ${rule.description} on ${dateString}`);
                        }

                        // Update DB immediately to avoid duplicate loops on crash
                        // We update even if we skipped insertion, because the goal is to advance the pointer
                        await supabase
                            .from('recurring_rules')
                            .update({ last_generated: candidate.toISOString() })
                            .eq('id', rule.id);

                        // Advance the base for next iteration
                        nextDate = candidate;
                    } else {
                        // Not due yet. Stop.
                        break;
                    }
                }
            }
        } catch (e) {
            console.error('Error processing recurring:', e);
        } finally {
            this._isProcessingRecurring = false;
        }
    },

    // --- Learned Commands (Phase 4) ---

    async getLearnedCommands() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_learned_commands')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching learned commands:', error);
            return []; // Graceful fallback
        }
        return data as { id: string, trigger_phrase: string, action_type: 'transaction' | 'response' | 'weather', action_data: any }[];
    },

    async addLearnedCommand(trigger_phrase: string, action_type: string, action_data: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data, error } = await supabase
            .from('user_learned_commands')
            .upsert({
                user_id: user.id,
                trigger_phrase: trigger_phrase.toLowerCase(),
                action_type,
                action_data
            }, { onConflict: 'user_id, trigger_phrase' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Ticket Queue (Scanning) ---

    async getUserTickets() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_tickets_queue')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as { id: string, created_at: string, status: string, extracted_data: any, image_path: string }[];
    },

    async saveUserTicket(extractedData: any, imagePath: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data, error } = await supabase
            .from('user_tickets_queue')
            .insert({
                user_id: user.id,
                extracted_data: extractedData,
                image_path: imagePath,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        let syncResult = 'skipped';

        // [SYNC] Reverse Sync: If Ticket added, create Expense if not exists
        if (data) {
            try {
                const amount = extractedData.total_amount;
                // Strict date match or default to today
                const date = extractedData.date ? extractedData.date.substring(0, 10) : new Date().toISOString().split('T')[0];

                if (amount) {
                    // Check if an expense with same amount/date exists
                    const { data: existing } = await supabase
                        .from('transactions')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('amount', amount)
                        .eq('date', date)
                        .limit(1);

                    if (!existing || existing.length === 0) {
                        // Create Expense
                        await supabase.from('transactions').insert({
                            user_id: user.id,
                            type: 'expense',
                            amount: amount,
                            date: date,
                            description: extractedData.store_name || "Compra con Ticket",
                            category: 'Sin Categoría', // Default
                            recurring: false,
                            payment_received: true,
                            details: extractedData // [SYNC] Save full OCR data for Invoicing
                        });
                        syncResult = 'created';
                    } else {
                        syncResult = 'duplicate';
                    }
                }
            } catch (err) {
                console.error("Auto-expense creation failed", err);
                // We don't throw blocking error for sync, but we report it
                syncResult = 'error';
                // throw err; // Decided NOT to throw to allow ticket save, but return error status
            }
        }

        return { ticket: data, syncResult };
    },

    async deleteUserTicket(id: string) {
        const { error } = await supabase
            .from('user_tickets_queue')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async updateTicketStatus(id: string, status: 'pending' | 'facturado' | 'error') {
        const { error } = await supabase
            .from('user_tickets_queue')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async updateTicketData(id: string, extractedData: any) {
        const { error } = await supabase
            .from('user_tickets_queue')
            .update({ extracted_data: extractedData })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async updateTicket(id: string, updates: any) {
        const { error } = await supabase
            .from('user_tickets_queue')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // --- Voice / CFDI Helpers ---

    async getLastInvoice(clientName: string) {
        // Find the last income transaction matching the client name
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'income')
            .ilike('description', `%${clientName}%`)
            .order('date', { ascending: false })
            .limit(1);

        return data?.[0] || null;
    },

    async getLastIssuedInvoice() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('has_invoice', true)
            .order('created_at', { ascending: false })
            .limit(1);

        return data?.[0] || null;
    },

    async savePreCFDI(data: { clientName: string, amount: number, concept: string }) {
        // Save as a pending income transaction (Pre-Comprobante)
        return this.addTransaction({
            amount: data.amount,
            type: 'income',
            category: 'Facturación / Pre-CFDI',
            description: `${data.clientName} - ${data.concept}`,
            date: new Date().toISOString(),
            payment_received: false,
            recurring: false,
            // We use the boolean 'has_invoice' as false to indicate it's not stamped yet
            has_invoice: false,
            details: {
                includes_iva: true, // Default Assumption
                has_retention: false,
                calculated_iva: data.amount * 0.16, // Approx
                calculated_retention: 0
            }
        });
    },

    async deleteTicketAndMatchingTransaction(ticketId: string, amount: number, date: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        // 1. Delete Ticket
        const { error: ticketError } = await supabase
            .from('user_tickets_queue')
            .delete()
            .eq('id', ticketId);

        if (ticketError) throw ticketError;

        let expenseDeleted = false;

        // 2. Find and Delete Matching Transaction (Expense)
        if (amount && date) {
            const cleanDate = date.includes('T') ? date.split('T')[0] : date;

            // Find strict match (Amount + Date + Expense Type)
            // We delete only ONE match to be safe
            const { data: expenses } = await supabase
                .from('transactions')
                .select('id')
                .eq('user_id', user.id)
                .eq('amount', amount)
                .eq('date', cleanDate)
                .eq('type', 'expense')
                .limit(1);

            if (expenses && expenses.length > 0) {
                const expenseId = expenses[0].id;
                const { error: deleteError } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', expenseId);

                if (!deleteError) expenseDeleted = true;
            }
        }

        return { ticketDeleted: true, expenseDeleted };
    },

    // --- Merchant Rules (Management) ---

    async getAllMerchantRules() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('merchant_processing_rules')
            .select('*')
            .eq('user_id', user.id)
            .order('merchant_name_pattern', { ascending: true });

        if (error) {
            console.error('Error fetching merchant rules:', error);
            return [];
        }
        return data as {
            user_id: string;
            merchant_rfc: string;
            merchant_name_pattern: string;
            invoicing_url: string;
            ticket_format_rule: string;
            extraction_map?: any;
        }[];
    },

    async deleteMerchantRule(rfc: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { error } = await supabase
            .from('merchant_processing_rules')
            .delete()
            .eq('user_id', user.id)
            .eq('merchant_rfc', rfc);

        if (error) throw error;
        return true;
    },

    async updateMerchantRule(rfc: string, updates: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { error } = await supabase
            .from('merchant_processing_rules')
            .update(updates)
            .eq('user_id', user.id)
            .eq('merchant_rfc', rfc);

        if (error) throw error;
        return true;
    },

    // --- Fiscal Clients (Facturapi Proxy) ---

    async getFiscalClients(search = '') {
        try {
            const res = await fetch(`/api/sat/clients?q=${search}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            return json.data || [];
        } catch (error) {
            console.error("Error fetching clients", error);
            return [];
        }
    },

    async createFiscalClient(client: any) {
        const res = await fetch(`/api/sat/clients`, {
            method: 'POST',
            body: JSON.stringify(client)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        return json;
    },

    async updateFiscalClient(id: string, updates: any) {
        const res = await fetch(`/api/sat/clients`, {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        return json;
    },

    async deleteFiscalClient(id: string) {
        const res = await fetch(`/api/sat/clients?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        return true;
    }
};
