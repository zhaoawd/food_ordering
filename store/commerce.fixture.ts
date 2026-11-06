import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * commerce-v1 A01 状态的业务数据，取自冻结设计包 design/commerce-v1（fixtures/、spec/）与
 * .autophone/feature-designs/commerce-v1-a01 的设计决定（D1 游客会员条、D2 订单空态、D3 金额两位小数与门店简称）。
 * 选择文档的 state_id 决定状态配方；没有选择时按默认态（会员）显示。
 */
export const COMMERCE_STATE_IDS = ['home.default.v1', 'home.guest.v1', 'orders.empty.v1'] as const;
export type CommerceStateId = (typeof COMMERCE_STATE_IDS)[number];

export const COMMERCE_FIXTURE = {
  clock: '2026-11-05T12:00:00+08:00',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
  randomSeed: 271105,
  userId: 'user-demo-001',
  store: { id: 'store-demo-001', shortName: '科创园店', distanceLabel: '步行约5分钟' },
  greeting: '午餐时间，把好心情吃回来。',
  hero: { headline: '今天，\n来点热乎的。', eyebrow: 'FRESHLY MADE · 现点现做', productName: '香脆鸡腿堡套餐', priceCents: 3290, tag: '套餐推荐 · 演示活动' },
  featured: [
    { id: 'combo-chicken-001', name: '香脆鸡腿堡套餐', priceCents: 3290 },
    { id: 'combo-beef-002', name: '炙烤牛肉堡套餐', priceCents: 3890 },
  ],
  availableCouponCount: 3,
} as const;

export type CommerceAccount = { kind: 'guest' } | { kind: 'member'; userId: string };

type CommerceState = {
  stateId: CommerceStateId;
  account: CommerceAccount;
  loadFixture: (stateId: CommerceStateId) => void;
};

const accountFor = (stateId: CommerceStateId): CommerceAccount =>
  stateId === 'home.guest.v1' ? { kind: 'guest' } : { kind: 'member', userId: COMMERCE_FIXTURE.userId };

export const commerceStore = createStore<CommerceState>()(set => ({
  stateId: 'home.default.v1',
  account: accountFor('home.default.v1'),
  loadFixture: stateId => set({ stateId, account: accountFor(stateId) }),
}));

export const useCommerceStore = <T,>(selector: (state: CommerceState) => T): T => useStore(commerceStore, selector);

/** 整数分 → ¥元.分（D3）。 */
export const formatCents = (cents: number): string => `¥${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

/** 会员条右侧文案：会员显示可用券数，游客显示登录引导（D1）。 */
export const memberStripAction = (account: CommerceAccount): string =>
  account.kind === 'guest' ? '登录 ›' : `${COMMERCE_FIXTURE.availableCouponCount} 张券 ›`;
