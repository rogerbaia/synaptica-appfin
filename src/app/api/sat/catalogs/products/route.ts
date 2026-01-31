
import { NextRequest, NextResponse } from "next/server";

const FACTURAPI_KEY = process.env.FACTURAPI_KEY;

export async function GET(req: NextRequest) {
    if (!FACTURAPI_KEY) return NextResponse.json({ data: [] });

    try {
        const url = new URL(req.url);
        const search = url.searchParams.get('q') || '';

        if (search.length < 3) return NextResponse.json({ data: [] });

        const res = await fetch(`https://www.facturapi.io/v2/catalogs/products?q=${search}&limit=20`, {
            headers: { 'Authorization': `Bearer ${FACTURAPI_KEY}` }
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error fetching catalog');

        // Map to standard format { code, name }
        // Facturapi returns { key: "84111506", description: "Servicios de facturacion" }
        const mapped = (json.data || []).map((item: any) => ({
            code: item.key,
            name: item.description
        }));

        return NextResponse.json({ data: mapped });
    } catch (error: any) {
        console.error('Facturapi Catalog Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
