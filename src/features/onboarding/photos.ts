import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { photoFormat, validatePhotoDimensions, validatePhotoSize } from './photoValidation';

async function inspectNativePhoto(uri: string) {
  const { File } = await import('expo-file-system');
  const file = new File(uri);
  validatePhotoSize(file.size);
  const handle = file.open();
  try { return { file, format: photoFormat(handle.readBytes(32)) }; }
  finally { handle.close(); }
}

export async function choosePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('Photo could not be read.');
  validatePhotoDimensions(asset.width, asset.height);
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('Photo could not be read.');
    validatePhotoSize(asset.file.size);
    const format = photoFormat(new Uint8Array(await asset.file.slice(0, 32).arrayBuffer()));
    // Read only after the actual File size/header have been checked.
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Photo could not be read.'));
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Photo could not be read.'));
      reader.readAsDataURL(asset.file!.slice(0, asset.file!.size, format.mime));
    });
  }
  await inspectNativePhoto(asset.uri);
  return asset.uri;
}

export async function keepPhoto(uri: string | null): Promise<string | null> {
  if (!uri || Platform.OS === 'web') return uri;
  const { File, Paths } = await import('expo-file-system');
  const { file, format } = await inspectNativePhoto(uri);
  if (uri.startsWith(Paths.document.uri)) return uri;
  const destination = new File(Paths.document, `profile-${randomUUID()}.${format.extension}`);
  file.copy(destination);
  return destination.uri;
}
