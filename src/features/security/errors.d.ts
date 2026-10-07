export class UserFacingError extends Error {}
export function publicErrorMessage(error: unknown, fallback: string): string;
