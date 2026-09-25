import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function choosePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: Platform.OS === 'web',
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    if (!asset.base64) throw new Error('Photo could not be read.');
    return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
  }
  return asset.uri;
}

export async function keepPhoto(uri: string | null): Promise<string | null> {
  if (!uri || Platform.OS === 'web') return uri;
  const { File, Paths } = await import('expo-file-system');
  if (uri.startsWith(Paths.document.uri)) return uri;
  const extension = uri.split('.').pop()?.split('?')[0];
  const safeExtension = extension && /^(jpg|jpeg|png|webp|heic)$/i.test(extension) ? extension : 'jpg';
  const destination = new File(Paths.document, `profile-${Date.now()}.${safeExtension}`);
  new File(uri).copy(destination);
  return destination.uri;
}
