# Onboarding verification

Implemented from the three images in `design/Onboarding/`:

- Welcome: family illustration, three feature rows, progress dots, primary CTA.
- Profile: name, avatar colors, optional local photo, birthday, notes, skip/continue.
- Notifications: bell illustration, feature rows, permission request, skip flow.
- A small completion screen supplies Step 3, for which no reference was provided.

## Checks performed

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed; root app scope excludes the unrelated `vericode/` project.
- Android production JavaScript/Hermes export: passed (not a native APK build).
- Web production export: passed.
- Eight model checks: leap dates, invalid dates, future dates, optional birthdays,
  initials, and saved-data shape validation.
- Browser interaction checks: Get started, missing-name validation, invalid-date
  validation, valid profile save, unsupported web notification message, skipping
  permission, completing setup, and restoring the profile after reload.

## Visual review

Captured and inspected running browser screenshots of Welcome, Profile, and
Notifications using the computer-use tool. Screenshots are visible in the task
conversation; no standalone screenshot files were exported.

The comparison caught a wrapped CTA arrow; replacing the Pressable callback style
with a static layout corrected it. A later comparison caught the right device-frame
edge in the reminder artwork; its clipping rectangle was tightened. Avatar colors
can wrap at narrow widths rather than extending beyond the screen.

These are close reconstructions, not verified pixel-identical renders. The source
does not identify its font family; native system typography and vector icons have
small visual differences. Inputs start empty rather than copying sample personal
data. The requested 20dp corners and extra privacy footer also differ deliberately
from the original image. System status/navigation bars are provided by the device,
not drawn into application content.

## Device verification still needed

Native photo picking, notification dialogs, keyboard/safe-area behavior, screen
readers, and large system fonts require an Android/iOS device or simulator run.
The onboarding stores data locally and uses bundled artwork. It does not implement
medicine scheduling or verify alarm delivery. Notification permission is never
presented as proof that an alarm has been scheduled. No backend requests, push-token
registration, account creation, or analytics were added.

The preview test profile is fictional and exists only in the browser's local
storage for `http://localhost:8082`.
