import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mixedText } from '@/components/MixedScriptText';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import { useCartStore } from '@/store/cart.store';
import {
  cartItemFor, defaultSelection, dishes, extraOptions, formatYuan, isDishId, MAX_QUANTITY, MIN_QUANTITY,
  portionOptions, selectionSummary, totalCents, type DishId, type DishSelection, type Extra,
} from '@/store/dish.catalog';

const sourceRef = { file: 'app/dish-detail.tsx', symbol: 'DishDetail' } as const;

const leave = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/');
};

export default function DishDetail() {
  const { dishId } = useLocalSearchParams<{ dishId?: string }>();
  return isDishId(dishId) ? <DishEditor dishId={dishId} /> : <MissingDish />;
}

function Header() {
  return <View style={styles.header}>
    <ObservedPressable stableId="dish.back" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回" onPress={leave} style={styles.back}>
      <Text style={styles.backLabel}>{mixedText('返回')}</Text>
    </ObservedPressable>
    <ObservedText stableId="dish.brand" sourceRef={sourceRef} observationRole="text" style={styles.brand}>{mixedText('Food AI')}</ObservedText>
  </View>;
}

function MissingDish() {
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <Header />
    <View style={styles.content}>
      <ObservedText stableId="dish.missing.message" sourceRef={sourceRef} observationRole="text" style={styles.title}>{mixedText('菜品不存在')}</ObservedText>
      <ObservedPressable stableId="dish.missing.home" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回首页" onPress={() => router.replace('/')} style={styles.add}>
        <Text style={styles.addLabel}>{mixedText('返回首页')}</Text>
      </ObservedPressable>
    </View>
  </SafeAreaView>;
}

function DishEditor({ dishId }: { dishId: DishId }) {
  const dish = dishes[dishId];
  const addItems = useCartStore(state => state.addItems);
  const [selection, setSelection] = useState<DishSelection>(defaultSelection);
  const [submitting, setSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const update = (next: Partial<DishSelection>) => {
    setSelection(current => ({ ...current, ...next }));
    setLimitReached(false);
  };
  const toggleExtra = (value: Extra) => update({
    extras: selection.extras.includes(value)
      ? selection.extras.filter(item => item !== value)
      : [...selection.extras, value],
  });
  const add = () => {
    if (submitting) return;
    setSubmitting(true);
    const result = addItems(cartItemFor(dishId, selection), selection.quantity);
    if (result === 'added') {
      leave();
      return;
    }
    setLimitReached(result === 'line_limit');
    setSubmitting(false);
  };
  const label = (id: string, text: string, style: object) => (
    <ObservedText stableId={id} sourceRef={sourceRef} observationRole="text" style={style}>{mixedText(text)}</ObservedText>
  );
  const option = (id: string, text: string, selected: boolean, onPress: () => void, multiple: boolean) => (
    <ObservedPressable key={id} stableId={id} sourceRef={sourceRef} observationRole="button" accessibilityRole={multiple ? 'checkbox' : 'radio'} aria-checked={selected} accessibilityState={{ checked: selected, selected }} accessibilityLabel={text} onPress={onPress} style={[styles.option, selected && styles.selected]}>
      <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>{mixedText(text)}</Text>
      {selected && <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.check}><View style={styles.checkStroke}/></View>}
    </ObservedPressable>
  );
  const stepper = (id: string, text: string, accessibilityLabel: string, disabled: boolean, onPress: () => void) => (
    <ObservedPressable stableId={id} sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[styles.stepper, disabled && styles.stepperDisabled]}>
      <Text style={[styles.stepperLabel, disabled && styles.stepperLabelDisabled]}>{text}</Text>
    </ObservedPressable>
  );
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <Header />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {label('dish.title', '菜品规格与数量', styles.title)}
      <View style={styles.card}>
        {label('dish.name', dish.name, styles.heading)}
        {label('dish.description', dish.description, styles.caption)}
        {label('dish.base_price', `${formatYuan(dish.basePriceCents)} 起`, styles.price)}
      </View>
      <View style={styles.choices} accessibilityRole="radiogroup">
        <Text style={styles.heading}>{mixedText('份量')}</Text>
        <View style={styles.options}>
          {portionOptions.map(item => option(`dish.portion.${item.value}`, item.label, selection.portion === item.value, () => update({ portion: item.value }), false))}
        </View>
      </View>
      <View style={styles.choices}>
        <Text style={styles.heading}>{mixedText('加料（可多选）')}</Text>
        <View style={styles.options}>
          {extraOptions.map(item => option(`dish.extras.${item.value}`, item.label, selection.extras.includes(item.value), () => toggleExtra(item.value), true))}
        </View>
      </View>
      <View style={styles.quantityRow}>
        {label('dish.quantity.label', '数量', styles.heading)}
        <View style={styles.quantityControls}>
          {stepper('dish.quantity.decrease', '−', '减少数量', selection.quantity <= MIN_QUANTITY, () => update({ quantity: selection.quantity - 1 }))}
          {label('dish.quantity.value', String(selection.quantity), styles.heading)}
          {stepper('dish.quantity.increase', '+', '增加数量', selection.quantity >= MAX_QUANTITY, () => update({ quantity: selection.quantity + 1 }))}
        </View>
      </View>
      {label('dish.selection', selectionSummary(selection), styles.caption)}
      {limitReached && label('dish.cart.error', '同一规格最多 9 份', styles.error)}
    </ScrollView>
    <View style={styles.footer}>
      <View style={styles.totalRow}>
        {label('dish.total.label', '商品合计', styles.label)}
        {label('dish.total', formatYuan(totalCents(dishId, selection)), styles.price)}
      </View>
      <ObservedPressable stableId="dish.add" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="加入购物车" accessibilityState={{ disabled: submitting }} disabled={submitting} onPress={add} style={styles.add}>
        <Text style={styles.addLabel}>{mixedText('加入购物车')}</Text>
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
  card: { padding: 16, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16 },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: '#241713' },
  caption: { fontSize: 13, lineHeight: 20, color: '#77655F' },
  price: { fontSize: 28, lineHeight: 38, fontWeight: '700', color: '#E6472F' },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#241713' },
  choices: { gap: 12 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E8DCD3', borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#F7D7B5', borderColor: '#E6472F' },
  optionLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#77655F' },
  selectedLabel: { color: '#E6472F' },
  check: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  checkStroke: { width: 10, height: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#E6472F', transform: [{ rotate: '-45deg' }] },
  quantityRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  quantityControls: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  stepper: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  stepperDisabled: { backgroundColor: '#F3ECE6' },
  stepperLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  stepperLabelDisabled: { color: '#77655F' },
  error: { fontSize: 13, lineHeight: 20, color: '#E6472F' },
  footer: { paddingVertical: 16, paddingHorizontal: 22, gap: 8, borderTopWidth: 1, borderTopColor: '#E8DCD3', backgroundColor: '#FFFFFF' },
  totalRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  add: { height: 48, borderRadius: 16, backgroundColor: '#E6472F', alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
});
