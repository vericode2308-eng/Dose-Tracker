/** Build launcher, adaptive, splash, and web assets from the supplied logo. */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const source = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/brand/source.png')));
const out = path.join(root, 'assets/images');
// The supplied PNG includes a painted checkerboard, not real transparency.
// Its colored rounded square is 1767 × 1767, starting at (224, 105).
const crop = { x: 224, y: 105, size: 1767, radius: 350 };

function signedDistance(x, y) {
  const center = crop.size / 2;
  const inner = center - crop.radius;
  const qx = Math.abs(x - center) - inner;
  const qy = Math.abs(y - center) - inner;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - crop.radius;
}

function sample(x, y) {
  const sx = Math.max(0, Math.min(source.width - 1.001, crop.x + x));
  const sy = Math.max(0, Math.min(source.height - 1.001, crop.y + y));
  const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
  const result = [];
  for (let channel = 0; channel < 3; channel++) {
    const a = source.data[(y0 * source.width + x0) * 4 + channel];
    const b = source.data[(y0 * source.width + x0 + 1) * 4 + channel];
    const c = source.data[((y0 + 1) * source.width + x0) * 4 + channel];
    const d = source.data[((y0 + 1) * source.width + x0 + 1) * 4 + channel];
    result.push(Math.round((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy));
  }
  return result;
}

function nearestArtworkPoint(x, y) {
  if (signedDistance(x, y) < -3) return [x, y];
  const center = crop.size / 2;
  let low = 0, high = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2;
    if (signedDistance(center + (x - center) * mid, center + (y - center) * mid) < -3) low = mid;
    else high = mid;
  }
  return [center + (x - center) * low, center + (y - center) * low];
}

function render(size, kind) {
  const image = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const scale = kind === 'adaptive' ? 0.69 : 1;
    const cx = crop.size / 2 + ((x + 0.5) / size - 0.5) * crop.size / scale;
    const cy = crop.size / 2 + ((y + 0.5) / size - 0.5) * crop.size / scale;
    const dist = signedDistance(cx, cy);
    const inside = nearestArtworkPoint(cx, cy);
    const rgb = kind === 'icon' && dist > -18
      ? [145, 169, 237]
      : kind !== 'icon' && dist > 0.5 ? [0, 0, 0] : sample(...inside);
    const offset = (y * size + x) * 4;
    image.data[offset] = rgb[0]; image.data[offset + 1] = rgb[1]; image.data[offset + 2] = rgb[2];
    image.data[offset + 3] = kind === 'icon' ? 255 : Math.round(Math.max(0, Math.min(1, 0.5 - (dist + 14) * size / crop.size)) * 255);
  }
  return image;
}

const assets = [
  ['icon.png', 1024, 'icon'],
  ['brand-mark.png', 1024, 'mark'],
  ['android-icon-foreground.png', 512, 'adaptive'],
  ['splash-icon.png', 512, 'mark'],
  ['favicon.png', 64, 'mark'],
];
for (const [file, size, kind] of assets) {
  const destination = path.join(out, file);
  fs.writeFileSync(destination, PNG.sync.write(render(size, kind)));
  console.log(`${file}: ${size}×${size}`);
}
