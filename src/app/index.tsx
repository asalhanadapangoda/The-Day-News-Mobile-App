import { Redirect } from 'expo-router';
import { useMoney } from '@/context/money-context';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/components/ui';

export default function Index() {
  const { loading, onboardingCompleted } = useMoney();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
