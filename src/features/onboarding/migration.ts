import { initializeProfiles } from '@/database';
import { onboardingFlags, readOnboarding, writeOnboarding } from './storage';

export async function loadOnboarding() {
  const stored = await readOnboarding();
  // Keep the only legacy copy until the SQLite transaction has committed.
  // initializeProfiles is idempotent, so interrupted cleanup can safely retry.
  await initializeProfiles(stored.profile);
  const clean = onboardingFlags(stored);
  await writeOnboarding(clean);
  return clean;
}
