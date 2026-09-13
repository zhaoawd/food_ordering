import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import usePreferencesStore, {
  AVOID_OPTIONS,
  AvoidItem,
  BUDGET_OPTIONS,
  BudgetBand,
  clonePreferences,
  DEFAULT_PREFERENCES,
  isDefaultPreferences,
  preferenceSummary,
  Preferences,
  SPICE_OPTIONS,
  SpiceLevel,
} from "@/store/preferences.store";
import { ObservedPressable, ObservedText } from "@/verification/observation";
import { isVerificationBuild } from "@/verification/runtime";

// 饮食偏好编辑页（需求 §7.3 的方案 A）。
//
// 这一屏的几何是**设计值**，不是排版副产物：分组标题行盒固定 22 pt、摘要卡两行固定
// 15/20 pt、底栏固定 96 pt。默认行高会让下面每个元素的 y 变成"iOS 的字体度量恰好等于
// 设计稿的字体度量"这个赌注，而设计导出里写的是 y=166/268/322/424/495/849 这些确定值。
//
// 观测元素不嵌套（需求 §8.1）：iOS 把 accessible 容器内部的子元素折叠掉，嵌套的观测元素
// 在 AX 树里根本不出现，而 AX 是文案与 frame 的第二路独立证据。所以返回按钮的外框写
// `accessible={false}`，让里面那个观测文案成为 AX 节点；选项则相反——观测的是控件本身，
// 里面的标签是普通 Text。
const sourceRef = {
  file: "app/preferences.tsx",
  symbol: "PreferencesScreen",
} as const;

const SAVE_DELAY_MS = 400;

