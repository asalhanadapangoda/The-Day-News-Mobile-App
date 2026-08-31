import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { totalFor, useMoney } from '@/context/money-context';
import { colors, PageTitle, Screen, SectionTitle, formatMoney, MonthPicker, AppHeader, CategoryIcon } from '@/components/ui';
import { useState } from 'react';

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function StatsScreen() { 
  const { transactions, categories, budgets, currency } = useMoney(); 
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
  const total = totalFor(monthTransactions, 'expense'); 
  
  const ranking = categories
    .filter((category) => category.type === 'expense')
    .map((category) => ({ 
      category, 
      amount: monthTransactions
        .filter((transaction) => transaction.categoryId === category.id && transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0) 
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount); 

  const monthBudgets = budgets.filter((budget) => budget.month === currentMonth); 
  
  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title="Analytics"
          leftElement={
            <Pressable onPress={() => router.push('/budget-form' as never)} style={s.headerAddBtn}>
              <Ionicons name="add-outline" size={16} color={colors.income} style={{ marginRight: 2 }} />
              <Text style={s.headerAddText}>Budget</Text>
            </Pressable>
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
        
        <PageTitle subtitle="Spending breakdown and budget tracking.">Monthly Insights</PageTitle>
        
        <View style={s.donut}>
          <View style={s.ring}>
            <Text style={s.spent}>Spent</Text>
            <Text style={s.spentAmount}>{formatMoney(total, currency)}</Text>
          </View>
        </View>
        
        <SectionTitle>MONTHLY BUDGETS</SectionTitle>
        {monthBudgets.length ? monthBudgets.map((budget) => { 
          const category = categories.find((item) => item.id === budget.categoryId); 
          const spent = monthTransactions.filter((transaction) => transaction.type === 'expense' && transaction.categoryId === budget.categoryId).reduce((sum, transaction) => sum + transaction.amount, 0); 
          const rawPercent = Math.round((spent / budget.amount) * 100); 
          const percent = Math.min(rawPercent, 100); 
          const tone = rawPercent > 100 ? colors.expense : category?.color ?? colors.primary; 
          return (
            <Pressable key={budget.id} onPress={() => router.push({ pathname: '/budget-form', params: { id: budget.id } } as never)} style={s.budget}>
              <View style={s.itemTitle}>
                <View style={s.itemTitleLeft}>
                  <CategoryIcon icon={category?.icon} color={tone} size={18} />
                  <Text style={s.itemName}>{category?.name}</Text>
                </View>
                <Text style={[s.itemAmount, { color: tone }]}>{formatMoney(spent, currency)} / {formatMoney(budget.amount, currency)}</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${percent}%`, backgroundColor: tone }]} />
              </View>
              <Text style={s.remaining}>{rawPercent > 100 ? `${formatMoney(spent - budget.amount, currency)} over budget` : `${formatMoney(budget.amount - spent, currency)} remaining`}</Text>
            </Pressable>
          ); 
        }) : (
          <Pressable onPress={() => router.push('/budget-form' as never)} style={s.empty}>
            <Text style={s.emptyText}>Set a category limit to start tracking your budget.</Text>
          </Pressable>
        )}
        
        <SectionTitle>SPENDING BY CATEGORY</SectionTitle>
        {ranking.map(({ category, amount }, index) => { 
          const pct = total ? Math.round((amount / total) * 100) : 0; 
          return (
            <View key={category.id} style={s.item}>
              <View style={s.itemTitle}>
                <View style={s.itemTitleLeft}>
                  <CategoryIcon icon={category.icon} color={category.color} size={18} />
                  <Text style={s.itemName}>{category.name}</Text>
                </View>
                <Text style={s.itemAmount}>{formatMoney(amount, currency)} ({pct}%)</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${pct}%`, backgroundColor: category.color }]} />
              </View>
            </View>
          ); 
        })}
      </ScrollView>
      <MonthPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentMonth={currentMonth} onSelect={setCurrentMonth} />
    </Screen>
  ); 
}

const s = StyleSheet.create({ 
  content: { padding: 16, paddingBottom: 60 }, 
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162C3D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#244B66',
  },
  headerAddText: { color: colors.income, fontSize: 13, fontWeight: '800' },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16, marginTop: 4 }, 
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  period: { color: colors.text, fontSize: 13, fontWeight: '800' }, 
  donut: { alignItems: 'center', marginVertical: 26 }, 
  ring: { height: 170, width: 170, borderRadius: 85, borderWidth: 18, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' }, 
  spent: { color: colors.muted, fontSize: 14 }, 
  spentAmount: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 5 }, 
  budget: { backgroundColor: colors.surface, padding: 15, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2E3D52' }, 
  item: { marginBottom: 20 }, 
  itemTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }, 
  itemTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  itemName: { color: colors.text, fontWeight: '700' }, 
  itemAmount: { color: colors.muted, fontWeight: '600', fontSize: 13 }, 
  track: { height: 10, backgroundColor: colors.surfaceLight, borderRadius: 5, overflow: 'hidden' }, 
  fill: { height: '100%', borderRadius: 5 }, 
  remaining: { color: colors.muted, marginTop: 8, fontSize: 12, fontWeight: '600' }, 
  empty: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 22, borderWidth: 1, borderColor: '#334155' }, 
  emptyText: { color: colors.muted, lineHeight: 20 } 
});
