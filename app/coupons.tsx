import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mixedText } from '@/components/MixedScriptText';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import { useCartStore } from '@/store/cart.store';
import {
  computeBill, couponLabel, couponStore, coupons, formatDiscount, isCouponAvailable, shortfallCents, useCouponStore,
  type CouponChoice,
} from '@/store/coupon.store';
import { formatYuan } from '@/store/dish.catalog';

const sourceRef = { file: 'app/coupons.tsx', symbol: 'Coupons' } as const;

const leave = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/cart');
};

export default function Coupons() {
  const items = useCartStore(state => state.items);
  const draft = useCouponStore(state => state.draft);
  const confirmRejected = useCouponStore(state => state.confirmRejected);
  useEffect(() => {
    couponStore.getState().beginEditing();
    return () => couponStore.getState().cancel();
  }, []);
  const bill = computeBill(items, draft);
  const available: CouponChoice[] = ['none', ...coupons.filter(c => isCouponAvailable(c.id, items)).map(c => c.id)];
  const unavailable = coupons.filter(c => !isCouponAvailable(c.id, items));
  const label = (id: string, text: string, style: object) => (
    <ObservedText stableId={id} sourceRef={sourceRef} observationRole="text" style={style}>{mixedText(text)}</ObservedText>
  );
  const confirm = () => {
    if (couponStore.getState().confirm(useCartStore.getState().items)) leave();
  };
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <View style={styles.header}>
      <ObservedPressable stableId="coupons.back" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回" onPress={() => { couponStore.getState().cancel(); leave(); }} style={styles.back}>
        <Text style={styles.backLabel}>{mixedText('返回')}</Text>
      </ObservedPressable>
      {label('coupons.brand', 'Food AI', styles.brand)}
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {label('coupons.title', '优惠券选择与金额明细', styles.title)}
      {label('coupons.description', '按商品金额判断门槛，每单限用 1 张。', styles.description)}
      <View style={styles.choices} accessibilityRole="radiogroup">
        <Text style={styles.heading}>{mixedText('可用优惠券')}</Text>
        <View style={styles.options}>
          {available.map(choice => {
            const selected = draft === choice;
            const text = couponLabel(choice);
            return <ObservedPressable key={choice} stableId={`coupons.option.${choice}`} sourceRef={sourceRef} observationRole="button" accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, selected }} accessibilityLabel={text} onPress={() => couponStore.getState().selectDraft(choice, useCartStore.getState().items)} style={[styles.option, selected && styles.selected]}>
              <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>{mixedText(text)}</Text>
              {selected && <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.check}><View style={styles.checkStroke}/></View>}
            </ObservedPressable>;
          })}
        </View>
      </View>
      {/* 不可用券不可点击；标题与原因作为独立文本供读屏读取。 */}
      {unavailable.map(coupon => (
        <View key={coupon.id} testID={`coupons.unavailable.${coupon.id}`} accessibilityState={{ disabled: true }} style={styles.card}>
          {label(`coupons.unavailable.${coupon.id}.title`, coupon.label, styles.unavailableTitle)}
          {label(`coupons.unavailable.${coupon.id}.reason`, `还差 ${formatYuan(shortfallCents(coupon.id, items))} 可用`, styles.caption)}
        </View>
      ))}
      {confirmRejected && label('coupons.error', '订单金额变化，请重新选择优惠券', styles.error)}
      <View style={styles.card}>
        <View style={styles.row}>
          {label('coupons.bill.goods.label', '商品金额', styles.body)}
          {label('coupons.bill.goods', formatYuan(bill.subtotalCents), styles.body)}
        </View>
        <View style={styles.row}>
          {label('coupons.bill.fees.label', `包装费 ${formatYuan(bill.packagingCents)} + 配送费 ${formatYuan(bill.deliveryCents)}`, styles.caption)}
          {label('coupons.bill.fees', formatYuan(bill.packagingCents + bill.deliveryCents), styles.caption)}
        </View>
        <View style={styles.row}>
          {label('coupons.bill.discount.label', '优惠', styles.label)}
          {label('coupons.bill.discount', formatDiscount(bill.discountCents), styles.discount)}
        </View>
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <View style={styles.payableRow}>
        {label('coupons.payable.label', '应付金额', styles.label)}
        {label('coupons.payable', formatYuan(bill.payableCents), styles.price)}
      </View>
      <ObservedPressable stableId="coupons.confirm" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="确认使用" onPress={confirm} style={styles.confirm}>
        <Text style={styles.confirmLabel}>{mixedText('确认使用')}</Text>
      </ObservedPressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8EF', paddingTop: 59, paddingBottom: 37 },
  header: { height: 64, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 64, height: 48, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  brand: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingHorizontal: 22, paddingBottom: 16, gap: 16 },
  title: { fontSize: 26, lineHeight: 36, fontWeight: '700', color: '#241713' },
  description: { fontSize: 15, lineHeight: 23, color: '#77655F' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: '#241713' },
  choices: { gap: 12 },
  options: { gap: 8 },
  option: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E8DCD3', borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#F7D7B5', borderColor: '#E6472F' },
  optionLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#77655F' },
  selectedLabel: { color: '#E6472F' },
  check: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  checkStroke: { width: 10, height: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#E6472F', transform: [{ rotate: '-45deg' }] },
  card: { padding: 16, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16 },
  unavailableTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#77655F' },
  caption: { fontSize: 13, lineHeight: 20, color: '#77655F' },
  body: { fontSize: 15, lineHeight: 23, color: '#241713' },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#241713' },
  discount: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  error: { fontSize: 13, lineHeight: 20, color: '#E6472F' },
  footer: { paddingVertical: 16, paddingHorizontal: 22, gap: 8, borderTopWidth: 1, borderTopColor: '#E8DCD3', backgroundColor: '#FFFFFF' },
  payableRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 28, lineHeight: 38, fontWeight: '700', color: '#E6472F' },
  confirm: { height: 48, borderRadius: 16, backgroundColor: '#E6472F', alignItems: 'center', justifyContent: 'center' },
  confirmLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
});
