import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/components/ui';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#162032',
          borderTopColor: '#26354D',
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'cube-outline';
          if (route.name === 'index') {
            iconName = 'newspaper-outline';
          } else if (route.name === 'stats') {
            iconName = 'pie-chart-outline';
          } else if (route.name === 'accounts') {
            iconName = 'wallet-outline';
          } else if (route.name === 'settings') {
            iconName = 'settings-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Ledger' }} />
      <Tabs.Screen name="stats" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
