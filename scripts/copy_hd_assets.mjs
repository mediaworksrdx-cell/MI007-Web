import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/daarv/.gemini/antigravity/brain/394e30c5-b000-4cf7-bc20-de4c23180a90';
const targetDir = path.resolve(process.cwd(), 'public/images/cinematic');

const mappings = [
  { src: 'hero_bull_clash_1790822575513.jpg', dest: 'hero_clash_hd.jpg' },
  { src: 'candlestick_highway_avenue_1790822611954.jpg', dest: 'candlestick_avenue_hd.jpg' },
  { src: 'bull_market_ascent_1790822641524.jpg', dest: 'bull_expansion_hd.jpg' },
];

for (const m of mappings) {
  const srcPath = path.join(artifactsDir, m.src);
  const destPath = path.join(targetDir, m.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${m.src} to ${m.dest}`);
  } else {
    console.warn(`Source ${srcPath} does not exist`);
  }
}
