import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImgPath = 'C:/Users/daarv/.gemini/antigravity/brain/394e30c5-b000-4cf7-bc20-de4c23180a90/.user_uploaded/media_1790822057878.jpg';
const outputDir = path.resolve(process.cwd(), 'public/images/cinematic');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function processImage() {
  const image = sharp(sourceImgPath);
  const metadata = await image.metadata();
  console.log(`Source dimensions: ${metadata.width}x${metadata.height}`);

  const W = metadata.width;
  const H = metadata.height;

  // Top row is 50% height, split 50/50 width
  const topH = Math.round(H * 0.5);
  const bottomH = H - topH;
  const topHalfW = Math.round(W * 0.5);

  // Bottom row has 3 panels:
  // Panel 3 (Global Core): roughly ~36.3% width
  // Panel 4 (Avenue): roughly ~32.8% width
  // Panel 5 (Clash): roughly ~30.9% width
  const bW1 = Math.round(W * 0.363);
  const bW2 = Math.round(W * 0.328);
  const bW3 = W - bW1 - bW2;

  // 1. Full Master Moodboard
  await sharp(sourceImgPath)
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'moodboard_full.webp'));
  console.log('Saved moodboard_full.webp');

  // 2. Bull Expansion (Top Left)
  await sharp(sourceImgPath)
    .extract({ left: 0, top: 0, width: topHalfW, height: topH })
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'bull_expansion.webp'));
  console.log('Saved bull_expansion.webp');

  // 3. Bear Distribution (Top Right)
  await sharp(sourceImgPath)
    .extract({ left: topHalfW, top: 0, width: W - topHalfW, height: topH })
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'bear_distribution.webp'));
  console.log('Saved bear_distribution.webp');

  // 4. Global Core (Bottom Left)
  await sharp(sourceImgPath)
    .extract({ left: 0, top: topH, width: bW1, height: bottomH })
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'global_core.webp'));
  console.log('Saved global_core.webp');

  // 5. Candlestick Avenue / Highway (Bottom Center)
  await sharp(sourceImgPath)
    .extract({ left: bW1, top: topH, width: bW2, height: bottomH })
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'candlestick_avenue.webp'));
  console.log('Saved candlestick_avenue.webp');

  // 6. Clash of Titans (Bottom Right)
  await sharp(sourceImgPath)
    .extract({ left: bW1 + bW2, top: topH, width: bW3, height: bottomH })
    .webp({ quality: 92 })
    .toFile(path.join(outputDir, 'hero_clash.webp'));
  console.log('Saved hero_clash.webp');

  console.log('All 5 cinematic assets successfully extracted to public/images/cinematic/');
}

processImage().catch(console.error);
