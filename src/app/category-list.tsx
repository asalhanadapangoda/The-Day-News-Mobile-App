import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import { colors, PageTitle, Screen, SectionTitle, AppHeader, CategoryIcon } from '@/components/ui';

export default function CategoryListScreen() { 
  const { categories, transactions } = useMoney(); 
  const expense = categories.filter((item) => item.type === 'expense'); 
  const income = categories.filter((item) => item.type === 'income'); 
  
  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title="Categories"
          leftElement={
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back-outline" size={18} color="#B5C8FC" />
              <Text style={s.backText}>Back</Text>
            </Pressable>
          }
        />

        <PageTitle subtitle="Organize your expenses and income for better tracking.">Categories Hub</PageTitle>
        <Pressable onPress={() => router.push('/category-form' as never)} style={s.newButton}>
          <Ionicons name="add-outline" size={20} color={colors.primaryDark} style={{ marginRight: 6 }} />
          <Text style={s.newText}>New Category</Text>
        </Pressable>
        
        <SectionTitle color={colors.expense}>Expenses</SectionTitle>
        <View style={s.grid}>
          {expense.map((category) => (
            <CategoryCard key={category.id} id={category.id} name={category.name} icon={category.icon} color={category.color} count={transactions.filter((transaction) => transaction.categoryId === category.id).length} />
          ))}
        </View>
        
        <View style={s.income}>
          <SectionTitle color={colors.income}>Income</SectionTitle>
          <View style={s.grid}>
            {income.map((category) => (
              <CategoryCard key={category.id} id={category.id} name={category.name} icon={category.icon} color={category.color} count={transactions.filter((transaction) => transaction.categoryId === category.id).length} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  ); 
}

function CategoryCard({ id, name, icon, color, count }: { id: string; name: string; icon: string; color: string; count: number }) { 
  return (
    <Pressable onPress={() => router.push({ pathname: '/category-form', params: { id } } as never)} style={s.card}>
      <View style={[s.categoryIcon, { backgroundColor: `${color}25`, borderColor: `${color}60` }]}>
        <CategoryIcon icon={icon} color={color} size={22} />
      </View>
      <Text style={s.cardName}>{name}</Text>
      <Text style={s.cardCount}>{count || 0} transactions</Text>
    </Pressable>
  ); 
}

const s = StyleSheet.create({ 
  content: { padding: 16, paddingBottom: 50 }, 
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C48',
    borderColor: '#394D73',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  backText: { color: '#B5C8FC', fontSize: 13, fontWeight: '800' }, 
  newButton: { flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center', marginVertical: 18 }, 
  newText: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' }, 
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, 
  card: { width: '47.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 16, minHeight: 140 }, 
  categoryIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }, 
  cardName: { color: colors.text, fontSize: 16, fontWeight: '800' }, 
  cardCount: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 6 }, 
  income: { marginTop: 32 } 
});
