import { Linking } from 'react-native';

export const PRIVACY_URL = 'https://vericodestudio.com/products/dose-tracker/privacy/';
export const TERMS_URL = 'https://vericodestudio.com/products/dose-tracker/terms/';

/** Opens a legal page in the system browser; never throws if no browser is available. */
export function openLegalUrl(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}
