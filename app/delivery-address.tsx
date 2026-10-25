import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import { addresses, addressStore, useAddressStore, type AddressId } from '@/store/address.store';

const addressText = (text: string) => text.split(/([\p{Script=Han}\u3000-\u303f\uff00-\uffef]+)/u).filter(Boolean).map((part, index) => (
  <Text key={index} style={{ fontFamily: /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(part) ? 'PingFang SC' : 'System' }}>{part}</Text>
));

const sourceRef = { file: 'app/delivery-address.tsx', symbol: 'DeliveryAddress' } as const;
export default function DeliveryAddress() {
  const draft = useAddressStore(state => state.draft);
  const editing = useAddressStore(state => state.editing);
  const address = addresses[draft];
  useEffect(() => {
    addressStore.getState().beginEditing();
    return () => addressStore.getState().cancel();
  }, []);
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const label = (id: string, text: string, style: object) => (
    <ObservedText stableId={id} sourceRef={sourceRef} observationRole="text" style={style}>{addressText(text)}</ObservedText>
  );
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <View style={styles.header}>
      <ObservedPressable stableId="address.back" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回" onPress={() => { addressStore.getState().cancel(); leave(); }} style={styles.back}>
        <Text style={styles.backLabel}>{addressText('返回')}</Text>
      </ObservedPressable>
      {label('address.brand', 'Food AI', styles.brand)}
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {label('address.title', '配送地址选择', styles.title)}
      {label('address.description', '选择本次配送地点，确认后更新首页。', styles.description)}
      <View style={styles.choices} accessibilityRole="radiogroup">
        <Text style={styles.heading}>{addressText('常用地址')}</Text>
        <View style={styles.options}>
          {(Object.keys(addresses) as AddressId[]).map(id => {
            const selected = draft === id;
            return <ObservedPressable key={id} stableId={`address.option.${id}`} sourceRef={sourceRef} observationRole="button" accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, selected }} accessibilityLabel={addresses[id].label} onPress={() => addressStore.getState().select(id)} style={[styles.option, selected && styles.selected]}>
              <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>{addressText(addresses[id].label)}</Text>
              {selected && <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.check}><View style={styles.checkStroke}/></View>}
            </ObservedPressable>;
          })}
        </View>
      </View>
      <View style={styles.detail}>
        {label('address.detail.tag', address.tag, styles.tag)}
        {label('address.detail.address', address.address, styles.heading)}
        {label('address.detail.room', address.room, styles.room)}
        {label('address.detail.contact', '测试用户 · 138****0000', styles.caption)}
      </View>
      {label('address.notice', '仅配送至已保存地址。', styles.caption)}
    </ScrollView>
    <View style={styles.footer}>
      {label('address.summary', `已选择：${address.label}`, styles.summary)}
      <ObservedPressable stableId="address.confirm" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="确认配送地址" accessibilityState={{ disabled: !editing }} disabled={!editing} onPress={() => { if (addressStore.getState().confirm()) leave(); }} style={styles.confirm}>
        <Text style={styles.confirmLabel}>{addressText('确认配送地址')}</Text>
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
  detail: { padding: 16, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16 },
  tag: { fontSize: 13, lineHeight: 20, color: '#E6472F' },
  room: { fontSize: 15, lineHeight: 23, color: '#241713' },
  caption: { fontSize: 13, lineHeight: 20, color: '#77655F' },
  footer: { paddingVertical: 16, paddingHorizontal: 22, gap: 8, borderTopWidth: 1, borderTopColor: '#E8DCD3', backgroundColor: '#FFFFFF' },
  summary: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#241713' },
  confirm: { height: 48, borderRadius: 16, backgroundColor: '#E6472F', alignItems: 'center', justifyContent: 'center' },
  confirmLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
});
