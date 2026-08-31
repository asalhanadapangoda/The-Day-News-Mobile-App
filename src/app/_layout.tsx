import { Stack, router } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { migrateDbIfNeeded } from '@/data/database';
import { MoneyProvider, useMoney } from '@/context/money-context';
import { colors } from '@/components/ui';

export default function RootLayout() {
  return <SQLiteProvider databaseName="lumina-finance.db" onInit={migrateDbIfNeeded}><MoneyProvider><StatusBar style="light" /><AppNavigator /></MoneyProvider></SQLiteProvider>;
}

function AppNavigator() { 
  const { loading, onboardingCompleted } = useMoney(); 
  
  useEffect(() => {
    if (!loading && !onboardingCompleted) {
      router.replace('/welcome');
    }
  }, [loading, onboardingCompleted]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>; 
  
  return <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 180, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="welcome" options={{ animation: 'fade' }} /><Stack.Screen name="add-entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="category-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="account-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="budget-form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="transaction-search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /></Stack>; 
}
