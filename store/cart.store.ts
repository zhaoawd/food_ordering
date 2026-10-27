import { CartCustomization, CartItemType, CartStore } from "@/type";
import { create } from "zustand";

import { cartItemFor, CUSTOMIZABLE_DISH_ID, defaultSelection } from "@/store/dish.catalog";

/** 同一规格单行最多 9 份。 */
export const MAX_LINE_QUANTITY = 9;
/** 这些状态要求购物车初始为空；其他状态沿用会话初值。 */
export const EMPTY_CART_STATE_IDS = [
    "dish.default.fixture-v1",
    "dish.customized.fixture-v1",
    "cart.empty.fixture-v1",
] as const;
/** 优惠券状态必须播种真实购物车（两份标准份），不能只写入展示金额。 */
export const SEEDED_CART_STATE_IDS = [
    "coupons.default.fixture-v1",
    "coupons.selected.fixture-v1",
] as const;

function customizationKey(customizations: CartCustomization[] = []): string {
    return [...customizations].map((c) => c.id).sort().join("+");
}

/** 商品 ID 与规范化定制 ID 集合；加料顺序不影响匹配。 */
export function cartLineKey(item: Pick<CartItemType, "id" | "customizations">): string {
    return `${item.id}.${customizationKey(item.customizations) || "none"}`;
}

/** 商品行 Stable ID，由行键生成，不使用数组下标。 */
export function cartLineStableId(item: Pick<CartItemType, "id" | "customizations">): string {
    return `cart.line.${cartLineKey(item).replace(/:/g, "-")}`;
}

function areCustomizationsEqual(
    a: CartCustomization[] = [],
    b: CartCustomization[] = []
): boolean {
    return customizationKey(a) === customizationKey(b);
}

/** 会话初值：首页购物袋显示 2，对应两份标准份炙烤牛肉拌饭。 */
function sessionItems(): CartItemType[] {
    return [{ ...cartItemFor(CUSTOMIZABLE_DISH_ID, defaultSelection), quantity: 2 }];
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: sessionItems(),
    fixtureNonce: null,

    addItems: (item, quantity) => {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
            return "invalid_quantity";
        }
        const customizations = item.customizations ?? [];
        const existing = get().items.find(
            (i) => i.id === item.id && areCustomizationsEqual(i.customizations, customizations)
        );
        if (existing) {
            // 合并后超限时整笔拒绝，购物车保持原样。
            if (existing.quantity + quantity > MAX_LINE_QUANTITY) return "line_limit";
            set({
                items: get().items.map((i) =>
                    i === existing ? { ...i, quantity: i.quantity + quantity } : i
                ),
            });
        } else {
            set({ items: [...get().items, { ...item, quantity, customizations }] });
        }
        return "added";
    },

    addItem: (item) => {
        get().addItems(item, 1);
    },

    removeItem: (id, customizations = []) => {
        set({
            items: get().items.filter(
                (i) => !(i.id === id && areCustomizationsEqual(i.customizations, customizations))
            ),
        });
    },

    increaseQty: (id, customizations = []) => {
        set({
            items: get().items.map((i) =>
                i.id === id &&
                areCustomizationsEqual(i.customizations, customizations) &&
                i.quantity < MAX_LINE_QUANTITY
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ),
        });
    },

    decreaseQty: (id, customizations = []) => {
        set({
            items: get()
                .items.map((i) =>
                    i.id === id && areCustomizationsEqual(i.customizations, customizations)
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                )
                .filter((i) => i.quantity > 0),
        });
    },

    clearCart: () => set({ items: [] }),

    loadFixture: (stateId, nonce) => {
        if (!nonce) throw new Error("Fixture nonce is required");
        if (get().fixtureNonce === nonce) return;
        if ((EMPTY_CART_STATE_IDS as readonly string[]).includes(stateId)) {
            set({ items: [], fixtureNonce: nonce });
        } else if ((SEEDED_CART_STATE_IDS as readonly string[]).includes(stateId)) {
            set({ items: sessionItems(), fixtureNonce: nonce });
        } else {
            throw new Error(`Unknown cart fixture: ${stateId}`);
        }
    },

    getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

    getTotalPrice: () =>
        get().items.reduce((total, item) => {
            const base = item.price;
            const customPrice =
                item.customizations?.reduce(
                    (s: number, c: CartCustomization) => s + c.price,
                    0
                ) ?? 0;
            return total + item.quantity * (base + customPrice);
        }, 0),
}));
