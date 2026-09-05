import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/components/ui';
import { useSecurity } from '@/context/security-context';

export function LockScreen() {
  const { authState, biometricInfo, unlock } = useSecurity();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticating = authState === 'AUTHENTICATING';

  // Automatically trigger authentication prompt upon lock screen display
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (active) {
        const success = await unlock();
        if (!success && active) {
          setErrorMessage('Authentication required to access financial records.');
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [unlock]);

  const handleManualUnlock = async () => {
    setErrorMessage(null);
    const success = await unlock();
    if (!success) {
      setErrorMessage('Authentication was canceled or failed.');
    }
  };

  // Choose appropriate biometric icon
  let authIconName: keyof typeof Ionicons.glyphMap = 'finger-print-outline';
  if (biometricInfo.biometricTypeLabel.toLowerCase().includes('face')) {
    authIconName = 'scan-outline';
  } else if (biometricInfo.biometricTypeLabel.toLowerCase().includes('iris')) {
    authIconName = 'eye-outline';
  } else if (!biometricInfo.isAvailable) {
    authIconName = 'lock-open-outline';
  }

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safeArea}>
        <View style={s.content}>
          <View style={s.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
          </View>

          <Text style={s.appName}>THE DAY APP</Text>
          <Text style={s.title}>Application Locked</Text>
          <Text style={s.subtitle}>
            Your financial ledger and account balances are protected. Authenticate to proceed.
          </Text>

          {errorMessage ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.expense} style={{ marginRight: 6 }} />
              <Text style={s.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [s.unlockBtn, pressed && s.unlockBtnPressed]}
            onPress={handleManualUnlock}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color={colors.primaryDark} size="small" />
            ) : (
              <>
                <Ionicons name={authIconName} size={22} color={colors.primaryDark} style={{ marginRight: 10 }} />
                <Text style={s.unlockBtnText}>
                  Unlock with {biometricInfo.biometricTypeLabel}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} style={{ marginRight: 6 }} />
          <Text style={s.footerText}>Hardware-Backed Privacy Shield Active</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 9999,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: `${colors.primary}45`,
  },
  appName: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B151F',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
    width: '100%',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  unlockBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  unlockBtnText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
