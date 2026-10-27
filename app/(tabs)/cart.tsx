import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ObservedPressable,
  ObservedText,
  ObservedView,
} from "@/verification/observation";
import { cartLineStableId, MAX_LINE_QUANTITY, useCartStore } from "@/store/cart.store";
import { computeBill, couponLabel, formatDiscount, useCouponStore } from "@/store/coupon.store";
import { formatYuan, lineSpecSummary } from "@/store/dish.catalog";
import type { CartItemType } from "@/type";

// 评测靶的第二个状态：空购物车。
//
// 刻意不从 fixture 播种购物车内容——空态不需要播种就是确定的，而播种会把"购物车里有
// 什么"变成又一个必须冻结的输入。第二个状态要证明的是 Driver 能复现并采集**另一个屏**，
// 不是购物车业务本身。
//
// 三个观测元素的取值全部写成 `StyleSheet.create` 里的字面量而不是工具类名：M5c 的写回
// 策略靠 `key: value` 唯一定位，NativeWind 的 `text-[#6B6B6B]` 这类写法定位不到（§9 M5c
// 的已知边界）。上游的购物车屏正是工具类名写法，所以这屏由评测模板整份接管之后，样式缺陷
// 才和文案缺陷一样可修。
const sourceRef = {
  file: "app/(tabs)/cart.tsx",
  symbol: "Cart",
} as const;

export default function Cart() {
  const items = useCartStore((state) => state.items);
  if (items.length > 0) return <CartLines items={items} />;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header} testID="cart.header">
        <ObservedText
          observationRole="text"
          sourceRef={sourceRef}
          stableId="cart.header.title"
          style={styles.headerTitle}
        >
          购物车
        </ObservedText>
      </View>

      <View style={styles.body} testID="cart.body">
        <ObservedView
          accessibilityLabel="空购物车图形"
          accessibilityRole="image"
          accessible
          observationRole="decoration"
          sourceRef={sourceRef}
          stableId="cart.empty.icon"
          style={styles.emptyIcon}
        />

        <ObservedText
          observationRole="text"
          observationStyle={styles.emptyMessageFrame}
          sourceRef={sourceRef}
          stableId="cart.empty.message"
          style={styles.emptyMessage}
        >
          购物车还是空的
        </ObservedText>

        <ObservedPressable
          accessibilityLabel="去逛逛"
          accessibilityRole="button"
          observationRole="button"
          onPress={() => router.push("/")}
          sourceRef={sourceRef}
          stableId="cart.empty.primary_action"
          style={styles.primaryAction}
        >
          <Text style={styles.primaryActionLabel}>去逛逛</Text>
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
    height: 44.33,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#1D1D1D",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  body: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 96,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#FFEBD6",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  emptyMessage: {
    color: "#6B6B6B",
    fontSize: 16,
    lineHeight: 21.67,
  },
  emptyMessageFrame: {
    height: 21.67,
    marginTop: 18,
    width: 112,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#E5432B",
    borderRadius: 16,
    height: 50,
    justifyContent: "center",
    marginTop: 26,
    width: 220,
  },
  primaryActionLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
});

const lineTotalCents = (item: CartItemType) =>
  item.quantity *
  (item.price + (item.customizations ?? []).reduce((sum, c) => sum + c.price, 0));

