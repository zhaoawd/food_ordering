import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ObservedPressable,
  ObservedText,
  ObservedView,
} from "@/verification/observation";
import usePreferencesStore, { preferenceSummary } from "@/store/preferences.store";
import { useFoodOrderingEvalFixture } from "@/verification/useEvalFixture";

const recommendations = [
  {
    title: "炙烤牛肉拌饭",
    attributes: "热乎、微辣，预计 30 分钟送达",
    price: 32,
    savings: 6,
    eta: "25–35 分钟",
    match: 96,
  },
  {
    title: "香辣鸡腿拌饭",
    attributes: "焦香、微辣，预计 28 分钟送达",
    price: 29,
    savings: 4,
    eta: "20–30 分钟",
    match: 93,
  },
] as const;

const tabs = [
  {
    id: "home",
    stableId: "home.navigation.home",
    label: "首页",
    icon: "home",
    route: null,
  },
  {
    id: "discover",
    stableId: "home.navigation.discover",
    label: "发现",
    icon: "compass-outline",
    route: null,
  },
  {
    id: "orders",
    stableId: "home.navigation.orders",
    label: "订单",
    icon: "receipt-outline",
    route: "/cart",
  },
  {
    id: "profile",
    stableId: "home.navigation.profile",
    label: "我的",
    icon: "person-outline",
    route: null,
  },
] as const;

type PromptState = "idle" | "submitting" | "ready";
type CtaState = "idle" | "loading" | "success";
type TabId = (typeof tabs)[number]["id"];

const sourceRef = {
  file: "app/(tabs)/index.tsx",
  symbol: "Index",
} as const;

const sourceRef_home_header_location = {
  file: "verification/fixture.ts",
  symbol: "baselineFixture",
} as const;

const sourceRef_home_recommendation_primary_action = {
  file: "app/(tabs)/index.tsx",
  symbol: "Index",
} as const;

const sourceRef_home_recommendation_title = {
  file: "app/(tabs)/index.tsx",
  symbol: "Index",
} as const;

