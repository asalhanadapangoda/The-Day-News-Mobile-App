import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState, createElement } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMoney } from '@/context/money-context';
import type { EntryType } from '@/data/types';
import { colors, Screen, AppHeader, CategoryIcon } from '@/components/ui';
import {
  persistReceipt,
  useReceiptDisplayUri,
  MAX_RECEIPT_SIZE_BYTES,
  type StagedReceipt,
} from '@/utils/receipt-storage';

export default function AddEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const { accounts, categories, transactions, saveTransaction, deleteTransaction, currency } = useMoney(); const existing = transactions.find((transaction) => transaction.id === id);
  const [type, setType] = useState<EntryType>(existing?.type ?? 'expense'); 
  const [amount, setAmount] = useState(existing ? String(existing.amount) : ''); 
  const [note, setNote] = useState(existing?.note ?? ''); 
  const [dateStr, setDateStr] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [customAccountId, setCustomAccountId] = useState(existing?.accountId ?? ''); 
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? ''); 
  const [customCategoryId, setCustomCategoryId] = useState(existing?.categoryId ?? ''); 
  const [persistedReceiptUri, setPersistedReceiptUri] = useState<string | null>(existing?.receiptUri ?? null);
  const [stagedAsset, setStagedAsset] = useState<StagedReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  
  const activeReceiptReference = stagedAsset ? stagedAsset.uri : persistedReceiptUri;
  const displayReceiptUri = useReceiptDisplayUri(activeReceiptReference);
  
  const visibleCategories = categories.filter((category) => category.type === (type === 'income' ? 'income' : 'expense'));
  const accountId = customAccountId || accounts[0]?.id || '';
  const destinations = accounts.filter((account) => account.id !== accountId);
  const categoryId = (type !== 'transfer' && visibleCategories.some((category) => category.id === customCategoryId))
    ? customCategoryId
    : (visibleCategories[0]?.id ?? '');
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_RECEIPT_SIZE_BYTES) {
        Alert.alert('File too large', 'Please choose an image under 15 MB.');
        return;
      }
      setStagedAsset({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        base64: asset.base64,
      });
    }
  };

  const handleRemoveReceipt = () => {
    setStagedAsset(null);
    setPersistedReceiptUri(null);
  };

  async function save() { 
    const parsed = Number(amount); 
    if (!accountId || !Number.isFinite(parsed) || parsed <= 0 || parsed > 999999999.99) {
      Alert.alert('Check this entry', 'Choose an account and enter a positive amount under 1,000,000,000.');
      return;
    } 
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      Alert.alert('Choose a destination', 'Select a different destination account receiving this transfer.');
      return;
    } 
    if (type !== 'transfer' && !categoryId) { Alert.alert('Choose a category', 'Select a category for this transaction.'); return; } 
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Check the date', 'Use the format YYYY-MM-DD'); return; }
    setSaving(true); 
    try { 
      let finalReceiptUri: string | null = persistedReceiptUri;
      if (stagedAsset) {
        finalReceiptUri = await persistReceipt(stagedAsset);
      }
      await saveTransaction({ type, amount: parsed, accountId, toAccountId: type === 'transfer' ? toAccountId : null, categoryId: type === 'transfer' ? null : categoryId, date: dateStr, note: note.trim().slice(0, 250), receiptUri: finalReceiptUri }, id); 
      router.back(); 
    } catch (err: any) {
      Alert.alert('Error saving transaction', err?.message || 'Failed to save transaction.');
    } finally { setSaving(false); } 
  }
  
  async function remove() { 
    if (Platform.OS === 'web') { 
      if (window.confirm('Delete transaction? This reverses its effect on the account balance.')) { if (id) { await deleteTransaction(id); router.back(); } } 
      return; 
    } 
    Alert.alert('Delete transaction?', 'This reverses its effect on the account balance.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (id) { await deleteTransaction(id); router.back(); } } }]); 
  }
  
  const currencySymbol = currency === 'USD' ? '$' : currency === 'LKR' ? 'රු' : currency;
  
  return (
    <Screen>
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <AppHeader
              title={existing ? 'Edit Entry' : 'New Entry'}
              leftElement={
                <Pressable hitSlop={10} onPress={() => router.back()} style={s.cancelBtn}>
                  <Text style={s.cancel}>Cancel</Text>
                </Pressable>
              }
              rightElement={
                <Pressable hitSlop={10} onPress={save} disabled={saving} style={s.saveBtn}>
                  {saving ? <ActivityIndicator color={colors.primaryDark} size="small" /> : <Text style={s.save}>Save</Text>}
                </Pressable>
              }
            />
            
            <View style={s.tabs}>
              {(['expense', 'income', 'transfer'] as EntryType[]).map((item) => (
                <Pressable key={item} onPress={() => { setType(item); setCustomCategoryId(''); }} style={[s.tab, type === item && s.tabActive]}>
                  <Text numberOfLines={1} style={[s.tabText, type === item && s.tabTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            
            <Text style={s.fieldLabel}>Amount</Text>
            <View style={s.amountField}>
              <Text style={s.currency}>{currencySymbol}</Text>
              <TextInput keyboardType="decimal-pad" maxLength={12} placeholder="0.00" placeholderTextColor="#8190A8" value={amount} onChangeText={setAmount} style={s.amountInput} />
            </View>

            <Text style={s.fieldLabel}>Date</Text>
            {Platform.OS === 'web' ? (
              createElement('input', {
                type: 'date',
                value: dateStr,
                onChange: (e: any) => setDateStr(e.target.value),
                style: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, border: '1px solid #334155', outline: 'none' }
              })
            ) : (
              <TextInput value={dateStr} onChangeText={setDateStr} maxLength={10} placeholder="YYYY-MM-DD" placeholderTextColor="#8190A8" style={s.note} />
            )}
            
            <Text style={s.fieldLabel}>{type === 'transfer' ? 'From account' : 'Account'}</Text>
            <View style={s.options}>
              {accounts.map((account) => {
                let accIcon: keyof typeof Ionicons.glyphMap = 'wallet-outline';
                if (account.type === 'cash') accIcon = 'cash-outline';
                else if (account.type === 'credit') accIcon = 'card-outline';
                else if (account.type === 'savings') accIcon = 'trending-up-outline';
                else if (account.type === 'bank') accIcon = 'business-outline';

                return (
                  <Choice
                    key={account.id}
                    active={accountId === account.id}
                    onPress={() => { setCustomAccountId(account.id); if (toAccountId === account.id) setToAccountId(''); }}
                  >
                    <View style={s.choiceContent}>
                      <Ionicons name={accIcon} size={18} color={accountId === account.id ? colors.text : colors.primary} style={{ marginRight: 8 }} />
                      <Text style={[s.choiceText, accountId === account.id && s.choiceTextActive]}>{account.name}</Text>
                    </View>
                  </Choice>
                );
              })}
            </View>
            
            {type === 'transfer' ? (
              <>
                <Text style={s.fieldLabel}>To account</Text>
                <View style={s.options}>
                  {destinations.map((account) => {
                    let accIcon: keyof typeof Ionicons.glyphMap = 'wallet-outline';
                    if (account.type === 'cash') accIcon = 'cash-outline';
                    else if (account.type === 'credit') accIcon = 'card-outline';
                    else if (account.type === 'savings') accIcon = 'trending-up-outline';
                    else if (account.type === 'bank') accIcon = 'business-outline';

                    return (
                      <Choice
                        key={account.id}
                        active={toAccountId === account.id}
                        onPress={() => setToAccountId(account.id)}
                      >
                        <View style={s.choiceContent}>
                          <Ionicons name={accIcon} size={18} color={toAccountId === account.id ? colors.text : colors.primary} style={{ marginRight: 8 }} />
                          <Text style={[s.choiceText, toAccountId === account.id && s.choiceTextActive]}>{account.name}</Text>
                        </View>
                      </Choice>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={s.fieldLabel}>Category</Text>
                <View style={s.options}>
                  {visibleCategories.map((category) => (
                    <Choice
                      key={category.id}
                      active={categoryId === category.id}
                      onPress={() => setCustomCategoryId(category.id)}
                    >
                      <View style={s.choiceContent}>
                        <CategoryIcon icon={category.icon} color={categoryId === category.id ? colors.text : (category.color ?? colors.primary)} size={18} />
                        <Text style={[s.choiceText, { marginLeft: 8 }, categoryId === category.id && s.choiceTextActive]}>{category.name}</Text>
                      </View>
                    </Choice>
                  ))}
                </View>
              </>
            )}
            
            <Text style={s.fieldLabel}>Note</Text>
            <TextInput placeholder="e.g., Keells Super Grocery" placeholderTextColor="#8190A8" value={note} onChangeText={setNote} maxLength={250} multiline style={s.note} />
            
            <Text style={s.fieldLabel}>Receipt (Optional)</Text>
            {displayReceiptUri ? (
              <View style={s.receiptPreviewContainer}>
                <Image source={{ uri: displayReceiptUri }} style={s.receiptPreview} />
                <Pressable onPress={handleRemoveReceipt} style={s.removeReceiptBtn}>
                  <Ionicons name="trash-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={s.removeReceiptText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={pickImage} style={s.attachReceiptBtn}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={s.attachReceiptText}>Attach Receipt Photo</Text>
              </Pressable>
            )}

            {existing ? (
              <Pressable onPress={remove} style={s.delete}>
                <Ionicons name="trash-outline" size={18} color={colors.expense} style={{ marginRight: 6 }} />
                <Text style={s.deleteText}>Delete transaction</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

function Choice({ children, active, onPress }: { children: ReactNode; active: boolean; onPress: () => void }) { 
  return (
    <Pressable onPress={onPress} style={[s.choice, active && s.choiceActive]}>
      {children}
    </Pressable>
  ); 
}

const s = StyleSheet.create({ 
  safe: { flex: 1 }, 
  flex: { flex: 1 }, 
  content: { paddingHorizontal: 16, paddingBottom: 48, flexGrow: 1 }, 
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  cancel: { color: colors.muted, fontSize: 15, fontWeight: '700' }, 
  saveBtn: { backgroundColor: '#1B352E', borderColor: '#2E6955', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 }, 
  save: { color: colors.income, fontSize: 14, fontWeight: '800' }, 
  tabs: { flexDirection: 'row', marginTop: 14, backgroundColor: colors.surface, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#334155' }, 
  tab: { flex: 1, minWidth: 0, paddingVertical: 11, alignItems: 'center', borderRadius: 9 }, 
  tabActive: { backgroundColor: colors.primary }, 
  tabText: { textTransform: 'uppercase', color: colors.muted, fontWeight: '800', fontSize: 11 }, 
  tabTextActive: { color: colors.primaryDark }, 
  fieldLabel: { color: colors.muted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 22, marginBottom: 9 }, 
  amountField: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 8 }, 
  currency: { color: colors.primary, fontSize: 30, fontWeight: '800', marginRight: 8 }, 
  amountInput: { color: colors.text, fontSize: 32, fontWeight: '800', flex: 1, minWidth: 0, padding: 0 }, 
  options: { gap: 8 }, 
  choice: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface }, 
  choiceActive: { borderColor: colors.primary, backgroundColor: '#1E3A8A' }, 
  choiceContent: { flexDirection: 'row', alignItems: 'center' },
  choiceText: { color: colors.muted, fontWeight: '700' }, 
  choiceTextActive: { color: colors.text }, 
  note: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, minHeight: 72, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' }, 
  delete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, padding: 14 }, 
  deleteText: { color: colors.expense, fontSize: 16, fontWeight: '800' }, 
  attachReceiptBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#334155' }, 
  attachReceiptText: { color: colors.text, fontWeight: '700', fontSize: 15 }, 
  receiptPreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden', height: 160, borderWidth: 1, borderColor: '#334155' }, 
  receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' }, 
  removeReceiptBtn: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }, 
  removeReceiptText: { color: '#FFF', fontWeight: '800', fontSize: 12 } 
});
