import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const spiceOptions = [
  { value: 'none', label: '不辣' },
  { value: 'mild', label: '微辣' },
  { value: 'hot', label: '中辣' },
] as const;
export const avoidOptions = [
  { value: 'coriander', label: '香菜' },
  { value: 'onion', label: '洋葱' },
  { value: 'peanut', label: '花生' },
] as const;
export const budgetOptions = [
  { value: 'under30', label: '¥30 内' },
  { value: 'under40', label: '¥40 内' },
  { value: 'any', label: '不限' },
] as const;
export type Spice = (typeof spiceOptions)[number]['value'];
export type Avoid = (typeof avoidOptions)[number]['value'];
export type Budget = (typeof budgetOptions)[number]['value'];
export type Preferences = { spice: Spice; avoid: Avoid[]; budget: Budget };

export const MAX_AVOID = 2;
export const defaultPreferences: Preferences = { spice: 'mild', avoid: [], budget: 'under40' };
export const PREFERENCES_STATE_IDS = ['preferences.default.fixture-v2', 'preferences.edited.fixture-v2'] as const;

const labelOf = <T extends string>(options: readonly { value: T; label: string }[], value: T) =>
  options.find(option => option.value === value)!.label;

/** 摘要里的忌口始终按选项表顺序排列，不按点击顺序。 */
export function preferenceSummary(preferences: Preferences): string {
  const avoid = avoidOptions.filter(option => preferences.avoid.includes(option.value)).map(option => option.label);
  return [
    labelOf(spiceOptions, preferences.spice),
    avoid.length ? `不要${avoid.join('、')}` : '无忌口',
    labelOf(budgetOptions, preferences.budget),
  ].join(' · ');
}

type PreferencesState = {
  committed: Preferences;
  draft: Preferences;
  avoidLimitReached: boolean;
  fixtureNonce: string | null;
  beginEditing: () => void;
  selectSpice: (value: Spice) => void;
  toggleAvoid: (value: Avoid) => void;
  selectBudget: (value: Budget) => void;
  resetDraft: () => void;
  save: () => void;
  cancel: () => void;
  loadFixture: (stateId: string, nonce: string) => void;
};

const copy = (value: Preferences): Preferences => ({ ...value, avoid: [...value.avoid] });

function assertOption(options: readonly { value: string }[], value: string, kind: string) {
  if (!options.some(option => option.value === value)) throw new Error(`Unknown ${kind}: ${value}`);
}

export function createPreferencesStore() {
  return createStore<PreferencesState>((set, get) => ({
    committed: copy(defaultPreferences),
    draft: copy(defaultPreferences),
    avoidLimitReached: false,
    fixtureNonce: null,
    beginEditing: () => set({ draft: copy(get().committed), avoidLimitReached: false }),
    selectSpice: (value) => {
      assertOption(spiceOptions, value, 'spice');
      set({ draft: { ...get().draft, spice: value } });
    },
    toggleAvoid: (value) => {
      assertOption(avoidOptions, value, 'avoid');
      const { draft } = get();
      if (draft.avoid.includes(value)) {
        set({ draft: { ...draft, avoid: draft.avoid.filter(item => item !== value) }, avoidLimitReached: false });
      } else if (draft.avoid.length >= MAX_AVOID) {
        set({ avoidLimitReached: true });
      } else {
        set({ draft: { ...draft, avoid: [...draft.avoid, value] } });
      }
    },
    selectBudget: (value) => {
      assertOption(budgetOptions, value, 'budget');
      set({ draft: { ...get().draft, budget: value } });
    },
    resetDraft: () => set({ draft: copy(defaultPreferences), avoidLimitReached: false }),
    save: () => set({ committed: copy(get().draft), avoidLimitReached: false }),
    cancel: () => set({ draft: copy(get().committed), avoidLimitReached: false }),
    loadFixture: (stateId, nonce) => {
      if (!(PREFERENCES_STATE_IDS as readonly string[]).includes(stateId)) {
        throw new Error(`Unknown preferences fixture: ${stateId}`);
      }
      if (!nonce) throw new Error('Fixture nonce is required');
      if (get().fixtureNonce === nonce) return;
      // 两个状态的初始 committed 都是默认值；变更态由真实点击产生，不预写草稿。
      set({
        committed: copy(defaultPreferences),
        draft: copy(defaultPreferences),
        avoidLimitReached: false,
        fixtureNonce: nonce,
      });
    },
  }));
}
export const preferencesStore = createPreferencesStore();
export function usePreferencesStore<T>(selector: (state: PreferencesState) => T): T {
  return useStore(preferencesStore, selector);
}
