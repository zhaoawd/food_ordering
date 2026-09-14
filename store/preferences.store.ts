import { create } from "zustand";

// 饮食偏好的进程内状态。§4.2 明确不跨冷启动持久化，所以这里**只**是一个 zustand store：
// 没有 AsyncStorage，没有 Appwrite。冷启动回到默认值是需求本身，不是缺陷。
//
// 摘要格式化函数放在这里而不是各屏自己拼：首页与编辑页显示的是同一句话，两处各写一遍
// 就会出现"编辑页说 2 项忌口、首页说不吃香菜"这种只有真跑起来才发现的分叉。

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
  /** 最近保存值；`null` 表示本次进程内还没有保存过，首页因此不渲染摘要行。 */
  saved: Preferences | null;
  /** 保存成功后的轻量提示是否可见。 */
  notice: boolean;
  commit: (value: Preferences) => void;
  dismissNotice: () => void;
};

const usePreferencesStore = create<PreferencesState>((set) => ({
  saved: null,
  notice: false,
  commit: (value) => set({ saved: clonePreferences(value), notice: true }),
  dismissNotice: () => set({ notice: false }),
}));

export default usePreferencesStore;
