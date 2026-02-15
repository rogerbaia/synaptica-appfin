
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgBuffer = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="aureaTricolor" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="25%" stopColor="#34d399" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="#111827"/> <!-- Dark Background for Icon -->
    <path
        d="M 30 15 H 80 A 5 5 0 0 1 85 20 V 30 A 5 5 0 0 1 80 35 H 50 V 45 H 70 A 5 5 0 0 1 75 50 V 60 A 5 5 0 0 1 70 65 H 50 V 85 A 5 5 0 0 1 45 90 H 35 A 5 5 0 0 1 30 85 V 15 Z"
        fill="url(#aureaTricolor)"
    />
</svg>
`);

// Standard sizes
const sizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generate() {
    for (const { name, size } of sizes) {
        const dir = path.join(__dirname, '../android/app/src/main/res', name);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Square(ish) Icon
        await sharp(svgBuffer)
            .resize(size, size)
            .toFile(path.join(dir, 'ic_launcher.png'));

        // Round Icon (Circle Mask)
        const roundBuffer = await sharp(svgBuffer)
            .resize(size, size)
            .composite([{
                input: Buffer.from(`<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`),
                blend: 'dest-in'
            }])
            .toFile(path.join(dir, 'ic_launcher_round.png'));

        console.log(`Generated ${name} (${size}x${size})`);
    }
}

generate().catch(err => console.error(err));
