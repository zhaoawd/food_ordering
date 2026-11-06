import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/commerce/theme';
import { ObservedPressable, ObservedText, ObservedView } from '@/verification/observation';

/** commerce-v1 订单页空态（orders.empty.v1）：文案与主操作按 D2，筛选 ID 按 D6；不显示购物袋。 */
const sourceRef = { file: 'app/(tabs)/orders.tsx', symbol: 'Orders' } as const;
const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'completed', label: '已完成' },
  { id: 'after_sale', label: '售后' },
] as const;

export default function Orders() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide} accessibilityLabel="返回">
          <Image source={require('@/assets/commerce/orders/unowned.iconbutton-1.svg')} style={styles.icon22} />
        </View>
        <ObservedText stableId="orders.title" observationRole="text" sourceRef={sourceRef} style={styles.title}>我的订单</ObservedText>
        <View style={styles.headerSide} />
      </View>
      <View style={styles.content}>
        <View style={styles.filters}>
          {FILTERS.map((filter, index) => (
            <ObservedPressable key={filter.id} stableId={`orders.filter.${filter.id}`} observationRole="button" sourceRef={sourceRef}
              accessibilityState={{ selected: index === 0 }} style={[styles.filter, index === 0 ? styles.filterSelected : null]}>
              <Text style={[styles.filterLabel, index === 0 ? styles.filterLabelSelected : null]}>{filter.label}</Text>
            </ObservedPressable>
          ))}
        </View>
        <ObservedView stableId="orders.empty" observationRole="group" sourceRef={sourceRef} style={styles.empty}>
          <ObservedText stableId="orders.empty.title" observationRole="text" sourceRef={sourceRef} style={styles.emptyTitle}>还没有订单</ObservedText>
          <ObservedPressable stableId="orders.empty.primary_action" observationRole="button" sourceRef={sourceRef} style={styles.emptyAction}
            onPress={() => router.navigate('/menu' as never)}>
            <Text style={styles.emptyActionLabel}>去点餐</Text>
          </ObservedPressable>
        </ObservedView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon22: { width: 22, height: 22 },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28, color: colors.ink },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 16 },
  filters: { flexDirection: 'row', height: 44, padding: 4, gap: 4, marginBottom: 12, backgroundColor: colors.segmentBg, borderRadius: 11 },
  filter: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterSelected: { backgroundColor: colors.surface },
  filterLabel: { fontSize: 12, lineHeight: 16, color: colors.ink },
  filterLabelSelected: { fontWeight: '700' },
  empty: { paddingVertical: 24, paddingHorizontal: 16, gap: 16, alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.cardLine, borderWidth: 1, borderRadius: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700', lineHeight: 22, color: colors.ink },
  emptyAction: { height: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  emptyActionLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: colors.ink },
});
