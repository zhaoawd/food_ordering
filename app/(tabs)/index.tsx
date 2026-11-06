import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/commerce/theme';
import { COMMERCE_FIXTURE, formatCents, memberStripAction, useCommerceStore } from '@/store/commerce.fixture';
import { ObservedPressable, ObservedText } from '@/verification/observation';
import { useFoodOrderingEvalFixture } from '@/verification/useEvalFixture';

/** commerce-v1 首页（home.default.v1 / home.guest.v1），设计包 .autophone/feature-designs/commerce-v1-a01。 */
const sourceRef = { file: 'app/(tabs)/index.tsx', symbol: 'Home' } as const;
const art = {
  hero: require('@/assets/commerce/home/unowned.art-1.svg'),
  products: [require('@/assets/commerce/home/unowned.art-2.svg'), require('@/assets/commerce/home/unowned.art-3.svg')],
  message: require('@/assets/commerce/home/unowned.iconbutton-1.svg'),
  pin: require('@/assets/commerce/home/home.store.select.row-1.svg'),
  chevron: require('@/assets/commerce/home/home.store.select.row-2.svg'),
  pickup: require('@/assets/commerce/home/home.mode.pickup.modeicon-1.svg'),
  delivery: require('@/assets/commerce/home/home.mode.delivery.modeicon-1.svg'),
  spark: require('@/assets/commerce/home/home.ai.open.span-1.svg'),
};

