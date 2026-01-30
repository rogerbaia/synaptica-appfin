const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/logo-aurea-fixed.png');
const outputFile = path.join(__dirname, '../public/icon.ico');

console.log(`Reading ${inputFile}...`);
const file = fs.readFileSync(inputFile);

toIco([file], {
    resize: true,
    sizes: [256, 128, 64, 48, 32, 16] // Generate multi-size ICO for best Windows appearance
}).then(buf => {
    fs.writeFileSync(outputFile, buf);
    console.log('✅ ICO generated successfully: public/icon.ico');
}).catch(err => {
    console.error('❌ Error converting to ICO:', err);
    process.exit(1);
});
