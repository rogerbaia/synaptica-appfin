
const https = require('https');

const KEY = 'sk_user_PLACEHOLDER'; // Redacted for security
const AUTH = 'Basic ' + Buffer.from(KEY + ':').toString('base64');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.facturapi.io',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`\n[${method} ${path}] Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    // console.log(JSON.stringify(json, null, 2)); // Reduce noise
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.log("Raw Body:", data);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => {
            console.error(e);
            resolve(null);
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("--- DEBUGGING USER KEY ---");

    // 1. Check List Orgs (Only User Key can do this)
    console.log("1. Listing Organizations (GET /v2/organizations)");
    const listRes = await request('GET', '/v2/organizations?limit=1');

    if (listRes.status === 200) {
        console.log("✅ Key is Valid USER KEY.");
        console.log("Found:", listRes.data.data.length, "organizations.");
    } else {
        console.log("❌ Key Failed:", listRes.data);
    }
}

run();