export default function Home() {
  // 读取评测选择（state_id 决定配方）、写选择回执并开启观测会话；就绪前不渲染，观测只含本状态的元素。
  const evaluation = useFoodOrderingEvalFixture();
  const navigatedSelection = useRef<string | null>(null);
  useEffect(() => {
    if (evaluation.status === 'ready' && evaluation.addressStateId && navigatedSelection.current !== evaluation.selectionNonce) {
      navigatedSelection.current = evaluation.selectionNonce;
      router.push('/delivery-address');
    }
  }, [evaluation]);
  const account = useCommerceStore(state => state.account);
  if (evaluation.status !== 'ready') return null;
  const f = COMMERCE_FIXTURE;
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <ObservedText stableId="home.brand" observationRole="text" sourceRef={sourceRef} style={styles.brand}>
          食刻 <Text style={styles.brandSub}>FRESH MOMENTS</Text>
        </ObservedText>
        <View style={styles.iconButton} accessibilityLabel="消息">
          <Image source={art.message} style={styles.icon22} />
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ObservedPressable stableId="home.store.select" observationRole="button" sourceRef={sourceRef} style={styles.storeRow}
          accessibilityLabel={`${f.store.shortName} ${f.store.distanceLabel}`}>
          <Image source={art.pin} style={styles.icon17} />
          <ObservedText stableId="home.store.name" observationRole="text" sourceRef={sourceRef} style={styles.storeName}>{f.store.shortName}</ObservedText>
          <ObservedText stableId="home.store.distance" observationRole="text" sourceRef={sourceRef} style={styles.storeDistance}>{f.store.distanceLabel}</ObservedText>
          <Image source={art.chevron} style={styles.icon17} />
        </ObservedPressable>
        <ObservedText stableId="home.greeting" observationRole="text" sourceRef={sourceRef} style={styles.greeting}>{f.greeting}</ObservedText>

        <View style={styles.hero}>
          <View style={styles.heroRing} />
          <Image source={art.hero} style={styles.heroArt} contentFit="contain" />
          <Text style={styles.eyebrow}>{f.hero.eyebrow}</Text>
          <ObservedText stableId="home.hero.headline" observationRole="text" sourceRef={sourceRef} style={styles.headline}>{f.hero.headline}</ObservedText>
          <View style={styles.offer}>
            <ObservedText stableId="home.hero.price" observationRole="text" sourceRef={sourceRef} style={styles.heroPrice}>{formatCents(f.hero.priceCents)}</ObservedText>
            <Text style={styles.micro}>{f.hero.productName}</Text>
          </View>
          <View style={styles.tag}><Text style={styles.tagText}>{f.hero.tag}</Text></View>
        </View>

        <View style={styles.modeGrid}>
          <ObservedPressable stableId="home.mode.pickup" observationRole="button" sourceRef={sourceRef} style={styles.modeCard}
            onPress={() => router.navigate('/menu' as never)}>
            <View style={styles.modeIcon}><Image source={art.pickup} style={styles.icon22} /></View>
            <View>
              <ObservedText stableId="home.mode.pickup.title" observationRole="text" sourceRef={sourceRef} style={styles.modeTitle}>到店自取</ObservedText>
              <Text style={styles.tinyMuted}>提前点，到店拿</Text>
            </View>
          </ObservedPressable>
          <ObservedPressable stableId="home.mode.delivery" observationRole="button" sourceRef={sourceRef} style={styles.modeCard}>
            <View style={styles.modeIcon}><Image source={art.delivery} style={styles.icon22} /></View>
            <View>
              <ObservedText stableId="home.mode.delivery.title" observationRole="text" sourceRef={sourceRef} style={styles.modeTitle}>外送到家</ObservedText>
              <Text style={styles.tinyMuted}>热乎美味送到家</Text>
            </View>
          </ObservedPressable>
        </View>

        <ObservedPressable stableId="member.points.open" observationRole="button" sourceRef={sourceRef} style={styles.memberStrip}>
          <Text style={styles.memberTitle}>食刻会员<Text style={styles.memberSubtle}> · 让每一餐都有回馈</Text></Text>
          <ObservedText stableId="home.member.coupons" observationRole="text" sourceRef={sourceRef} style={styles.memberAction}>{memberStripAction(account)}</ObservedText>
        </ObservedPressable>

        <View style={styles.sectionTitle}>
          <ObservedText stableId="home.shelf.title" observationRole="text" sourceRef={sourceRef} style={styles.sectionText}>人气好滋味</ObservedText>
          <ObservedPressable stableId="home.start_order" observationRole="button" sourceRef={sourceRef} style={styles.textAction}
            onPress={() => router.navigate('/menu' as never)}>
            <Text style={styles.textActionLabel}>开始点餐 ›</Text>
          </ObservedPressable>
        </View>
        <View style={styles.miniGrid}>
          {f.featured.map((product, index) => (
            <ObservedPressable key={product.id} stableId={`menu.product.${product.id}.open`} observationRole="button" sourceRef={sourceRef} style={styles.miniProduct}>
              <View style={styles.miniArt}><Image source={art.products[index]} style={styles.miniArtImage} contentFit="contain" /></View>
              <View style={styles.miniCopy}>
                <ObservedText stableId={`home.shelf.${product.id}.name`} observationRole="text" sourceRef={sourceRef} style={styles.miniName}>{product.name}</ObservedText>
                <View style={styles.miniRow}>
                  <ObservedText stableId={`home.shelf.${product.id}.price`} observationRole="text" sourceRef={sourceRef} style={styles.miniPrice}>{formatCents(product.priceCents)}</ObservedText>
                  <Text style={styles.plus}>＋</Text>
                </View>
              </View>
            </ObservedPressable>
          ))}
        </View>

        <ObservedPressable stableId="home.ai.open" observationRole="button" sourceRef={sourceRef} style={styles.aiCard}>
          <View style={styles.aiLabel}><Image source={art.spark} style={styles.icon22} /><Text style={styles.aiText}> 不知道吃什么？帮我搭一餐</Text></View>
          <Text style={styles.aiText}>›</Text>
        </ObservedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 20, minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 26, fontWeight: '800', color: colors.brand, letterSpacing: -1 },
  brandSub: { fontSize: 10, letterSpacing: 2, color: colors.muted, fontWeight: '400' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  icon22: { width: 22, height: 22 },
  icon17: { width: 17, height: 17 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  storeName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  storeDistance: { fontSize: 12, lineHeight: 20, color: colors.muted },
  greeting: { fontSize: 13, color: colors.muted, marginTop: 6, marginBottom: 14 },
  hero: { height: 214, backgroundColor: colors.heroBg, borderRadius: 24, overflow: 'hidden', padding: 22 },
  heroRing: { position: 'absolute', width: 210, height: 210, borderWidth: 1, borderColor: '#D9B487', borderRadius: 105, right: -48, top: -42 },
  heroArt: { position: 'absolute', right: -20, bottom: -13, width: 228, height: 194, transform: [{ rotate: '-7deg' }] },
  eyebrow: { fontSize: 10, color: colors.heroMicro, letterSpacing: 2, fontWeight: '600' },
  headline: { fontSize: 29, lineHeight: 38, marginVertical: 10, color: colors.heroInk, fontWeight: '800' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  heroPrice: { fontSize: 22, color: colors.heroPrice, fontWeight: '800', letterSpacing: -0.4 },
  micro: { fontSize: 10, color: colors.heroMicro },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.memberBg, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 12, width: 105 },
  tagText: { color: '#FFFFFF', fontSize: 10 },
  modeGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  modeCard: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 18, backgroundColor: colors.surface, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.modeLine, minHeight: 88 },
  modeIcon: { backgroundColor: colors.soft, borderRadius: 14, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  tinyMuted: { fontSize: 11, color: colors.muted },
  memberStrip: { marginTop: 14, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: colors.memberBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberTitle: { fontSize: 13, fontWeight: '700', color: colors.memberInk },
  memberSubtle: { fontSize: 11, fontWeight: '400', color: colors.memberSubtle },
  memberAction: { fontSize: 13, color: colors.memberInk },
  sectionTitle: { marginTop: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionText: { fontSize: 18, fontWeight: '700', color: colors.ink },
  textAction: { minHeight: 44, paddingVertical: 8, justifyContent: 'center' },
  textActionLabel: { fontSize: 13, color: colors.muted },
  miniGrid: { flexDirection: 'row', gap: 12 },
  miniProduct: { flex: 1, borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden' },
  miniArt: { height: 104, backgroundColor: colors.productArt, alignItems: 'center', justifyContent: 'center' },
  miniArtImage: { width: 177, height: 104 },
  miniCopy: { paddingVertical: 10, paddingHorizontal: 12 },
  miniName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  miniRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniPrice: { fontSize: 18, color: colors.brand, fontWeight: '800', letterSpacing: -0.4 },
  plus: { fontSize: 14, color: colors.ink },
  aiCard: { marginTop: 16, borderRadius: 20, backgroundColor: colors.soft, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiLabel: { flexDirection: 'row', alignItems: 'center' },
  aiText: { fontSize: 14, color: colors.ink },
});
