import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface MerchantRule {
    user_id?: string;
    merchant_rfc: string | null;
    merchant_name_pattern: string | null;
    invoicing_url: string | null;
    ticket_format_rule: 'full' | 'start_10' | 'end_10' | 'regex' | null;
    // [NEW] Visual extraction map
    extraction_map?: Record<string, any>;
}

export function useMerchantRules(currentData: { rfc?: string | null, store_name?: string | null, url?: string | null }) {
    const [rule, setRule] = useState<MerchantRule | null>(null);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Rule on Load (Prioritizing RFC)
    useEffect(() => {
        async function fetchRule() {
            if (!currentData.rfc && !currentData.store_name) return;

            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // [GLOBAL INTELLIGENCE] 
                // We search across ALL rules, but filter logic prioritizes OWN rules later.
                let query = supabase.from('merchant_processing_rules').select('*');

                // OR Logic: Match by RFC (Strong) OR Name (Weak)
                // Note: Supabase JS simple query builder doesn't do complex ORs easily without .or() string syntax
                // "merchant_rfc.eq.X,merchant_name_pattern.eq.Y"

                const conditions = [];
                if (currentData.rfc) conditions.push(`merchant_rfc.eq.${currentData.rfc}`);
                if (currentData.store_name && !currentData.rfc) conditions.push(`merchant_name_pattern.eq.${currentData.store_name}`);

                if (conditions.length > 0) {
                    // Fetch ALL matching rules (Global Intelligence)
                    const { data, error } = await query.or(conditions.join(','));

                    if (data && data.length > 0) {
                        // Priority 1: My own specific rule
                        const myRule = data.find(r => r.user_id === user.id && r.merchant_rfc === currentData.rfc);

                        // Priority 2: Community rule for this RFC (First one found)
                        const communityRule = data.find(r => r.merchant_rfc === currentData.rfc);

                        // Priority 3: Fallback match
                        setRule(myRule || communityRule || data[0]);
                    }
                }
            } catch (e) {
                console.error("Error fetching merchant rule:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchRule();
    }, [currentData.rfc, currentData.store_name]);

    // 2. Save Rule (Upsert)
    const saveRule = async (newSettings: {
        url: string,
        format: 'full' | 'end' | 'start',
        rfc: string,
        extractionMap?: Record<string, any>
    }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase.from('merchant_processing_rules').upsert({
                user_id: user.id,
                merchant_rfc: newSettings.rfc,
                merchant_name_pattern: currentData.store_name || "Unknown Store",
                invoicing_url: newSettings.url,
                ticket_format_rule: newSettings.format === 'end' ? 'end_10' : newSettings.format === 'start' ? 'start_10' : 'full',
                updated_at: new Date().toISOString(),
                extraction_map: newSettings.extractionMap // [NEW] Save visual map
            }, { onConflict: 'user_id, merchant_rfc' });

            if (error) throw error;

            // Update local state to reflect saved capability
            setRule({
                merchant_rfc: newSettings.rfc,
                merchant_name_pattern: currentData.store_name || "Unknown",
                invoicing_url: newSettings.url,
                ticket_format_rule: newSettings.format === 'end' ? 'end_10' : newSettings.format === 'start' ? 'start_10' : 'full',
                extraction_map: newSettings.extractionMap
            });

            return true;
        } catch (e) {
            console.error("Error saving rule:", e);
            alert("Error al guardar la regla.");
            return false;
        }
    };

    // 3. Delete Rule
    const deleteRule = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('merchant_processing_rules')
                .delete()
                .eq('user_id', user.id)
                .eq('merchant_rfc', currentData.rfc);

            if (error) throw error;

            setRule(null);
            return true;
        } catch (e) {
            console.error("Error deleting rule:", e);
            alert("Error al eliminar la regla.");
            return false;
        }
    };

    return { rule, loading, saveRule, deleteRule };
}

// [GLOBAL INTELLIGENCE] Helper to discover fields used by the community
export async function getCommunityFields() {
    try {
        const { data, error } = await supabase
            .from('merchant_processing_rules')
            .select('extraction_map')
            .limit(100); // Analyze sample of last 100 rules for trends

        if (error || !data) return [];

        const fieldCounts: Record<string, { label: string, count: number }> = {};

        data.forEach(row => {
            if (row.extraction_map) {
                Object.keys(row.extraction_map).forEach(key => {
                    // Skip if it's not a custom object structure we expect, or if plain key
                    const fieldDef = row.extraction_map[key];
                    // We expect { labelOrValue: ... } or just check the key
                    // In our save logic we save: { label: string, type: 'custom_field' }

                    if (fieldDef && fieldDef.label && fieldDef.type === 'custom_field') {
                        if (!fieldCounts[key]) {
                            fieldCounts[key] = { label: fieldDef.label, count: 0 };
                        }
                        fieldCounts[key].count++;
                    }
                });
            }
        });

        // Return fields that appear at least once (or set a threshold)
        // Sort by popularity
        return Object.entries(fieldCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([key, val]) => ({ key, label: val.label }));

    } catch (e) {
        console.error("Error fetching community fields:", e);
        return [];
    }
}
