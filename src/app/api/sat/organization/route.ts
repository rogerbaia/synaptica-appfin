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

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        });
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




        const cleanKey = FACTURAPI_KEY.trim();
        const authHeaderFacturapi = `Basic ${Buffer.from(cleanKey + ':').toString('base64')}`;
        const targetRFC = formData.get('tax_id') as string;

        console.log('[DEBUG] Step 0: Searching for existing organization with RFC:', targetRFC);

        // 0. Step 0: Search for existing Organization
        let orgId: string | null = null;
        let orgLegalName: string = legalName;

        try {
            const searchRes = await fetch('https://www.facturapi.io/v2/organizations', {
                method: 'GET',
                headers: { 'Authorization': authHeaderFacturapi }
            });

            if (searchRes.ok) {
                const orgs = await searchRes.json();
                const match = orgs.data.find((o: any) => o.legal.tax_id === targetRFC);
                if (match) {
                    orgId = match.id;
                    orgLegalName = match.legal.legal_name;
                    console.log(`[DEBUG] Found Existing Org: ${orgId} (${orgLegalName})`);
                }
            }
        } catch (e) {
            console.warn("Error searching organizations", e);
        }

        // 1. Step 1: Create Organization via JSON (Only if not found)
        if (!orgId) {
            console.log('[DEBUG] Org not found. Creating new...');
            const createRes = await fetch('https://www.facturapi.io/v2/organizations', {
                method: 'POST',
                headers: {
                    'Authorization': authHeaderFacturapi,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    legal_name: legalName,
                    tax_id: targetRFC,
                    tax_system: formData.get('tax_system') as string,
                    address: {
                        zip: formData.get('address[zip]') as string,
                    }
                })
            });

            const json = await createRes.json();

            if (!createRes.ok) {
                console.error("Facturapi Creation Error:", json);
                const msg = json.message || "Error creando organización (JSON)";
                throw new Error(msg);
            }
            orgId = json.id;
            orgLegalName = json.legal_name || legalName;
        }

        console.log(`[DEBUG] Step 1 Done. Target Org ID: ${orgId}. LINKING User...`);

        // [CRITICAL] Link User in Supabase
        // Strategy: Try Admin Client (Service Role) first for guaranteed permission.
        const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        let updateError = null;

        if (SERVICE_ROLE_KEY) {
            console.log('[DEBUG] Using Service Role Key for Admin Update');
            const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
            const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
                user_metadata: {
                    facturapi_org_id: orgId, // CRITICAL LINK
                    facturapi_rfc: targetRFC,
                    facturapi_legal_name: orgLegalName,
                    is_fiscal_ready: true
                }
            });
            updateError = error;
        } else {
            console.warn('[WARN] No SERVICE_ROLE_KEY found. Falling back to User Context Update.');
            const { error } = await supabase.auth.updateUser({
                data: {
                    facturapi_org_id: orgId, // CRITICAL LINK
                    facturapi_rfc: targetRFC,
                    facturapi_legal_name: orgLegalName,
                    is_fiscal_ready: true
                }
            });
            updateError = error;
        }

        if (updateError) {
            console.error("Supabase Metadata Update Error", updateError);
            throw new Error(`Organización encontrada/creada pero falló la vinculación (Supabase: ${updateError.message}).`);
        }
        console.log(`✅ Organization Linked: ${orgId}`);

        // 2. Step 2: Upload CSD Files (Non-Fatal)
        let csdMessage = "CSD subidos correctamente.";
        const cert = formData.get('certificate');
        const key = formData.get('key');
        const pass = formData.get('password');

        if (cert && key && pass) {
            try {
                const filesFormData = new FormData();
                filesFormData.append('certificate', cert);
                filesFormData.append('key', key);
                filesFormData.append('password', pass as string);

                const uploadRes = await fetch(`https://www.facturapi.io/v2/organizations/${orgId}/legal/csd`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': authHeaderFacturapi,
                    },
                    body: filesFormData
                });

                if (!uploadRes.ok) {
                    const uploadJson = await uploadRes.json();
                    console.error("Facturapi CSD Upload Error:", uploadJson);
                    csdMessage = `Advertencia: Organización guardada, pero hubo un error subiendo los CSD (${uploadJson.message}). Intenta subirlos nuevamente.`;
                } else {
                    console.log('[DEBUG] Step 2 Success: CSD Uploaded.');
                }
            } catch (err: any) {
                console.warn("CSD Upload Exception:", err);
                csdMessage = `Advertencia: Error de conexión al subir CSD.`;
            }
        }

        // 3. Step 3: Logo Upload (if provided)
        const logo = formData.get('logo');
        if (logo) {
            try {
                const logoFormData = new FormData();
                logoFormData.append('logo', logo);
                await fetch(`https://www.facturapi.io/v2/organizations/${orgId}/logo`, {
                    method: 'PUT',
                    headers: { 'Authorization': authHeaderFacturapi },
                    body: logoFormData
                });
            } catch (e) {
                console.warn("Logo upload failed silently", e);
            }
        }

        // Return success response based on the new flow
        return NextResponse.json({
            id: orgId,
            legal_name: orgLegalName,
            message: `Organización Guardada. ${csdMessage}`
        });

    } catch (error: any) {
        console.error('Organization Config Error:', error);
        return NextResponse.json({
            message: error.message || 'Error configuring fiscal data'
        }, { status: 500 });
    }
}