// 非空购物车没有设计参考图；空态的元素、文案与样式保持上面的原样。
function CartLines({ items }: { items: CartItemType[] }) {
  const { removeItem, increaseQty, decreaseQty } = useCartStore();
  const applied = useCouponStore((state) => state.applied);
  const invalidated = useCouponStore((state) => state.invalidated);
  const bill = computeBill(items, applied);
  const text = (stableId: string, value: string, style: object) => (
    <ObservedText stableId={stableId} sourceRef={sourceRef} observationRole="text" style={style}>{value}</ObservedText>
  );
  const stepper = (stableId: string, label: string, accessibilityLabel: string, disabled: boolean, onPress: () => void) => (
    <ObservedPressable stableId={stableId} sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[lineStyles.stepper, disabled && lineStyles.stepperDisabled]}>
      <Text style={[lineStyles.stepperLabel, disabled && lineStyles.stepperLabelDisabled]}>{label}</Text>
    </ObservedPressable>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header} testID="cart.header">
        <ObservedText observationRole="text" sourceRef={sourceRef} stableId="cart.header.title" style={styles.headerTitle}>
          购物车
        </ObservedText>
      </View>
      <ScrollView contentContainerStyle={lineStyles.list}>
        {items.map((item) => {
          const id = cartLineStableId(item);
          const customizations = item.customizations ?? [];
          return (
            <ObservedView key={id} stableId={id} sourceRef={sourceRef} observationRole="group" style={lineStyles.line}>
              <View style={lineStyles.lineText}>
                {text(`${id}.name`, item.name, lineStyles.name)}
                {text(`${id}.spec`, lineSpecSummary(item), lineStyles.meta)}
                <View style={lineStyles.quantityRow}>
                  {stepper(`${id}.decrease`, "−", `减少${item.name}`, false, () => decreaseQty(item.id, customizations))}
                  {text(`${id}.quantity`, `${item.quantity} 份`, lineStyles.meta)}
                  {stepper(`${id}.increase`, "+", `增加${item.name}`, item.quantity >= MAX_LINE_QUANTITY, () => increaseQty(item.id, customizations))}
                </View>
              </View>
              <View style={lineStyles.lineSide}>
                {text(`${id}.subtotal`, formatYuan(lineTotalCents(item)), lineStyles.price)}
                <ObservedPressable stableId={`${id}.remove`} sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel={`删除${item.name}`} onPress={() => removeItem(item.id, customizations)} style={lineStyles.remove}>
                  <Text style={lineStyles.removeLabel}>删除</Text>
                </ObservedPressable>
              </View>
            </ObservedView>
          );
        })}
        <View style={lineStyles.bill}>
          <ObservedPressable stableId="cart.coupon.entry" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel={`优惠券，${couponLabel(applied)}`} onPress={() => router.push("/coupons")} style={lineStyles.billRow}>
            <Text style={lineStyles.name}>优惠券</Text>
            <Text style={lineStyles.meta}>{`${couponLabel(applied)} ›`}</Text>
          </ObservedPressable>
          {invalidated && text("cart.coupon.notice", "优惠券已失效，请重新选择", lineStyles.notice)}
          <View style={lineStyles.billRow}>
            <Text style={lineStyles.meta}>商品金额</Text>
            {text("cart.summary.subtotal", formatYuan(bill.subtotalCents), lineStyles.amount)}
          </View>
          <View style={lineStyles.billRow}>
            <Text style={lineStyles.meta}>包装费</Text>
            {text("cart.summary.packaging", formatYuan(bill.packagingCents), lineStyles.amount)}
          </View>
          <View style={lineStyles.billRow}>
            <Text style={lineStyles.meta}>配送费</Text>
            {text("cart.summary.delivery", formatYuan(bill.deliveryCents), lineStyles.amount)}
          </View>
          <View style={lineStyles.billRow}>
            <Text style={lineStyles.meta}>优惠</Text>
            {text("cart.summary.discount", formatDiscount(bill.discountCents), lineStyles.discount)}
          </View>
        </View>
      </ScrollView>
      <View style={lineStyles.footer}>
        <View style={lineStyles.summaryRow}>
          <Text style={lineStyles.name}>共</Text>
          {text("cart.summary.quantity", String(bill.quantity), lineStyles.name)}
          <Text style={lineStyles.name}>件 · 应付</Text>
          <View style={lineStyles.spacer} />
          {text("cart.summary.payable", formatYuan(bill.payableCents), lineStyles.price)}
        </View>
        <ObservedPressable stableId="cart.continue" sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel="继续选购" onPress={() => router.navigate("/")} style={lineStyles.continue}>
          <Text style={lineStyles.continueLabel}>继续选购</Text>
        </ObservedPressable>
      </View>
    </SafeAreaView>
  );
}

const lineStyles = StyleSheet.create({
  list: { gap: 12, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 },
  line: { backgroundColor: "#FFFFFF", borderRadius: 16, flexDirection: "row", gap: 12, padding: 16 },
  lineText: { flex: 1, gap: 4 },
  lineSide: { alignItems: "flex-end", gap: 8, justifyContent: "space-between" },
  name: { color: "#241713", fontSize: 16, fontWeight: "600", lineHeight: 22 },
  meta: { color: "#77655F", fontSize: 13, lineHeight: 20 },
  price: { color: "#E6472F", fontSize: 18, fontWeight: "700", lineHeight: 24 },
  remove: { borderColor: "#E8DCD3", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  removeLabel: { color: "#77655F", fontSize: 13, lineHeight: 18 },
  footer: { backgroundColor: "#FFFFFF", borderTopColor: "#E8DCD3", borderTopWidth: 1, gap: 12, paddingHorizontal: 22, paddingVertical: 16 },
  summaryRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  spacer: { flex: 1 },
  continue: { alignItems: "center", backgroundColor: "#E6472F", borderRadius: 16, height: 48, justifyContent: "center" },
  continueLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", lineHeight: 22 },
  quantityRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  stepper: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E8DCD3", borderRadius: 10, borderWidth: 1, height: 32, justifyContent: "center", width: 32 },
  stepperDisabled: { backgroundColor: "#F3ECE6" },
  stepperLabel: { color: "#E6472F", fontSize: 15, fontWeight: "600", lineHeight: 22 },
  stepperLabelDisabled: { color: "#77655F" },
  bill: { backgroundColor: "#FFFFFF", borderRadius: 16, gap: 8, padding: 16 },
  billRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  amount: { color: "#241713", fontSize: 15, lineHeight: 22 },
  discount: { color: "#E6472F", fontSize: 15, fontWeight: "600", lineHeight: 22 },
  notice: { color: "#E6472F", fontSize: 13, lineHeight: 20 },
});
