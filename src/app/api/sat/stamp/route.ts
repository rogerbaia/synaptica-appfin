import { NextRequest, NextResponse } from 'next/server';

const FACTURAPI_KEY = process.env.FACTURAPI_KEY || '';

const getAuthHeader = () => {
    const cleanKey = FACTURAPI_KEY.trim();
    if (!cleanKey) throw new Error("Missing FACTURAPI_KEY");
    return `Basic ${Buffer.from(cleanKey + ':').toString('base64')}`;
};

export async function POST(req: NextRequest) {
    if (!FACTURAPI_KEY || FACTURAPI_KEY.includes('placeholder')) {
        return NextResponse.json({ message: 'Missing FACTURAPI_KEY' }, { status: 503 });
    }

    try {
        const data = await req.json();

        // 1. Find or Create Customer
        let customerId = await findCustomerByRFC(data.rfc);
        if (!customerId) {
            customerId = await createCustomer({
                legal_name: data.client,
                tax_id: data.rfc,
                tax_system: data.fiscalRegime,
                email: 'cliente@example.com', // Placeholder or add to form
                address: {
                    zip: '20000' // Placeholder or add to form
                }
            });
        }

        // 2. Create Invoice
        const invoice = await createInvoice(customerId, data);

        // 3. Map to StampedInvoice Interface
        return NextResponse.json({
            uuid: invoice.uuid,
            folio: invoice.folio_number?.toString() || invoice.id.substring(0, 6).toUpperCase(),
            date: invoice.created_at,
            selloSAT: invoice.stamp?.sat_signature || 'PENDING',
            selloCFDI: invoice.stamp?.signature || 'PENDING',
            certificateNumber: invoice.cert_number || '',
            originalChain: invoice.original_chain || '',
            xml: invoice.xml_url || '' // Facturapi provides a URL
        });

    } catch (error: any) {
        console.error('Facturapi Error:', error);
        return NextResponse.json({
            message: error.message || 'Error processing invoice',
            details: error
        }, { status: 500 });
    }
}

async function findCustomerByRFC(rfc: string) {
    const res = await fetch(`https://www.facturapi.io/v2/customers?q=${rfc}`, {
        headers: { 'Authorization': getAuthHeader() }
    });
    const json = await res.json();
    if (json.data && json.data.length > 0) return json.data[0].id;
    return null;
}

async function createCustomer(data: any) {
    const res = await fetch(`https://www.facturapi.io/v2/customers`, {
        method: 'POST',
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error creating customer');
    return json.id;
}

async function createInvoice(customerId: string, data: any) {
    const payload = {
        customer: customerId,
        items: [{
            quantity: data.quantity,
            product: {
                description: data.description,
                product_key: data.satProductKey,
                price: parseFloat(data.unitValue),
                unit_key: data.satUnitKey,
                taxes: [
                    {
                        type: 'IVA',
                        rate: 0.16
                    }
                ]
            }
        }],
        payment_form: data.paymentForm,
        payment_method: data.paymentMethod,
        use: data.cfdiUse
    };

    // Adjust taxes logic based on data.hasIva / retention
    // If mocking, `data` has flags. We need to respect them.
    // Simplifying: If data.iva > 0, we add IVA.
    // If data.retention > 0, we add retention.

    const taxes = [];
    if (data.iva > 0) taxes.push({ type: 'IVA', rate: 0.16 });
    if (data.retention > 0) {
        // ISR Retention? RESICO is 1.25% usually.
        // We need to know the retention RATE.
        // `InvoiceModal` calculates it but doesn't pass the rate explicitly, just the amount.
        // But for Facturapi we need the rate.
        // We can infer it or pass it.
        // For RESICO: 0.0125.
        // For now, hardcode RESICO retention if retention > 0.
        taxes.push({ type: 'ISR', rate: 0.0125, factor: 'Tasa', withholding: true });
    }

    // Override product taxes
    // @ts-ignore
    payload.items[0].product.taxes = taxes;

    const res = await fetch(`https://www.facturapi.io/v2/invoices`, {
        method: 'POST',
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error creating invoice');
    return json;
}
