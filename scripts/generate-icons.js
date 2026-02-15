
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// USER PROVIDED PNG (Latest found in artifacts)
const sourceIconPath = 'C:/Users/roger/.gemini/antigravity/brain/56bb97af-d726-40f0-ac6c-e26b65848d1c/media__1771196315756.png';

if (!fs.existsSync(sourceIconPath)) {
    console.error(`Error: Source icon not found at ${sourceIconPath}`);
    process.exit(1);
}

// Standard sizes
const sizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generate() {
    console.log(`Generating icons from: ${sourceIconPath}`);

    for (const { name, size } of sizes) {
        const dir = path.join(__dirname, '../android/app/src/main/res', name);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Square(ish) Icon
        await sharp(sourceIconPath)
            .resize(size, size)
            .toFile(path.join(dir, 'ic_launcher.png'));

        // Round Icon (Circle Mask)
        await sharp(sourceIconPath)
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
