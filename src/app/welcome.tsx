import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useMoney } from '@/context/money-context';
import { AnimatedPressable, colors } from '@/components/ui';

const OFFICIAL_WEBSITE_URL = 'https://thedaynewsglobal.lk/';

export default function WelcomeScreen() {
  const { setGlobalCurrency, setGlobalUsername, saveAccount, completeOnboarding, onboardingCompleted } = useMoney();
  // Step State
  const [currentStep, setCurrentStep] = useState(0);

  // Modal State for FinLift video series
  const [showFinliftModal, setShowFinliftModal] = useState(false);

  // User State
  const [userName, setUserName] = useState('');

  // Currency State
  const [currencyType, setCurrencyType] = useState<'USD' | 'LKR' | 'CUSTOM'>('USD');
  const [customCurrency, setCustomCurrency] = useState('');

  // Account State
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');

  const [saving, setSaving] = useState(false);

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  const handleOpenWebsite = async () => {
    try {
      if (process.env.EXPO_OS !== 'web') {
        await WebBrowser.openBrowserAsync(OFFICIAL_WEBSITE_URL);
      } else {
        await Linking.openURL(OFFICIAL_WEBSITE_URL);
      }
    } catch {
      await Linking.openURL(OFFICIAL_WEBSITE_URL);
    }
  };

  const handleStartApp = () => {
    if (onboardingCompleted) {
      router.replace('/(tabs)');
    } else {
      setCurrentStep(1);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const finish = async () => {
    setSaving(true);

    if (userName.trim()) {
      await setGlobalUsername(userName.trim());
    }

    const finalCurrency = currencyType === 'CUSTOM' ? (customCurrency.trim().toUpperCase() || 'USD') : currencyType;

    if (currencyType === 'CUSTOM' && finalCurrency.length !== 3) {
      Alert.alert('Invalid Currency', 'Custom currency must be exactly 3 letters (e.g., EUR).');
      setSaving(false);
      return;
    }

    await setGlobalCurrency(finalCurrency);

    const openingBalance = Number(balance);
    if (accountName.trim() && Number.isFinite(openingBalance) && Math.abs(openingBalance) <= 999999999.99) {
      await saveAccount({
        name: accountName.trim(),
        type: 'cash',
        balance: openingBalance,
        currency: finalCurrency,
      });
    }

    await completeOnboarding();
    setSaving(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* STEP 0: Landing Welcome Hub with 3 Primary Buttons */}
      {currentStep === 0 && (
        <View style={s.page}>
          <ScrollView contentContainerStyle={s.landingScrollContent} showsVerticalScrollIndicator={false}>
            {/* Header / Brand Emblem */}
            <View style={s.brandSection}>
              <View style={s.badgePill}>
                <Ionicons name="newspaper-outline" size={13} color={colors.primary} style={{ marginRight: 5 }} />
                <Text style={s.badgePillText}>THE DAY APP</Text>
              </View>

              {/* Official Logo Frame */}
              <View style={s.logoFrame}>
                <Image
                  source={require('../../assets/images/tdn-logo.png')}
                  style={s.officialLogoImg}
                />
              </View>

              <Text style={s.landingTitle}>The Day App</Text>
              <Text style={s.landingSubtitle}>
                Smart Personal Finance & Offline Money Tracker
              </Text>
            </View>

            {/* The 3 Action Buttons / Cards */}
            <View style={s.actionCardsContainer}>
              {/* BUTTON 1: Official Website */}
              <AnimatedPressable onPress={handleOpenWebsite} style={s.secondaryActionCard}>
                <View style={s.cardIconCircle}>
                  <Ionicons name="globe-outline" size={22} color={colors.primary} />
                </View>
                <View style={s.cardTextCol}>
                  <View style={s.cardTitleRow}>
                    <Text style={s.cardTitle}>Official Website</Text>
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={s.cardDesc}>Visit thedaynewsglobal.lk for world news & updates</Text>
                </View>
              </AnimatedPressable>

              {/* BUTTON 2 (MIDDLE): Start into the App */}
              <AnimatedPressable onPress={handleStartApp} style={s.primaryHeroCard}>
                <View style={s.primaryHeroContent}>
                  <View style={s.primaryHeroIconCircle}>
                    <Ionicons name="rocket-outline" size={24} color="#FFFFFF" />
                  </View>
                  <View style={s.cardTextCol}>
                    <View style={s.cardTitleRow}>
                      <Text style={s.primaryHeroTitle}>Start into the App</Text>
                      <Ionicons name="arrow-forward-outline" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={s.primaryHeroDesc}>
                      Track accounts, expenses, budgets & analytics offline
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>

              {/* BUTTON 3: FinLift with Sasiru (Coming Soon) */}
              <AnimatedPressable onPress={() => setShowFinliftModal(true)} style={s.videoSeriesCard}>
                <View style={[s.cardIconCircle, { backgroundColor: '#332917', borderColor: '#5C471F' }]}>
                  <Ionicons name="videocam-outline" size={22} color="#FBBF24" />
                </View>
                <View style={s.cardTextCol}>
                  <View style={s.cardTitleRow}>
                    <Text style={s.cardTitle}>FinLift with Sasiru</Text>
                    <View style={s.comingSoonBadge}>
                      <Text style={s.comingSoonText}>COMING SOON</Text>
                    </View>
                  </View>
                  <Text style={s.cardDesc}>
                    Financial literacy & wealth mastery video series
                  </Text>
                </View>
              </AnimatedPressable>
            </View>

            {/* Footer note */}
            <Text style={s.versionNote}>v1.0.0 • 100% Offline & Private</Text>

            {/* Quick Skip Option */}
            <Pressable onPress={handleSkip} style={s.skipButton}>
              <Text style={s.skipButtonText}>Skip setup and start tracking →</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* STEP 1: Introduction / User Name */}
      {currentStep === 1 && (
        <View style={s.page}>
          <View style={s.content}>
            <View style={s.iconWrapper}>
              <Ionicons name="person-outline" size={40} color={colors.primary} />
            </View>
            <Text style={s.title}>What&apos;s Your Name?</Text>
            <Text style={s.subtitle}>Personalize your dashboard experience.</Text>

            <View style={s.form}>
              <Text style={s.label}>Your Name or Nickname</Text>
              <TextInput
                style={s.input}
                value={userName}
                onChangeText={setUserName}
                maxLength={40}
                placeholder="e.g., Alex"
                placeholderTextColor="#8190A8"
              />
            </View>
          </View>
          <View style={s.footerRow}>
            <Pressable onPress={() => goToStep(0)} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>
            <AnimatedPressable
              onPress={() => goToStep(2)}
              disabled={!userName.trim()}
              style={[s.nextBtn, !userName.trim() && { opacity: 0.5 }]}
            >
              <Text style={s.buttonText}>Continue</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* STEP 2: Choose Currency */}
      {currentStep === 2 && (
        <View style={s.page}>
          <View style={s.content}>
            <View style={s.iconWrapper}>
              <Ionicons name="cash-outline" size={40} color={colors.primary} />
            </View>
            <Text style={s.title}>Choose Currency</Text>
            <Text style={s.subtitle}>Select your primary currency. You can change this later in settings.</Text>

            <View style={s.currencyOptions}>
              <AnimatedPressable
                onPress={() => setCurrencyType('USD')}
                style={[s.currencyCard, currencyType === 'USD' && s.currencyCardActive]}
              >
                <Text style={s.currencySymbol}>$</Text>
                <Text style={[s.currencyLabel, currencyType === 'USD' && s.textActive]}>USD</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => setCurrencyType('LKR')}
                style={[s.currencyCard, currencyType === 'LKR' && s.currencyCardActive]}
              >
                <Text style={s.currencySymbol}>රු</Text>
                <Text style={[s.currencyLabel, currencyType === 'LKR' && s.textActive]}>LKR</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => setCurrencyType('CUSTOM')}
                style={[s.currencyCard, currencyType === 'CUSTOM' && s.currencyCardActive]}
              >
                <Ionicons name="options-outline" size={26} color={colors.text} style={{ marginBottom: 6 }} />
                <Text style={[s.currencyLabel, currencyType === 'CUSTOM' && s.textActive]}>Custom</Text>
              </AnimatedPressable>
            </View>

            {currencyType === 'CUSTOM' && (
              <View style={s.customCurrencyContainer}>
                <Text style={s.label}>Enter Currency Code (e.g., EUR, GBP)</Text>
                <TextInput
                  style={s.input}
                  value={customCurrency}
                  onChangeText={setCustomCurrency}
                  placeholder="EUR"
                  placeholderTextColor="#8190A8"
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            )}
          </View>
          <View style={s.footerRow}>
            <Pressable onPress={() => goToStep(1)} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>
            <AnimatedPressable onPress={() => goToStep(3)} style={s.nextBtn}>
              <Text style={s.buttonText}>Continue</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* STEP 3: First Account Setup */}
      {currentStep === 3 && (
        <View style={s.page}>
          <View style={s.content}>
            <View style={s.iconWrapper}>
              <Ionicons name="wallet-outline" size={40} color={colors.primary} />
            </View>
            <Text style={s.title}>First Account</Text>
            <Text style={s.subtitle}>Set up your primary cash wallet or bank account to begin.</Text>

            <View style={s.form}>
              <Text style={s.label}>Account Name</Text>
              <TextInput
                style={s.input}
                value={accountName}
                onChangeText={setAccountName}
                maxLength={50}
                placeholder="e.g., Main Wallet / Cash"
                placeholderTextColor="#8190A8"
              />

              <Text style={s.label}>Initial Balance</Text>
              <TextInput
                style={s.input}
                value={balance}
                onChangeText={setBalance}
                maxLength={12}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#8190A8"
              />
            </View>
          </View>
          <View style={s.footerRow}>
            <Pressable onPress={() => goToStep(2)} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>
            <AnimatedPressable
              onPress={finish}
              disabled={saving || (!accountName.trim() && balance !== '')}
              style={[s.nextBtn, (!accountName.trim() && balance !== '') && { opacity: 0.5 }]}
            >
              <Text style={s.buttonText}>{saving ? 'Starting...' : 'Finish Setup'}</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* FinLift with Sasiru Preview Modal */}
      <Modal
        visible={showFinliftModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinliftModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowFinliftModal(false)}>
          <Pressable style={s.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalBadgeRow}>
              <View style={s.modalBadge}>
                <Text style={s.modalBadgeText}>EXCLUSIVE VIDEO SERIES</Text>
              </View>
              <View style={s.comingSoonBadge}>
                <Text style={s.comingSoonText}>COMING SOON</Text>
              </View>
            </View>

            <View style={s.modalIconCircle}>
              <Ionicons name="play-circle-outline" size={44} color="#FBBF24" />
            </View>

            <Text style={s.modalTitle}>FinLift with Sasiru</Text>
            <Text style={s.modalSubtitle}>
              Empowering your financial future with actionable knowledge, smart budgeting principles, investment blueprints, and real-world money wisdom.
            </Text>

            <View style={s.modalFeatureList}>
              <View style={s.modalFeatureItem}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.income} />
                <Text style={s.modalFeatureText}>Practical personal wealth & budget tactics</Text>
              </View>
              <View style={s.modalFeatureItem}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.income} />
                <Text style={s.modalFeatureText}>Expert market breakdowns & interviews</Text>
              </View>
              <View style={s.modalFeatureItem}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.income} />
                <Text style={s.modalFeatureText}>Hosted by Sasiru on The Day News Global</Text>
              </View>
            </View>

            <AnimatedPressable
              onPress={() => {
                setShowFinliftModal(false);
                handleOpenWebsite();
              }}
              style={s.modalWebBtn}
            >
              <Text style={s.modalWebBtnText}>Visit Website for Launch Updates ↗</Text>
            </AnimatedPressable>

            <Pressable onPress={() => setShowFinliftModal(false)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseText}>Got It</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  page: { flex: 1, padding: 24, paddingBottom: 24, justifyContent: 'space-between' },
  landingScrollContent: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 20 },

  brandSection: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C48',
    borderColor: '#394D73',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgePillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  logoFrame: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#1E3A8A',
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  officialLogoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  landingTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  landingSubtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },

  actionCardsContainer: { gap: 14, marginVertical: 12 },

  // Secondary Card (Website & Video)
  secondaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#384762',
  },
  videoSeriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2638',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A3B20',
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E2C44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#314467',
  },
  cardTextCol: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  // Primary Hero Card (Start into the App)
  primaryHeroCard: {
    backgroundColor: '#1D4ED8',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryHeroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#93C5FD80',
  },
  primaryHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  primaryHeroDesc: {
    fontSize: 13,
    color: '#E0E7FF',
    lineHeight: 18,
  },

  comingSoonBadge: {
    backgroundColor: '#F59E0B25',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  versionNote: {
    textAlign: 'center',
    color: '#657591',
    fontSize: 12,
    marginTop: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  skipButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Setup Wizard Steps
  content: { flex: 1, justifyContent: 'center' },
  iconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  buttonText: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  backBtn: { padding: 16 },
  backText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
  },
  currencyOptions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  currencyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  currencyCardActive: { borderColor: colors.primary, backgroundColor: '#1E3A8A' },
  currencySymbol: { fontSize: 28, color: colors.text, marginBottom: 8, fontWeight: '800' },
  currencyLabel: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  textActive: { color: colors.text },
  customCurrencyContainer: { marginTop: 8 },
  form: { gap: 16 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
    padding: 16,
    borderRadius: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#384762',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#4A5B78',
    alignItems: 'center',
  },
  modalBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 18, alignItems: 'center' },
  modalBadge: {
    backgroundColor: '#1E2C48',
    borderColor: '#394D73',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modalBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#282114',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  modalFeatureList: { width: '100%', gap: 10, marginBottom: 22, backgroundColor: '#162032', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#263754' },
  modalFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalFeatureText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  modalWebBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalWebBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  modalCloseBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalCloseText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
