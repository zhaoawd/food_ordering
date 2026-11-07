import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/components/commerce/theme';
import { ObservedPressable } from '@/verification/observation';

/** 底部导航固定为 首页｜点餐｜优惠｜订单｜我的（PRODUCT_DESIGN.md；批次定义 tab_bar）。 */
const TABS = [
  { stableId: 'nav.home', label: '首页', route: '/', activeIcon: require('@/assets/commerce/home/nav.home.active-1.svg'), idleIcon: require('@/assets/commerce/orders/nav.home.button-1.svg') },
  { stableId: 'nav.menu', label: '点餐', route: '/menu', idleIcon: require('@/assets/commerce/home/nav.menu.button-1.svg') },
  { stableId: 'nav.coupons', label: '优惠', route: '/rewards', idleIcon: require('@/assets/commerce/home/nav.coupons.button-1.svg') },
  { stableId: 'nav.orders', label: '订单', route: '/orders', idleIcon: require('@/assets/commerce/home/nav.orders.button-1.svg'), activeIcon: require('@/assets/commerce/orders/nav.orders.active-1.svg') },
  { stableId: 'nav.member', label: '我的', route: '/profile', idleIcon: require('@/assets/commerce/home/nav.member.button-1.svg') },
] as const;

const sourceRef = { file: 'components/commerce/TabBar.tsx', symbol: 'TabBar' } as const;

export default function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 37) }]}>
      {TABS.map(tab => {
        const active = tab.route === '/' ? pathname === '/' || pathname === '/index' : pathname.startsWith(tab.route);
        const icon = active && 'activeIcon' in tab ? tab.activeIcon : tab.idleIcon;
        return (
          <ObservedPressable
            key={tab.stableId}
            stableId={tab.stableId}
            observationRole="tab"
            sourceRef={sourceRef}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => { if (!active) router.navigate(tab.route as never); }}
            style={styles.tab}
          >
            <Image source={icon} style={styles.icon} tintColor={active ? colors.brand : colors.muted} contentFit="contain" />
            <Text style={[styles.label, active ? styles.labelActive : null]}>{tab.label}</Text>
          </ObservedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 16.89,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { width: 65, height: 50, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 22, height: 22 },
  label: { fontSize: 10, lineHeight: 14, color: colors.muted },
  labelActive: { color: colors.brand, fontWeight: '700' },
});
