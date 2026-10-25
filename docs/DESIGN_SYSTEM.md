# DoseTracker design system

The app's visual source of truth. Read this before changing any screen.

## Where things live

| Concern | Location |
|---|---|
| Tokens: colors (light + dark), text styles, radii, spacing, motion | `theme.js` — the only token file. Tailwind and the runtime both read it. |
| Runtime theme (light/dark resolution, `Appearance` sync, root background) | `src/features/theme/ThemeContext.tsx` → `useTheme().colors` |
| Shared components | `src/features/ui/` |
| Reanimated easing curves and layout animations | `src/features/ui/motion.ts` |

## Architecture: which tool for what

- **Colors come from `useTheme().colors`**, applied with `style`. They change with light/dark mode, so they are never Tailwind color classes. Hex literals in screens are drift.
- **NativeWind classes are for layout and static sizing**: flex, gap, padding, text-style classes (`text-headline`, `text-footnote`, …) and radius classes (`rounded-card`, `rounded-sheet`).
- **Native controls before custom ones**: system `Alert` for confirmations (`confirmDestructive`), `Switch`, system date pickers. Later phases move menus, pickers and grouped settings to `@expo/ui`, and headers and sheets to native Expo Router options.
- **Liquid Glass** only on sheets and system bars (`GlassSheetSurface` / `Sheet`, iOS 26+, respects Reduce Transparency). Never on cards or list rows.

## Navigation

- Tabs: `NativeTabs` in `src/features/navigation/AppTabs.tsx` (web: `AppTabs.web.tsx`). The tab bar stays visible while drilling down inside a tab; never hide it per route.
- Every tab owns a native Stack configured with `useStackScreenOptions()`. Screen titles come from the stack (`options.title`, or `<Stack.Screen options={{ title }} />` for dynamic titles), never from in-content text. Header actions go in `headerRight` as `IconButton`s tinted `accentText`.
- A screen's first child is its `ScrollView`/`FlatList` with `contentInsetAdjustmentBehavior="automatic"`; don't wrap tab screens in a top `SafeAreaView`. If a wrapper `View` is needed, give it `collapsable={false}`.
- Separate tasks (Add/Edit Medicine) are root `presentation: 'modal'` routes; guard drafts with `usePreventRemove`.
- Bottom overlays (snackbars, toasts) go inside `BottomOverlay` so they clear the tab bar.

## Color roles

Use roles, not hues. Every text role meets 4.5:1 on `background`, `surface` and its own `*Soft` fill; non-text fills meet 3:1.

| Role | Use |
|---|---|
| `background` / `surface` / `surfaceSecondary` / `surfaceElevated` | Screen, cards, inset areas, sheets |
| `fill` | Secondary buttons, switch-off tracks, ring track |
| `label` / `secondaryLabel` / `tertiaryLabel` | Primary text, supporting text, placeholders and chevrons |
| `separator` | Hairlines and dark-mode card edges |
| `primary` + `onPrimary` | The one main action per area (navy in light, teal with dark ink in dark) |
| `accent` | Non-text teal: ring, switch-on, icons |
| `accentText` / `accentSoft` | Teal text and links; tinted button and badge fill |
| `success*`, `warning*`, `danger*`, `info*` | Status: Taken, Skipped/Paused, Low stock/Delete, Tags. `*Text` for text, `*Soft` for fills |
| `inverseSurface` / `inverseLabel` / `inverseAccent` | Snackbars and toasts |

Medicine colors (`src/features/medicines/colors.ts`) are user data and stay as chosen. Show them only as filled avatars with a white glyph.

## Text styles

`AppText variant=…` or the matching class: `largeTitle 34/41`, `title1 28/34`, `title2 22/28`, `title3 20/25`, `headline 17/22 semibold`, `body 17/22`, `callout 16/21`, `subhead 15/20`, `footnote 13/18`, `caption 12/16`, `caption2 11/13`. Never set `fontSize` directly, and don't add letter-spacing: SF applies its own tracking. Use `fontVariant: ['tabular-nums']` for counts and times, and `selectable` on data people may copy.

## Components

| Component | Contract |
|---|---|
| `Button` | `variant`: primary, secondary, tinted, plain, destructive, destructiveSoft · `size`: sm, md, lg · `icon`, `loading`, `disabled`, `style` (layout only). Minimum 44pt/48dp. Title Case labels. |
| `IconButton` | Icon-only, 44pt/48dp target, `accessibilityLabel` required. |
| `Card` | Grouped surface: radius 20, continuous corners; soft shadow in light mode, hairline in dark. `padded={false}` for inset row groups. |
| `InlineMessage` | `tone`: info, warning, danger, success; optional title and action. Replaces ad-hoc colored boxes. |
| `Sheet` | The only bottom sheet: grabber, title, close, scrollable body. |
| `Icon` | Registry name → SF Symbol on iOS, vector icon elsewhere. Add new glyphs to the registry; SF names are type-checked. |
| `PressableScale` | Press feedback for custom tappables (scale 0.97 + dim, 120ms; dim only under Reduce Motion). |
| `confirmDestructive` | Native confirmation alert; destructive by default, `destructive: false` for reversible actions such as Archive. |

## Motion rules (from the expo-animation skill)

- Frequent actions (marking doses) animate for at most 150ms; tab switches never animate.
- Screen transitions use each platform's native default — don't override them.
- Animate `transform` and `opacity` only, on the UI thread (Reanimated); never `setState` per frame.
- Every animation uses `ReduceMotion.System` or `useReducedMotion()`.
- Haptics: success on Take, light on Skip/Snooze, selection on pickers, medium when a destructive action is confirmed. One haptic per action, always paired with a visual change.
