import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FACTURAPI_KEY = process.env.FACTURAPI_KEY;
// Using hardcoded values to match lib/supabase.ts logic since .env might be missing in some setups, but normally should be env
const SUPABASE_URL = "https://hmhyihenczvkeqmptxsh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaHlpaGVuY3p2a2VxbXB0eHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzM1MzIsImV4cCI6MjA4MjIwOTUzMn0._2AgnDWS3eeYsXanCMAXSSpTIAZtjmXKTENNgFC7zh4";

export async function POST(req: NextRequest) {
    if (!FACTURAPI_KEY || FACTURAPI_KEY.includes('placeholder')) {
        return NextResponse.json({ message: 'Missing FACTURAPI_KEY env' }, { status: 503 });
    }

    try {
        const formData = await req.formData();

        // 1. Authenticate User (Manual Token Check)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: 'Missing Authorization Header' }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        // Verify token
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ message: 'Unauthorized calling API' }, { status: 401 });
        }

        // [DEBUG] Log received fields
        console.log('[DEBUG] Received FormData Keys:', Array.from(formData.keys()));
        const legalName = formData.get('legal_name') as string;
        const name = formData.get('name') as string || legalName;

        if (!name) {
            return NextResponse.json({ message: 'Missing name or legal_name' }, { status: 400 });
        }

        // [LOGIC] Default Logo Injection (Same as before)
        if (!formData.get('logo')) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const defaultLogoPath = path.join(process.cwd(), 'public', 'logo-factura-default.png');

                if (fs.existsSync(defaultLogoPath)) {
                    const logoBuffer = fs.readFileSync(defaultLogoPath);
                    const logoBlob = new Blob([logoBuffer], { type: 'image/png' });
                    formData.append('logo', logoBlob, 'logo-default.png');
                }
            } catch (err) {
                console.error("Error injecting default logo:", err);
            }
        }

        // Re-construct formData to ensure clean state
        const outgoingFormData = new FormData();
        outgoingFormData.append('legal_name', legalName);
        outgoingFormData.append('name', name);
        outgoingFormData.append('tax_id', formData.get('tax_id') as string);
        outgoingFormData.append('tax_system', formData.get('tax_system') as string);
        const zip = formData.get('address[zip]');
        if (zip) outgoingFormData.append('address[zip]', zip as string);

        // Files
        const cert = formData.get('certificate');
        const key = formData.get('key');
        const pass = formData.get('password');
        const logo = formData.get('logo');

        if (cert) outgoingFormData.append('certificate', cert);
        if (key) outgoingFormData.append('key', key);
        if (pass) outgoingFormData.append('password', pass as string);
        if (logo) outgoingFormData.append('logo', logo);


        const cleanKey = FACTURAPI_KEY.trim();
        const authHeaderFacturapi = `Basic ${Buffer.from(cleanKey + ':').toString('base64')}`;

        console.log('[DEBUG] Sending to Facturapi with Name:', name);

        // 2. Call Facturapi to Create Child Organization
        const res = await fetch('https://www.facturapi.io/v2/organizations', {
            method: 'POST',
            headers: {
                'Authorization': authHeaderFacturapi,
            },
            body: outgoingFormData
        });

        const json = await res.json();

        if (!res.ok) {
            console.error("Facturapi Error:", json);
            const msg = json.message || "Error creando organización";

            // Common error: Duplicate
            if (msg.includes('already exists') || msg.includes('duplicate')) {
                // Should we try to find it? For now, just error.
                throw new Error("Una organización con este RFC ya existe en tu cuenta.");
            }
            throw new Error(msg);
        }

        const orgId = json.id;

        // 3. Save Org ID to User Metadata
        const { error: updateError } = await supabase.auth.updateUser({
            data: {
                facturapi_org_id: orgId, // CRITICAL: This links the user to their unique fiscal identity
                facturapi_rfc: formData.get('tax_id'),
                facturapi_legal_name: json.legal_name,
                is_fiscal_ready: true
            }
        });

        if (updateError) {
            console.error("Supabase Metadata Update Error", updateError);
            throw new Error("Organización creada pero falló la vinculación con tu usuario. Contacta soporte.");
        }

        console.log(`✅ Organization Created & Linked: ${orgId} for User ${user.email}`);

        return NextResponse.json({
            id: orgId,
            legal_name: json.legal_name,
            message: "Organización Fiscal Configurada Correctamente"
        });

    } catch (error: any) {
        console.error('Organization Config Error:', error);
        return NextResponse.json({
            message: error.message || 'Error configuring fiscal data'
        }, { status: 500 });
    }
}
