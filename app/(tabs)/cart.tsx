import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ObservedPressable,
  ObservedText,
  ObservedView,
} from "@/verification/observation";

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
