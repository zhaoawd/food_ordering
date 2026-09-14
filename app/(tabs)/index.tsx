import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ObservedPressable,
  ObservedText,
  ObservedView,
} from "@/verification/observation";
import { foodAiTokens } from "@/verification/food-ai-tokens.generated";
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
  { id: "home", stableId: "home.navigation.home", label: "首页", icon: "home" , route: null },
  { id: "discover", stableId: "home.navigation.discover", label: "发现", icon: "compass-outline" , route: null },
  { id: "orders", stableId: "home.navigation.orders", label: "订单", icon: "receipt-outline" , route: "/cart" },
  { id: "profile", stableId: "home.navigation.profile", label: "我的", icon: "person-outline" , route: null },
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
      setRecommendationIndex((current) => (current + 1) % recommendations.length);
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
    () => `${recommendationIndex + 1}/4`,
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
    <SafeAreaView
      edges={["top"]}
      style={styles.screen}
      testID="home.root"
    >
      <View
        style={styles.intro}
        testID="home.header"
      >
        <View style={styles.headerActions}>
          <ObservedPressable
            accessibilityLabel={home.location}
            accessibilityRole="button"
            observationRole="button"
            sourceRef={sourceRef_home_header_location}
            stableId="home.header.location"
            style={[
              styles.locationButton,
              {
                marginTop: home.headerSpacing,
                transform: [{ translateY: home.locationTranslateY }],
              },
            ]}
          >
            <Ionicons
              color={foodAiTokens.color.primitive.forest["700"]}
              name="location-sharp"
              size={19}
            />
            <Text
              style={[
                styles.locationLabel,
                {
                  fontSize: home.locationFontSize,
                  lineHeight: home.locationFontSize * 1.25,
                },
              ]}
            >
              {home.location}
            </Text>
            <Ionicons color="#24312E" name="chevron-down" size={13} />
          </ObservedPressable>

          <ObservedPressable
            accessibilityLabel={`购物袋，${cartCount} 件商品`}
            accessibilityRole="button"
            observationRole="button"
            sourceRef={sourceRef}
            stableId="home.header.cart"
            style={styles.cartButton}
          >
            <Ionicons color="#1D1D1D" name="bag-outline" size={29} />
            <ObservedView
              observationRole="text"
              sourceRef={sourceRef}
              stableId="home.header.cart_badge"
              style={styles.cartBadge}
            >
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </ObservedView>
          </ObservedPressable>
        </View>

        <ObservedText
          accessibilityLabel="Food AI"
          observationRole="text"
          sourceRef={sourceRef}
          stableId="home.brand.wordmark"
          style={styles.brand}
        >
          <Text style={styles.brandFood}>Food</Text> AI
        </ObservedText>
        <ObservedText
          observationRole="text"
          observationStyle={styles.headlineObservation}
          sourceRef={sourceRef}
          stableId="home.hero.headline"
          style={styles.headline}
        >
          今晚，好好吃一顿
        </ObservedText>

        <ObservedView
          observationRole="group"
          sourceRef={sourceRef}
          stableId="home.ai_prompt"
          style={styles.promptShell}
        >
          <Ionicons color="#B94A00" name="sparkles" size={18} />
          <ObservedView
            observationRole="textbox"
            sourceRef={sourceRef}
            stableId="home.ai_prompt.input"
            style={styles.promptInputObservation}
          >
            <Text style={styles.hiddenText}>想吃热乎的、微辣、别太油</Text>
            <TextInput
              accessibilityLabel="饮食偏好"
              onChangeText={(value) => {
                setPrompt(value);
                if (promptState === "ready") setPromptState("idle");
              }}
              onSubmitEditing={submitPrompt}
              placeholder="想吃热乎的、微辣、别太油"
              placeholderTextColor="#756D68"
              returnKeyType="go"
              style={styles.promptInput}
              value={prompt}
            />
          </ObservedView>
          <Pressable
            accessibilityLabel="调偏好"
            accessibilityRole="button"
            onPress={() => {
              Keyboard.dismiss();
              router.push("/preferences");
            }}
            style={styles.promptPreferences}
            testID="home.ai_prompt.preferences"
          >
            <Ionicons color="#B94A00" name="options-outline" size={20} />
          </Pressable>
          <ObservedPressable
            accessibilityLabel={promptButtonLabel}
            accessibilityRole="button"
            disabled={promptState === "submitting"}
            observationRole="button"
            onPress={submitPrompt}
            sourceRef={sourceRef}
            stableId="home.ai_prompt.submit"
            style={styles.promptSubmit}
          >
            <Ionicons
              color="#B94A00"
              name={promptState === "ready" ? "checkmark" : "arrow-forward"}
              size={22}
            />
          </ObservedPressable>
        </ObservedView>

      </View>

      <ObservedView
        observationRole="group"
        sourceRef={sourceRef}
        stableId="home.recommendation.card"
        style={styles.recommendation}
      >
        <ObservedView
          observationRole="image"
          sourceRef={sourceRef}
          stableId="home.recommendation.image"
          style={styles.recommendationImage}
        >
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            contentPosition={{ left: "50%", top: "88%" }}
            source={require("@/assets/images/food-ai-beef-bowl.png")}
            style={styles.recommendationImageAsset}
          />
        </ObservedView>
        <ObservedView
          observationRole="decoration"
          sourceRef={sourceRef}
          stableId="home.recommendation.scrim"
          style={styles.scrimLayer}
        >
          <View style={styles.scrimMiddle} />
          <View style={styles.scrimBottom} />
        </ObservedView>

        <View style={styles.recommendationContent}>
          <ObservedView
            accessibilityLabel={`口味匹配度 ${recommendation.match}%`}
            observationRole="text"
            sourceRef={sourceRef}
            stableId="home.recommendation.match_score"
            style={styles.matchPill}
          >
            <Ionicons color="#FFFFFF" name="sparkles" size={14} />
            <Text style={styles.matchText}>匹配度 {recommendation.match}%</Text>
          </ObservedView>

          <ObservedText
            accessibilityRole="text"
            observationRole="text"
            observationStyle={styles.dishTitleObservation}
            sourceRef={sourceRef_home_recommendation_title}
            stableId="home.recommendation.title"
            style={[styles.dishTitle, isSwapping && styles.mutedContent]}
          >
            {recommendation.title}
          </ObservedText>

          <ObservedView
            observationRole="text"
            sourceRef={sourceRef}
            stableId="home.recommendation.attributes"
            style={styles.attributesRow}
          >
            <Ionicons color="#70AD6C" name="checkmark-circle" size={17} />
            <Text style={styles.attributesText}>{recommendation.attributes}</Text>
          </ObservedView>

          <ObservedView
            accessibilityLabel={`第 ${recommendationIndex + 1} 项，共 4 项`}
            observationRole="image"
            sourceRef={sourceRef}
            stableId="home.recommendation.pagination"
            style={styles.pagination}
          >
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={index === recommendationIndex ? styles.pageActive : styles.pageIdle}
              />
            ))}
            <Text style={styles.hiddenText}>{paginationLabel}</Text>
          </ObservedView>

          <View style={styles.offerRow} testID="home.recommendation.purchase_meta">
            <ObservedText
              observationRole="text"
              sourceRef={sourceRef}
              stableId="home.recommendation.price"
              style={styles.price}
            >
              ¥{recommendation.price}
            </ObservedText>
            <ObservedView
              accessibilityLabel="限时立减 6 元"
              observationRole="text"
              sourceRef={sourceRef}
              stableId="home.recommendation.savings"
              style={styles.savingsBadge}
            >
              <Text style={styles.savingsText}>限时立减 ¥{recommendation.savings}</Text>
            </ObservedView>
            <View style={styles.offerDivider} />
            <ObservedView
              observationRole="text"
              sourceRef={sourceRef}
              stableId="home.recommendation.eta"
              style={styles.etaCopy}
            >
              <Ionicons color="#FFFFFF" name="time-outline" size={19} />
              <Text style={styles.etaText}>
                {recommendation.eta}{"\n"}预计送达
              </Text>
            </ObservedView>
          </View>

          <ObservedPressable
            accessibilityLabel={primaryActionLabel}
            accessibilityRole="button"
            disabled={ctaState !== "idle"}
            observationRole="button"
            onPress={() => {
              Keyboard.dismiss();
              setCtaState("loading");
            }}
            sourceRef={sourceRef_home_recommendation_primary_action}
            stableId="home.recommendation.primary_action"
            style={[
              styles.primaryAction,
              { backgroundColor: home.primaryActionBackground },
              ctaState === "success" && styles.primaryActionSuccess,
            ]}
          >
            <Text style={styles.primaryActionText}>
              {primaryActionLabel}
            </Text>
          </ObservedPressable>

          <ObservedPressable
            accessibilityRole="button"
            disabled={isSwapping}
            hitSlop={2}
            observationRole="button"
            onPress={() => {
              Keyboard.dismiss();
              setIsSwapping(true);
            }}
            sourceRef={sourceRef}
            stableId="home.recommendation.next_action"
            style={styles.nextAction}
          >
            <Text style={styles.nextActionText}>
              {isSwapping ? "正在换口味" : "换个口味"}
            </Text>
          </ObservedPressable>
        </View>
      </ObservedView>

      <ObservedView
        accessibilityRole="tablist"
        observationRole="tablist"
        sourceRef={sourceRef}
        stableId="home.navigation"
        style={styles.bottomNavigation}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <ObservedPressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.id}
              observationRole="tab"
              onPress={() => {
                Keyboard.dismiss();
                setActiveTab(tab.id);
                if (tab.route) {
                  router.push(tab.route);
                }
              }}
              sourceRef={sourceRef}
              stableId={tab.stableId}
              style={styles.tab}
            >
              <Ionicons
                color={active ? "#B94A00" : "#1D1D1D"}
                name={active && tab.id === "home" ? "home" : tab.icon}
                size={24}
              />
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
  screen: {
    backgroundColor: foodAiTokens.color.primitive.cream["50"],
    flex: 1,
  },
  intro: {
    backgroundColor: foodAiTokens.color.primitive.cream["50"],
    height: 195,
    paddingHorizontal: 21,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    justifyContent: "space-between",
  },
  locationButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginLeft: -4,
    minHeight: 44,
    width: 176,
  },
  locationLabel: {
    color: "#0E2E2A",
    fontWeight: "500",
  },
  cartButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginRight: -3,
    width: 44,
  },
  cartBadge: {
    backgroundColor: "#B94A00",
    borderColor: foodAiTokens.color.primitive.cream["50"],
    borderRadius: 10,
    borderWidth: 2,
    height: 19,
    position: "absolute",
    right: -2,
    top: -4,
    width: 21,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center",
  },
  brand: {
    color: foodAiTokens.color.primitive.ink["900"],
    fontSize: 29,
    fontWeight: "900",
    height: 34,
    letterSpacing: -1.015,
    lineHeight: 34,
    marginTop: 0,
  },
  brandFood: { color: "#B94A00" },
  headline: {
    color: foodAiTokens.color.primitive.ink["900"],
    fontSize: 39,
    fontWeight: "900",
    letterSpacing: -2.028,
    lineHeight: 46,
  },
  headlineObservation: {
    height: 46,
    marginTop: 5,
  },
  promptShell: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,244,0.72)",
    borderColor: "#9C8D80",
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 44,
    marginTop: 8,
    overflow: "hidden",
    paddingLeft: 13,
  },
  promptInput: {
    color: foodAiTokens.color.primitive.ink["900"],
    flex: 1,
    fontSize: 14.5,
    fontWeight: "400",
    height: 42,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  promptInputObservation: {
    flex: 1,
    height: 42,
  },
  promptSubmit: {
    alignItems: "center",
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    marginVertical: 1,
    position: "relative",
    top: 1,
    width: 44,
  },
  promptPreferences: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  recommendation: {
    backgroundColor: "#2B1408",
    flex: 1,
    overflow: "hidden",
  },
  recommendationImage: { ...StyleSheet.absoluteFillObject },
  recommendationImageAsset: { ...StyleSheet.absoluteFillObject },
  scrimLayer: { ...StyleSheet.absoluteFillObject },
  scrimMiddle: {
    backgroundColor: "rgba(7,3,1,0.28)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: "43%",
  },
  scrimBottom: {
    backgroundColor: "rgba(7,3,1,0.58)",
    bottom: 0,
    height: "37%",
    left: 0,
    position: "absolute",
    right: 0,
  },
  recommendationContent: {
    bottom: 54,
    left: 22,
    position: "absolute",
    right: 22,
  },
  matchPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: foodAiTokens.color.primitive.green["700"],
    borderRadius: 14,
    flexDirection: "row",
    gap: 5,
    height: 28,
    paddingHorizontal: 9,
    width: 128,
  },
  matchText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18.75,
  },
  dishTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 27.5,
  },
  dishTitleObservation: {
    height: 31,
    marginTop: 7,
  },
  mutedContent: { opacity: 0.45 },
  attributesRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: 20,
    marginTop: 3,
  },
  attributesText: {
    color: "#FEF9F3",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    height: 5,
    marginTop: 14,
  },
  pageActive: {
    backgroundColor: foodAiTokens.color.primitive.orange["500"],
    borderRadius: 2,
    height: 4,
    width: 31,
  },
  pageIdle: {
    backgroundColor: "rgba(255,249,243,0.58)",
    borderRadius: 2,
    height: 4,
    width: 15,
  },
  hiddenText: { height: 0, opacity: 0, width: 0 },
  offerRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 46,
    marginTop: 10,
  },
  price: {
    color: foodAiTokens.color.primitive.orange["500"],
    fontSize: 25,
    fontWeight: "700",
    lineHeight: 29,
    width: 56,
  },
  savingsBadge: {
    alignItems: "center",
    backgroundColor: foodAiTokens.color.primitive.orange["500"],
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginLeft: 14,
    width: 120,
  },
  savingsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  offerDivider: {
    backgroundColor: "rgba(255,255,255,0.76)",
    height: 30,
    marginHorizontal: 16,
    width: 1,
  },
  etaCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    height: 32,
    width: 105,
  },
  etaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 16,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 16,
    height: 50,
    justifyContent: "center",
    marginTop: 8,
  },
  primaryActionSuccess: { backgroundColor: "#70AD6C" },
  primaryActionText: {
    color: foodAiTokens.color.primitive.ink["900"],
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 21.25,
  },
  nextAction: {
    alignItems: "center",
    alignSelf: "center",
    height: 44,
    justifyContent: "center",
    marginTop: 1,
    width: 112,
  },
  nextActionText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 21.25,
    textDecorationColor: foodAiTokens.color.primitive.orange["500"],
    textDecorationLine: "underline",
  },
  bottomNavigation: {
    backgroundColor: "rgba(255,249,241,0.98)",
    borderTopColor: "rgba(34,23,14,0.18)",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    height: 70,
    left: 0,
    paddingBottom: 14,
    paddingHorizontal: 9,
    paddingTop: 5,
    position: "absolute",
    right: 0,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  tabLabel: {
    color: "#1D1D1D",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
  },
  tabLabelActive: {
    color: "#B94A00",
  },
});
