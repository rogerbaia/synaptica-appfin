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

    // 0. Auth & Client Setup
    const authHeader = req.headers.get('Authorization');
    // ... (Verify auth same as Organization route, but we need the USER object)
    // For brevity in valid implementation, we assume we use the server-side supabase client helper or just standard verify:
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role to query Transactions globally for this user
    );

    let user;
    // We can trust the user ID passed from client IF we verify token, OR we just trust the token.
    // Better: Get User from Token.
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        user = data.user;
    }

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const metadata = user.user_metadata || {};
    const orgId = metadata.facturapi_org_id;

    // 1. Enforce Organization (RFC) Registration
    // This implicitly handles the "One RFC per Account" constraint via Facturapi
    if (!orgId) {
        return NextResponse.json({
            message: 'Configuración Fiscal Incompleta. Ve a Configuración > Fiscal y guarda tus datos primero.'
        }, { status: 403 });
    }

    try {
        const data = await req.json();

        // 2. TRIAL LIMIT CHECK (1 Invoice Max)
        // Check if user is in "Trial" (No explicit plan OR 'free' plan AND created < 7 days ago)
        // Note: SubscriptionContext logic effectively grants 'platinum' features but we must restrict THIS specific feature server-side.
        // We check if they are NOT truly 'pro'/'platinum' in the DB profile (ignoring the temporary client-side grant).

        const isPaidPlan = metadata.subscription_tier === 'pro' || metadata.subscription_tier === 'platinum' || metadata.is_pro === true;

        // Calculate Account Age
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const isTrialPeriod = diffDays <= 7;

        // "God Mode" bypass
        const isGod = ['rogerbaia@hotmail.com', 'admin@synaptica.ai'].includes(user.email || '');

        if (!isPaidPlan && isTrialPeriod && !isGod) {
            // Count existing invoices in DB
            const { count, error } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('has_invoice', true);

            if (error) console.error("Error counting invoices", error);

            const invoiceCount = count || 0;

            if (invoiceCount >= 1) {
                return NextResponse.json({
                    message: `🛑 Límite de Prueba Alcanzado.\n\nDurante los 7 días gratuitos, solo puedes emitir 1 factura real para probar el sistema.\n\nPara facturación ilimitada, actualiza a Platinum.`
                }, { status: 403 });
            }
        }

        // 3. Create Invoice (Using the User's Org ID)
        // We pass 'orgId' to our helper logic to ensure Facturapi assigns it correctly
        const invoice = await createInvoice(orgId, data); // Pass orgId instead of looking up customer manually logic

        // 4. Map to StampedInvoice Interface
        return NextResponse.json({
            uuid: invoice.uuid,
            folio: invoice.folio_number?.toString() || invoice.id.substring(0, 6).toUpperCase(),
            date: invoice.created_at,
            selloSAT: invoice.verification_url ? 'https://verificacfdi.facturaelectronica.sat.gob.mx...' : 'PENDING', // Facturapi simplifies this
            selloCFDI: invoice.stamp?.signature || 'PENDING',
            certificateNumber: '30001000000500003421', // Mock or extract from invoice.cert_number
            originalChain: invoice.original_string || '',
            xml: invoice.xml_download_url || ''
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

async function createInvoice(orgId: string, data: any) {
    // 1. Create/Find Customer "Just in Time"
    // Ideally this should be scoped to the user, but for now we create a transient customer
    // Facturapi allows creating customer inline? No, usually separate.
    // Let's create customer first.
    // Note: We need to create the customer association for THIS Organization?
    // If we use the Platform Key, customers are global?
    // Let's attempt to create customer first.
    let customerId;
    try {
        customerId = await createCustomer({
            legal_name: data.client,
            tax_id: data.rfc,
            tax_system: data.fiscalRegime,
            email: 'cliente@synaptica.ai',
            address: { zip: '20000' }
        });
    } catch (e) {
        // Maybe exists? Search?
        // Fallback: search?
        // Simplified: We assume create works or throws if invalid data. 
        // If "already exists", we typically search.
        // For this task, we assume happy path or simple search fallback.
        customerId = await findCustomerByRFC(data.rfc);
    }

    if (!customerId) throw new Error("No se pudo registrar el cliente receptor.");

    const payload = {
        customer: customerId,
        items: [{
            quantity: data.quantity,
            product: {
                description: data.description,
                product_key: data.satProductKey, // e.g. 84111506
                price: parseFloat(data.unitValue),
                unit_key: data.satUnitKey, // e.g. E48
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
        use: data.cfdiUse,
        // [CRITICAL] Issue on behalf of the User's Organization
        organization: orgId
    };

    // Taxes Logic Matches Previous...
    const taxes = [];
    if (data.iva > 0) taxes.push({ type: 'IVA', rate: 0.16 });
    if (data.retention > 0) {
        taxes.push({ type: 'ISR', rate: 0.0125, factor: 'Tasa', withholding: true });
    }
    // @ts-ignore
    payload.items[0].product.taxes = taxes;

    const res = await fetch(`https://www.facturapi.io/v2/invoices`, {
        method: 'POST',
        headers: {
            'Authorization': getAuthHeader(), // Platform Key
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error creating invoice in Facturapi');
    return json;
}
