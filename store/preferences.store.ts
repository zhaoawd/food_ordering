import { create } from "zustand";

// R2 仅保存当前 App 进程内的偏好，不跨冷启动持久化。

export type SpiceLevel = "none" | "mild" | "medium" | "hot";
export type BudgetBand = "under_20" | "20_35" | "35_50" | "unlimited";
export type AvoidItem = "cilantro" | "peanut" | "dairy" | "seafood";

export type Preferences = {
  spice: SpiceLevel;
  budget: BudgetBand;
  avoids: AvoidItem[];
};

export const SPICE_OPTIONS: { value: SpiceLevel; label: string }[] = [
  { value: "none", label: "不辣" },
  { value: "mild", label: "微辣" },
  { value: "medium", label: "中辣" },
  { value: "hot", label: "重辣" },
];

export const BUDGET_OPTIONS: { value: BudgetBand; label: string }[] = [
  { value: "under_20", label: "¥20 以下" },
  { value: "20_35", label: "¥20–35" },
  { value: "35_50", label: "¥35–50" },
  { value: "unlimited", label: "不限" },
];

export const AVOID_OPTIONS: { value: AvoidItem; label: string }[] = [
  { value: "cilantro", label: "香菜" },
  { value: "peanut", label: "花生" },
  { value: "dairy", label: "乳制品" },
  { value: "seafood", label: "海鲜" },
];

export const DEFAULT_PREFERENCES: Preferences = {
  spice: "mild",
  budget: "20_35",
  avoids: [],
};

const SPICE_LABELS = new Map(SPICE_OPTIONS.map((item) => [item.value, item.label]));
const BUDGET_LABELS = new Map(BUDGET_OPTIONS.map((item) => [item.value, item.label]));
const AVOID_LABELS = new Map(AVOID_OPTIONS.map((item) => [item.value, item.label]));

export function clonePreferences(value: Preferences): Preferences {
  return { spice: value.spice, budget: value.budget, avoids: [...value.avoids] };
}

export function isDefaultPreferences(value: Preferences): boolean {
  return (
    value.spice === DEFAULT_PREFERENCES.spice
    && value.budget === DEFAULT_PREFERENCES.budget
    && value.avoids.length === 0
  );
}

/** §5.4：0 项「无忌口」、1 项「不吃{选项}」、2 项以上「{数量} 项忌口」。 */
export function avoidSummary(avoids: AvoidItem[]): string {
  if (avoids.length === 0) return "无忌口";
  if (avoids.length === 1) return `不吃${AVOID_LABELS.get(avoids[0])}`;
  return `${avoids.length} 项忌口`;
}

export function preferenceSummary(value: Preferences): string {
  const spice = SPICE_LABELS.get(value.spice);
  const budget = BUDGET_LABELS.get(value.budget);
  return `${spice} · ${budget} · ${avoidSummary(value.avoids)}`;
}

type PreferencesState = {
  saved: Preferences | null;
  commit: (value: Preferences) => void;
};

const usePreferencesStore = create<PreferencesState>((set) => ({
  saved: null,
  commit: (value) => set({ saved: clonePreferences(value) }),
}));

export default usePreferencesStore;
