import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LocalProfile } from '@/database';
import { initials } from '@/features/onboarding/model';
import { useProfiles } from './context';

function Avatar({ profile, size = 52 }: { profile: LocalProfile | null; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: profile?.color || '#08B8BE' }} className="shrink-0 items-center justify-center overflow-hidden">{profile?.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: size, height: size }} /> : <Text className="font-semibold text-white" style={{ fontSize: size * 0.36 }}>{initials(profile?.name || 'Me')}</Text>}</View>;
}
export function ProfileSwitcherTrigger({ showOtherProfiles = false }: { showOtherProfiles?: boolean }) {
  const { currentProfile, profiles, showSwitcher, select } = useProfiles();
  const { fontScale } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selecting = useRef(false);
  const others = showOtherProfiles ? profiles.filter(p => p.id !== currentProfile?.id && p.status === 'Active') : [];
  async function choose(id: string) {
    if (selecting.current) return;
    selecting.current = true; setBusy(true); setError('');
    try { await select(id); }
    catch { setError('Could not switch profiles. Tap the profile to retry.'); }
    finally { selecting.current = false; setBusy(false); }
  }
  return <View className="mb-2">
    <View testID="profile-header" className="min-h-[52px] flex-row items-center gap-2">
      <Pressable accessibilityRole="button" accessibilityLabel={`Switch profile, ${currentProfile?.name || 'Me'}`} accessibilityHint="Opens all profiles and profile management" accessibilityState={{ disabled: busy }} disabled={busy} onPress={showSwitcher}
        className="min-h-[48px] min-w-0 flex-row items-center gap-2" style={{ maxWidth: others.length ? '46%' : '100%', flexShrink: 0 }}>
        <Avatar profile={currentProfile} size={42} />
        <Text numberOfLines={1} ellipsizeMode="tail" className="min-w-0 shrink text-[16px] font-semibold text-[#102238]">{currentProfile?.name || 'Me'}</Text>
        <Feather name="chevron-down" size={18} color="#102238" />
      </Pressable>
      {others.length > 0 && <ScrollView key={currentProfile?.id} horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Other profiles" className="min-w-0 flex-1" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
        {others.map(profile => <Pressable key={profile.id} accessibilityRole="button" accessibilityLabel={`${profile.name}, ${profile.overdueCount} overdue ${profile.overdueCount === 1 ? 'dose' : 'doses'}, switch profile`} accessibilityHint="Opens this person's Today dashboard" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void choose(profile.id)}
          className="min-h-[44px] flex-row items-center gap-1 rounded-full bg-[#F4F1ED] px-1.5 py-1.5" style={{ width: 104 * Math.max(1, fontScale), flexShrink: 0 }}>
          <View className="h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: `${profile.color}26` }}>
            {profile.photoUri ? <Image source={{ uri: profile.photoUri }} className="h-6 w-6" /> : <Ionicons name="person" size={19} color={profile.color} />}
          </View>
          <View className="min-w-0 flex-1"><Text numberOfLines={1} ellipsizeMode="tail" className="text-[13px] font-semibold text-[#102238]">{profile.name}</Text><Text numberOfLines={1} className="text-[11px] font-medium" style={{ color: profile.overdueCount > 0 ? '#C92A2A' : '#64748B' }}>{profile.overdueCount > 0 ? `${profile.overdueCount > 99 ? '99+' : profile.overdueCount} overdue` : 'No overdue'}</Text></View>
        </Pressable>)}
      </ScrollView>}
    </View>
    {!!error && <Text accessibilityRole="alert" className="mt-1 text-sm text-red-700">{error}</Text>}
  </View>;
}
export function ProfileSwitcher() {
  const { profiles, currentProfile, visible, hideSwitcher, select } = useProfiles();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.2;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selecting = useRef(false);
  const close = () => { if (!selecting.current) { setError(''); hideSwitcher(); } };
  const edit = (id: string) => { close(); router.push({ pathname: '/profile', params: { mode: 'edit', id } }); };
  const choose = async (id: string) => {
    if (selecting.current) return;
    selecting.current = true; setBusy(true); setError('');
    try { await select(id); } catch { setError('Could not switch profiles. Please try again.'); }
    finally { selecting.current = false; setBusy(false); }
  };
  const ordered = [...profiles].sort((a, b) => Number(b.id === currentProfile?.id) - Number(a.id === currentProfile?.id));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View className="flex-1 justify-end bg-black/45">
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss profile switcher" onPress={close} className="absolute inset-0" />
      <View accessibilityViewIsModal className="max-h-[85%] w-full max-w-[440px] self-center overflow-hidden rounded-t-[30px] bg-white" style={{ paddingBottom: insets.bottom }}>
        <View className="mb-2 mt-3 h-1 w-12 self-center rounded-full bg-[#CBD1D9]" />
        <View className="flex-row items-center gap-3 px-6 pb-3 pt-1"><Text accessibilityRole="header" className="min-w-0 flex-1 text-[26px] font-bold text-[#102238]">Switch Profile</Text><Pressable accessibilityRole="button" accessibilityLabel="Close profile switcher" disabled={busy} onPress={close} className="h-11 w-11 items-center justify-center"><Feather name="x" size={22} color="#536073" /></Pressable></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {ordered.map(profile => { const current = profile.id === currentProfile?.id; const archived = profile.status === 'Archived'; return <View key={profile.id} className="mb-2 flex-row items-center rounded-[20px]" style={{ backgroundColor: current ? '#EAF3FF' : '#FFFFFF' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={archived ? `Manage archived profile ${profile.name}` : `Switch to ${profile.name}`} accessibilityState={{ selected: current, disabled: busy }} disabled={busy} onPress={() => archived ? edit(profile.id) : void choose(profile.id)} className="min-w-0 flex-1 flex-row items-center gap-3 py-4 pl-4 pr-2">
              <Avatar profile={profile} /><View className="min-w-0 flex-1"><Text className="text-[19px] font-semibold text-[#102238]">{profile.name}</Text><Text className="mt-1 text-[14px]" style={{ color: current ? '#386791' : '#6A7789' }}>{current ? 'Current profile' : profile.relationship || 'Family member'}</Text>{compact && !current && (archived || profile.overdueCount > 0) && <View className="shrink-0 self-start rounded-full px-2 py-1" style={{ backgroundColor: archived ? '#F0F2F5' : '#FFE8E5' }}><Text className="text-[13px] font-medium" style={{ color: archived ? '#77818F' : '#D85752' }}>{archived ? 'Archived' : `${profile.overdueCount} overdue`}</Text></View>}</View>{!compact && !current && (archived || profile.overdueCount > 0) && <View className="shrink-0 self-start rounded-full px-2 py-1" style={{ backgroundColor: archived ? '#F0F2F5' : '#FFE8E5' }}><Text className="text-[13px] font-medium" style={{ color: archived ? '#77818F' : '#D85752' }}>{archived ? 'Archived' : `${profile.overdueCount} overdue`}</Text></View>}
              {current && <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#102238]"><Feather name="check" size={18} color="white" /></View>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${profile.name}`} disabled={busy} onPress={() => edit(profile.id)} className="h-11 w-11 shrink-0 items-center justify-center"><Feather name="edit-2" size={16} color="#6A7789" /></Pressable>
          </View>; })}
          {!!error && <Text accessibilityRole="alert" className="mb-3 text-sm text-red-700">{error}</Text>}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { close(); router.push('/profile?mode=create'); }} className="mx-5 mb-5 min-h-[56px] flex-row items-center justify-center gap-3 rounded-full bg-[#102238]"><Feather name="plus" size={22} color="white" /><Text className="text-[18px] font-semibold text-white">Add Profile</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
