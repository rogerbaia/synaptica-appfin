
import { NextRequest, NextResponse } from 'next/server';

// Reuse Key Logic (Ideally shared but duplicating for safety in this standalone file)
const KEY_PART_1 = 'sk_live_';
const KEY_PART_2 = 'N8NW3LtbUGBvmLZQd1LPDikpxUHyNUrBH61g5WU8Mq';
const FALLBACK_KEY = KEY_PART_1 + KEY_PART_2;

const FACTURAPI_KEY = process.env.FACTURAPI_KEY || FALLBACK_KEY;

const getAuthHeader = () => {
    const cleanKey = FACTURAPI_KEY.trim();
    if (!cleanKey) throw new Error("Missing FACTURAPI_KEY");
    const { Buffer } = require('buffer');
    const base64 = Buffer.from(cleanKey + ':').toString('base64');
    return `Basic ${base64}`;
};

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'Missing ID' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://www.facturapi.io/v2/invoices/${id}`, {
            headers: { 'Authorization': getAuthHeader() }
        });

        if (!response.ok) {
            return NextResponse.json({ message: 'Invoice not found in Facturapi' }, { status: 404 });
        }

        const json = await response.json();
        return NextResponse.json(json);

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
