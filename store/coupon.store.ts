import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { useCartStore } from '@/store/cart.store';
import { formatYuan } from '@/store/dish.catalog';
import type { CartItemType } from '@/type';

/** 所有金额为整数分。门槛只看商品及规格加价合计，包含等于。 */
export const coupons = [
  { id: 'save6', label: '满 ¥32 减 ¥6', thresholdCents: 3200, discountCents: 600 },
  { id: 'save10', label: '满 ¥60 减 ¥10', thresholdCents: 6000, discountCents: 1000 },
  { id: 'save20', label: '满 ¥100 减 ¥20', thresholdCents: 10000, discountCents: 2000 },
] as const;
export type CouponId = (typeof coupons)[number]['id'];
export type CouponChoice = CouponId | 'none';
export const NO_COUPON_LABEL = '不使用优惠券';
export const PACKAGING_CENTS_PER_ITEM = 200;
export const DELIVERY_CENTS = 300;
export const COUPON_STATE_IDS = ['coupons.default.fixture-v1', 'coupons.selected.fixture-v1'] as const;

export type Bill = {
  quantity: number;
  subtotalCents: number;
  packagingCents: number;
  deliveryCents: number;
  discountCents: number;
  payableCents: number;
};

const couponOf = (id: CouponId) => coupons.find(coupon => coupon.id === id)!;

/** 优惠以“−¥N”显示；无优惠显示“¥0”。 */
export function formatDiscount(cents: number): string {
  return cents > 0 ? `−${formatYuan(cents)}` : formatYuan(0);
}

export function couponLabel(choice: CouponChoice): string {
  return choice === 'none' ? NO_COUPON_LABEL : couponOf(choice).label;
}

export function subtotalCents(items: readonly CartItemType[]): number {
  return items.reduce((sum, item) =>
    sum + item.quantity * (item.price + (item.customizations ?? []).reduce((s, c) => s + c.price, 0)), 0);
}

export function isCouponAvailable(choice: CouponChoice, items: readonly CartItemType[]): boolean {
  if (choice === 'none') return true;
  return items.length > 0 && subtotalCents(items) >= couponOf(choice).thresholdCents;
}

/** 距离门槛还差多少分；已可用时为 0。 */
export function shortfallCents(id: CouponId, items: readonly CartItemType[]): number {
  return Math.max(0, couponOf(id).thresholdCents - subtotalCents(items));
}

export function computeBill(items: readonly CartItemType[], choice: CouponChoice): Bill {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = subtotalCents(items);
  const packaging = quantity * PACKAGING_CENTS_PER_ITEM;
  const delivery = items.length > 0 ? DELIVERY_CENTS : 0;
  const discount = choice !== 'none' && isCouponAvailable(choice, items) ? couponOf(choice).discountCents : 0;
  return {
    quantity,
    subtotalCents: subtotal,
    packagingCents: packaging,
    deliveryCents: delivery,
    discountCents: discount,
    payableCents: Math.max(0, subtotal + packaging + delivery - discount),
  };
}

type CouponState = {
  applied: CouponChoice;
  draft: CouponChoice;
  /** 已保存的券因购物车变化失效；下次确认选券时清除。 */
  invalidated: boolean;
  /** 确认时按当前购物车校验失败。 */
  confirmRejected: boolean;
  fixtureNonce: string | null;
  beginEditing: () => void;
  selectDraft: (choice: CouponChoice, items: readonly CartItemType[]) => void;
  confirm: (items: readonly CartItemType[]) => boolean;
  cancel: () => void;
  reconcile: (items: readonly CartItemType[]) => void;
  loadFixture: (stateId: string, nonce: string) => void;
};

function assertChoice(choice: string): asserts choice is CouponChoice {
  if (choice !== 'none' && !coupons.some(coupon => coupon.id === choice)) {
    throw new Error(`Unknown coupon: ${choice}`);
  }
}

export function createCouponStore() {
  return createStore<CouponState>((set, get) => ({
    applied: 'none',
    draft: 'none',
    invalidated: false,
    confirmRejected: false,
    fixtureNonce: null,
    beginEditing: () => set({ draft: get().applied, confirmRejected: false }),
    selectDraft: (choice, items) => {
      assertChoice(choice);
      if (isCouponAvailable(choice, items)) set({ draft: choice, confirmRejected: false });
    },
    confirm: (items) => {
      const { draft } = get();
      if (!isCouponAvailable(draft, items)) {
        set({ draft: 'none', confirmRejected: true });
        return false;
      }
      set({ applied: draft, invalidated: false, confirmRejected: false });
      return true;
    },
    cancel: () => set({ draft: get().applied, confirmRejected: false }),
    reconcile: (items) => {
      if (items.length === 0) {
        // 空购物车恢复不使用优惠券；空态不显示失效提示。
        set({ applied: 'none', invalidated: false });
        return;
      }
      const { applied } = get();
      if (applied !== 'none' && !isCouponAvailable(applied, items)) {
        set({ applied: 'none', invalidated: true });
      }
    },
    loadFixture: (stateId, nonce) => {
      if (!(COUPON_STATE_IDS as readonly string[]).includes(stateId)) {
        throw new Error(`Unknown coupon fixture: ${stateId}`);
      }
      if (!nonce) throw new Error('Fixture nonce is required');
      if (get().fixtureNonce === nonce) return;
      // 两个状态的已应用券都是 none；选中态由真实点击产生。
      set({ applied: 'none', draft: 'none', invalidated: false, confirmRejected: false, fixtureNonce: nonce });
    },
  }));
}
export const couponStore = createCouponStore();
// 购物车每次变化都按当前商品金额校验已应用的券。
useCartStore.subscribe(state => couponStore.getState().reconcile(state.items));
export function useCouponStore<T>(selector: (state: CouponState) => T): T {
  return useStore(couponStore, selector);
}
