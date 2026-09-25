import { Platform } from 'react-native';
import { isSettings, type SettingsPreferences } from './storage';

const FORMAT = 'dosetracker-preferences-v1';
const MAX_BACKUP_BYTES = 1024 * 1024;

export async function exportPreferences(settings: SettingsPreferences): Promise<void> {
  const content = JSON.stringify({ format: FORMAT, settings }, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dosetracker-preferences.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'), import('expo-sharing'),
  ]);
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable.');
  const file = new File(Paths.cache, `dosetracker-preferences-${Date.now()}.json`);
  file.create();
  try {
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save DoseTracker preferences', UTI: 'public.json' });
  } finally {
    if (file.exists) file.delete();
  }
}

export async function importPreferences(): Promise<SettingsPreferences | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || (asset.size != null && asset.size > MAX_BACKUP_BYTES)) throw new Error('Backup file is too large.');

  let content: string;
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('Backup file could not be opened.');
    content = await asset.file.text();
  } else {
    const { File } = await import('expo-file-system');
    const file = new File(asset.uri);
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup file is too large.');
    content = await file.text();
  }
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup file.');
  const backup = parsed as { format?: unknown; settings?: unknown };
  if (backup.format !== FORMAT || !isSettings(backup.settings)) throw new Error('Invalid backup file.');
  return backup.settings;
}
