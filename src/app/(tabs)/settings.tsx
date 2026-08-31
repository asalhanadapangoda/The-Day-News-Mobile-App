import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import { colors, formatMoney, PageTitle, Screen, AppHeader } from '@/components/ui';
import { useState } from 'react';
import { exportToCSV, exportToPDF } from '@/utils/export-utils';

export default function SettingsScreen() { 
  const { accounts, categories, transactions, currency, setGlobalCurrency, username, setGlobalUsername } = useMoney(); 
  const [customCurrency, setCustomCurrency] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(username);
  
  const total = accounts.reduce((sum, account) => sum + account.balance, 0); 
  const isCustom = currency !== 'USD' && currency !== 'LKR';

  const handleCurrencySelect = (code: string) => {
    if (code !== 'CUSTOM') {
      setGlobalCurrency(code);
    } else {
      setGlobalCurrency(customCurrency.toUpperCase() || 'EUR');
    }
  };

  const handleNameSave = () => {
    setGlobalUsername(newName.trim() || 'User');
    setIsEditingName(false);
  };

  const handleExportCSV = async () => {
    const success = await exportToCSV(transactions, categories, accounts, currency);
    if (success) Alert.alert('Export Successful', 'Your transactions were successfully exported.');
    else Alert.alert('Export Failed', 'There was an error generating your file.');
  };

  const handleExportPDF = async () => {
    const success = await exportToPDF(transactions, categories, currency);
    if (success) Alert.alert('Export Successful', 'Your report was successfully exported.');
    else Alert.alert('Export Failed', 'There was an error generating your report.');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title="Settings"
          leftElement={
            <View style={s.headerUserChip}>
              <Ionicons name="person-outline" size={14} color={colors.primary} />
              <Text style={s.headerUserName} numberOfLines={1}>{username}</Text>
            </View>
          }
        />

        <PageTitle subtitle="Preferences, exports, and media links.">Settings & About</PageTitle>
        
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Ionicons name="person-circle-outline" size={54} color={colors.primary} />
          </View>
          {isEditingName ? (
            <TextInput 
              style={s.nameInput}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleNameSave}
              onBlur={handleNameSave}
              autoFocus
            />
          ) : (
            <Pressable onPress={() => { setNewName(username); setIsEditingName(true); }} style={s.nameRow}>
              <Text style={s.greeting}>Hi, {username}</Text>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
            </Pressable>
          )}
          <View style={s.divider} />
          <Text style={s.profileLabel}>TOTAL NET WORTH</Text>
          <Text style={s.profileAmount}>{formatMoney(total, currency)}</Text>
        </View>

        <Text style={s.sectionHeader}>CURRENCY</Text>
        <View style={s.currencyRow}>
          <Pressable onPress={() => handleCurrencySelect('USD')} style={[s.currencyBtn, currency === 'USD' && s.currencyBtnActive]}>
            <Text style={[s.currencyBtnText, currency === 'USD' && s.currencyBtnTextActive]}>USD ($)</Text>
          </Pressable>
          <Pressable onPress={() => handleCurrencySelect('LKR')} style={[s.currencyBtn, currency === 'LKR' && s.currencyBtnActive]}>
            <Text style={[s.currencyBtnText, currency === 'LKR' && s.currencyBtnTextActive]}>LKR (රු)</Text>
          </Pressable>
          <Pressable onPress={() => handleCurrencySelect('CUSTOM')} style={[s.currencyBtn, isCustom && s.currencyBtnActive]}>
            <Text style={[s.currencyBtnText, isCustom && s.currencyBtnTextActive]}>{isCustom ? currency : 'Custom'}</Text>
          </Pressable>
        </View>

        {isCustom && (
          <View style={s.customCurrencyContainer}>
            <TextInput 
              style={s.input}
              value={customCurrency}
              onChangeText={setCustomCurrency}
              onSubmitEditing={() => setGlobalCurrency(customCurrency.toUpperCase() || 'EUR')}
              placeholder="Type code (e.g. EUR) and press enter"
              placeholderTextColor="#8190A8"
              autoCapitalize="characters"
              maxLength={3}
            />
          </View>
        )}

        <Text style={s.sectionHeader}>PREFERENCES</Text>
        <View style={s.menuGroup}>
          <MenuRow
            iconName="grid-outline"
            label="Manage Categories"
            onPress={() => router.push('/category-list' as never)}
            isLast
          />
        </View>

        <Text style={s.sectionHeader}>DATA & BACKUP</Text>
        <View style={s.menuGroup}>
          <MenuRow iconName="document-text-outline" label="Export Data as CSV" onPress={handleExportCSV} />
          <MenuRow iconName="reader-outline" label="Export Report as PDF" onPress={handleExportPDF} />
          <MenuRow iconName="cloud-upload-outline" label="Backup Database" onPress={() => Alert.alert('Coming Soon', 'Raw SQLite database backup will be implemented in a future update.')} isLast />
        </View>

        <Text style={s.sectionHeader}>ABOUT & MEDIA</Text>
        <View style={s.menuGroup}>
          <MenuRow
            iconName="globe-outline"
            label="The Day News Global Website"
            onPress={async () => {
              try {
                if (process.env.EXPO_OS !== 'web') {
                  await (await import('expo-web-browser')).openBrowserAsync('https://thedaynewsglobal.lk/');
                } else {
                  await (await import('expo-linking')).openURL('https://thedaynewsglobal.lk/');
                }
              } catch {
                (await import('expo-linking')).openURL('https://thedaynewsglobal.lk/');
              }
            }}
          />
          <MenuRow
            iconName="videocam-outline"
            iconColor="#FBBF24"
            label="FinLift with Sasiru (Video Series)"
            onPress={() => Alert.alert('FinLift with Sasiru', 'Coming Soon! Exclusive financial literacy masterclass & video series hosted by Sasiru on The Day News Global.')}
          />
          <MenuRow
            iconName="sparkles-outline"
            label="Welcome & Overview Page"
            onPress={() => router.push('/welcome' as never)}
            isLast
          />
        </View>

      </ScrollView>
    </Screen>
  ); 
}

function MenuRow({
  iconName,
  iconColor = colors.primary,
  label,
  onPress,
  isLast,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable style={[s.menuRow, !isLast && s.menuRowBorder]} onPress={onPress}>
      <View style={s.menuIconWrapper}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward-outline" size={18} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({ 
  content: { padding: 16, paddingBottom: 60 },
  headerUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C48',
    borderColor: '#394D73',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    maxWidth: 130,
  },
  headerUserName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, marginVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.primary}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: `${colors.primary}40` },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800' },
  nameInput: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.primary, minWidth: 120, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#334155', width: '100%', marginBottom: 16 },
  profileLabel: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  profileAmount: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 6 },
  sectionHeader: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 10, marginLeft: 4 },
  currencyRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  currencyBtn: { flex: 1, backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  currencyBtnActive: { backgroundColor: '#1E3A8A', borderColor: colors.primary },
  currencyBtnText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  currencyBtnTextActive: { color: colors.text },
  customCurrencyContainer: { marginBottom: 20, marginTop: -6 },
  input: { backgroundColor: colors.surface, color: colors.text, fontSize: 16, padding: 16, borderRadius: 12, fontWeight: '700', borderWidth: 1, borderColor: colors.primary },
  menuGroup: { backgroundColor: colors.surface, borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#283548' },
  menuIconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16233B', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#263754' },
  menuLabel: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
});
