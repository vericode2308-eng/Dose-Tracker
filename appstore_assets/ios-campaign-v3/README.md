# Dose Tracker App Store creative — v3

Created 25 October 2026 using the built-in image-generation tool and the existing iOS icon as reference. Earlier campaign assets are preserved.

- `header-3840x1646.png`: product-page Header artwork, resized from the generated source to exactly 3840 × 1646; opaque PNG. Visually reviewed for copy and composition. Check cropping in App Store Connect Preview before saving.
- `sources/header-original.png`: unchanged generated artwork (1916 × 821).
- `search-results-3840x2560.png`: matching Search Results artwork, exported at exactly 3840 × 2560; opaque RGB PNG. Visually reviewed for composition and exact copy. Generated at 1536 × 1024 and upscaled for delivery.
- `sources/search-original.png`: unchanged generated search artwork.
- `sources/search-prompt.txt`: exact search-image generation prompt, using the icon and completed header as references.

Promotional brand artwork, not a device screenshot. No upload or publication performed.

Specifications checked against [Apple creative asset specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications).

## Header creative brief

Built-in image generation with the existing iOS icon as reference: premium 21:9 App Store header; warm ivory and pale lavender backdrop, navy sans-serif typography, large dimensional pill-and-clock icon on right, translucent mint and lavender orbital ribbons, soft studio lighting. Exact text: “DOSE TRACKER”, “Your medicines. One clear place.”, “Schedules, stock and dose history.” No device UI, badges, ratings, medical promises or watermark. This records the creative brief; the initial exact prompt was not persisted successfully.

## Verification

Both delivery images have exact filenames' dimensions, RGB colour and no alpha channel, verified using sips. On continuation, Expo lint and TypeScript checks both failed on an unrelated mismatched JSX closing tag in `src/features/medicines/MedicinesListScreen.tsx:99`; this artwork task did not edit app source. These are upscaled generated artworks. App Store Connect upload and crop preview remain unverified.
