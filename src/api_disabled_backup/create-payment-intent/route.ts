import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { amount, currency = 'usd' } = await request.json();

        // Security: In a real app, validate the user session here
        // const session = await getSession(req);
        // if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

        // Create PaymentIntent
        // Amount is expected in "cents" (e.g. $15.00 -> 1500)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            automatic_payment_methods: { enabled: true },
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: any) {
        console.error("Stripe Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
