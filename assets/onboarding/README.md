# Onboarding artwork

These bundled images are copies of the user-supplied onboarding references.
`ReferenceArt` in `src/features/onboarding/ui.tsx` clips to the family and bell
illustration regions at render time. Text, forms, feature cards, and buttons are
real React Native components, not flattened screenshots. No remote assets load.

If standalone illustration exports become available, replace these source images
and simplify the clipping component. The originals are intentionally retained
without generative changes to preserve the supplied artwork.
