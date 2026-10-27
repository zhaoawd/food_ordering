import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import { preferenceSummary, usePreferencesStore } from '@/store/preferences.store';

const sourceRef = { file: 'app/(tabs)/profile.tsx', symbol: 'Profile' } as const;

const Profile = () => {
  const committed = usePreferencesStore(state => state.committed);
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <View style={styles.header}>
      <ObservedPressable stableId="profile.back" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回首页" onPress={() => router.navigate('/')} style={styles.back}>
        <Text style={styles.backLabel}>返回首页</Text>
      </ObservedPressable>
    </View>
    <View style={styles.content}>
      <ObservedText stableId="profile.title" sourceRef={sourceRef} observationRole="text" style={styles.title}>我的</ObservedText>
      {/* 摘要不能放进 Pressable：iOS 把可点击区域合成一个无障碍元素，摘要就无法单独回读。 */}
      <View style={styles.entry}>
        <ObservedPressable stableId="profile.preferences" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="饮食偏好" onPress={() => router.push('/preferences')}>
          <Text style={styles.entryLabel}>饮食偏好</Text>
        </ObservedPressable>
        <ObservedText stableId="profile.preferences.summary" sourceRef={sourceRef} observationRole="text" style={styles.entrySummary}>{preferenceSummary(committed)}</ObservedText>
      </View>
    </View>
  </SafeAreaView>;
};

export default Profile;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8EF', paddingTop: 59, paddingBottom: 37 },
  header: { height: 64, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' },
  back: { height: 48, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  content: { paddingTop: 8, paddingHorizontal: 22, gap: 16 },
  title: { fontSize: 26, lineHeight: 36, fontWeight: '700', color: '#241713' },
  entry: { padding: 16, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16 },
  entryLabel: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: '#241713' },
  entrySummary: { fontSize: 15, lineHeight: 23, color: '#77655F' },
});
