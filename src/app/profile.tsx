import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboarding } from '@/features/onboarding/context';
import { AVATAR_COLORS, EMPTY_PROFILE, initials, validBirthday } from '@/features/onboarding/model';
import { choosePhoto, keepPhoto } from '@/features/onboarding/photos';
import { Button, ErrorMessage, Icon, Page, StepHeader, styles } from '@/features/onboarding/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const { data, save } = useOnboarding();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit' || data.completed;
  const [profile, setProfile] = useState(data.profile || EMPTY_PROFILE);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [moreColors, setMoreColors] = useState(false);
  const saving = useRef(false);
  const nameInput = useRef<TextInput>(null);
  const birthdayInput = useRef<TextInput>(null);
  const letters = initials(profile.name);
  async function proceed(skip = false) {
    if (saving.current || photoBusy) return;
    if (!skip && !profile.name.trim()) { setError('Enter a name to create your profile.'); nameInput.current?.focus(); return; }
    if (!skip && !validBirthday(profile.dateOfBirth)) { setError('Enter a valid past date as YYYY-MM-DD, or leave it blank.'); birthdayInput.current?.focus(); return; }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const photoUri = skip ? null : await keepPhoto(profile.photoUri);
      await save({ profile: skip ? null : { ...profile, name: profile.name.trim(), dateOfBirth: profile.dateOfBirth.trim(), photoUri } });
      if (editing) router.replace('/settings');
      else router.push('/notifications');
    } catch { setError('Your profile couldn’t be saved on this device. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function pickPhoto() {
    if (photoBusy || busy) return;
    setPhotoBusy(true);
    setError('');
    try {
      const photoUri = await choosePhoto();
      if (photoUri) setProfile((p) => ({ ...p, photoUri }));
    } catch { setError('The photo couldn’t be opened. Try another image or continue without a photo.'); }
    finally { setPhotoBusy(false); }
  }
  return <Page>
    {!editing && <StepHeader step={1} />}
    <View style={{ paddingHorizontal: 6, marginBottom: 16 }}>
      <Text accessibilityRole="header" style={styles.title}>{editing ? 'Edit profile' : 'Create your first profile'}</Text>
      <Text style={styles.subtitle}>{editing ? 'Update your profile details saved on this device.' : 'Let’s set up a profile. You can add more family members later.'}</Text>
    </View>
    <View style={[styles.card, { padding: 14, gap: 14 }]}>
      <View>
        <Text style={s.label}>Name</Text>
        <TextInput ref={nameInput} accessibilityLabel="Name" style={s.input} placeholder="Your name" placeholderTextColor="#8993A0" value={profile.name} maxLength={80} autoCapitalize="words" autoComplete="name" returnKeyType="next" onChangeText={(name) => setProfile({ ...profile, name })} onSubmitEditing={() => birthdayInput.current?.focus()} />
      </View>
      <View>
        <Text style={s.label}>Avatar color</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
          {AVATAR_COLORS.slice(0, 5).map((color, i) => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`${['Teal', 'Coral', 'Blue', 'Amber', 'Purple'][i]} avatar`} accessibilityState={{ checked: profile.color === color }} onPress={() => setProfile({ ...profile, color })}
            style={[s.colorRing, { borderColor: profile.color === color ? color : 'transparent' }]}>
            <View style={[s.swatch, { backgroundColor: color }]}><Text style={s.initials}>{letters}</Text></View>
          </Pressable>)}
          <Pressable accessibilityRole="button" accessibilityLabel="More avatar colors" accessibilityState={{ expanded: moreColors }} onPress={() => setMoreColors(!moreColors)} style={[s.colorRing, { backgroundColor: '#F0F1F3' }]}><Icon name={moreColors ? 'minus' : 'plus'} /></Pressable>
        </View>
        {moreColors && <View className="flex-row" style={{ gap: 12, marginTop: 12 }}>{['#64748B', '#C16893', '#44846D'].map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`Avatar color ${color}`} accessibilityState={{ checked: color === profile.color }} onPress={() => setProfile({ ...profile, color })} style={[s.colorRing, { backgroundColor: color }]}><Icon name={color === profile.color ? 'check' : 'user'} color="white" /></Pressable>)}</View>}
      </View>
      <View>
        <Text style={s.label}>Photo (optional)</Text>
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <View style={[s.avatar, { backgroundColor: profile.color }]}>{profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={s.avatar} accessibilityLabel="Selected profile photo" /> : <Text style={{ fontSize: 25, color: 'white', fontWeight: '600' }}>{letters}</Text>}</View>
          <View className="flex-1" style={{ gap: 6 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: photoBusy || busy }} disabled={photoBusy || busy} onPress={pickPhoto} style={s.photoButton}><Icon name="camera" size={20} /><Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A' }}>{photoBusy ? 'Opening…' : profile.photoUri ? 'Change photo' : 'Add photo'}</Text></Pressable>
            <Text style={s.helper}>A photo makes it easier to tell profiles apart.</Text>
          </View>
        </View>
      </View>
      <View>
        <Text style={s.label}>Date of birth (optional)</Text>
        <View style={s.dateRow}>
          <TextInput ref={birthdayInput} accessibilityLabel="Date of birth, YYYY-MM-DD" placeholder="YYYY-MM-DD" placeholderTextColor="#8993A0" value={profile.dateOfBirth} maxLength={10} keyboardType="numbers-and-punctuation" style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]} onChangeText={(dateOfBirth) => setProfile({ ...profile, dateOfBirth })} />
          <Pressable accessibilityRole="button" accessibilityLabel="Enter date of birth" onPress={() => birthdayInput.current?.focus()} style={{ padding: 12 }}><Icon name="calendar" size={22} /></Pressable>
        </View>
      </View>
      <View>
        <Text style={s.label}>Notes (optional)</Text>
        <TextInput accessibilityLabel="Notes, optional" multiline maxLength={200} textAlignVertical="top" style={[s.input, { minHeight: 76, paddingTop: 10, fontSize: 16 }]} placeholder={'e.g. allergies, medical conditions,\nor other useful notes…'} placeholderTextColor="#8993A0" value={profile.notes} onChangeText={(notes) => setProfile({ ...profile, notes })} />
        <Text style={[s.helper, { textAlign: 'right', marginTop: 4 }]}>{profile.notes.length}/200</Text>
      </View>
      <View style={s.callout}>
        <View style={s.pillCircle}><Icon name="package" color="#168CF4" size={27} /></View>
        <View className="flex-1"><Text style={[s.label, { marginBottom: 3 }]}>Add first medicine later</Text><Text style={s.helper}>You can set up medicines after creating the profile.</Text></View>
      </View>
    </View>
    <ErrorMessage message={error} />
    <View style={styles.footer}>
      <Button title={editing ? 'Save changes' : 'Continue'} busy={busy || photoBusy} onPress={() => void proceed()} />
      {!editing && <Button title="Not now" secondary busy={busy || photoBusy} onPress={() => void proceed(true)} />}
    </View>
  </Page>;
}

const s = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 7 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, fontSize: 18, color: '#0F172A', backgroundColor: '#FFFFFF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12 },
  colorRing: { width: 46, height: 46, borderRadius: 999, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  swatch: { width: 39, height: 39, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  avatar: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  photoButton: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB' },
  helper: { fontSize: 14, lineHeight: 19, color: '#64748B' },
  callout: { padding: 10, backgroundColor: '#EBF5FF', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillCircle: { width: 48, height: 48, borderRadius: 999, backgroundColor: '#DDEEFF', justifyContent: 'center', alignItems: 'center' },
});
