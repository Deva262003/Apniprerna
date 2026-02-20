import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#tealGrad)"/>
  <g fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M64 20 L64 20 L100 32 L100 60 Q100 90 64 108 Q28 90 28 60 L28 32 Z"/>
    <polyline points="48,64 58,74 80,52"/>
  </g>
</svg>`;

const sizes = [16, 48, 128];
const iconsDir = join(__dirname, '..', 'icons');

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
}

generateIcons().catch(console.error);
