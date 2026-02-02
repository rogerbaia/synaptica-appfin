
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch Invoice F6
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('invoice_number', 'F6')
            .single();

        if (txError || !tx) {
            return NextResponse.json({ message: 'Invoice F6 not found in DB', error: txError }, { status: 404 });
        }

        console.log("Found Invoice:", tx.invoice_number, "ID:", tx.id);

        const currentDetails = tx.details || {};

        // Check if fullResponse exists
        if (currentDetails.fullResponse && currentDetails.fullResponse.original_chain) {
            return NextResponse.json({ message: 'Invoice F6 already has fullResponse with original_chain', details: currentDetails });
        }

        // 2. Fetch from Facturapi
        // We need the Facturapi ID. It is usually in details.id
        const facturapiId = currentDetails.id;
        if (!facturapiId) {
            return NextResponse.json({ message: 'Facturapi ID not found in details', details: currentDetails }, { status: 400 });
        }

        const apiKey = process.env.FACTURAPI_KEY;
        if (!apiKey) return NextResponse.json({ message: 'Missing FACTURAPI_KEY' }, { status: 500 });

        const response = await fetch(`https://www.facturapi.io/v2/invoices/${facturapiId}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            return NextResponse.json({ message: 'Error fetching from Facturapi', error: err }, { status: response.status });
        }

        const facturapiData = await response.json();

        // 3. Update DB
        const newDetails = {
            ...currentDetails,
            fullResponse: facturapiData,
            // Also patch top-level fields for good measure
            originalChain: facturapiData.original_chain || facturapiData.original_string || currentDetails.originalChain,
            selloSAT: facturapiData.stamp?.sello_sat || currentDetails.selloSAT,
            selloCFDI: facturapiData.stamp?.sello_cfdi || currentDetails.selloCFDI,
            satCertificateNumber: facturapiData.stamp?.sat_cert_number || currentDetails.satCertificateNumber
        };

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ details: newDetails })
            .eq('id', tx.id);

        if (updateError) {
            return NextResponse.json({ message: 'Error updating DB', error: updateError }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Updated Invoice F6 with fresh data from Facturapi',
            added_original_chain: facturapiData.original_chain
        });

    } catch (e: any) {
        return NextResponse.json({ message: 'Server Error', error: e.message, stack: e.stack }, { status: 500 });
    }
}
