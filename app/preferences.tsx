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

// R2 饮食偏好编辑页；观测控件分别提供独立 AX 节点。
const sourceRef = {
  file: "app/preferences.tsx",
  symbol: "PreferencesScreen",
} as const;

const SAVE_DELAY_MS = 400;

// 组合修复起点（BL-188）：条件子节点移入组件，隐藏时返回 null，渲染出的宿主树不变。
function OptionCheck({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Ionicons color="#C75A09" name="checkmark" size={14} />;
}

function VerificationCommitSave({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;
  return (
    <Pressable
      accessibilityLabel="提交保存"
      accessibilityRole="button"
      accessible
      collapsable={false}
      onPress={onPress}
      style={styles.commitSave}
      testID="verification.commit_save"
    />
  );
}

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
    // 验证构建固定 saving 状态，由 verification.commit_save 提交；普通构建延迟 400 ms。
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

  // 组合修复起点（BL-188）：内联表达式提为具名常量，选项 map 展开为 12 个具名节点。
  const goBack = () => router.back();
  const showCommitSave = isVerificationBuild && saving;
  const spiceNone = SPICE_OPTIONS[0];
  const spiceNoneLabel = spiceNone.label;
  const spiceNoneSelected = draft.spice === spiceNone.value;
  const spiceNoneState = { selected: spiceNoneSelected };
  const onSpiceNone = () => setSpice(spiceNone.value);
  const spiceNoneBoxStateStyle = spiceNoneSelected && styles.optionSelected;
  const spiceNoneTextStateStyle = spiceNoneSelected && styles.optionLabelSelected;
  const spiceMild = SPICE_OPTIONS[1];
  const spiceMildLabel = spiceMild.label;
  const spiceMildSelected = draft.spice === spiceMild.value;
  const spiceMildState = { selected: spiceMildSelected };
  const onSpiceMild = () => setSpice(spiceMild.value);
  const spiceMildBoxStateStyle = spiceMildSelected && styles.optionSelected;
  const spiceMildTextStateStyle = spiceMildSelected && styles.optionLabelSelected;
  const spiceMedium = SPICE_OPTIONS[2];
  const spiceMediumLabel = spiceMedium.label;
  const spiceMediumSelected = draft.spice === spiceMedium.value;
  const spiceMediumState = { selected: spiceMediumSelected };
  const onSpiceMedium = () => setSpice(spiceMedium.value);
  const spiceMediumBoxStateStyle = spiceMediumSelected && styles.optionSelected;
  const spiceMediumTextStateStyle = spiceMediumSelected && styles.optionLabelSelected;
  const spiceHot = SPICE_OPTIONS[3];
  const spiceHotLabel = spiceHot.label;
  const spiceHotSelected = draft.spice === spiceHot.value;
  const spiceHotState = { selected: spiceHotSelected };
  const onSpiceHot = () => setSpice(spiceHot.value);
  const spiceHotBoxStateStyle = spiceHotSelected && styles.optionSelected;
  const spiceHotTextStateStyle = spiceHotSelected && styles.optionLabelSelected;
  const budgetUnder20 = BUDGET_OPTIONS[0];
  const budgetUnder20Label = budgetUnder20.label;
  const budgetUnder20Selected = draft.budget === budgetUnder20.value;
  const budgetUnder20State = { selected: budgetUnder20Selected };
  const onBudgetUnder20 = () => setBudget(budgetUnder20.value);
  const budgetUnder20BoxStateStyle = budgetUnder20Selected && styles.optionSelected;
  const budgetUnder20TextStateStyle = budgetUnder20Selected && styles.optionLabelSelected;
  const budget20To35 = BUDGET_OPTIONS[1];
  const budget20To35Label = budget20To35.label;
  const budget20To35Selected = draft.budget === budget20To35.value;
  const budget20To35State = { selected: budget20To35Selected };
  const onBudget20To35 = () => setBudget(budget20To35.value);
  const budget20To35BoxStateStyle = budget20To35Selected && styles.optionSelected;
  const budget20To35TextStateStyle = budget20To35Selected && styles.optionLabelSelected;
  const budget35To50 = BUDGET_OPTIONS[2];
  const budget35To50Label = budget35To50.label;
  const budget35To50Selected = draft.budget === budget35To50.value;
  const budget35To50State = { selected: budget35To50Selected };
  const onBudget35To50 = () => setBudget(budget35To50.value);
  const budget35To50BoxStateStyle = budget35To50Selected && styles.optionSelected;
  const budget35To50TextStateStyle = budget35To50Selected && styles.optionLabelSelected;
  const budgetUnlimited = BUDGET_OPTIONS[3];
  const budgetUnlimitedLabel = budgetUnlimited.label;
  const budgetUnlimitedSelected = draft.budget === budgetUnlimited.value;
  const budgetUnlimitedState = { selected: budgetUnlimitedSelected };
  const onBudgetUnlimited = () => setBudget(budgetUnlimited.value);
  const budgetUnlimitedBoxStateStyle = budgetUnlimitedSelected && styles.optionSelected;
  const budgetUnlimitedTextStateStyle = budgetUnlimitedSelected && styles.optionLabelSelected;
  const avoidCilantro = AVOID_OPTIONS[0];
  const avoidCilantroLabel = avoidCilantro.label;
  const avoidCilantroSelected = draft.avoids.includes(avoidCilantro.value);
  const avoidCilantroState = { selected: avoidCilantroSelected };
  const onAvoidCilantro = () => toggleAvoid(avoidCilantro.value);
  const avoidCilantroBoxStateStyle = avoidCilantroSelected && styles.optionSelected;
  const avoidCilantroTextStateStyle = avoidCilantroSelected && styles.optionLabelSelected;
  const avoidPeanut = AVOID_OPTIONS[1];
  const avoidPeanutLabel = avoidPeanut.label;
  const avoidPeanutSelected = draft.avoids.includes(avoidPeanut.value);
  const avoidPeanutState = { selected: avoidPeanutSelected };
  const onAvoidPeanut = () => toggleAvoid(avoidPeanut.value);
  const avoidPeanutBoxStateStyle = avoidPeanutSelected && styles.optionSelected;
  const avoidPeanutTextStateStyle = avoidPeanutSelected && styles.optionLabelSelected;
  const avoidDairy = AVOID_OPTIONS[2];
  const avoidDairyLabel = avoidDairy.label;
  const avoidDairySelected = draft.avoids.includes(avoidDairy.value);
  const avoidDairyState = { selected: avoidDairySelected };
  const onAvoidDairy = () => toggleAvoid(avoidDairy.value);
  const avoidDairyBoxStateStyle = avoidDairySelected && styles.optionSelected;
  const avoidDairyTextStateStyle = avoidDairySelected && styles.optionLabelSelected;
  const avoidSeafood = AVOID_OPTIONS[3];
  const avoidSeafoodLabel = avoidSeafood.label;
  const avoidSeafoodSelected = draft.avoids.includes(avoidSeafood.value);
  const avoidSeafoodState = { selected: avoidSeafoodSelected };
  const onAvoidSeafood = () => toggleAvoid(avoidSeafood.value);
  const avoidSeafoodBoxStateStyle = avoidSeafoodSelected && styles.optionSelected;
  const avoidSeafoodTextStateStyle = avoidSeafoodSelected && styles.optionLabelSelected;
  const summaryTitleLabel = "当前偏好";
  const summaryLabel = preferenceSummary(draft);
  const resetDraft = () => setDraft(clonePreferences(DEFAULT_PREFERENCES));
  const resetBoxStateStyle = atDefault && styles.resetAtDefault;
  const resetTextStateStyle = atDefault && styles.resetLabelAtDefault;
  const startSaving = () => setSaving(true);
  const saveBoxStateStyle = saving && styles.saveSaving;

  return (
    /* AUTOPHONE_COMPOSITION_START */
    <SafeAreaView edges={["top"]} style={styles.screen} testID="preferences.root">
      <View style={styles.header} testID="preferences.header">
        <Pressable
          accessible={false}
          onPress={goBack}
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
        <VerificationCommitSave onPress={commitAndLeave} visible={showCommitSave} />
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
            <ObservedPressable
              accessibilityLabel={spiceNoneLabel}
              accessibilityRole="button"
              accessibilityState={spiceNoneState}
              observationRole="button"
              onPress={onSpiceNone}
              sourceRef={sourceRef}
              stableId="preferences.spice.none"
              style={[styles.option, styles.optionColumn, spiceNoneBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, spiceNoneTextStateStyle]}>
                {spiceNoneLabel}
              </Text>
              <OptionCheck visible={spiceNoneSelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={spiceMildLabel}
              accessibilityRole="button"
              accessibilityState={spiceMildState}
              observationRole="button"
              onPress={onSpiceMild}
              sourceRef={sourceRef}
              stableId="preferences.spice.mild"
              style={[styles.option, styles.optionColumn, spiceMildBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, spiceMildTextStateStyle]}>
                {spiceMildLabel}
              </Text>
              <OptionCheck visible={spiceMildSelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={spiceMediumLabel}
              accessibilityRole="button"
              accessibilityState={spiceMediumState}
              observationRole="button"
              onPress={onSpiceMedium}
              sourceRef={sourceRef}
              stableId="preferences.spice.medium"
              style={[styles.option, styles.optionColumn, styles.optionColumnNarrow, spiceMediumBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, spiceMediumTextStateStyle]}>
                {spiceMediumLabel}
              </Text>
              <OptionCheck visible={spiceMediumSelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={spiceHotLabel}
              accessibilityRole="button"
              accessibilityState={spiceHotState}
              observationRole="button"
              onPress={onSpiceHot}
              sourceRef={sourceRef}
              stableId="preferences.spice.hot"
              style={[styles.option, styles.optionColumn, spiceHotBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, spiceHotTextStateStyle]}>
                {spiceHotLabel}
              </Text>
              <OptionCheck visible={spiceHotSelected} />
            </ObservedPressable>
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
            <ObservedPressable
              accessibilityLabel={budgetUnder20Label}
              accessibilityRole="button"
              accessibilityState={budgetUnder20State}
              observationRole="button"
              onPress={onBudgetUnder20}
              sourceRef={sourceRef}
              stableId="preferences.budget.under_20"
              style={[styles.option, styles.optionCell, budgetUnder20BoxStateStyle]}
            >
              <Text style={[styles.optionLabel, budgetUnder20TextStateStyle]}>
                {budgetUnder20Label}
              </Text>
              <OptionCheck visible={budgetUnder20Selected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={budget20To35Label}
              accessibilityRole="button"
              accessibilityState={budget20To35State}
              observationRole="button"
              onPress={onBudget20To35}
              sourceRef={sourceRef}
              stableId="preferences.budget.20_35"
              style={[styles.option, styles.optionCell, budget20To35BoxStateStyle]}
            >
              <Text style={[styles.optionLabel, budget20To35TextStateStyle]}>
                {budget20To35Label}
              </Text>
              <OptionCheck visible={budget20To35Selected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={budget35To50Label}
              accessibilityRole="button"
              accessibilityState={budget35To50State}
              observationRole="button"
              onPress={onBudget35To50}
              sourceRef={sourceRef}
              stableId="preferences.budget.35_50"
              style={[styles.option, styles.optionCell, budget35To50BoxStateStyle]}
            >
              <Text style={[styles.optionLabel, budget35To50TextStateStyle]}>
                {budget35To50Label}
              </Text>
              <OptionCheck visible={budget35To50Selected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={budgetUnlimitedLabel}
              accessibilityRole="button"
              accessibilityState={budgetUnlimitedState}
              observationRole="button"
              onPress={onBudgetUnlimited}
              sourceRef={sourceRef}
              stableId="preferences.budget.unlimited"
              style={[styles.option, styles.optionCell, budgetUnlimitedBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, budgetUnlimitedTextStateStyle]}>
                {budgetUnlimitedLabel}
              </Text>
              <OptionCheck visible={budgetUnlimitedSelected} />
            </ObservedPressable>
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
            <ObservedPressable
              accessibilityLabel={avoidCilantroLabel}
              accessibilityRole="button"
              accessibilityState={avoidCilantroState}
              observationRole="button"
              onPress={onAvoidCilantro}
              sourceRef={sourceRef}
              stableId="preferences.avoid.cilantro"
              style={[styles.option, styles.optionColumn, avoidCilantroBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, avoidCilantroTextStateStyle]}>
                {avoidCilantroLabel}
              </Text>
              <OptionCheck visible={avoidCilantroSelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={avoidPeanutLabel}
              accessibilityRole="button"
              accessibilityState={avoidPeanutState}
              observationRole="button"
              onPress={onAvoidPeanut}
              sourceRef={sourceRef}
              stableId="preferences.avoid.peanut"
              style={[styles.option, styles.optionColumn, avoidPeanutBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, avoidPeanutTextStateStyle]}>
                {avoidPeanutLabel}
              </Text>
              <OptionCheck visible={avoidPeanutSelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={avoidDairyLabel}
              accessibilityRole="button"
              accessibilityState={avoidDairyState}
              observationRole="button"
              onPress={onAvoidDairy}
              sourceRef={sourceRef}
              stableId="preferences.avoid.dairy"
              style={[styles.option, styles.optionColumn, styles.optionColumnNarrow, avoidDairyBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, avoidDairyTextStateStyle]}>
                {avoidDairyLabel}
              </Text>
              <OptionCheck visible={avoidDairySelected} />
            </ObservedPressable>
            <ObservedPressable
              accessibilityLabel={avoidSeafoodLabel}
              accessibilityRole="button"
              accessibilityState={avoidSeafoodState}
              observationRole="button"
              onPress={onAvoidSeafood}
              sourceRef={sourceRef}
              stableId="preferences.avoid.seafood"
              style={[styles.option, styles.optionColumn, avoidSeafoodBoxStateStyle]}
            >
              <Text style={[styles.optionLabel, avoidSeafoodTextStateStyle]}>
                {avoidSeafoodLabel}
              </Text>
              <OptionCheck visible={avoidSeafoodSelected} />
            </ObservedPressable>
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
            {summaryTitleLabel}
          </ObservedText>
          <ObservedText
            accessibilityRole="text"
            observationRole="text"
            observationStyle={styles.summaryValueFrame}
            sourceRef={sourceRef}
            stableId="preferences.summary"
            style={styles.summaryValue}
          >
            {summaryLabel}
          </ObservedText>
        </View>
      </ScrollView>

      <View style={styles.actions} testID="preferences.actions">
        <ObservedPressable
          accessibilityLabel="恢复默认"
          accessibilityRole="button"
          observationRole="button"
          onPress={resetDraft}
          sourceRef={sourceRef}
          stableId="preferences.actions.reset"
          style={[styles.reset, resetBoxStateStyle]}
        >
          <Text style={[styles.resetLabel, resetTextStateStyle]}>
            恢复默认
          </Text>
        </ObservedPressable>
        <ObservedPressable
          accessibilityLabel={saveLabel}
          accessibilityRole="button"
          disabled={saving}
          observationRole="button"
          onPress={startSaving}
          sourceRef={sourceRef}
          stableId="preferences.actions.save"
          style={[styles.save, saveBoxStateStyle]}
        >
          <Text style={styles.saveLabel}>{saveLabel}</Text>
        </ObservedPressable>
      </View>
    </SafeAreaView>
    /* AUTOPHONE_COMPOSITION_END */
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
