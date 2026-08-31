import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryFor, totalFor, useMoney } from '@/context/money-context';
import { colors, Screen, formatMoney, MonthPicker, AppHeader, CategoryIcon } from '@/components/ui';
import { useState } from 'react';

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return `${days[dateObj.getDay()]}, ${shortMonths[dateObj.getMonth()]} ${dateObj.getDate()}`;
}

export default function TransactionsScreen() {
  const { transactions, categories, accounts, currency } = useMoney();
  
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pickerVisible, setPickerVisible] = useState(false);

  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const prettyMonth = `${monthNames[month - 1]} ${year}`;

  const handlePrev = () => {
    let y = year; let m = month - 1;
    if (m < 1) { m = 12; y--; }
    setCurrentMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNext = () => {
    let y = year; let m = month + 1;
    if (m > 12) { m = 1; y++; }
    setCurrentMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  const income = totalFor(monthTransactions, 'income'); 
  const expenses = totalFor(monthTransactions, 'expense');

  const groups: Record<string, typeof transactions> = {};
  for (const t of monthTransactions) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader 
          title="Ledger"
          leftElement={
            <View style={s.headerActions}>
              <Pressable hitSlop={10} onPress={() => router.push('/transaction-search' as never)} style={s.iconBtn}>
                <Ionicons name="search-outline" size={17} color={colors.text} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => Alert.alert('Notifications', 'All caught up! No new notifications.')} style={s.iconBtn}>
                <Ionicons name="notifications-outline" size={17} color={colors.text} />
              </Pressable>
            </View>
          }
        />
        
        <View style={s.periodRow}>
          <View style={s.monthNav}>
            <Pressable onPress={handlePrev} hitSlop={15}>
              <Ionicons name="chevron-back-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => setPickerVisible(true)}>
              <Text style={s.period}>{prettyMonth.toUpperCase()}</Text>
            </Pressable>
            <Pressable onPress={handleNext} hitSlop={15}>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <Text style={s.title}>Daily Ledger</Text>
        
        <View style={s.overview}>
          <Text style={s.overviewLabel}>MONTHLY OVERVIEW</Text>
          <View style={s.totals}>
            <Metric label="Income" amount={formatMoney(income, currency)} tone={colors.income} />
            <Metric label="Expense" amount={formatMoney(expenses, currency)} tone={colors.expense} />
            <Metric label="Remaining" amount={formatMoney(income - expenses, currency)} tone={colors.text} />
          </View>
        </View>
        
        <Text style={s.section}>TRANSACTIONS</Text>
        
        {sortedDates.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={38} color={colors.muted} />
            </View>
            <Text style={s.emptyTitle}>No transactions</Text>
            <Text style={s.emptyDesc}>You haven't recorded any expenses or income for {prettyMonth}.</Text>
          </View>
        ) : (
          sortedDates.map((date) => (
            <View key={date} style={s.dateGroup}>
              <Text style={s.dateHeader}>{formatDate(date)}</Text>
              {groups[date].map((transaction) => { 
                const category = categoryFor(categories, transaction.categoryId); 
                const account = accounts.find((item) => item.id === transaction.accountId); 
                const positive = transaction.type === 'income'; 
                return (
                  <Pressable key={transaction.id} onPress={() => router.push({ pathname: '/add-entry', params: { id: transaction.id } } as never)} style={s.entry}>
                    <View style={s.entryRow}>
                      <View style={[s.icon, { backgroundColor: `${category?.color ?? colors.primary}25`, borderColor: `${category?.color ?? colors.primary}50` }]}>
                        {transaction.type === 'transfer' ? (
                          <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                        ) : (
                          <CategoryIcon icon={category?.icon} color={category?.color ?? colors.primary} size={18} />
                        )}
                      </View>
                      <View style={s.entryDetail}>
                        <Text style={s.entryName}>{category?.name ?? 'Transfer'}</Text>
                        <Text style={s.entryNote}>{transaction.note || account?.name}</Text>
                      </View>
                      <Text style={[s.entryAmount, { color: positive ? colors.income : colors.expense }]}>
                        {positive ? '+' : '-'}{formatMoney(transaction.amount, currency)}
                      </Text>
                    </View>
                  </Pressable>
                ); 
              })}
            </View>
          ))
        )}
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => router.push('/add-entry' as never)} style={s.fab}>
        <Ionicons name="add-outline" size={20} color={colors.primaryDark} style={{ marginRight: 4 }} />
        <Text style={s.fabText}>Add entry</Text>
      </Pressable>
      <MonthPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentMonth={currentMonth} onSelect={setCurrentMonth} />
    </Screen>
  );
}

function Metric({ label, amount, tone }: { label: string; amount: string; tone: string }) { 
  return (
    <View>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricAmount, { color: tone }]}>{amount}</Text>
    </View>
  ); 
}

const s = StyleSheet.create({ 
  content: { padding: 16, paddingBottom: 100 }, 
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  periodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  period: { color: colors.primary, fontWeight: '800', letterSpacing: 1, fontSize: 12 }, 
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 8, marginBottom: 16 }, 
  overview: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#334155' }, 
  overviewLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }, 
  totals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, 
  metricLabel: { color: colors.muted, fontSize: 13 }, 
  metricAmount: { fontSize: 16, fontWeight: '800', marginTop: 6 }, 
  section: { color: colors.primary, fontWeight: '800', marginTop: 26, marginBottom: 10, letterSpacing: 0.8 }, 
  dateGroup: { marginBottom: 16 },
  dateHeader: { color: colors.muted, fontSize: 13, marginBottom: 8, marginTop: 4, fontWeight: '700' },
  entry: { backgroundColor: colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2E3D52' }, 
  entryRow: { flexDirection: 'row', alignItems: 'center' }, 
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 }, 
  entryDetail: { flex: 1 }, 
  entryName: { color: colors.text, fontSize: 16, fontWeight: '700' }, 
  entryNote: { color: colors.muted, fontSize: 13, marginTop: 3 }, 
  entryAmount: { fontWeight: '800', fontSize: 15 }, 
  emptyState: { alignItems: 'center', paddingVertical: 36 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: colors.muted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  fab: { position: 'absolute', right: 16, bottom: 18, backgroundColor: colors.primary, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14, elevation: 6, flexDirection: 'row', alignItems: 'center' }, 
  fabText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' } 
});
