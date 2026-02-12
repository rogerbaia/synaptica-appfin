import Stripe from 'stripe';

// Server-side Instance (API calls)
// This uses the Secret Key which is ONLY available on the server
// This file should NEVER be imported in client components
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
});
