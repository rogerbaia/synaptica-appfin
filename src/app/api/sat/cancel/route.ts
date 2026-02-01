
import { NextRequest, NextResponse } from 'next/server';

const FACTURAPI_KEY = process.env.FACTURAPI_SECRET_KEY || 'sk_test_...'; // Ensure env var is known

function getAuthHeader() {
    return `Basic ${Buffer.from(FACTURAPI_KEY + ':').toString('base64')}`;
}

export async function POST(req: NextRequest) {
    try {
        const { id, reason } = await req.json();

        if (!id) {
            return NextResponse.json({ message: 'Missing invoice ID' }, { status: 400 });
        }

        // Cancel in Facturapi
        // Query params: ?motive=02 (Definite cancellation)
        const response = await fetch(`https://www.facturapi.io/v2/invoices/${id}?motive=${reason || '02'}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });

        const json = await response.json();

        if (!response.ok) {
            return NextResponse.json({ message: json.message || 'Error canceling in Facturapi' }, { status: response.status });
        }

        return NextResponse.json(json);

    } catch (error: any) {
        console.error('Cancellation Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
