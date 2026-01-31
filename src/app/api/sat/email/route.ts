
import { NextRequest, NextResponse } from "next/server";

const FACTURAPI_KEY = process.env.FACTURAPI_KEY;

export async function POST(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ message: "Server Misconfigured: Missing Facturapi Key" }, { status: 500 });

    try {
        const { invoiceId, email } = await req.json();

        if (!invoiceId) return NextResponse.json({ message: "Invoice ID required" }, { status: 400 });

        // 1. Send to Client
        const resClient = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FACTURAPI_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (!resClient.ok) {
            const err = await resClient.json();
            throw new Error(err.message || 'Error sending email to client');
        }

        // 2. Send Copy to Issuer (Me) - Roger's email
        // We use a separate call because Facturapi might not support CC in the same payload for basic tiers, 
        // or we just want to be sure. 
        // NOTE: The user requested "a quien esta facturando (en ese caso a mi)".
        const ISSUER_EMAIL = "rogerbaia@hotmail.com"; // Hardcoded for this user context as requested

        await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FACTURAPI_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: ISSUER_EMAIL })
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Email Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
