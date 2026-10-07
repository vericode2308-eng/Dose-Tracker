import { UserFacingError } from '@/features/security/errors';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 24_000_000;

export function validatePhotoSize(bytes: number) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_PHOTO_BYTES) {
    throw new UserFacingError('Choose an image smaller than 8 MB.');
  }
}

export function validatePhotoDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0
    || width > 8192 || height > 8192 || width * height > MAX_PHOTO_PIXELS) {
    throw new UserFacingError('Choose an image up to 24 megapixels and 8192 pixels per side.');
  }
}

/** Inspect bytes, not the filename/MIME label. The native/browser picker decodes the image. */
export function photoFormat(bytes: Uint8Array): { extension: string; mime: string } {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', mime: 'image/jpeg' };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return { extension: 'png', mime: 'image/png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return { extension: 'heic', mime: 'image/heic' };
    if (['avif', 'avis'].includes(brand)) return { extension: 'avif', mime: 'image/avif' };
  }
  throw new UserFacingError('Choose a JPEG, PNG, WebP, HEIC, or AVIF image.');
}
