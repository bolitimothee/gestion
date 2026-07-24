/* global process */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const iconsDir = path.join(process.cwd(), 'public', 'icons');
const input = path.join(iconsDir, 'icon-512.png');

async function generate() {
  if (!fs.existsSync(input)) {
    console.error('Input icon not found:', input);
    process.exit(1);
  }

  try {
    // Create resized PNGs (16,32,48,64,128,256)
    const sizes = [16, 32, 48, 64, 128, 256];

    for (const size of sizes) {
      const outPng = path.join(path.dirname(input), `icon-${size}.png`);
      await sharp(input)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(outPng);
      console.log(`wrote ${outPng}`);
    }

    // We won't produce an ICO here (png-only favicons will be used).
    console.log('Resized PNG favicons generated (16/32/48/64/128/256).');
  } catch (err) {
    console.error('Failed to generate favicon.ico:', err);
    process.exit(1);
  }
}

generate();
