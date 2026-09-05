import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useMoney } from '@/context/money-context';
import { useSecurity } from '@/context/security-context';
import { colors, formatMoney, PageTitle, Screen, AppHeader } from '@/components/ui';
import { useState } from 'react';
import { exportToCSV, exportToPDF } from '@/utils/export-utils';
import { exportLocalBackup, restoreLocalBackup, factoryResetData } from '@/utils/backup-service';

export default function SettingsScreen() { 
  const db = useSQLiteContext();
  const { accounts, categories, transactions, currency, setGlobalCurrency, username, setGlobalUsername, refreshData } = useMoney(); 
  const { appLockEnabled, biometricInfo, autoLockTimeout, setAppLockEnabled, setAutoLockTimeout } = useSecurity();
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

  const handleToggleAppLock = async (value: boolean) => {
    const success = await setAppLockEnabled(value);
    if (!success) {
      Alert.alert('Authentication Failed', 'Identity verification is required to change App Lock.');
    }
  };

  const handleCycleTimeout = () => {
    if (autoLockTimeout === 0) {
      setAutoLockTimeout(60);
    } else if (autoLockTimeout === 60) {
      setAutoLockTimeout(300);
    } else {
      setAutoLockTimeout(0);
    }
  };

  const handleExportCSV = () => {
    const runExport = async () => {
      const success = await exportToCSV(transactions, categories, accounts, currency);
      if (success) Alert.alert('Export Successful', 'Your transactions were successfully exported.');
      else Alert.alert('Export Failed', 'There was an error generating your file.');
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Notice: Exported CSV documents are unencrypted and saved outside The Day App\'s App Lock security boundary. Continue?')) {
        runExport();
      }
    } else {
      Alert.alert(
        'Export Financial Data',
        'Exported CSV files are unencrypted and will reside outside The Day App\'s App Lock security boundary. Anyone with file access can view them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export', onPress: runExport }
        ]
      );
    }
  };

  const handleExportPDF = () => {
    const runExport = async () => {
      const success = await exportToPDF(transactions, categories, currency);
      if (success) Alert.alert('Export Successful', 'Your report was successfully exported.');
      else Alert.alert('Export Failed', 'There was an error generating your report.');
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Notice: Exported PDF documents are unencrypted and saved outside The Day App\'s App Lock security boundary. Continue?')) {
        runExport();
      }
    } else {
      Alert.alert(
        'Export Financial Report',
        'Exported PDF reports are unencrypted and will reside outside The Day App\'s App Lock security boundary. Anyone with file access can view them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export', onPress: runExport }
        ]
      );
    }
  };

  const handleExportBackup = () => {
    const runExport = async () => {
      try {
        const success = await exportLocalBackup(db);
        if (success) {
          Alert.alert('Backup Created', 'Your complete backup has been generated.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        Alert.alert('Backup Error', `Failed to create backup: ${msg}`);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Notice: Exported JSON backup files are unencrypted and contain your full financial records outside The Day App\'s App Lock security boundary. Store it securely. Continue?')) {
        runExport();
      }
    } else {
      Alert.alert(
        'Export Local Backup',
        'Exported JSON backup files are unencrypted and contain your full financial records outside The Day App\'s App Lock security boundary. Anyone with file access can read them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export Backup', onPress: runExport }
        ]
      );
    }
  };

  const handleRestoreBackup = () => {
    const runRestore = async () => {
      try {
        const result = await restoreLocalBackup(db, refreshData);
        if (result.success) {
          Alert.alert('Restore Complete', result.message || 'Data restored successfully.');
        } else if (result.message && result.message !== 'Restore cancelled.') {
          Alert.alert('Restore Notice', result.message);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown restore error';
        Alert.alert('Restore Failed', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Warning: Restoring a backup will replace your current accounts, categories, transactions, and budgets with the data from the backup file. Continue?')) {
        runRestore();
      }
    } else {
      Alert.alert(
        'Restore from Backup',
        'Restoring a backup will replace your current accounts, categories, transactions, and budgets with the data from the backup file. We recommend creating a backup of your current data first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Select Backup File', onPress: runRestore }
        ]
      );
    }
  };

  const handleFactoryReset = () => {
    const runReset = async () => {
      try {
        await factoryResetData(db, refreshData);
        Alert.alert('Factory Reset Complete', 'All application data has been wiped and reset to clean factory defaults.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Reset failed';
        Alert.alert('Reset Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('DANGER: Are you sure you want to erase all data? This will permanently delete all your accounts, transactions, budgets, receipts, and custom categories. This action CANNOT be undone!')) {
        runReset();
      }
    } else {
      Alert.alert(
        'Erase All Data (Factory Reset)',
        'This will permanently delete all your accounts, transactions, budgets, receipts, and custom categories. This action CANNOT be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Erase Everything', style: 'destructive', onPress: runReset }
        ]
      );
    }
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
              maxLength={40}
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

        <Text style={s.sectionHeader}>SECURITY & PRIVACY</Text>
        <View style={s.menuGroup}>
          <View style={[s.menuRow, appLockEnabled && s.menuRowBorder]}>
            <View style={s.menuIconWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>App Lock</Text>
              <Text style={s.menuSubLabel}>
                {biometricInfo.isAvailable ? `Require ${biometricInfo.biometricTypeLabel}` : 'Require Device Passcode'}
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={appLockEnabled ? '#FFF' : '#94A3B8'}
            />
          </View>
          {appLockEnabled ? (
            <Pressable style={s.menuRow} onPress={handleCycleTimeout}>
              <View style={s.menuIconWrapper}>
                <Ionicons name="timer-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>Auto-Lock Timeout</Text>
                <Text style={s.menuSubLabel}>When returning from background</Text>
              </View>
              <Text style={s.menuValue}>
                {autoLockTimeout === 0 ? 'Immediately' : autoLockTimeout === 60 ? '1 Minute' : '5 Minutes'}
              </Text>
              <Ionicons name="chevron-forward-outline" size={16} color={colors.muted} style={{ marginLeft: 6 }} />
            </Pressable>
          ) : null}
        </View>

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
          <MenuRow iconName="download-outline" label="Export Local Backup (JSON)" onPress={handleExportBackup} />
          <MenuRow iconName="refresh-outline" label="Restore from Backup (JSON)" onPress={handleRestoreBackup} isLast />
        </View>

        <Text style={[s.sectionHeader, { color: '#F87171' }]}>DANGER ZONE</Text>
        <View style={[s.menuGroup, { borderColor: '#7F1D1D' }]}>
          <MenuRow
            iconName="trash-outline"
            iconColor="#EF4444"
            label="Erase All Data (Factory Reset)"
            onPress={handleFactoryReset}
            isLast
          />
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
  menuSubLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  menuValue: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
