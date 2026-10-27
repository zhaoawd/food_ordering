import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ObservedPressable,
  ObservedText,
  ObservedView,
} from "@/verification/observation";
import { cartLineStableId, useCartStore } from "@/store/cart.store";
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
  const removeItem = useCartStore((state) => state.removeItem);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + lineTotalCents(item), 0);
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
          return (
            <ObservedView key={id} stableId={id} sourceRef={sourceRef} observationRole="group" style={lineStyles.line}>
              <View style={lineStyles.lineText}>
                <ObservedText stableId={`${id}.name`} sourceRef={sourceRef} observationRole="text" style={lineStyles.name}>{item.name}</ObservedText>
                <ObservedText stableId={`${id}.spec`} sourceRef={sourceRef} observationRole="text" style={lineStyles.meta}>{lineSpecSummary(item)}</ObservedText>
                <ObservedText stableId={`${id}.quantity`} sourceRef={sourceRef} observationRole="text" style={lineStyles.meta}>{`${item.quantity} 份`}</ObservedText>
              </View>
              <View style={lineStyles.lineSide}>
                <ObservedText stableId={`${id}.subtotal`} sourceRef={sourceRef} observationRole="text" style={lineStyles.price}>{formatYuan(lineTotalCents(item))}</ObservedText>
                <ObservedPressable stableId={`${id}.remove`} sourceRef={sourceRef} observationRole="button" accessibilityRole="button" accessibilityLabel={`删除${item.name}`} onPress={() => removeItem(item.id, item.customizations ?? [])} style={lineStyles.remove}>
                  <Text style={lineStyles.removeLabel}>删除</Text>
                </ObservedPressable>
              </View>
            </ObservedView>
          );
        })}
      </ScrollView>
      <View style={lineStyles.footer}>
        <View style={lineStyles.summaryRow}>
          <Text style={lineStyles.name}>共</Text>
          <ObservedText stableId="cart.summary.quantity" sourceRef={sourceRef} observationRole="text" style={lineStyles.name}>{String(quantity)}</ObservedText>
          <Text style={lineStyles.name}>件</Text>
          <View style={lineStyles.spacer} />
          <ObservedText stableId="cart.summary.subtotal" sourceRef={sourceRef} observationRole="text" style={lineStyles.price}>{formatYuan(subtotal)}</ObservedText>
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
});
