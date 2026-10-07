/** Only explicitly authored validation messages may cross the UI boundary. */
export class UserFacingError extends Error {}

export function publicErrorMessage(error, fallback) {
  return error instanceof UserFacingError ? error.message : fallback;
}
