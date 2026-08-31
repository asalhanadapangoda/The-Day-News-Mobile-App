import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMoney } from '@/context/money-context';
import { colors, PageTitle, Screen, SectionTitle, formatMoney, AppHeader } from '@/components/ui';

export default function AccountsScreen() {
  const { accounts, currency } = useMoney();
  const assets = accounts.filter((account) => account.balance >= 0);
  const liabilities = accounts.filter((account) => account.balance < 0);
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader
          title="Accounts"
          leftElement={
            <Pressable onPress={() => router.push('/account-form' as never)} style={s.addBtn}>
              <Ionicons name="add-outline" size={16} color={colors.income} style={{ marginRight: 2 }} />
              <Text style={s.addText}>Add</Text>
            </Pressable>
          }
        />

        <PageTitle subtitle="Your money, accounts, and balances in one place.">Net Worth</PageTitle>
        
        <View style={s.total}>
          <Text style={s.totalLabel}>TOTAL NET WORTH</Text>
          <Text style={s.totalAmount}>{formatMoney(total, currency)}</Text>
        </View>

        <SectionTitle color={colors.income}>ASSETS</SectionTitle>
        {assets.length === 0 ? (
          <Text style={s.emptyHint}>No asset accounts created yet.</Text>
        ) : (
          assets.map((account) => (
            <AccountRow
              key={account.id}
              id={account.id}
              name={account.name}
              type={account.type}
              amount={account.balance}
              currency={currency}
            />
          ))
        )}

        <View style={{ marginTop: 24 }}>
          <SectionTitle color={colors.expense}>LIABILITIES</SectionTitle>
          {liabilities.length === 0 ? (
            <Text style={s.emptyHint}>No liabilities or credit balances.</Text>
          ) : (
            liabilities.map((account) => (
              <AccountRow
                key={account.id}
                id={account.id}
                name={account.name}
                type={account.type}
                amount={account.balance}
                currency={currency}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function AccountRow({
  id,
  name,
  type,
  amount,
  currency,
}: {
  id: string;
  name: string;
  type: string;
  amount: number;
  currency: string;
}) {
  let iconName: keyof typeof Ionicons.glyphMap = 'wallet-outline';
  if (type === 'cash') iconName = 'cash-outline';
  else if (type === 'credit') iconName = 'card-outline';
  else if (type === 'savings') iconName = 'trending-up-outline';
  else if (type === 'bank') iconName = 'business-outline';

  const isLiability = amount < 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/account-form', params: { id } } as never)}
      style={s.row}
    >
      <View style={[s.accountIcon, { backgroundColor: isLiability ? '#3E2529' : '#1C2E4A', borderColor: isLiability ? '#6B2D38' : '#2D4573' }]}>
        <Ionicons name={iconName} size={20} color={isLiability ? colors.expense : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{name}</Text>
        <Text style={s.type}>{type.toUpperCase()}</Text>
      </View>
      <Text style={[s.amount, { color: amount >= 0 ? colors.text : colors.expense }]}>
        {amount < 0 ? '-' : ''}
        {formatMoney(amount, currency)}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, gap: 10 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162C3D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#244B66',
  },
  addText: { color: colors.income, fontSize: 13, fontWeight: '800' },
  total: { backgroundColor: colors.surface, borderRadius: 16, padding: 22, marginVertical: 18, borderWidth: 1, borderColor: '#334155' },
  totalLabel: { color: colors.muted, fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },
  totalAmount: { color: colors.text, fontSize: 33, fontWeight: '900', marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E3D52',
  },
  accountIcon: {
    height: 42,
    width: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    borderWidth: 1,
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  type: { color: colors.muted, fontSize: 11, marginTop: 4, fontWeight: '700' },
  amount: { fontWeight: '800', fontSize: 16 },
  emptyHint: { color: colors.muted, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
});
