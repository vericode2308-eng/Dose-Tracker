# Corrections log

Record user-requested corrections here with the request date, affected screen, implementation status, and verification. Implemented in source does not mean released or verified on a device.

## 2026-09-29 — 001: Make medicine strength optional

- **Request:** Strength must not be compulsory on the Add Medicine page.
- **Previous behavior:** Next rejected blank strength with “Enter a medicine name and a valid strength.” The supplied screenshots show this old behavior, as confirmed by the user.
- **Correction:** Label the field “Strength (optional)”; allow blank or whitespace-only strength; retain positive-number validation when a value is entered. Save omitted strength without a unit-only value, and show “Not specified” on Review.
- **Files:** `src/features/medicines/AddMedicineScreen.tsx`, `src/features/medicines/MedicineDetailsForm.tsx`.
- **Status:** Implemented in source.
- **Verification:** Expo lint and TypeScript checks passed; all 52 existing tests passed. Updated device UI has not been tested; release/install status is not verified.

## 2026-09-29 — 002: Sharpen the opening logo

- **Request:** The logo shown when opening the app is blurry; upscale it.
- **Previous asset:** Native splash screen used a 512 × 512 PNG.
- **Correction:** Added a 1254 × 1254 PNG with transparency and sharper artwork, based on the existing brand mark. Updated the splash plugin to use it while retaining the 160-point display width. Kept the original asset. The separate filename prevents the existing brand asset script from overwriting the enhanced image.
- **Files:** `assets/images/splash-icon-upscaled.png`, `app.json`.
- **Method:** Built-in image generation, editing `assets/images/brand-mark.png`.
- **Prompt:** “Upscale this existing DoseTracker logo to a crisp 2048 by 2048 PNG for a mobile app launch splash screen. This is a faithful restoration, NOT a redesign. Preserve exact composition, proportions, rounded square silhouette, blue/lavender gradient, white circular clock face and its dot positions, diagonal turquoise capsule, liquid detail, white check mark, highlights and shadows. Improve edge sharpness and remove raster softness. No new elements, no text, no extra border or padding. True transparent pixels outside the rounded square corners. Return a saved local output file.” The tool returned 1254 × 1254 pixels, verified from the saved file.
- **Status:** Implemented in source; Android resources regenerated using Expo prebuild. A rebuilt app must be installed to see the change; installation and device visual verification remain pending.
- **Verification:** PNG dimensions and alpha verified; generated Android xxxhdpi splash resource visually inspected. Expo lint and TypeScript checks passed. Expo Doctor passed 20/21 checks; its remaining warning reports six existing Expo package patch-version mismatches (`@expo/ui`, `expo`, `expo-constants`, `expo-document-picker`, `expo-router`, `expo-task-manager`). Dependencies were not changed for this asset correction.
- **Reference:** [Expo 57 splash-screen documentation](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/). Verify final appearance in a preview or release build.
