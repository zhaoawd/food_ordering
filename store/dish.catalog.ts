import type { CartCustomization, CartItemType } from '@/type';

/** 所有金额为整数分。 */
export const dishes = {
  'beef-bowl-001': { name: '炙烤牛肉拌饭', description: '热乎 · 微辣 · 25–35 分钟送达', basePriceCents: 3200 },
  'chicken-bowl-002': { name: '香辣鸡腿拌饭', description: '焦香 · 微辣 · 20–30 分钟送达', basePriceCents: 2900 },
} as const;
export type DishId = keyof typeof dishes;
/** 本轮只有炙烤牛肉拌饭提供规格页。 */
export const CUSTOMIZABLE_DISH_ID: DishId = 'beef-bowl-001';

export const portionOptions = [
  { value: 'standard', label: '标准份', name: '标准份', priceCents: 0 },
  { value: 'large', label: '大份 +¥6', name: '大份', priceCents: 600 },
] as const;
export const extraOptions = [
  { value: 'egg', label: '加蛋 +¥3', name: '加蛋', priceCents: 300 },
  { value: 'tofu', label: '豆腐 +¥4', name: '豆腐', priceCents: 400 },
  { value: 'vegetables', label: '蔬菜 +¥5', name: '蔬菜', priceCents: 500 },
] as const;
export type Portion = (typeof portionOptions)[number]['value'];
export type Extra = (typeof extraOptions)[number]['value'];
export type DishSelection = { portion: Portion; extras: Extra[]; quantity: number };

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 9;
export const defaultSelection: DishSelection = { portion: 'standard', extras: [], quantity: 1 };

export function isDishId(value: unknown): value is DishId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(dishes, value);
}

const portionOf = (value: Portion) => portionOptions.find(option => option.value === value)!;
/** 加料按选项表顺序排列，与点击顺序无关。 */
const extrasOf = (values: readonly Extra[]) => extraOptions.filter(option => values.includes(option.value));

export function unitPriceCents(dishId: DishId, selection: Pick<DishSelection, 'portion' | 'extras'>): number {
  return dishes[dishId].basePriceCents + portionOf(selection.portion).priceCents
    + extrasOf(selection.extras).reduce((sum, option) => sum + option.priceCents, 0);
}

export function totalCents(dishId: DishId, selection: DishSelection): number {
  return unitPriceCents(dishId, selection) * selection.quantity;
}

/** 整数分显示为人民币：整元不带小数。 */
export function formatYuan(cents: number): string {
  return cents % 100 === 0 ? `¥${cents / 100}` : `¥${(cents / 100).toFixed(2)}`;
}

export function specSummary(selection: Pick<DishSelection, 'portion' | 'extras'>): string {
  const extras = extrasOf(selection.extras).map(option => option.name);
  return `${portionOf(selection.portion).name} · ${extras.length ? extras.join('、') : '不加料'}`;
}

export function selectionSummary(selection: DishSelection): string {
  return `${specSummary(selection)} · ${selection.quantity} 份`;
}

/** 份量总是一项定制，标准份与大份因此形成不同的行。 */
export function cartItemFor(dishId: DishId, selection: Pick<DishSelection, 'portion' | 'extras'>): Omit<CartItemType, 'quantity'> {
  const portion = portionOf(selection.portion);
  const customizations: CartCustomization[] = [
    { id: `portion:${portion.value}`, name: portion.name, price: portion.priceCents, type: 'portion' },
    ...extrasOf(selection.extras).map(option => ({
      id: `extra:${option.value}`, name: option.name, price: option.priceCents, type: 'extra',
    })),
  ];
  return { id: dishId, name: dishes[dishId].name, price: dishes[dishId].basePriceCents, image_url: '', customizations };
}

/** 从购物车行的定制 ID 还原规格；无法识别的定制按原名称列出。 */
export function lineSpecSummary(item: Pick<CartItemType, 'customizations'>): string {
  const ids = (item.customizations ?? []).map(c => c.id);
  const portion = portionOptions.find(option => ids.includes(`portion:${option.value}`));
  const extras = extraOptions.filter(option => ids.includes(`extra:${option.value}`)).map(option => option.value);
  if (portion) return specSummary({ portion: portion.value, extras });
  return (item.customizations ?? []).map(c => c.name).join('、') || '不加料';
}
