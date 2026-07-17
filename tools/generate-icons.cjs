const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../public/viewy-logo.png');
const outDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [120, 152, 167, 180, 192, 512];

async function gen() {
  if (!fs.existsSync(src)) {
    console.error('Source logo not found:', src);
    process.exit(1);
  }

  for (const size of sizes) {
    const name = size >= 512 ? `icon-${size}.png` : `apple-touch-icon-${size}.png`;
    const out = path.join(outDir, name);
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(out);
    console.log('Wrote', out);
  }

  // create maskable copy (512)
  const maskableSrc = path.join(outDir, 'icon-512-maskable.png');
  await sharp(path.join(outDir, 'icon-512.png'))
    .png()
    .toFile(maskableSrc);
  console.log('Wrote', maskableSrc);

  // Copy top-level icon files for compatibility
  fs.copyFileSync(path.join(outDir, 'icon-192.png'), path.resolve(__dirname, '../public/icon-192.png'));
  fs.copyFileSync(path.join(outDir, 'icon-512.png'), path.resolve(__dirname, '../public/icon-512.png'));
  console.log('Copied top-level icon files');
}

gen().catch(err => {
  console.error(err);
  process.exit(1);
});
