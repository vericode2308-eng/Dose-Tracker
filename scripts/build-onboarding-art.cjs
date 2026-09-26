/** Remove the checkerboard baked into the supplied onboarding illustration. */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const input = PNG.sync.read(fs.readFileSync(path.join(root, 'design/onboaarding image.png')));
const { width, height, data } = input;
const count = width * height;
const background = new Uint8Array(count);
const queue = new Int32Array(count);
let head = 0;
let tail = 0;

function neutral(index) {
  const offset = index * 4;
  const r = data[offset], g = data[offset + 1], b = data[offset + 2];
  return Math.min(r, g, b) > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 12;
}
function add(index) {
  if (index < 0 || index >= count || background[index] || !neutral(index)) return;
  background[index] = 1;
  queue[tail++] = index;
}

for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
while (head < tail) {
  const index = queue[head++];
  const x = index % width;
  if (x) add(index - 1);
  if (x + 1 < width) add(index + 1);
  if (index >= width) add(index - width);
  if (index < count - width) add(index + width);
}
for (let index = 0; index < count; index++) {
  if (background[index]) data[index * 4 + 3] = 0;
}

const destination = path.join(root, 'assets/onboarding/family-illustration.png');
fs.writeFileSync(destination, PNG.sync.write(input));
console.log(`${destination}: ${width}×${height}, ${tail} background pixels removed`);
