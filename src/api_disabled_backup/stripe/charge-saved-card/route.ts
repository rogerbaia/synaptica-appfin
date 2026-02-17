import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

// Admin client to update user_metadata (server-side only)
// Lazy init
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await req.json();
        const { folios, amount } = body; // amount in MXN (dollars/pesos not cents yet)

        if (!folios || !amount) {
            return NextResponse.json({ error: 'Missing folios or amount' }, { status: 400 });
        }

        // 1. Get Logged User
        // We use the Authorization header passed by the client (SB Access Token)
        // Or we can rely on standard header parsing if we had middleware.
        // For simplicity, let's extract the user from the token passed in headers.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user || !user.email) {
            return NextResponse.json({ error: 'Unauthorized User' }, { status: 401 });
        }

        console.log(`[Charge] Processing ${folios} folios for ${user.email} ($${amount})`);

        // 2. Resolve Stripe Customer
        let customerId = user.user_metadata?.stripe_customer_id;

        if (!customerId) {
            console.log(`[Charge] No ID in metadata. Searching Stripe by email: ${user.email}`);
            const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
                console.log(`[Charge] Found existing customer: ${customerId}`);

                // Persist for next time
                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                    user_metadata: { stripe_customer_id: customerId }
                });
            } else {
                return NextResponse.json({
                    error: 'No saved card found. Please subscribe to a plan first to set up your payment method.'
                }, { status: 400 });
            }
        }

        // 3. Get Payment Methods
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        if (paymentMethods.data.length === 0) {
            return NextResponse.json({
                error: 'No saved card found. Please add a card in your subscription limits.'
            }, { status: 400 });
        }

        // Use the first card (usually the default if only one, or most recent)
        // Ideally we check for default_source, but for PaymentMethods we just pick the first one 
        // as we don't have a UI to select.
        const paymentMethodId = paymentMethods.data[0].id;
        console.log(`[Charge] Charging PaymentMethod: ${paymentMethodId} (Last4: ${paymentMethods.data[0].card?.last4})`);

        // 4. Create Charge (PaymentIntent)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'mxn',
            customer: customerId,
            payment_method: paymentMethodId,
            off_session: true, // Crucial for using saved card without user interaction
            confirm: true, // Confirm immediately
            description: `Recarga de ${folios} Folios (Synaptica AppFin)`,
            metadata: {
                userId: user.id,
                email: user.email,
                folios: folios.toString(),
                type: 'folio_pack'
            }
        });

        if (paymentIntent.status !== 'succeeded') {
            console.error(`[Charge] Payment failed status: ${paymentIntent.status}`);
            return NextResponse.json({ error: `Payment failed: ${paymentIntent.status}. Please check your card.` }, { status: 400 });
        }

        // 5. Update User Balance (Metadata)
        // Retrieve fresh metadata first locally or just increment?
        // We trust the value we are about to set.
        // Wait, multiple tabs race condition? Metadata update is atomic-ish.
        // We need to read current extra_folios.

        // We already have 'user' object from getUser() above, but that might be stale if logic took long?
        // Let's rely on user.user_metadata.extra_folios from the getUser we just did.
        const currentExtra = parseInt(user.user_metadata?.extra_folios || '0');
        const newExtra = currentExtra + folios;

        console.log(`[Charge] Success! Updating extra_folios from ${currentExtra} to ${newExtra}`);

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: { extra_folios: newExtra }
        });

        if (updateError) {
            console.error("[Charge] Critical: Payment succeeded but Metadata update failed!", updateError);
            return NextResponse.json({ error: "Payment succeeded but balance update failed. Please contact support." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            newBalance: newExtra,
            txId: paymentIntent.id
        });

    } catch (error: any) {
        console.error("[Charge] Checkpoint Error:", error);
        // Handle Stripe Specific Errors (Card declined, etc)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
