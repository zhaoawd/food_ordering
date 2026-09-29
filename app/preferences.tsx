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
<SafeAreaView edges={["top"]} testID={"preferences.root"} style={compositionStyles.n_71bfb7b15fdd1590}>
  <View style={compositionStyles.n_ecd0f436a76724f6}>
    <ObservedPressable stableId={"preferences.header.back"} sourceRef={sourceRef} observationRole={"text"} accessibilityLabel={"‹ 返回"} accessibilityRole={"button"} onPress={goBack} style={compositionStyles.n_6697c97efdab17ce}>
      <Text style={compositionStyles.n_6697c97efdab17ce_text}>{"‹ 返回"}</Text>
    </ObservedPressable>
    <ObservedText stableId={"preferences.header.title"} sourceRef={sourceRef} observationRole={"text"} accessibilityRole={"header"} observationStyle={compositionStyles.n_2bcdcfb628afca9d} style={compositionStyles.n_2bcdcfb628afca9d_text}>
      {"饮食偏好"}
    </ObservedText>
    <VerificationCommitSave onPress={commitAndLeave} visible={showCommitSave} />
  </View>
  <ScrollView style={compositionStyles.n_3d6e09607f2afdb6} contentContainerStyle={compositionStyles.n_3d6e09607f2afdb6_content}>
    <View style={compositionStyles.n_a27075b4b50704b9}>
      <View style={compositionStyles.n_19aa0c034e13a5bb}>
        <ObservedText stableId={"preferences.spice.title"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_9f028f5f96d98059} style={compositionStyles.n_9f028f5f96d98059_text}>
          {"辣度"}
        </ObservedText>
        <ObservedText stableId={"preferences.spice.note"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_df7887907907cd64} style={compositionStyles.n_df7887907907cd64_text}>
          {"单选"}
        </ObservedText>
      </View>
      <View style={compositionStyles.n_53480d8ea7c5b8c7}>
        <View style={compositionStyles.n_8b47af017916b5ad}>
          <View style={compositionStyles.n_fd9734bd6411724e_cell}>
            <ObservedPressable stableId={"preferences.spice.none"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={spiceNoneLabel} accessibilityRole={"button"} accessibilityState={spiceNoneState} onPress={onSpiceNone} style={[compositionStyles.n_fd9734bd6411724e, spiceNoneSelected && compositionStyles.n_fd9734bd6411724e_selected]}>
              <Text style={[compositionStyles.n_fd9734bd6411724e_text, spiceNoneSelected && compositionStyles.n_fd9734bd6411724e_text_selected]}>{spiceNoneLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_fd9734bd6411724e_text, spiceNoneSelected && compositionStyles.n_fd9734bd6411724e_text_selected]} visible={spiceNoneSelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_d26a9225a1e51c20_cell}>
            <ObservedPressable stableId={"preferences.spice.mild"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={spiceMildLabel} accessibilityRole={"button"} accessibilityState={spiceMildState} onPress={onSpiceMild} style={[compositionStyles.n_d26a9225a1e51c20, spiceMildSelected && compositionStyles.n_d26a9225a1e51c20_selected]}>
              <Text style={[compositionStyles.n_d26a9225a1e51c20_text, spiceMildSelected && compositionStyles.n_d26a9225a1e51c20_text_selected]}>{spiceMildLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_d26a9225a1e51c20_text, spiceMildSelected && compositionStyles.n_d26a9225a1e51c20_text_selected]} visible={spiceMildSelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_a94091c2812d7c23_cell}>
            <ObservedPressable stableId={"preferences.spice.medium"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={spiceMediumLabel} accessibilityRole={"button"} accessibilityState={spiceMediumState} onPress={onSpiceMedium} style={[compositionStyles.n_a94091c2812d7c23, spiceMediumSelected && compositionStyles.n_a94091c2812d7c23_selected]}>
              <Text style={[compositionStyles.n_a94091c2812d7c23_text, spiceMediumSelected && compositionStyles.n_a94091c2812d7c23_text_selected]}>{spiceMediumLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_a94091c2812d7c23_text, spiceMediumSelected && compositionStyles.n_a94091c2812d7c23_text_selected]} visible={spiceMediumSelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_c958fb81a4defe16_cell}>
            <ObservedPressable stableId={"preferences.spice.hot"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={spiceHotLabel} accessibilityRole={"button"} accessibilityState={spiceHotState} onPress={onSpiceHot} style={[compositionStyles.n_c958fb81a4defe16, spiceHotSelected && compositionStyles.n_c958fb81a4defe16_selected]}>
              <Text style={[compositionStyles.n_c958fb81a4defe16_text, spiceHotSelected && compositionStyles.n_c958fb81a4defe16_text_selected]}>{spiceHotLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_c958fb81a4defe16_text, spiceHotSelected && compositionStyles.n_c958fb81a4defe16_text_selected]} visible={spiceHotSelected} />
            </ObservedPressable>
          </View>
        </View>
      </View>
    </View>
    <View style={compositionStyles.n_3e64a3cdc02b2d45}>
      <View style={compositionStyles.n_74c013b255c3b387}>
        <ObservedText stableId={"preferences.budget.title"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_e6fba3e23d8f937e} style={compositionStyles.n_e6fba3e23d8f937e_text}>
          {"单餐预算"}
        </ObservedText>
        <ObservedText stableId={"preferences.budget.note"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_a60dc885dc704dae} style={compositionStyles.n_a60dc885dc704dae_text}>
          {"单选"}
        </ObservedText>
      </View>
      <View style={compositionStyles.n_42096a1bade00ea8}>
        <View style={compositionStyles.n_8509a1bcb5d3356b}>
          <View style={compositionStyles.n_1e98d7c4d1b0df0e_cell}>
            <ObservedPressable stableId={"preferences.budget.under_20"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={budgetUnder20Label} accessibilityRole={"button"} accessibilityState={budgetUnder20State} onPress={onBudgetUnder20} style={[compositionStyles.n_1e98d7c4d1b0df0e, budgetUnder20Selected && compositionStyles.n_1e98d7c4d1b0df0e_selected]}>
              <Text style={[compositionStyles.n_1e98d7c4d1b0df0e_text, budgetUnder20Selected && compositionStyles.n_1e98d7c4d1b0df0e_text_selected]}>{budgetUnder20Label}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_1e98d7c4d1b0df0e_text, budgetUnder20Selected && compositionStyles.n_1e98d7c4d1b0df0e_text_selected]} visible={budgetUnder20Selected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_38fdb2bee2a01481_cell}>
            <ObservedPressable stableId={"preferences.budget.20_35"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={budget20To35Label} accessibilityRole={"button"} accessibilityState={budget20To35State} onPress={onBudget20To35} style={[compositionStyles.n_38fdb2bee2a01481, budget20To35Selected && compositionStyles.n_38fdb2bee2a01481_selected]}>
              <Text style={[compositionStyles.n_38fdb2bee2a01481_text, budget20To35Selected && compositionStyles.n_38fdb2bee2a01481_text_selected]}>{budget20To35Label}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_38fdb2bee2a01481_text, budget20To35Selected && compositionStyles.n_38fdb2bee2a01481_text_selected]} visible={budget20To35Selected} />
            </ObservedPressable>
          </View>
        </View>
        <View style={compositionStyles.n_04217d393f0e67a5}>
          <View style={compositionStyles.n_087bdfe4aeab86f1_cell}>
            <ObservedPressable stableId={"preferences.budget.35_50"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={budget35To50Label} accessibilityRole={"button"} accessibilityState={budget35To50State} onPress={onBudget35To50} style={[compositionStyles.n_087bdfe4aeab86f1, budget35To50Selected && compositionStyles.n_087bdfe4aeab86f1_selected]}>
              <Text style={[compositionStyles.n_087bdfe4aeab86f1_text, budget35To50Selected && compositionStyles.n_087bdfe4aeab86f1_text_selected]}>{budget35To50Label}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_087bdfe4aeab86f1_text, budget35To50Selected && compositionStyles.n_087bdfe4aeab86f1_text_selected]} visible={budget35To50Selected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_bb95381b6007b803_cell}>
            <ObservedPressable stableId={"preferences.budget.unlimited"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={budgetUnlimitedLabel} accessibilityRole={"button"} accessibilityState={budgetUnlimitedState} onPress={onBudgetUnlimited} style={[compositionStyles.n_bb95381b6007b803, budgetUnlimitedSelected && compositionStyles.n_bb95381b6007b803_selected]}>
              <Text style={[compositionStyles.n_bb95381b6007b803_text, budgetUnlimitedSelected && compositionStyles.n_bb95381b6007b803_text_selected]}>{budgetUnlimitedLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_bb95381b6007b803_text, budgetUnlimitedSelected && compositionStyles.n_bb95381b6007b803_text_selected]} visible={budgetUnlimitedSelected} />
            </ObservedPressable>
          </View>
        </View>
      </View>
    </View>
    <View style={compositionStyles.n_1a6f7dbb2a739bb0}>
      <View style={compositionStyles.n_51542617d34df846}>
        <ObservedText stableId={"preferences.avoid.title"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_c5397ddb2ee6abc8} style={compositionStyles.n_c5397ddb2ee6abc8_text}>
          {"忌口"}
        </ObservedText>
        <ObservedText stableId={"preferences.avoid.note"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_e684b30cbc664fa5} style={compositionStyles.n_e684b30cbc664fa5_text}>
          {"可多选"}
        </ObservedText>
      </View>
      <View style={compositionStyles.n_ff510da3858b7a76}>
        <View style={compositionStyles.n_fae667959eba9139}>
          <View style={compositionStyles.n_31519462063e44ea_cell}>
            <ObservedPressable stableId={"preferences.avoid.cilantro"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={avoidCilantroLabel} accessibilityRole={"button"} accessibilityState={avoidCilantroState} onPress={onAvoidCilantro} style={[compositionStyles.n_31519462063e44ea, avoidCilantroSelected && compositionStyles.n_31519462063e44ea_selected]}>
              <Text style={[compositionStyles.n_31519462063e44ea_text, avoidCilantroSelected && compositionStyles.n_31519462063e44ea_text_selected]}>{avoidCilantroLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_31519462063e44ea_text, avoidCilantroSelected && compositionStyles.n_31519462063e44ea_text_selected]} visible={avoidCilantroSelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_cc15ffb033b3161f_cell}>
            <ObservedPressable stableId={"preferences.avoid.peanut"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={avoidPeanutLabel} accessibilityRole={"button"} accessibilityState={avoidPeanutState} onPress={onAvoidPeanut} style={[compositionStyles.n_cc15ffb033b3161f, avoidPeanutSelected && compositionStyles.n_cc15ffb033b3161f_selected]}>
              <Text style={[compositionStyles.n_cc15ffb033b3161f_text, avoidPeanutSelected && compositionStyles.n_cc15ffb033b3161f_text_selected]}>{avoidPeanutLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_cc15ffb033b3161f_text, avoidPeanutSelected && compositionStyles.n_cc15ffb033b3161f_text_selected]} visible={avoidPeanutSelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_ee0bc98f28f3ddb4_cell}>
            <ObservedPressable stableId={"preferences.avoid.dairy"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={avoidDairyLabel} accessibilityRole={"button"} accessibilityState={avoidDairyState} onPress={onAvoidDairy} style={[compositionStyles.n_ee0bc98f28f3ddb4, avoidDairySelected && compositionStyles.n_ee0bc98f28f3ddb4_selected]}>
              <Text style={[compositionStyles.n_ee0bc98f28f3ddb4_text, avoidDairySelected && compositionStyles.n_ee0bc98f28f3ddb4_text_selected]}>{avoidDairyLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_ee0bc98f28f3ddb4_text, avoidDairySelected && compositionStyles.n_ee0bc98f28f3ddb4_text_selected]} visible={avoidDairySelected} />
            </ObservedPressable>
          </View>
          <View style={compositionStyles.n_4283730847fd91fe_cell}>
            <ObservedPressable stableId={"preferences.avoid.seafood"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={avoidSeafoodLabel} accessibilityRole={"button"} accessibilityState={avoidSeafoodState} onPress={onAvoidSeafood} style={[compositionStyles.n_4283730847fd91fe, avoidSeafoodSelected && compositionStyles.n_4283730847fd91fe_selected]}>
              <Text style={[compositionStyles.n_4283730847fd91fe_text, avoidSeafoodSelected && compositionStyles.n_4283730847fd91fe_text_selected]}>{avoidSeafoodLabel}</Text>
              <CompositionSelectedMark style={[compositionStyles.n_4283730847fd91fe_text, avoidSeafoodSelected && compositionStyles.n_4283730847fd91fe_text_selected]} visible={avoidSeafoodSelected} />
            </ObservedPressable>
          </View>
        </View>
      </View>
    </View>
    <View style={compositionStyles.n_cbd340759a81b260}>
      <ObservedText stableId={"preferences.summary.label"} sourceRef={sourceRef} observationRole={"text"} observationStyle={compositionStyles.n_f4a04e4f2c77fdcc} style={compositionStyles.n_f4a04e4f2c77fdcc_text}>
        {summaryTitleLabel}
      </ObservedText>
      <ObservedText stableId={"preferences.summary"} sourceRef={sourceRef} observationRole={"text"} accessibilityRole={"text"} observationStyle={compositionStyles.n_9702846e66c29683} style={compositionStyles.n_9702846e66c29683_text}>
        {summaryLabel}
      </ObservedText>
      <View pointerEvents="none" style={compositionStyles.n_8550b80d8fa82ba1}>

      </View>
    </View>
  </ScrollView>
  <View style={compositionStyles.n_52bf1efa1edcf677}>
    <ObservedPressable stableId={"preferences.actions.reset"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={"恢复默认"} accessibilityRole={"button"} onPress={resetDraft} style={compositionStyles.n_4004758eebc9bc1c}>
      <Text style={compositionStyles.n_4004758eebc9bc1c_text}>{"恢复默认"}</Text>
    </ObservedPressable>
    <ObservedPressable stableId={"preferences.actions.save"} sourceRef={sourceRef} observationRole={"button"} accessibilityLabel={saveLabel} accessibilityRole={"button"} disabled={saving} onPress={startSaving} style={[compositionStyles.n_6ccd4623363102e6, saveBoxStateStyle]}>
      <Text style={compositionStyles.n_6ccd4623363102e6_text}>{saveLabel}</Text>
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

const compositionStyles = StyleSheet.create({
"n_71bfb7b15fdd1590": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column",
    "backgroundColor": "#FFF9F1",
    "flex": 1
  },
  "n_ecd0f436a76724f6": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "width": "100%",
    "height": 52,
    "alignItems": "center",
    "justifyContent": "center",
    "backgroundColor": "#FFF9F1",
    "borderBottomColor": "#EADFD4",
    "borderBottomWidth": 1
  },
  "n_6697c97efdab17ce": {
    "position": "absolute",
    "flexShrink": 1,
    "flexDirection": "row",
    "height": 44,
    "alignItems": "center",
    "top": 4,
    "left": 20,
    "justifyContent": "center"
  },
  "n_6697c97efdab17ce_text": {
    "fontSize": 16,
    "fontWeight": "600",
    "color": "#B94A00",
    "lineHeight": 22
  },
  "n_2bcdcfb628afca9d": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_2bcdcfb628afca9d_text": {
    "fontSize": 18,
    "fontWeight": "700",
    "color": "#1D1D1D",
    "lineHeight": 24,
    "textAlign": "center"
  },
  "n_3d6e09607f2afdb6": {
    "position": "relative",
    "flexShrink": 1,
    "width": "100%",
    "flexGrow": 1,
    "flexBasis": 0,
    "overflow": "hidden"
  },
  "n_3d6e09607f2afdb6_content": {
    "flexDirection": "column",
    "gap": 25,
    "paddingBottom": 20,
    "paddingLeft": 20,
    "paddingRight": 20,
    "paddingTop": 22
  },
  "n_a27075b4b50704b9": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column"
  },
  "n_19aa0c034e13a5bb": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "marginTop": 0,
    "marginRight": 0,
    "marginBottom": 11,
    "marginLeft": 0,
    "alignItems": "center",
    "justifyContent": "space-between"
  },
  "n_9f028f5f96d98059": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_9f028f5f96d98059_text": {
    "fontSize": 17,
    "fontWeight": "700",
    "color": "#1D1D1D",
    "lineHeight": 22
  },
  "n_df7887907907cd64": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_df7887907907cd64_text": {
    "fontSize": 12,
    "fontWeight": "400",
    "color": "#6B6B6B",
    "lineHeight": 22
  },
  "n_53480d8ea7c5b8c7": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column",
    "gap": 8
  },
  "n_8b47af017916b5ad": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "gap": 8
  },
  "n_fd9734bd6411724e": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_fd9734bd6411724e_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_fd9734bd6411724e_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_fd9734bd6411724e_text_selected": {
    "color": "#B94A00"
  },
  "n_fd9734bd6411724e_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_d26a9225a1e51c20": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_d26a9225a1e51c20_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_d26a9225a1e51c20_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_d26a9225a1e51c20_text_selected": {
    "color": "#B94A00"
  },
  "n_d26a9225a1e51c20_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_a94091c2812d7c23": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_a94091c2812d7c23_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_a94091c2812d7c23_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_a94091c2812d7c23_text_selected": {
    "color": "#B94A00"
  },
  "n_a94091c2812d7c23_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_c958fb81a4defe16": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_c958fb81a4defe16_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_c958fb81a4defe16_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_c958fb81a4defe16_text_selected": {
    "color": "#B94A00"
  },
  "n_c958fb81a4defe16_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_3e64a3cdc02b2d45": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column"
  },
  "n_74c013b255c3b387": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "marginTop": 0,
    "marginRight": 0,
    "marginBottom": 11,
    "marginLeft": 0,
    "alignItems": "center",
    "justifyContent": "space-between"
  },
  "n_e6fba3e23d8f937e": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_e6fba3e23d8f937e_text": {
    "fontSize": 17,
    "fontWeight": "700",
    "color": "#1D1D1D",
    "lineHeight": 22
  },
  "n_a60dc885dc704dae": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_a60dc885dc704dae_text": {
    "fontSize": 12,
    "fontWeight": "400",
    "color": "#6B6B6B",
    "lineHeight": 22
  },
  "n_42096a1bade00ea8": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column",
    "gap": 10
  },
  "n_8509a1bcb5d3356b": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "gap": 10
  },
  "n_1e98d7c4d1b0df0e": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_1e98d7c4d1b0df0e_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_1e98d7c4d1b0df0e_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_1e98d7c4d1b0df0e_text_selected": {
    "color": "#B94A00"
  },
  "n_1e98d7c4d1b0df0e_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_38fdb2bee2a01481": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_38fdb2bee2a01481_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_38fdb2bee2a01481_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_38fdb2bee2a01481_text_selected": {
    "color": "#B94A00"
  },
  "n_38fdb2bee2a01481_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_04217d393f0e67a5": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "gap": 10
  },
  "n_087bdfe4aeab86f1": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_087bdfe4aeab86f1_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_087bdfe4aeab86f1_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_087bdfe4aeab86f1_text_selected": {
    "color": "#B94A00"
  },
  "n_087bdfe4aeab86f1_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_bb95381b6007b803": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_bb95381b6007b803_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_bb95381b6007b803_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_bb95381b6007b803_text_selected": {
    "color": "#B94A00"
  },
  "n_bb95381b6007b803_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_1a6f7dbb2a739bb0": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column"
  },
  "n_51542617d34df846": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "marginTop": 0,
    "marginRight": 0,
    "marginBottom": 11,
    "marginLeft": 0,
    "alignItems": "center",
    "justifyContent": "space-between"
  },
  "n_c5397ddb2ee6abc8": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_c5397ddb2ee6abc8_text": {
    "fontSize": 17,
    "fontWeight": "700",
    "color": "#1D1D1D",
    "lineHeight": 22
  },
  "n_e684b30cbc664fa5": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_e684b30cbc664fa5_text": {
    "fontSize": 12,
    "fontWeight": "400",
    "color": "#6B6B6B",
    "lineHeight": 22
  },
  "n_ff510da3858b7a76": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column",
    "gap": 9
  },
  "n_fae667959eba9139": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "gap": 9
  },
  "n_31519462063e44ea": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_31519462063e44ea_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_31519462063e44ea_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_31519462063e44ea_text_selected": {
    "color": "#B94A00"
  },
  "n_31519462063e44ea_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_cc15ffb033b3161f": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_cc15ffb033b3161f_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_cc15ffb033b3161f_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_cc15ffb033b3161f_text_selected": {
    "color": "#B94A00"
  },
  "n_cc15ffb033b3161f_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_ee0bc98f28f3ddb4": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_ee0bc98f28f3ddb4_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_ee0bc98f28f3ddb4_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_ee0bc98f28f3ddb4_text_selected": {
    "color": "#B94A00"
  },
  "n_ee0bc98f28f3ddb4_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_4283730847fd91fe": {
    "position": "relative",
    "flexShrink": 1,
    "borderColor": "#D8CFC6",
    "borderRadius": 14,
    "borderWidth": 1,
    "minHeight": 44,
    "alignItems": "center",
    "justifyContent": "center",
    "flexDirection": "row",
    "width": "100%",
    "flexGrow": 1
  },
  "n_4283730847fd91fe_text": {
    "fontSize": 14,
    "fontWeight": "400",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_4283730847fd91fe_selected": {
    "backgroundColor": "#FFEBD6",
    "borderColor": "#B94A00",
    "borderWidth": 2
  },
  "n_4283730847fd91fe_text_selected": {
    "color": "#B94A00"
  },
  "n_4283730847fd91fe_cell": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0
  },
  "n_cbd340759a81b260": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "column",
    "width": "100%",
    "height": 64,
    "paddingTop": 10,
    "paddingRight": 14,
    "paddingBottom": 10,
    "paddingLeft": 14,
    "gap": 7,
    "backgroundColor": "#FFEBD6",
    "borderRadius": 16
  },
  "n_f4a04e4f2c77fdcc": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_f4a04e4f2c77fdcc_text": {
    "fontSize": 12,
    "fontWeight": "700",
    "color": "#6B6B6B",
    "lineHeight": 15
  },
  "n_9702846e66c29683": {
    "position": "relative",
    "flexShrink": 1
  },
  "n_9702846e66c29683_text": {
    "fontSize": 15,
    "fontWeight": "600",
    "color": "#1D1D1D",
    "lineHeight": 20
  },
  "n_8550b80d8fa82ba1": {
    "position": "absolute",
    "flexShrink": 1,
    "width": 32,
    "height": 6,
    "right": 12,
    "bottom": 10,
    "backgroundColor": "#FF7300",
    "borderRadius": 3
  },
  "n_52bf1efa1edcf677": {
    "position": "relative",
    "flexShrink": 1,
    "flexDirection": "row",
    "width": "100%",
    "height": 96,
    "paddingTop": 12,
    "paddingRight": 20,
    "paddingBottom": 34,
    "paddingLeft": 20,
    "gap": 12,
    "backgroundColor": "#FFF9F1",
    "borderTopColor": "#EADFD4",
    "borderTopWidth": 1
  },
  "n_4004758eebc9bc1c": {
    "position": "relative",
    "flexShrink": 1,
    "width": 132,
    "height": 50,
    "borderColor": "#D8CFC6",
    "borderRadius": 16,
    "borderWidth": 1,
    "alignItems": "center",
    "justifyContent": "center"
  },
  "n_4004758eebc9bc1c_text": {
    "fontSize": 16,
    "fontWeight": "700",
    "color": "#6B6B6B",
    "lineHeight": 20
  },
  "n_6ccd4623363102e6": {
    "position": "relative",
    "flexShrink": 1,
    "width": "100%",
    "height": 50,
    "flexGrow": 1,
    "flexBasis": 0,
    "backgroundColor": "#FF7300",
    "borderRadius": 16,
    "alignItems": "center",
    "justifyContent": "center"
  },
  "n_6ccd4623363102e6_text": {
    "fontSize": 16,
    "fontWeight": "700",
    "color": "#1D1D1D",
    "lineHeight": 20
  }
});

// BL-195: ChoiceGroup selected mark (prototype CSS ::after); decorative, outside observed text and AX.
function CompositionSelectedMark({ visible, style }: { visible: boolean; style: import("react-native").TextProps["style"] }) {
  if (!visible) return null;
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {"✓"}
    </Text>
  );
}
