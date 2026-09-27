# DoseTracker App — Remediation Issues & Resolution Log

This document tracks all identified UX, Android, and functional issues, their status, root cause analysis, and the concrete technical actions taken to resolve them.

---

## Issue Registry

| Issue ID | Severity | Status | Component / Screen | Description |
| :--- | :---: | :---: | :--- | :--- |
| **P0-1** | 🔴 P0 (Blocker) | **RESOLVED** | `AddMedicineScreen.tsx` | Bottom action buttons ("Back" and "Save Medicine") pushed below the viewport into the Android gesture navigation pill on Step 4 (Review and save). |
| **P0-2** | 🔴 P0 (Blocker) | Pending | `(tabs)/_layout.tsx`, `SettingsHomeScreen.tsx` | Dark theme only changes local Settings styling; Tab bar and Today/History/Medicines remain bright white. Hardcoded checkmark next to System theme. |
| **P0-3** | 🔴 P0 (Blocker) | Pending | `AddMedicineScreen.tsx` | Android hardware/gesture back press abruptly exits the wizard, discarding entered schedules and medicine details. |
| **P1-1** | 🟡 P1 (High) | Pending | `welcome.tsx`, `notifications.tsx` | Hero illustrations push primary action CTAs ("Get started") and advisory footers below the fold on modern aspect ratios. |
| **P1-2** | 🟡 P1 (High) | Pending | `profile.tsx`, `AddMedicineScreen.tsx` | Manual text entry required for dates and times without native Android pickers. |
| **P1-3** | 🟡 P1 (High) | Pending | `AddMedicineScreen.tsx` | Optional stock step switch defaults to active with empty fields, causing contradictory validation error when tapping Next. |
| **P1-4** | 🟡 P1 (High) | Pending | `notificationManager.js` | Android notifications lack interactive action buttons (`[Take Now]`, `[Snooze 15m]`, `[Skip]`). |
| **P1-5** | 🟡 P1 (High) | Pending | `SettingsHomeScreen.tsx` | Status toast message ("Test reminder scheduled...") lacks auto-dismiss timeout and permanently blocks screen area. |
| **P2-1** | 🔵 P2 (Polish) | Pending | Global Actions | No tactile/haptic feedback on taking doses, saving medicines, or deleting entries. |
| **P2-2** | 🔵 P2 (Polish) | Pending | `TodayHomeScreen.tsx` | Circular adherence progress ring and completed dose cards jump instantly without smooth interpolation or layout transitions. |
| **P2-3** | 🔵 P2 (Polish) | Pending | `TodayHomeScreen.tsx`, `HistoryScreen.tsx` | Completed doses cannot be tapped to "Undo" or edited to fix accidental taps. |
| **P2-4** | 🔵 P2 (Polish) | Pending | `profile.tsx` | Profile initials logic generates hardcoded fallback `'ME'` for multi-word names instead of splitting words. |

---

## Detailed Issue Logs & Actions Taken

### 🔴 P0-1: Catastrophic Button Viewport Overflow in Add Medicine Review Step
* **Identified**: 2026-09-27 during Senior Android emulator audit on Pixel 9 (API 35).
* **Severity**: P0 (Release Blocker)
* **File Modified**: [`src/features/medicines/AddMedicineScreen.tsx`](file:///Users/shome/Documents/Projects/DoseTrackerApp/src/features/medicines/AddMedicineScreen.tsx)
* **Root Cause**:
  1. The parent container `<SafeAreaView>` and `<KeyboardAvoidingView>` used Tailwind `className="flex-1"`, which does not reliably pass flexbox height constraints through third-party wrapped components on Android without `cssInterop`.
  2. The inner `<ScrollView>` lacked explicit `style={{ flex: 1 }}`, causing it to measure as the full height of the tall review card (~500dp+) instead of flexing within the viewport.
  3. The bottom button footer was placed inside the flex measurement flow without fixed height boundaries, pushing the "Back" and "Save Medicine" buttons ~150px off-screen directly into the Android gesture navigation area.
* **Resolution Action**:
  1. Added explicit `style={{ flex: 1, backgroundColor: '#FBF8F3' }}` to `SafeAreaView`, `KeyboardAvoidingView`, and `ScrollView`.
  2. Extracted and pinned the bottom button container with explicit top border (`borderTopWidth: 1, borderTopColor: '#E8EAF0'`) and safe vertical padding.
  3. Added `contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}` to ensure scrollable content has proper clearance above the pinned footer.
* **Verification**:
  - Tested on Pixel 9 emulator (1080x2424, API 35).
  - Verified across all 4 steps of the wizard (Details, Schedule, Stock, Review).
  - Confirmed "Back" and "Save Medicine ✓" buttons are 100% visible, fully interactive, and comfortably clear of the Android navigation bar.
  - Successfully committed a new medicine ("Metformin 500 mg Capsule") and verified clean transition to the active medicines list.
  - All 34 automated unit tests pass.
