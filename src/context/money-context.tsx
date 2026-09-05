import { useSQLiteContext } from 'expo-sqlite';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Account, Budget, Category, EntryType, Transaction } from '@/data/types';
import { deleteReceiptFile } from '@/utils/receipt-storage';

export type TransactionInput = Omit<Transaction, 'id'>;
export type CategoryInput = Omit<Category, 'id'>;
export type AccountInput = Omit<Account, 'id'>;
export type BudgetInput = Omit<Budget, 'id'>;

const MAX_MONETARY_AMOUNT = 999999999.99; // Maximum allowable financial amount (1 billion limit)
const MAX_TEXT_LENGTH_NAME = 50;
const MAX_TEXT_LENGTH_NOTE = 250; // Aligned with UI limit (250 chars)
const VALID_TX_TYPES: EntryType[] = ['expense', 'income', 'transfer'];
const VALID_ACCOUNT_TYPES = ['cash', 'bank', 'savings', 'credit'];
const VALID_CATEGORY_TYPES = ['expense', 'income'];

function normalizeAmount(val: number): number {
  if (!Number.isFinite(val) || val <= 0 || val > MAX_MONETARY_AMOUNT) {
    throw new Error(`Invalid transaction amount. Must be positive and at most ${MAX_MONETARY_AMOUNT}.`);
  }
  // Normalizes monetary values to two decimal places and reduces common floating-point representation artifacts
  return Math.round(val * 100) / 100;
}