export default function PreferencesScreen() {
  const saved = usePreferencesStore((state) => state.saved);
  const commit = usePreferencesStore((state) => state.commit);
  const [draft, setDraft] = useState<Preferences>(
    () => clonePreferences(saved ?? DEFAULT_PREFERENCES),
  );
  const [saving, setSaving] = useState(false);

  const commitAndLeave = () => {
    commit(draft);
    router.back();
  };

  useEffect(() => {
    // 验证构建里 saving 不自动结束：采集模型是「到达 → 稳定 → 采集」，没有 400 ms 的
    // 时间窗保证。定格的只是"什么时候离开这个状态"，状态本身与正式构建一致，提交改由
    // `verification.commit_save` 触发（需求 §10）。
    if (!saving || isVerificationBuild) return undefined;
    const timer = setTimeout(commitAndLeave, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [saving]);

  const setSpice = (value: SpiceLevel) => setDraft((current) => ({ ...current, spice: value }));
  const setBudget = (value: BudgetBand) => setDraft((current) => ({ ...current, budget: value }));
  const toggleAvoid = (value: AvoidItem) => setDraft((current) => ({
    ...current,
    avoids: current.avoids.includes(value)
      ? current.avoids.filter((item) => item !== value)
      : [...current.avoids, value],
  }));

  const saveLabel = saving ? "正在保存" : "保存偏好";
  const atDefault = isDefaultPreferences(draft);

  const option = (
    stableId: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    style: object,
  ) => (
    <ObservedPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      key={stableId}
      observationRole="button"
      onPress={onPress}
      sourceRef={sourceRef}
      stableId={stableId}
      style={[styles.option, style, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label}
      </Text>
      {selected ? <Ionicons color="#C75A09" name="checkmark" size={14} /> : null}
    </ObservedPressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen} testID="preferences.root">
      <View style={styles.header} testID="preferences.header">
        <Pressable
          accessible={false}
          onPress={() => router.back()}
          style={styles.backButton}
          testID="preferences.header.back_button"
        >
          <Text accessible={false} style={styles.backChevron}>‹</Text>
          <ObservedText
            accessibilityLabel="返回"
            accessibilityRole="button"
            observationRole="text"
            observationStyle={styles.backLabelFrame}
            sourceRef={sourceRef}
            stableId="preferences.header.back"
            style={styles.backLabel}
          >
            返回
          </ObservedText>
        </Pressable>
        <ObservedText
          accessibilityRole="header"
          observationRole="text"
          observationStyle={styles.headerTitleFrame}
          sourceRef={sourceRef}
          stableId="preferences.header.title"
          style={styles.headerTitle}
        >
          饮食偏好
        </ObservedText>
        {isVerificationBuild && saving ? (
          <Pressable
            accessibilityLabel="提交保存"
            accessibilityRole="button"
            accessible
            collapsable={false}
            onPress={commitAndLeave}
            style={styles.commitSave}
            testID="verification.commit_save"
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.scroll}
        testID="preferences.content"
      >
        <View style={styles.sectionFirst} testID="preferences.section.spice">
          <View style={styles.sectionHead}>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionTitleFrame}
              sourceRef={sourceRef}
              stableId="preferences.spice.title"
              style={styles.sectionTitle}
            >
              辣度
            </ObservedText>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionNoteFrame}
              sourceRef={sourceRef}
              stableId="preferences.spice.note"
              style={styles.sectionNote}
            >
              单选
            </ObservedText>
          </View>
          <View style={styles.optionRow}>
            {SPICE_OPTIONS.map((item) => option(
              `preferences.spice.${item.value}`,
              item.label,
              draft.spice === item.value,
              () => setSpice(item.value),
              [
                styles.optionColumn,
                item.value === "medium" && styles.optionColumnNarrow,
              ],
            ))}
          </View>
        </View>

        <View style={styles.section} testID="preferences.section.budget">
          <View style={styles.sectionHead}>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionTitleFrame}
              sourceRef={sourceRef}
              stableId="preferences.budget.title"
              style={styles.sectionTitle}
            >
              单餐预算
            </ObservedText>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionNoteFrame}
              sourceRef={sourceRef}
              stableId="preferences.budget.note"
              style={styles.sectionNote}
            >
              单选
            </ObservedText>
          </View>
          <View style={styles.optionGrid}>
            {BUDGET_OPTIONS.map((item) => option(
              `preferences.budget.${item.value}`,
              item.label,
              draft.budget === item.value,
              () => setBudget(item.value),
              styles.optionCell,
            ))}
          </View>
        </View>

        <View style={styles.section} testID="preferences.section.avoid">
          <View style={styles.sectionHead}>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionTitleFrame}
              sourceRef={sourceRef}
              stableId="preferences.avoid.title"
              style={styles.sectionTitle}
            >
              忌口
            </ObservedText>
            <ObservedText
              observationRole="text"
              observationStyle={styles.sectionNoteFrame}
              sourceRef={sourceRef}
              stableId="preferences.avoid.note"
              style={styles.sectionNote}
            >
              可多选
            </ObservedText>
          </View>
          <View style={styles.chips}>
            {AVOID_OPTIONS.map((item) => option(
              `preferences.avoid.${item.value}`,
              item.label,
              draft.avoids.includes(item.value),
              () => toggleAvoid(item.value),
              [
                styles.optionColumn,
                item.value === "dairy" && styles.optionColumnNarrow,
              ],
            ))}
          </View>
        </View>

        <View style={styles.summaryCard} testID="preferences.summary_card">
          <ObservedText
            observationRole="text"
            observationStyle={styles.summaryLabelFrame}
            sourceRef={sourceRef}
            stableId="preferences.summary.label"
            style={styles.summaryLabel}
          >
            当前偏好
          </ObservedText>
          <ObservedText
            accessibilityRole="text"
            observationRole="text"
            observationStyle={styles.summaryValueFrame}
            sourceRef={sourceRef}
            stableId="preferences.summary"
            style={styles.summaryValue}
          >
            {preferenceSummary(draft)}
          </ObservedText>
        </View>
      </ScrollView>

      <View style={styles.actions} testID="preferences.actions">
        <ObservedPressable
          accessibilityLabel="恢复默认"
          accessibilityRole="button"
          observationRole="button"
          onPress={() => setDraft(clonePreferences(DEFAULT_PREFERENCES))}
          sourceRef={sourceRef}
          stableId="preferences.actions.reset"
          style={[styles.reset, atDefault && styles.resetAtDefault]}
        >
          <Text style={[styles.resetLabel, atDefault && styles.resetLabelAtDefault]}>
            恢复默认
          </Text>
        </ObservedPressable>
        <ObservedPressable
          accessibilityLabel={saveLabel}
          accessibilityRole="button"
          disabled={saving}
          observationRole="button"
          onPress={() => setSaving(true)}
          sourceRef={sourceRef}
          stableId="preferences.actions.save"
          style={[styles.save, saving && styles.saveSaving]}
        >
          <Text style={styles.saveLabel}>{saveLabel}</Text>
        </ObservedPressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#FFF9F1",
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(216,207,198,0.58)",
    borderBottomWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    left: 20,
    position: "absolute",
    top: 3,
    width: 72,
  },
  backLabel: {
    color: "#C75A09",
    fontFamily: "NotoSansSC-SemiBold",
    fontSize: 16,
    lineHeight: 24,
  },
  backChevron: {
    color: "#C75A09",
    fontFamily: "NotoSansSC-SemiBold",
    fontSize: 22,
    lineHeight: 24,
    textAlign: "left",
    width: 18,
  },
  backLabelFrame: { height: 24, width: 54 },
  headerTitle: {
    color: "#202020",
    fontFamily: "NotoSansSC-Bold",
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
  },
  headerTitleFrame: {
    height: 28,
    left: 150,
    position: "absolute",
    top: 11,
    width: 130,
  },
  scroll: { flex: 1 },
  content: {
    paddingBottom: 118,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionFirst: { width: "100%" },
  section: { marginTop: 25, width: "100%" },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    height: 22,
    justifyContent: "space-between",
    marginBottom: 11,
  },
  sectionTitle: {
    color: "#222222",
    fontFamily: "NotoSansSC-Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionTitleFrame: { height: 22, width: 160 },
  sectionNote: {
    color: "#88827B",
    fontFamily: "NotoSansSC-Regular",
    fontSize: 13,
    lineHeight: 22,
  },
  sectionNoteFrame: { height: 22, width: 64 },
  optionRow: {
    columnGap: 8,
    flexDirection: "row",
  },
  optionGrid: {
    columnGap: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
  },
  chips: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 9,
  },
  option: {
    alignItems: "center",
    borderColor: "#DED6CC",
    borderRadius: 15,
    borderWidth: 1,
    columnGap: 5,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: "#FFF0E2",
    borderColor: "#C75A09",
    borderWidth: 1.5,
  },
  optionColumn: { width: 92 },
  optionColumnNarrow: { width: 90 },
  optionCell: { width: 190 },
  optionLabel: {
    color: "#38332E",
    fontFamily: "NotoSansSC-Regular",
    fontSize: 15,
    lineHeight: 20,
  },
  optionLabelSelected: { color: "#C75A09", fontFamily: "NotoSansSC-SemiBold" },
  summaryCard: {
    backgroundColor: "#FFE8CF",
    borderRadius: 16,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLabel: {
    color: "#9B704C",
    fontFamily: "NotoSansSC-SemiBold",
    fontSize: 12,
    lineHeight: 15,
    transform: [{ translateY: -1 }],
  },
  summaryLabelFrame: { height: 15, width: 120 },
  summaryValue: {
    color: "#222222",
    fontFamily: "NotoSansSC-SemiBold",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 5,
  },
  summaryValueFrame: {
    alignSelf: "flex-start",
    height: 25,
    width: 310,
  },
  actions: {
    backgroundColor: "rgba(255,249,241,0.98)",
    borderTopColor: "rgba(216,207,198,0.8)",
    borderTopWidth: 1,
    bottom: 0,
    columnGap: 12,
    flexDirection: "row",
    height: 96,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 13,
    position: "absolute",
    right: 0,
  },
  reset: {
    alignItems: "center",
    borderColor: "#B94A00",
    borderRadius: 17,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 132,
  },
  resetAtDefault: { borderColor: "#DED6CC" },
  resetLabel: {
    color: "#C75A09",
    fontFamily: "NotoSansSC-SemiBold",
    fontSize: 16,
    lineHeight: 20,
  },
  resetLabelAtDefault: { color: "#817B74" },
  save: {
    alignItems: "center",
    backgroundColor: "#FF6B00",
    borderRadius: 16,
    flex: 1,
    height: 52,
    justifyContent: "center",
  },
  saveSaving: { opacity: 0.7 },
  saveLabel: {
    color: "#1D1D1D",
    fontFamily: "NotoSansSC-Bold",
    fontSize: 17,
    lineHeight: 20,
  },
  // 验证构建专用的提交入口：44×44、完全透明、压在页眉右侧的空白上，所以它既不改变
  // saving 态的任何一个像素，也不遮住任何被观测的元素。它必须属于页眉容器，使 AX
  // frame 包含顶部 Safe Area 偏移，State Driver 才会点击到真实控件。
  commitSave: {
    height: 44,
    position: "absolute",
    right: 8,
    top: 4,
    width: 44,
  },
});
