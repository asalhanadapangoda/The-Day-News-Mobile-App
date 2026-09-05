import { useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, ScrollView, Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMoney, categoryFor } from '@/context/money-context';
import { colors, formatMoney, AppHeader, CategoryIcon } from '@/components/ui';

export default function TransactionSearchScreen() {
  const { transactions, categories, currency } = useMoney();
  const [query, setQuery] = useState('');
  
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.trim().toLowerCase();
    return transactions.filter(t => {
      const matchNote = t.note?.toLowerCase().includes(lower);
      const cat = categoryFor(categories, t.categoryId);
      const matchCat = cat?.name.toLowerCase().includes(lower);
      return matchNote || matchCat;
    });
  }, [query, transactions, categories]);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.headerWrapper}>
        <AppHeader
          title="Search"
          leftElement={
            <Pressable onPress={() => router.back()} style={s.cancelBtn}>
              <Ionicons name="chevron-back-outline" size={20} color={colors.primary} />
              <Text style={s.cancelText}>Back</Text>
            </Pressable>
          }
        />
        
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.muted} style={s.searchIcon} />
          <TextInput 
            autoFocus
            style={s.input}
            maxLength={100}
            placeholder="Search by note, account or category..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={s.clearBtn}>
              <Ionicons name="close-circle-outline" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>
      
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {results.map(t => {
           const cat = categoryFor(categories, t.categoryId);
           return (
             <Pressable key={t.id} onPress={() => router.push({ pathname: '/add-entry', params: { id: t.id } } as never)} style={s.row}>
               <View style={[s.iconWrapper, { backgroundColor: `${cat?.color ?? colors.primary}25`, borderColor: `${cat?.color ?? colors.primary}50` }]}>
                 {t.type === 'transfer' ? (
                   <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                 ) : (
                   <CategoryIcon icon={cat?.icon} color={cat?.color ?? colors.primary} size={18} />
                 )}
               </View>
               <View style={s.details}>
                  <Text style={s.title}>{cat?.name ?? (t.type === 'transfer' ? 'Transfer' : 'General')}</Text>
                  <Text style={s.note} numberOfLines={1}>{t.note || t.date}</Text>
               </View>
               <Text style={[s.amount, { color: t.type === 'expense' ? colors.expense : colors.income }]}>
                 {t.type === 'expense' ? '-' : '+'}{formatMoney(t.amount, currency)}
               </Text>
             </Pressable>
           );
        })}
        {query.trim().length > 0 && results.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="search-outline" size={36} color={colors.muted} style={{ marginBottom: 10 }} />
            <Text style={s.empty}>No transactions found for &quot;{query}&quot;</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 24 : 0 },
  headerWrapper: { paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#26354D', paddingBottom: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: 4 },
  cancelText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, marginTop: 4 },
  searchIcon: { marginRight: 8 },
  clearBtn: { padding: 4 },
  input: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '700' },
  content: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2E3D52' },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 13, borderWidth: 1 },
  details: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  note: { color: colors.muted, fontSize: 13 },
  amount: { fontSize: 16, fontWeight: '800' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 15 }
});
