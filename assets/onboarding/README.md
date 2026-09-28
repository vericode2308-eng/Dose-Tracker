# Onboarding artwork

These are runtime artwork assets, not advertising screenshots.
`ReferenceArt` in `src/features/onboarding/ui.tsx` uses `family-illustration.png`
and clips `reminders-reference.png` to its bell illustration region at render
time. Text, forms, feature cards, and buttons are real React Native components,
not flattened screenshots. No remote assets load.

If standalone illustration exports become available, replace these source images
and simplify the clipping component. The unused full welcome screenshot was
removed because it contained the old app name treatment.
