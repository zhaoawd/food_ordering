import { Tabs } from 'expo-router';

import TabBar from '@/components/commerce/TabBar';

/**
 * commerce-v1：游客可直接浏览（T001、R10 只要求下单登录），不在 Tab 入口强制登录。
 * 旧的 search、cart 路由保留为非 Tab 页（ui-contract deprecated_aliases：旧 cart 入口保留迁移测试）。
 */
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <TabBar />}>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="menu" options={{ title: '点餐' }} />
      <Tabs.Screen name="rewards" options={{ title: '优惠' }} />
      <Tabs.Screen name="orders" options={{ title: '订单' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
    </Tabs>
  );
}
