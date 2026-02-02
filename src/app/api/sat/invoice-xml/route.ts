
import { NextRequest, NextResponse } from 'next/server';

const FACTURAPI_KEY = process.env.FACTURAPI_KEY;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'Missing Invoice ID' }, { status: 400 });
        }

        if (!FACTURAPI_KEY) {
            return NextResponse.json({ message: 'Server Misconfiguration' }, { status: 500 });
        }

        const auth = 'Basic ' + Buffer.from(FACTURAPI_KEY + ':').toString('base64');

        // Fetch XML from Facturapi
        const response = await fetch(`https://www.facturapi.io/v2/invoices/${id}/xml`, {
            headers: { 'Authorization': auth }
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ message: 'Facturapi Error', detail: errText }, { status: response.status });
        }

        const xmlText = await response.text();

        return new NextResponse(xmlText, {
            status: 200,
            headers: { 'Content-Type': 'application/xml' }
        });

    } catch (error: any) {
        console.error('Invoice XML Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
