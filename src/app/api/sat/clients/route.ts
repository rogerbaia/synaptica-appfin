import { NextRequest, NextResponse } from 'next/server';

const FACTURAPI_KEY = process.env.FACTURAPI_KEY || '';

const getAuthHeader = () => {
    const cleanKey = FACTURAPI_KEY.trim();
    if (!cleanKey) throw new Error("Missing FACTURAPI_KEY");
    return `Basic ${Buffer.from(cleanKey + ':').toString('base64')}`;
};

export async function GET(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ data: [] });

    try {
        const url = new URL(req.url);
        const search = url.searchParams.get('q') || '';

        const res = await fetch(`https://www.facturapi.io/v2/customers?q=${search}&limit=100`, {
            headers: { 'Authorization': getAuthHeader() },
            cache: 'no-store'
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error fetching clients');

        return NextResponse.json(json);
    } catch (error: any) {
        console.error('Facturapi Clients Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ message: 'No API Key' }, { status: 401 });

    try {
        const body = await req.json();

        // Basic validation
        if (!body.legal_name || !body.tax_id || !body.tax_system) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const res = await fetch(`https://www.facturapi.io/v2/customers`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error creating client');

        return NextResponse.json(json);
    } catch (error: any) {
        console.error('Facturapi Create Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ message: 'No API Key' }, { status: 401 });

    try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

        const res = await fetch(`https://www.facturapi.io/v2/customers/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error updating client');

        return NextResponse.json(json);
    } catch (error: any) {
        console.error('Facturapi Update Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ message: 'No API Key' }, { status: 401 });

    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

        const res = await fetch(`https://www.facturapi.io/v2/customers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': getAuthHeader() }
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error deleting client');

        return NextResponse.json(json);
    } catch (error: any) {
        console.error('Facturapi Delete Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
