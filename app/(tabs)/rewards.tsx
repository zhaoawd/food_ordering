import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/commerce/theme';


/** commerce-v1 优惠页占位：A01 只要求底部导航可达，页面内容由后续批次交付。 */
export default function Rewards() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Text style={styles.title}>优惠</Text>
      <View style={styles.card}><Text style={styles.body}>优惠中心将在后续批次交付</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28, color: colors.ink, marginTop: 18, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14 },
  body: { fontSize: 13, color: colors.muted },
});
