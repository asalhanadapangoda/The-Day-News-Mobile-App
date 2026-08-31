import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import type { AccountInput } from '@/context/money-context';
import { colors, Screen, AppHeader } from '@/components/ui';

const accountTypes: { type: AccountInput['type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'cash', label: 'Cash Wallet', icon: 'cash-outline' },
  { type: 'bank', label: 'Bank Account', icon: 'business-outline' },
  { type: 'savings', label: 'Savings', icon: 'trending-up-outline' },
  { type: 'credit', label: 'Credit Card', icon: 'card-outline' },
];

export default function AccountForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, deleteAccount, currency } = useMoney();
  const current = accounts.find((account) => account.id === id);
  const [name, setName] = useState(current?.name ?? '');
  const [type, setType] = useState<AccountInput['type']>(current?.type ?? 'cash');
  const [balance, setBalance] = useState(String(current?.balance ?? '0'));

  async function save() {
    const amount = Number(balance);
    if (!name.trim() || !Number.isFinite(amount)) {
      Alert.alert('Check your account', 'Enter a name and a valid opening balance.');
      return;
    }
    await saveAccount({ name: name.trim(), type, balance: amount, currency: currency }, id);
    router.back();
  }

  async function remove() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete account? Accounts with transactions cannot be deleted.')) {
        if (id && await deleteAccount(id)) {
          router.back();
        } else {
          window.alert('Account in use. Delete or move its transactions first.');
        }
      }
      return;
    }
    Alert.alert('Delete account?', 'Accounts with transactions cannot be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id && await deleteAccount(id)) router.back();
          else Alert.alert('Account in use', 'Delete or move its transactions first.');
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title={current ? 'Edit Account' : 'New Account'}
          leftElement={
            <Pressable onPress={() => router.back()} style={s.cancelBtn}>
              <Text style={s.cancel}>Cancel</Text>
            </Pressable>
          }
          rightElement={
            <Pressable onPress={save} style={s.saveBtn}>
              <Text style={s.save}>Save</Text>
            </Pressable>
          }
        />

        <Text style={s.label}>Account Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Main Savings Account"
          placeholderTextColor="#8190A8"
          style={s.input}
        />

        <Text style={s.label}>Account Type</Text>
        <View style={s.types}>
          {accountTypes.map((item) => (
            <Pressable
              key={item.type}
              onPress={() => setType(item.type)}
              style={[s.type, type === item.type && s.typeActive]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={type === item.type ? colors.text : colors.primary}
                style={{ marginBottom: 4 }}
              />
              <Text style={[s.typeText, type === item.type && s.typeTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Opening Balance</Text>
        <TextInput
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#8190A8"
          style={s.input}
        />

        {current ? (
          <Pressable onPress={remove} style={s.delete}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} style={{ marginRight: 6 }} />
            <Text style={s.deleteText}>Delete account</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 50 },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  cancel: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: '#1B352E', borderColor: '#2E6955', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  save: { color: colors.income, fontWeight: '800', fontSize: 14 },
  label: { color: colors.muted, marginTop: 24, marginBottom: 9, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 15, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: '#374763' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  type: { width: '48%', backgroundColor: colors.surface, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  typeActive: { borderColor: colors.primary, backgroundColor: '#1E3A8A' },
  typeText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  typeTextActive: { color: colors.text },
  delete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, padding: 14 },
  deleteText: { color: colors.expense, fontWeight: '800', fontSize: 16 },
});
