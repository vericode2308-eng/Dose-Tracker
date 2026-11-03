# DoseTracker native UI/UX audit report

Date: 2026-11-03 · Branch `upgrade/sdk-58` · Commits `b7c0cda`, `e7a6d89` (plus earlier uncommitted work folded into `b7c0cda`)
Device: iPhone 18 Pro simulator, iOS 27, Metro dev client. **Android was not run in this audit.**

Status key: **FV** = fixed and verified (seen on the simulator after the change) · **FNV** = fixed but not visually verified · **UNR** = identified but unresolved.

## 1. Executive summary

The audit covered Today, History, Medicines (list, detail, Add/Edit sheet, Log Refill), Settings and all its sub-screens, Profile, and the first-run flow. Fifteen defects were fixed; two were serious.

- **First-run routing (serious).** A fresh install opened step 3 of onboarding instead of Welcome, skipping the profile and notification steps. Fixed (FV).
- **Forms could not scroll (serious, introduced earlier in this audit).** The full-screen tap-to-dismiss-keyboard wrapper blocked scrolling in the Add Profile, Add Medicine and onboarding forms, so the Save button could be unreachable. Found and fixed during the Settings pass (FV).
- The rest are layout, copy and wording defects: header overlap, switch alignment, tall dose cards, a misleading "Starts today", platform-wrong copy, a missing today marker.

All changes keep the existing look: colours, radii, type and tab bar are unchanged. 156 tests, `tsc` and lint pass. Nothing is pushed.

## 2. Root causes

| Cause | What it produced |
| --- | --- |
| A `Pressable` wrapped a `ScrollView` (`DismissKeyboard`). On iOS the Pressable claims the touch. | Forms stopped scrolling. |
| Expo Router SDK 58 has no `/` route while onboarding is incomplete and picked the last registered screen. | Cold start landed on step 3. |
| RN `KeyboardAvoidingView` measures overlap from layout position; a sheet's offset is applied by UIKit and is invisible to layout. | Next/Save hidden behind the keyboard. |
| Native `Switch` on iOS 26 sits at the top of its row; the row's own `alignItems` did not centre it. | Switches high beside two-line text. |
| A `beforeRemove` removed API and a save that did not lock after persisting. | Sheet stayed open; one medicine saved per tap. |
| The creation-cutoff rule (#011) hides doses before a schedule's creation minute, but the UI said "Starts today". | "Starts today" vs "No doses scheduled today". |
| Dev-only: dynamic `import('expo-file-system')` failed against a stale bundle, and it sat before the navigation call. | Erase left the user on an error. |

## 3. Native UI improvements

- Settings and History titles no longer overlap content; Medicines filter chips bleed to the screen edge (FV, seen in screenshots).
- Add Medicine sheet closes once after saving; Save is idempotent; Discard dialog works (FV).
- Shared keyboard helpers: footer lifts above the keyboard in sheets and onboarding; scrolling dismisses the keyboard; tapping the fixed header or any non-control in scroll content dismisses it (FV on Add Medicine, Add Profile, Log Refill).
- Today: pending dose card shortened from about 166pt to 139pt; touch targets stay 44pt (iOS) / 48dp (Android) (FV with one Upcoming dose).
- Today empty state says "Your next dose is tomorrow at 9:00 AM." and Add Medicine says "First dose tomorrow at …" when today's times have passed (FV).
- Switches centred on Sound & Vibration and App Lock (FV); same style applied to Settings home, Add Medicine and Medicine detail rows (Medicine detail seen centred; Add Medicine rows FNV).
- History calendar rings today and labels it for VoiceOver (FV).
- First-run: Welcome is the cold-start screen; profile name starts blank; Ready says "Your profile is saved"; notifications copy is iPhone-specific on iOS (FV).
- Erase all data always returns to Welcome once records are erased (FNV without the dev-bundle error).

## 4. Screen-by-screen QA (iOS Simulator)

| Screen | Result |
| --- | --- |
| Today (empty, upcoming, caught-up) | FV after fixes. "Due now" three-button card not re-viewed. |
| History (empty month, filters, calendar) | FV. Not seen with real records or filters applied. "Log a dose" jumps to Today. |
| Medicines list / detail | FV. |
| Log Refill sheet | FV: Save above the number pad. |
| Add Medicine (steps 1–2, discard) | FV. Steps 3–4 on device: wording only seen earlier. |
| Edit Medicine | Not viewed. |
| Settings home | FV. |
| Reminder status | Looked right. |
| Notification privacy | Looked right. |
| Sound & Vibration | FV after switch fix. |
| App Lock | FV after switch fix (enabling it was not exercised; needs biometrics). |
| Switch Profile sheet / Add Profile | FV; scrolls to the button. |
| Onboarding: Welcome, Profile, Notifications, Ready | FV. |

## 5. Cross-platform compatibility

- iOS: verified as above. Dev builds show a warning toast over the tab bar and bottom buttons (dev only).
- Android (the primary release target): **not run.** Android-specific code paths touched: `KeyboardAvoider` keeps the stock `KeyboardAvoidingView`; `keyboardScrollProps` uses `on-drag`; the notifications copy keeps the Android wording; `switchStyle` is platform-neutral. All of this needs a native Android pass, including edge-to-edge insets and predictive back.
- iPad, small iPhones (SE-class) and landscape: not checked.

## 6. Remaining issues

1. **UNR** Android build and device verification of every change here.
2. **UNR** Dynamic Type / large text: not tested; Today cards, switches and onboarding at the largest sizes are unknown.
3. **UNR** VoiceOver / TalkBack, haptics and animation review.
4. **UNR** Backing out of Add Profile discards typed input without asking (Add Medicine does ask).
5. **UNR** Form pages cut off at the safe-area edge above the home indicator instead of scrolling under it. Fixing it means reworking the keyboard-lift calculation.
6. **UNR** The first-run profile button sits at the end of a long scroll.
7. **UNR** The keyboard's drag-to-dismiss, Edit Medicine, History with real records, and App Lock enabling were not exercised.
8. **FNV** If erase cannot clear profile photos, orphaned photo files stay and the user is not told.
9. Still uncommitted: `app.json` (`versionCode` 3 → 4, not mine), `base/` (untracked, not mine), regenerated `graphify-out/`.
10. A further Today compaction (single Take action, Skip in a menu) was offered and not built.

## 7. Verification evidence

- `npx tsc --noEmit`: clean. `npx expo lint`: clean. `npm test`: 156 pass, 0 fail (new tests: first eligible occurrence, keyboard helpers incl. "no `DismissKeyboard` around a `ScrollView`", root layout anchor).
- iOS Simulator walkthroughs on iPhone 18 Pro, iOS 27, with before/after screenshots for: switch alignment, Today card height, form scrolling (reproduced the failure with two slow drags, then fixed), keyboard dismissal by header tap, Add Medicine sheet saving once, first-run flow from erased data to Today, and a second cold start landing on Today.
- Every user-requested or audit change is logged in `docs/CORRECTIONS_LOG.md` with its files and what was not verified.
- Test data: Erase all data cleared the simulator earlier; it now holds profile "Riya" and no medicines.
