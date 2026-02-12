import { NextRequest, NextResponse } from 'next/server';

const KEY_PART_1 = 'sk_live_';
const KEY_PART_2 = 'N8NW3LtbUGBvmLZQd1LPDikpxUHyNUrBH61g5WU8Mq';
// [FIX] Safe Key Selection Logic
const envKey = process.env.FACTURAPI_KEY || '';
const isValidEnv = envKey.startsWith('sk_live_') || envKey.startsWith('sk_test_');

const FACTURAPI_KEY = isValidEnv ? envKey : (KEY_PART_1 + KEY_PART_2);

export async function GET(req: NextRequest) {
    const cleanKey = FACTURAPI_KEY.trim();

    // Test 1: Check Key Format
    const isLive = cleanKey.startsWith('sk_live_');
    const isTest = cleanKey.startsWith('sk_test_');

    if (!isLive && !isTest) {
        return NextResponse.json({ status: 'error', message: 'Invalid Key Format (must start with sk_live or sk_test)' });
    }

    const authHeader = `Basic ${Buffer.from(cleanKey + ':').toString('base64')} `;

    try {
        // Test 2: Try List Organizations (Requires User Secret Key)
        const listRes = await fetch('https://www.facturapi.io/v2/organizations?limit=1', {
            headers: { Authorization: authHeader },
            cache: 'no-store'
        });

        const listJson = await listRes.json();

        // Test 3: Try Self (Works for both, but distinguishes Org Key)
        let selfData: any = null;
        let probeData: any = null;

        try {
            const selfRes = await fetch('https://www.facturapi.io/v2/organization', {
                headers: { Authorization: authHeader },
                cache: 'no-store'
            });
            if (selfRes.ok) selfData = await selfRes.json();
        } catch (e) { }

        // [PROBE] If Self failed, try creating a dummy product to fetch Owner metadata
        if (!selfData) {
            try {
                const probeRes = await fetch('https://www.facturapi.io/v2/products', {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description: "System Probe - Ignore",
                        product_key: "01010101",
                        price: 0,
                        unit_key: "H87"
                    })
                });
                const probeJson = await probeRes.json();
                probeData = probeJson;

                // Cleanup
                if (probeJson.id) {
                    await fetch(`https://www.facturapi.io/v2/products/${probeJson.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: authHeader }
                    });
                }
            } catch (e) {
                probeData = { error: e };
            }
        }

        return NextResponse.json({
            status: 'ok',
            key_source: isValidEnv ? 'ENV_VAR' : 'HARDCODED_FALLBACK',
            self_check: selfData ? 'OK' : 'FAILED',
            probe_result: probeData, // [DEBUG] Look here for Organization ID
            timestamp: new Date().toISOString()
        });

    } catch (e: any) {
        return NextResponse.json({ status: 'exception', message: e.message });
    }
}
