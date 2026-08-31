import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import { colors, Screen, AppHeader, CategoryIcon } from '@/components/ui';

const currentMonth = new Date().toISOString().slice(0, 7);

export default function BudgetForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { budgets, categories, saveBudget, deleteBudget, currency } = useMoney();
  const existing = budgets.find((budget) => budget.id === id);
  const expenseCategories = categories.filter((category) => category.type === 'expense');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');

  useEffect(() => {
    if (!categoryId && expenseCategories[0]) setCategoryId(expenseCategories[0].id);
  }, [categoryId, expenseCategories]);

  async function save() {
    const value = Number(amount);
    if (!categoryId || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Enter a budget', 'Choose a category and a positive monthly amount.');
      return;
    }
    await saveBudget({ categoryId, amount: value, month: existing?.month ?? currentMonth }, id);
    router.back();
  }

  async function remove() {
    if (Platform.OS === 'web') {
      if (window.confirm('Remove budget? This does not delete any transactions.')) {
        if (id) {
          await deleteBudget(id);
          router.back();
        }
      }
      return;
    }
    Alert.alert('Remove budget?', 'This does not delete any transactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deleteBudget(id);
            router.back();
          }
        },
      },
    ]);
  }

  const currencySymbol = currency === 'USD' ? '$' : currency === 'LKR' ? 'රු' : currency;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title={existing ? 'Edit Budget' : 'New Budget'}
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

        <Text style={s.label}>Monthly Category</Text>
        <View style={s.options}>
          {expenseCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[s.choice, categoryId === category.id && s.choiceActive]}
            >
              <View style={s.choiceContent}>
                <CategoryIcon
                  icon={category.icon}
                  color={categoryId === category.id ? colors.text : (category.color ?? colors.primary)}
                  size={20}
                />
                <Text style={[s.choiceText, categoryId === category.id && s.choiceTextActive]}>
                  {category.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Monthly Spending Limit</Text>
        <View style={s.amount}>
          <Text style={s.dollar}>{currencySymbol}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#8190A8"
            style={s.input}
          />
        </View>

        {existing ? (
          <Pressable onPress={remove} style={s.delete}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} style={{ marginRight: 6 }} />
            <Text style={s.deleteText}>Remove budget</Text>
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
  save: { color: colors.income, fontSize: 14, fontWeight: '800' },
  label: { color: colors.muted, marginTop: 24, marginBottom: 9, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  options: { gap: 8 },
  choice: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 14 },
  choiceActive: { borderColor: colors.primary, backgroundColor: '#1E3A8A' },
  choiceContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  choiceTextActive: { color: colors.text },
  amount: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 6 },
  dollar: { color: colors.primary, fontSize: 30, fontWeight: '800', marginRight: 8 },
  input: { color: colors.text, fontSize: 32, fontWeight: '800', flex: 1, padding: 6 },
  delete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, padding: 14 },
  deleteText: { color: colors.expense, fontSize: 16, fontWeight: '800' },
});
