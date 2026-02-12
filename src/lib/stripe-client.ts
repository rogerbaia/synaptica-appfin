import { loadStripe } from '@stripe/stripe-js';

// Client-side Promise (loading the script)
// This uses the NEXT_PUBLIC_ key which is available in the browser
export const getStripe = () => {
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};
