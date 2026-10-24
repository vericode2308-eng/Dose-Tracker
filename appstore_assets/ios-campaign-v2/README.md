# Dose Tracker — iOS campaign v2

Created 23 October 2026 from `playstore_assets/android-promotional-v2/` and the existing `assets/images/icon-ios.png`, using the built-in image-generation tool. Original artwork is preserved.

## Upload map

| Folder / image | Export pixels | App Store Connect placement |
| --- | --- | --- |
| `header-and-search/01-universal-5244x2950.png` | 5244 × 2950 | Header **or** Search Results; universal alternative |
| `header-and-search/02-header-wide-3840x1646.png` | 3840 × 1646 | Header; ultrawide alternative |
| `header-and-search/03-search-results-3840x2560.png` | 3840 × 2560 | Search Results; 3:2 alternative |
| `screenshots-review/iphone-medium-1206x2622/` | 1206 × 2622 each | Medium Dynamic Island iPhone screenshot design set; review status below |
| `screenshots-review/iphone-large-1320x2868/` | 1320 × 2868 each | Large Dynamic Island iPhone screenshot design set; review status below |
| `icon/app-icon-1024x1024.png` | 1024 × 1024 | Existing opaque icon master; the app icon is delivered through the app build |

For the screen in the user's attachment, select **Header and Search Results → Header** and upload either the universal or ultrawide image, then inspect **Preview**. Select **Search Results** and use the dedicated search image or universal alternative. Upload one image per placement; these are alternatives, not a slideshow. Check cropping in App Store Connect Preview before saving.

The four screenshot designs tell a sequence: Today → Medicines → Stock → History. Upload in filename order once their screens match the shipping iOS build. Use each device-size folder only in its corresponding slot. Apple accepts 1–10 screenshots per size and scales supported sizes for other displays; creating every legacy size is unnecessary.

## Important screenshot status

The four phone-screen artworks are AI-rendered promotional adaptations of existing AI-rendered Android marketing images. They are **not captures of the shipping iOS app**. The iPhone hardware treatment does not prove that the depicted interface is accurate. They are kept in `screenshots-review` for this reason. Before screenshot submission, compare every label, control, calendar, status bar, and screen proportion with the iOS build, and preferably replace the screen interiors with actual iOS captures while preserving the marketing layout. Apple asks for images captured from the app UI. Exact pixel dimensions alone do not establish submission readiness.

The header/search artwork is brand creative without app UI, and can be used as creative artwork after checking App Store Connect's crop preview. No approval, featured placement, download growth or release is guaranteed by producing assets.

The icon is a copy of the project's existing opaque iOS master, not a newly generated replacement. This task does not modify the app configuration or binary.

## Scope of image types

- **Included:** product-page header, search-results creative, medium and large iPhone screenshot design sets, existing 1024px icon master, originals/prompts and a verification manifest.
- **iPad:** not included because the current submission pack specifies iPhone-only. If the uploaded binary supports iPadOS, a real iPad 13-inch screenshot is also required (2064 × 2752 or 2048 × 2732 portrait). Resizing a phone image into an iPad screenshot would misrepresent the layout.
- **iPhone Duo:** not currently required; Apple's published requirement starts April 2027 for apps using iOS 27.1 SDK or later. No Duo optimisation claim is made.
- **App preview:** optional video, not a still-image category. None generated; actual device footage is needed for a truthful preview.
- **In-App Events / in-app purchases:** separate conditional image categories, not generic launch requirements. No event or purchase is supplied in this request, so no fictional event/purchase images are created.
- **Mac / Apple Watch / Apple TV / Vision Pro:** no supported app targets established; no unrelated platform screenshots generated.

## Export and verification

All delivery PNGs must have exact listed dimensions, RGB colour and no alpha channel. AI generation dimensions can differ; final export normalises dimensions. These are rendered/upscaled artwork exports, not native-resolution device captures. Source outputs and exact prompts are retained under `sources/`. See `verification.json` for measured dimensions, colour mode, alpha status, sizes and hashes.

Repository checks: `npx expo lint` and `npx tsc --noEmit`. No app logic, dependency or native configuration changes are made by this asset task.

## Official specifications checked 23 October 2026

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Creative assets specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications)
- [Asset best practices and crop previews](https://developer.apple.com/app-store/asset-best-practices/)
- [Product-page guidance: actual UI screenshots and previews](https://developer.apple.com/app-store/product-page/)
- [Manage App Store assets](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets)
