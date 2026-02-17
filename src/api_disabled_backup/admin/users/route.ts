import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Super Admin Only
// Lazy initialization inside handler to avoid build-time errors
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // In real app ...
        // ... (rest of logic) ...

        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error('[AdminUsers] Error listing users:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map to expected format, prioritizing Metadata
        const mappedUsers = users.map(user => {
            const meta = user.user_metadata || {};

            // Determine Plan from Metadata (SOF)
            let plan = 'free';
            if (meta.subscription_tier) plan = meta.subscription_tier;
            else if (meta.is_pro) plan = 'pro';
            else if (meta.role === 'admin') plan = 'admin';

            // Determine Trial End from Metadata (SOF)
            // If missing, check if we have a legacy profile fetch (not possible here easily without joining)
            // But since we are writing to Metadata now, this is the way forward.
            const trial_ends = meta.trial_ends || null;

            return {
                id: user.id,
                email: user.email,
                joined: user.created_at,
                plan,
                trial_ends
            };
        });

        // Filter out the super admin himself if needed, or keep him
        return NextResponse.json(mappedUsers);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
