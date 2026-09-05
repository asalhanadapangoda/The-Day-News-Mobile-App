import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { migrateDbIfNeeded } from '@/data/database';
import { MoneyProvider, useMoney } from '@/context/money-context';
import { colors } from '@/components/ui';

import { SecurityProvider, useSecurity } from '@/context/security-context';
import { LockScreen } from '@/components/security/lock-screen';

export default function RootLayout() {
  useEffect(() => {
    // Dismiss native splash screen immediately when React Native mounts
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SecurityProvider>
      <StatusBar style="light" />
      <AppSecurityGate />
    </SecurityProvider>
  );
}

function AppSecurityGate() {
  const { authState, privacyShieldActive } = useSecurity();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, [authState]);

  if (authState === 'INITIALIZING') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (authState === 'LOCKED' || authState === 'AUTHENTICATING') {
    return <LockScreen />;
  }

  return (
    <SQLiteProvider
      databaseName="lumina-finance.db"
      onInit={migrateDbIfNeeded}
    >
      <MoneyProvider>
        <AppNavigator />
        {privacyShieldActive ? <LockScreen /> : null}
      </MoneyProvider>
    </SQLiteProvider>
  );
}

function AppNavigator() { 
  const { loading } = useMoney(); 
  
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 180,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="add-entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="category-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="account-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="budget-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="transaction-search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