export default function Index() {
  const evaluation = useFoodOrderingEvalFixture();
  const savedPreferences = usePreferencesStore((state) => state.saved);
  const [prompt, setPrompt] = useState("");
  const [promptState, setPromptState] = useState<PromptState>("idle");
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [ctaState, setCtaState] = useState<CtaState>("idle");
  const [cartCount, setCartCount] = useState(2);
  const [activeTab, setActiveTab] = useState<TabId>("home");

  const recommendation = recommendations[recommendationIndex];
  const promptButtonLabel =
    promptState === "submitting"
      ? "正在生成推荐"
      : promptState === "ready"
        ? "推荐已更新"
        : "提交饮食偏好";

  useEffect(() => {
    if (promptState !== "submitting") return undefined;
    const timer = setTimeout(() => setPromptState("ready"), 650);
    return () => clearTimeout(timer);
  }, [promptState]);

  useEffect(() => {
    if (!isSwapping) return undefined;
    const timer = setTimeout(() => {
      setRecommendationIndex(
        (current) => (current + 1) % recommendations.length,
      );
      setIsSwapping(false);
    }, 520);
    return () => clearTimeout(timer);
  }, [isSwapping]);

  useEffect(() => {
    if (ctaState === "loading") {
      const timer = setTimeout(() => {
        setCartCount(3);
        setCtaState("success");
      }, 220);
      return () => clearTimeout(timer);
    }
    if (ctaState === "success") {
      const timer = setTimeout(() => setCtaState("idle"), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [ctaState]);

  const paginationLabel = useMemo(
    () => `${recommendationIndex + 1} / 4`,
    [recommendationIndex],
  );

  if (evaluation.status !== "ready") return null;
  const { home } = evaluation.fixture;

  const submitPrompt = () => {
    if (promptState === "submitting") return;
    Keyboard.dismiss();
    setPromptState("submitting");
  };
  const primaryActionLabel =
    ctaState === "loading"
      ? "正在加入"
      : ctaState === "success"
        ? "已加入购物袋"
        : "立即下单";

  return (
    <SafeAreaView edges={["top"]} style={styles.screen} testID="home.root">
      <View style={styles.intro}>
        <View style={styles.headerActions}>
          <ObservedPressable
            stableId="home.header.location"
            sourceRef={sourceRef_home_header_location}
            observationRole="button"
            accessibilityLabel={home.location}
            style={[
              styles.locationButton,
              {
                marginTop: home.headerSpacing,
                transform: [{ translateY: home.locationTranslateY }],
              },
            ]}
          >
            <Text
              style={[
                styles.locationLabel,
                { fontSize: home.locationFontSize },
              ]}
            >
              {home.location}
            </Text>
          </ObservedPressable>
          <ObservedPressable
            stableId="home.header.cart"
            sourceRef={sourceRef}
            observationRole="button"
            accessibilityLabel={`袋 ${cartCount}`}
            accessibilityHint={`购物袋，${cartCount} 件商品`}
            style={styles.cartButton}
          >
            <Text style={styles.cartIcon}>袋</Text>
            <ObservedView
              stableId="home.header.cart_badge"
              sourceRef={sourceRef}
              observationRole="text"
              accessible
              style={styles.cartBadge}
            >
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </ObservedView>
          </ObservedPressable>
        </View>
        <ObservedText
          stableId="home.brand.wordmark"
          sourceRef={sourceRef}
          observationRole="text"
          accessible
          observationStyle={styles.brandObservation}
          style={styles.brand}
        >
          Food AI
        </ObservedText>
        <ObservedText
          stableId="home.hero.headline"
          sourceRef={sourceRef}
          observationRole="text"
          accessible
          observationStyle={styles.headlineObservation}
          style={styles.headline}
        >
          今晚，好好吃一顿
        </ObservedText>
        <ObservedView
          stableId="home.ai_prompt"
          sourceRef={sourceRef}
          observationRole="group"
          style={styles.promptShell}
        >
          <ObservedView
            stableId="home.ai_prompt.input"
            sourceRef={sourceRef}
            observationRole="textbox"
            accessible
            accessibilityLabel={prompt || "想吃热乎的、微辣、别太油"}
            accessibilityHint="饮食偏好"
            style={styles.promptInputObservation}
          >
            <Text style={styles.hiddenText}>
              {prompt || "想吃热乎的、微辣、别太油"}
            </Text>
            <TextInput
              accessibilityLabel="饮食偏好"
              onChangeText={(value) => {
                setPrompt(value);
                if (promptState === "ready") setPromptState("idle");
              }}
              onSubmitEditing={submitPrompt}
              placeholder="想吃热乎的、微辣、别太油"
              placeholderTextColor="#77655F"
              returnKeyType="go"
              style={styles.promptInput}
              value={prompt}
            />
          </ObservedView>
          <Pressable
            accessibilityLabel="调偏好"
            accessibilityRole="button"
            onPress={() => { Keyboard.dismiss(); router.push("/preferences"); }}
            style={styles.promptPreferences}
            testID="home.ai_prompt.preferences"
          >
            <Ionicons color="#B94A00" name="options-outline" size={20} />
          </Pressable>
          <ObservedPressable
            stableId="home.ai_prompt.submit"
            sourceRef={sourceRef}
            observationRole="button"
            accessibilityLabel={promptState === "ready" ? "✓" : "→"}
            accessibilityHint={promptButtonLabel}
            disabled={promptState === "submitting"}
            onPress={submitPrompt}
            style={styles.promptSubmit}
          >
            <Text style={styles.promptSubmitText}>
              {promptState === "ready" ? "✓" : "→"}
            </Text>
          </ObservedPressable>
        </ObservedView>
      </View>
      {savedPreferences !== null && (
        <View style={styles.preferencesResult}>
          <ObservedText
            stableId="home.preferences.saved_notice"
            observationRole="text"
            sourceRef={sourceRef}
            style={styles.preferencesNotice}
          >偏好已保存</ObservedText>
          <ObservedText
            stableId="home.preferences.summary"
            observationRole="text"
            sourceRef={sourceRef}
            style={styles.preferencesSummary}
          >{preferenceSummary(savedPreferences)}</ObservedText>
        </View>
      )}
      <ObservedView
        stableId="home.recommendation.card"
        sourceRef={sourceRef}
        observationRole="group"
        style={styles.recommendation}
      >
        <ObservedView
          stableId="home.recommendation.image"
          sourceRef={sourceRef}
          observationRole="image"
          style={styles.recommendationImage}
        >
          <View style={styles.imageHalo} />
          <View style={styles.imageBowl} />
          <ObservedView
            stableId="home.recommendation.scrim"
            sourceRef={sourceRef}
            observationRole="decoration"
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
          />
        </ObservedView>
        <View style={styles.recommendationContent}>
          <ObservedView
            stableId="home.recommendation.match_score"
            sourceRef={sourceRef}
            observationRole="text"
            accessible
            style={styles.matchPill}
          >
            <Text style={styles.matchText}>匹配度 {recommendation.match}%</Text>
          </ObservedView>
          <ObservedText
            stableId="home.recommendation.title"
            sourceRef={sourceRef_home_recommendation_title}
            observationRole="text"
            accessible
            observationStyle={styles.dishTitleObservation}
            style={[styles.dishTitle, isSwapping && styles.mutedContent]}
          >
            {recommendation.title}
          </ObservedText>
          <ObservedView
            stableId="home.recommendation.attributes"
            sourceRef={sourceRef}
            observationRole="text"
            accessible
            style={styles.attributesRow}
          >
            <Text style={styles.attributesText}>
              {recommendation.attributes}
            </Text>
          </ObservedView>
          <ObservedView
            stableId="home.recommendation.pagination"
            sourceRef={sourceRef}
            observationRole="text"
            accessible
            style={styles.pagination}
          >
            <Text style={styles.paginationText}>{paginationLabel}</Text>
          </ObservedView>
          <View
            style={styles.offerRow}
            testID="home.recommendation.purchase_meta"
          >
            <ObservedText
              stableId="home.recommendation.price"
              sourceRef={sourceRef}
              observationRole="text"
              accessible
              observationStyle={styles.priceObservation}
              style={styles.price}
            >
              ¥{recommendation.price}
            </ObservedText>
            <ObservedView
              stableId="home.recommendation.savings"
              sourceRef={sourceRef}
              observationRole="text"
              accessible
              accessibilityLabel={`限时立减 ¥${recommendation.savings}`}
              style={styles.savingsBadge}
            >
              <Text style={styles.savingsText}>
                限时立减 ¥{recommendation.savings}
              </Text>
            </ObservedView>
            <ObservedView
              stableId="home.recommendation.eta"
              sourceRef={sourceRef}
              observationRole="text"
              accessible
              style={styles.etaCopy}
            >
              <Text style={styles.etaText}>
                {recommendation.eta} · 预计送达
              </Text>
            </ObservedView>
          </View>
          <ObservedPressable
            stableId="home.recommendation.primary_action"
            sourceRef={sourceRef_home_recommendation_primary_action}
            observationRole="button"
            accessibilityLabel={primaryActionLabel}
            disabled={ctaState !== "idle"}
            onPress={() => {
              Keyboard.dismiss();
              setCtaState("loading");
            }}
            style={[
              styles.primaryAction,
              { backgroundColor: home.primaryActionBackground },
              ctaState === "success" && styles.primaryActionSuccess,
            ]}
          >
            <Text style={styles.primaryActionText}>{primaryActionLabel}</Text>
          </ObservedPressable>
          <ObservedPressable
            stableId="home.recommendation.next_action"
            sourceRef={sourceRef}
            observationRole="button"
            accessibilityRole="button"
            disabled={isSwapping}
            onPress={() => {
              Keyboard.dismiss();
              setIsSwapping(true);
            }}
            style={styles.nextAction}
          >
            <Text style={styles.nextActionText}>
              {isSwapping ? "正在换口味" : "换个口味"}
            </Text>
          </ObservedPressable>
        </View>
      </ObservedView>
      <ObservedView
        stableId="home.navigation"
        sourceRef={sourceRef}
        observationRole="tablist"
        accessibilityRole="tablist"
        style={styles.bottomNavigation}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <ObservedPressable
              key={tab.id}
              stableId={tab.stableId}
              sourceRef={sourceRef}
              observationRole="tab"
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                Keyboard.dismiss();
                setActiveTab(tab.id);
                if (tab.route) router.push(tab.route);
              }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </ObservedPressable>
          );
        })}
      </ObservedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  promptPreferences: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  preferencesResult: { paddingHorizontal: 24, paddingBottom: 12, gap: 4 },
  preferencesNotice: { color: "#B94A00", fontSize: 14, fontWeight: "600" },
  preferencesSummary: { color: "#6B6B6B", fontSize: 14 },
  screen: { backgroundColor: "#FFF8EF", flex: 1 },
  intro: { height: 195, paddingHorizontal: 21 },
  headerActions: {
    height: 44,
    marginHorizontal: -3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationButton: { width: 120, height: 21 },
  locationLabel: {
    color: "#241713",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    letterSpacing: 0,
  },
  cartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cartIcon: {
    color: "#241713",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  cartBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E6472F",
    position: "absolute",
    top: 0,
    right: 0,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  brandObservation: { width: 120, height: 34 },
  brand: {
    color: "#E6472F",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    height: 34,
    letterSpacing: 0,
  },
  headlineObservation: { width: 360, height: 46, marginTop: 3 },
  headline: {
    color: "#241713",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 46,
    letterSpacing: 0,
  },
  promptShell: {
    height: 44,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 4,
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DCD3",
    borderWidth: 1,
    borderRadius: 16,
  },
  promptInputObservation: { height: 20, flex: 1 },
  promptInput: {
    height: 20,
    padding: 0,
    color: "#77655F",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0,
  },
  hiddenText: { height: 0, opacity: 0, width: 0 },
  promptSubmit: {
    width: 35.7969,
    height: 36,
    backgroundColor: "#E6472F",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  promptSubmitText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: 0,
  },
  recommendation: { flex: 1, backgroundColor: "#FFFFFF", overflow: "hidden" },
  recommendationImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 261,
    backgroundColor: "#7E3825",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageHalo: {
    height: 270,
    width: 270,
    backgroundColor: "#B7653E",
    borderRadius: 80,
  },
  imageBowl: {
    height: 170,
    width: 230,
    backgroundColor: "#EAB478",
    borderRadius: 80,
    position: "absolute",
    left: 100,
    top: 85,
  },
  recommendationContent: {
    position: "absolute",
    bottom: 8,
    left: 22,
    right: 22,
  },
  matchPill: {
    height: 20,
    width: 100,
    backgroundColor: "#F7D7B5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  matchText: {
    color: "#241713",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: 0,
  },
  dishTitleObservation: { height: 31, width: 386, marginTop: 6 },
  dishTitle: {
    color: "#241713",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 31,
    letterSpacing: 0,
  },
  mutedContent: { opacity: 0.45 },
  attributesRow: { height: 20, width: 386, marginTop: 6 },
  attributesText: {
    color: "#77655F",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: 0,
  },
  pagination: { height: 14, width: 50, marginTop: 6 },
  paginationText: {
    color: "#E6472F",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    letterSpacing: 0,
  },
  offerRow: {
    height: 32,
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  priceObservation: { width: 56, height: 29 },
  price: {
    color: "#E6472F",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 29,
    width: 56,
    height: 29,
    letterSpacing: 0,
  },
  savingsBadge: {
    width: 120,
    height: 26,
    marginLeft: 14,
    backgroundColor: "#E6472F",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  savingsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: 0,
  },
  etaCopy: { width: 163, height: 18, marginLeft: 33 },
  etaText: {
    color: "#77655F",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 0,
  },
  primaryAction: {
    height: 46,
    marginTop: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionSuccess: { backgroundColor: "#70AD6C" },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    letterSpacing: 0,
  },
  nextAction: {
    height: 28,
    width: 386,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextActionText: {
    color: "#E6472F",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    letterSpacing: 0,
  },
  bottomNavigation: {
    height: 70,
    flexDirection: "row",
    paddingHorizontal: 9,
    paddingTop: 5,
    paddingBottom: 14,
    borderTopColor: "#E8DCD3",
    borderTopWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  tab: {
    flex: 1,
    height: 50,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: "#F7D7B5", borderRadius: 16 },
  tabLabel: {
    color: "#77655F",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    letterSpacing: 0,
  },
  tabLabelActive: { color: "#E6472F" },
});
