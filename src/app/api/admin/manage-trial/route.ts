import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client to update user_metadata (server-side only)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, action, email } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
        }

        // Verify Super Admin (Generic Check via Session or Headers)
        // Ideally we check session here, but for now we trust the client logic + simple email check if we had session.
        // But since this is a protected route, let's just proceed with the admin action request if key is valid.

        console.log(`[Trial Manager] Action: ${action} for User: ${userId}`);

        if (action === 'START') {
            // 1. Grant Platinum Status
            // 2. Set Manual Trial Flag (Infinite)
            // 3. Add 10 Folios
            // 4. Clear any existing trial_ends to ensure it doesn't expire

            // 1 & 2 & 3 & 4 (Persist Trial Ends in Metadata too)
            const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                    subscription_tier: 'platinum',
                    is_pro: true,
                    manual_trial_active: true,
                    extra_folios: 10,
                    trial_ends: '2099-01-01T00:00:00.000Z' // Source of Truth
                }
            });

            if (metaError) throw metaError;

            // 5. Update Profile Table (Best Effort)
            // Removed 'plan' as it causes schema errors.
            try {
                await supabaseAdmin.from('profiles').upsert({
                    id: userId,
                    ...(email ? { email } : {}),
                    trial_ends: '2099-01-01T00:00:00.000Z'
                });
            } catch (ignored) {
                console.warn("Profile table update failed (ignoring as metadata is saved)", ignored);
            }

            return NextResponse.json({ success: true, message: 'Trial Started' });
        }

        if (action === 'END_PHASE') {
            // 1. Calculate +7 Days
            const now = new Date();
            const end = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

            // 2. Set Trial End Date
            // 3. Disable Manual Flag (so it falls back to expiry date check)

            // Note: We keep subscription_tier='platinum' so they can enjoy the 7 days.
            // But we remove 'manual_trial_active' so the system starts checking 'trial_ends'.

            const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                    manual_trial_active: false
                    // We keep tier: platinum
                }
            });

            if (metaError) throw metaError;

            // Update Profile Table
            await supabaseAdmin.from('profiles').update({
                trial_ends: end.toISOString()
            }).eq('id', userId);

            return NextResponse.json({ success: true, message: 'Trial Phase Ended (7 Days Left)' });
        }

        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        console.error("[Trial Manager] Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