type MoneyContextValue = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  loading: boolean;
  currency: string;
  username: string;
  onboardingCompleted: boolean;
  addTransaction: (transaction: TransactionInput) => Promise<void>;
  saveTransaction: (input: TransactionInput, id?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCategory: (input: CategoryInput, id?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  saveAccount: (input: AccountInput, id?: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<boolean>;
  saveBudget: (input: BudgetInput, id?: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  setGlobalCurrency: (currency: string) => Promise<void>;
  setGlobalUsername: (name: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshData: () => Promise<void>;
};

const createUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const MoneyContext = createContext<MoneyContextValue | null>(null);

export function MoneyProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [username, setUsername] = useState('User');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [a, c, t, b, s] = await Promise.all([
        db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name').catch(() => []),
        db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name').catch(() => []),
        db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC').catch(() => []),
        db.getAllAsync<Budget>('SELECT * FROM budgets ORDER BY month DESC').catch(() => []),
        db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings').catch(() => []),
      ]);
      setAccounts(a);
      setCategories(c);
      setTransactions(t);
      setBudgets(b);
      const cur = s.find((x) => x.key === 'currency')?.value;
      if (cur) setCurrency(cur);
      const uname = s.find((x) => x.key === 'username')?.value;
      if (uname) setUsername(uname);
      const onb = s.find((x) => x.key === 'onboarding')?.value;
      if (onb === '1') setOnboardingCompleted(true);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        await refresh();
      } catch (err) {
        if (isMounted) console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const saveTransaction = useCallback(
    async (transaction: TransactionInput, id?: string) => {
      // 1. Validate monetary amount
      const validAmount = normalizeAmount(transaction.amount);

      // 2. Validate transaction type
      if (!VALID_TX_TYPES.includes(transaction.type)) {
        throw new Error('Invalid transaction type.');
      }

      // 3. Validate source account existence
      const sourceAccount = accounts.find((a) => a.id === transaction.accountId);
      if (!sourceAccount) {
        throw new Error('Source account does not exist.');
      }

      // 4. Validate transfer destination / category reference
      let validToAccountId: string | null = null;
      let validCategoryId: string | null = null;

      if (transaction.type === 'transfer') {
        if (!transaction.toAccountId) {
          throw new Error('Destination account is required for transfers.');
        }
        if (transaction.toAccountId === transaction.accountId) {
          throw new Error('Destination account cannot be the same as source account.');
        }
        const destAccount = accounts.find((a) => a.id === transaction.toAccountId);
        if (!destAccount) {
          throw new Error('Destination account does not exist.');
        }
        validToAccountId = transaction.toAccountId;
      } else {
        if (!transaction.categoryId) {
          throw new Error('Category is required for income/expense.');
        }
        const cat = categories.find((c) => c.id === transaction.categoryId);
        if (!cat) {
          throw new Error('Category does not exist.');
        }
        validCategoryId = transaction.categoryId;
      }

      // 5. Validate date format (YYYY-MM-DD)
      if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD.');
      }

      // 6. Validate note length (reject if exceeds limit, no silent truncation)
      let validNote: string | null = null;
      if (transaction.note) {
        const trimmed = transaction.note.trim();
        if (trimmed.length > MAX_TEXT_LENGTH_NOTE) {
          throw new Error(`Transaction note exceeds maximum length of ${MAX_TEXT_LENGTH_NOTE} characters.`);
        }
        validNote = trimmed.length > 0 ? trimmed : null;
      }

      let oldReceiptToDelete: string | null = null;

      await db.withTransactionAsync(async () => {
        if (id) {
          const previous = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', id);
          if (!previous) throw new Error('Transaction not found');
          if (previous.receiptUri && previous.receiptUri !== transaction.receiptUri) {
            oldReceiptToDelete = previous.receiptUri;
          }
          const undoSource = previous.type === 'income' ? -previous.amount : previous.amount;
          await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', undoSource, previous.accountId);
          if (previous.type === 'transfer' && previous.toAccountId) {
            await db.runAsync('UPDATE accounts SET balance = balance - ? WHERE id = ?', previous.amount, previous.toAccountId);
          }
          await db.runAsync(
            'UPDATE transactions SET type = ?, accountId = ?, toAccountId = ?, categoryId = ?, amount = ?, date = ?, note = ?, receiptUri = ? WHERE id = ?',
            transaction.type,
            transaction.accountId,
            validToAccountId,
            validCategoryId,
            validAmount,
            transaction.date,
            validNote,
            transaction.receiptUri ?? null,
            id
          );
        } else {
          id = createUniqueId('tx');
          await db.runAsync(
            'INSERT INTO transactions (id, type, accountId, toAccountId, categoryId, amount, date, note, receiptUri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            transaction.type,
            transaction.accountId,
            validToAccountId,
            validCategoryId,
            validAmount,
            transaction.date,
            validNote,
            transaction.receiptUri ?? null
          );
        }

        const sourceImpact = transaction.type === 'income' ? validAmount : -validAmount;
        await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', sourceImpact, transaction.accountId);
        if (transaction.type === 'transfer' && validToAccountId) {
          await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', validAmount, validToAccountId);
        }
      });

      if (oldReceiptToDelete) {
        await deleteReceiptFile(oldReceiptToDelete);
      }
      await refresh();
    },
    [db, refresh, accounts, categories]
  );

  const addTransaction = useCallback(
    async (transaction: TransactionInput) => saveTransaction(transaction),
    [saveTransaction]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      let receiptToDelete: string | null = null;
      await db.withTransactionAsync(async () => {
        const previous = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', id);
        if (!previous) return;
        receiptToDelete = previous.receiptUri ?? null;
        const undoSource = previous.type === 'income' ? -previous.amount : previous.amount;
        await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', undoSource, previous.accountId);
        if (previous.type === 'transfer' && previous.toAccountId) {
          await db.runAsync('UPDATE accounts SET balance = balance - ? WHERE id = ?', previous.amount, previous.toAccountId);
        }
        await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
      });
      if (receiptToDelete) {
        await deleteReceiptFile(receiptToDelete);
      }
      await refresh();
    },
    [db, refresh]
  );

  const saveCategory = useCallback(
    async (input: CategoryInput, id?: string) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) throw new Error('Category name cannot be empty.');
      if (trimmedName.length > 40) throw new Error('Category name exceeds 40 characters.');
      if (!VALID_CATEGORY_TYPES.includes(input.type)) throw new Error('Invalid category type.');
      const icon = (input.icon || 'restaurant-outline').trim();
      if (icon.length > 50) throw new Error('Category icon identifier exceeds maximum length of 50 characters.');
      const color = (input.color || '#8B6BE8').trim();
      if (color.length > 20) throw new Error('Category color identifier exceeds maximum length of 20 characters.');

      if (id) {
        await db.runAsync(
          'UPDATE categories SET name = ?, type = ?, icon = ?, color = ? WHERE id = ?',
          trimmedName,
          input.type,
          icon,
          color,
          id
        );
      } else {
        await db.runAsync(
          'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
          createUniqueId('category'),
          trimmedName,
          input.type,
          icon,
          color
        );
      }
      await refresh();
    },
    [db, refresh]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (transactions.some((transaction) => transaction.categoryId === id)) return false;
      if (budgets.some((budget) => budget.categoryId === id)) return false;
      await db.runAsync('DELETE FROM categories WHERE id = ?', id);
      await refresh();
      return true;
    },
    [db, refresh, transactions, budgets]
  );

  const saveAccount = useCallback(
    async (input: AccountInput, id?: string) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) throw new Error('Account name cannot be empty.');
      if (trimmedName.length > MAX_TEXT_LENGTH_NAME) throw new Error(`Account name exceeds ${MAX_TEXT_LENGTH_NAME} characters.`);
      if (!VALID_ACCOUNT_TYPES.includes(input.type)) throw new Error('Invalid account type.');
      if (!Number.isFinite(input.balance) || Math.abs(input.balance) > MAX_MONETARY_AMOUNT) {
        throw new Error('Invalid account balance.');
      }
      const roundedBalance = Math.round(input.balance * 100) / 100;
      const validCurrency = (input.currency || 'USD').trim().toUpperCase();
      if (validCurrency.length !== 3) throw new Error('Currency code must be exactly 3 characters (e.g. USD).');

      if (id) {
        await db.runAsync(
          'UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ? WHERE id = ?',
          trimmedName,
          input.type,
          roundedBalance,
          validCurrency,
          id
        );
      } else {
        await db.runAsync(
          'INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)',
          createUniqueId('account'),
          trimmedName,
          input.type,
          roundedBalance,
          validCurrency
        );
      }
      await refresh();
    },
    [db, refresh]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (transactions.some((transaction) => transaction.accountId === id || transaction.toAccountId === id)) return false;
      await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
      await refresh();
      return true;
    },
    [db, refresh, transactions]
  );

  const saveBudget = useCallback(
    async (input: BudgetInput, id?: string) => {
      if (!categories.some((c) => c.id === input.categoryId)) {
        throw new Error('Category does not exist.');
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > MAX_MONETARY_AMOUNT) {
        throw new Error('Budget amount must be positive and within allowable range.');
      }
      if (!/^\d{4}-\d{2}$/.test(input.month)) {
        throw new Error('Invalid budget month. Expected YYYY-MM.');
      }
      const roundedAmount = Math.round(input.amount * 100) / 100;
      const budgetId = id ?? 'budget-' + input.categoryId + '-' + input.month;
      await db.runAsync(
        'INSERT INTO budgets (id, categoryId, amount, month) VALUES (?, ?, ?, ?) ON CONFLICT(categoryId, month) DO UPDATE SET amount = excluded.amount',
        budgetId,
        input.categoryId,
        roundedAmount,
        input.month
      );
      await refresh();
    },
    [db, refresh, categories]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
      await refresh();
    },
    [db, refresh]
  );

  const setGlobalCurrency = useCallback(
    async (val: string) => {
      const clean = val.trim().toUpperCase();
      if (clean.length !== 3) {
        throw new Error('Currency code must be exactly 3 letters (e.g. USD).');
      }
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        'currency',
        clean
      );
      await refresh();
    },
    [db, refresh]
  );

  const setGlobalUsername = useCallback(
    async (val: string) => {
      const clean = val.trim();
      if (!clean) throw new Error('Username cannot be empty.');
      if (clean.length > 40) {
        throw new Error('Username exceeds maximum length of 40 characters.');
      }
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        'username',
        clean
      );
      await refresh();
    },
    [db, refresh]
  );

  const completeOnboarding = useCallback(async () => {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'onboarding',
      '1'
    );
    await refresh();
  }, [db, refresh]);

  return (
    <MoneyContext.Provider
      value={useMemo(
        () => ({
          accounts,
          categories,
          transactions,
          budgets,
          loading,
          currency,
          username,
          onboardingCompleted,
          addTransaction,
          saveTransaction,
          deleteTransaction,
          saveCategory,
          deleteCategory,
          saveAccount,
          deleteAccount,
          saveBudget,
          deleteBudget,
          setGlobalCurrency,
          setGlobalUsername,
          completeOnboarding,
          refreshData: refresh,
        }),
        [
          accounts,
          categories,
          transactions,
          budgets,
          loading,
          currency,
          username,
          onboardingCompleted,
          addTransaction,
          saveTransaction,
          deleteTransaction,
          saveCategory,
          deleteCategory,
          saveAccount,
          deleteAccount,
          saveBudget,
          deleteBudget,
          setGlobalCurrency,
          setGlobalUsername,
          completeOnboarding,
          refresh,
        ]
      )}
    >
      {children}
    </MoneyContext.Provider>
  );
}

export function useMoney() {
  const value = useContext(MoneyContext);
  if (!value) throw new Error('useMoney must be used within MoneyProvider');
  return value;
}

export function categoryFor(categories: Category[], id?: string | null) {
  return categories.find((category) => category.id === id);
}

export function totalFor(transactions: Transaction[], type: EntryType) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}
