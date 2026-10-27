import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import {
  avoidOptions, budgetOptions, preferenceSummary, preferencesStore, spiceOptions, usePreferencesStore,
} from '@/store/preferences.store';

// Web 按基线对齐不同字体的行内片段，PingFang 与系统字体混排时行盒比 lineHeight 高 1pt；
// iOS 由段落样式固定行高，不需要也不受影响。
const webSpanAlign = Platform.OS === 'web' ? ({ verticalAlign: 'top' } as const) : null;
const mixedText = (text: string) => text.split(/([\p{Script=Han}\u3000-\u303f\uff00-\uffef]+)/u).filter(Boolean).map((part, index) => (
  <Text key={index} style={[{ fontFamily: /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(part) ? 'PingFang SC' : 'System' }, webSpanAlign]}>{part}</Text>
));

const sourceRef = { file: 'app/preferences.tsx', symbol: 'Preferences' } as const;

export default function Preferences() {
  const draft = usePreferencesStore(state => state.draft);
  const avoidLimitReached = usePreferencesStore(state => state.avoidLimitReached);
  useEffect(() => {
    preferencesStore.getState().beginEditing();
    return () => preferencesStore.getState().cancel();
  }, []);
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };
  const label = (id: string, text: string, style: object) => (
    <ObservedText stableId={id} sourceRef={sourceRef} observationRole="text" style={style}>{mixedText(text)}</ObservedText>
  );
  const group = <T extends string,>(
    prefix: string, title: string, options: readonly { value: T; label: string }[],
    isSelected: (value: T) => boolean, onPress: (value: T) => void, multiple: boolean,
  ) => (
    <View style={styles.choices} accessibilityRole={multiple ? undefined : 'radiogroup'}>
      <Text style={styles.heading}>{mixedText(title)}</Text>
      <View style={styles.options}>
        {options.map(option => {
          const selected = isSelected(option.value);
          return <ObservedPressable key={option.value} stableId={`${prefix}.${option.value}`} sourceRef={sourceRef} observationRole="button" accessibilityRole={multiple ? 'checkbox' : 'radio'} aria-checked={selected} accessibilityState={{ checked: selected, selected }} accessibilityLabel={option.label} onPress={() => onPress(option.value)} style={[styles.option, selected && styles.selected]}>
            <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>{mixedText(option.label)}</Text>
            {selected && <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.check}><View style={styles.checkStroke}/></View>}
          </ObservedPressable>;
        })}
      </View>
    </View>
  );
  const actions = preferencesStore.getState();
  return <SafeAreaView edges={{ top: 'maximum', bottom: 'maximum' }} style={styles.screen}>
    <View style={styles.header}>
      <ObservedPressable stableId="preferences.back" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="返回" onPress={() => { preferencesStore.getState().cancel(); leave(); }} style={styles.back}>
        <Text style={styles.backLabel}>{mixedText('返回')}</Text>
      </ObservedPressable>
      {label('preferences.brand', 'Food AI', styles.brand)}
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {label('preferences.title', '饮食偏好设置', styles.title)}
      {label('preferences.description', '设置口味、忌口与单餐预算。', styles.description)}
      {group('preferences.spice', '辣度', spiceOptions, value => draft.spice === value, actions.selectSpice, false)}
      <View style={styles.avoid}>
        {group('preferences.avoid', '忌口（最多 2 项）', avoidOptions, value => draft.avoid.includes(value), actions.toggleAvoid, true)}
        {avoidLimitReached && label('preferences.avoid.error', '最多选择 2 项忌口', styles.error)}
      </View>
      {group('preferences.budget', '单餐预算', budgetOptions, value => draft.budget === value, actions.selectBudget, false)}
      <View style={styles.card}>
        {label('preferences.summary.title', '当前偏好', styles.caption)}
        {label('preferences.summary', preferenceSummary(draft), styles.summary)}
        {label('preferences.disclaimer', '保存后可在“我的”查看和修改。', styles.caption)}
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <View style={styles.actions}>
        <ObservedPressable stableId="preferences.reset" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="恢复默认" onPress={() => preferencesStore.getState().resetDraft()} style={styles.reset}>
          <Text style={styles.resetLabel}>{mixedText('恢复默认')}</Text>
        </ObservedPressable>
        <ObservedPressable stableId="preferences.save" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="保存偏好" onPress={() => { preferencesStore.getState().save(); leave(); }} style={styles.save}>
          <Text style={styles.saveLabel}>{mixedText('保存偏好')}</Text>
        </ObservedPressable>
      </View>
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
  avoid: { gap: 8 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E8DCD3', borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#F7D7B5', borderColor: '#E6472F' },
  optionLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#77655F' },
  selectedLabel: { color: '#E6472F' },
  check: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  checkStroke: { width: 10, height: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#E6472F', transform: [{ rotate: '-45deg' }] },
  error: { fontSize: 13, lineHeight: 20, color: '#E6472F' },
  card: { padding: 16, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16 },
  caption: { fontSize: 13, lineHeight: 20, color: '#77655F' },
  summary: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#241713' },
  footer: { paddingVertical: 16, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: '#E8DCD3', backgroundColor: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 12 },
  reset: { width: 120, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  resetLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#E6472F' },
  save: { flex: 1, height: 48, borderRadius: 16, backgroundColor: '#E6472F', alignItems: 'center', justifyContent: 'center' },
  saveLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
});
