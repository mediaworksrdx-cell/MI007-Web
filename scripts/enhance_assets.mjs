import sharp from 'sharp';
import path from 'path';

const dir = path.resolve(process.cwd(), 'public/images/cinematic');

async function enhance() {
  // Upscale bear_distribution with Lanczos3 and unsharp mask
  await sharp(path.join(dir, 'bear_distribution.webp'))
    .resize(1920, 1080, {
      kernel: sharp.kernel.lanczos3,
      fit: 'cover',
      position: 'center',
    })
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
    .jpeg({ quality: 95 })
    .toFile(path.join(dir, 'bear_distribution_hd.jpg'));
  console.log('Generated enhanced bear_distribution_hd.jpg');

  // Upscale global_core with Lanczos3 and unsharp mask
  await sharp(path.join(dir, 'global_core.webp'))
    .resize(1920, 1080, {
      kernel: sharp.kernel.lanczos3,
      fit: 'cover',
      position: 'center',
    })
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
    .jpeg({ quality: 95 })
    .toFile(path.join(dir, 'global_core_hd.jpg'));
  console.log('Generated enhanced global_core_hd.jpg');
}

enhance().catch(console.error);
