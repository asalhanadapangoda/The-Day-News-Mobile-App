import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, Budget, Category, Transaction } from '@/data/types';
import { clearAllReceiptStorage } from '@/utils/receipt-storage';

export interface SettingItem {
  key: string;
  value: string;
}

export interface TheDayAppBackupPayload {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: SettingItem[];
}

export type LuminaBackupPayload = TheDayAppBackupPayload;

export interface TheDayAppBackupData {
  app: 'The Day App' | 'Lumina Finance';
  version: 1;
  exportedAt: string;
  payload: TheDayAppBackupPayload;
}

export type LuminaBackupData = TheDayAppBackupData;

const MAX_MONETARY_AMOUNT = 999999999.99;
const VALID_ACCOUNT_TYPES = ['cash', 'bank', 'savings', 'credit'];
const VALID_CATEGORY_TYPES = ['expense', 'income'];
const VALID_TX_TYPES = ['expense', 'income', 'transfer'];

/**
 * Validates untrusted parsed JSON data against Lumina's backup schema.
 * Ensures data integrity, prevents SQL injection/corruption, and checks relational links.
 */
export function validateBackupData(data: unknown): LuminaBackupData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format. Expected a JSON object.');
  }

  const obj = data as Record<string, unknown>;

  if (obj.app !== 'The Day App' && obj.app !== 'Lumina Finance') {
    throw new Error('Incompatible backup file: application identifier mismatch.');
  }

  if (obj.version !== 1) {
    throw new Error(`Unsupported backup version: ${obj.version}. Only version 1 is supported.`);
  }

  if (typeof obj.exportedAt !== 'string' || isNaN(Date.parse(obj.exportedAt))) {
    throw new Error('Invalid export timestamp in backup file.');
  }

  if (!obj.payload || typeof obj.payload !== 'object') {
    throw new Error('Missing or invalid payload in backup file.');
  }

  const p = obj.payload as Record<string, unknown>;

  if (!Array.isArray(p.accounts)) throw new Error('Payload missing "accounts" list.');
  if (!Array.isArray(p.categories)) throw new Error('Payload missing "categories" list.');
  if (!Array.isArray(p.transactions)) throw new Error('Payload missing "transactions" list.');
  if (!Array.isArray(p.budgets)) throw new Error('Payload missing "budgets" list.');
  if (!Array.isArray(p.settings)) throw new Error('Payload missing "settings" list.');

  const validatedAccounts: Account[] = [];
  const accountIds = new Set<string>();

  for (const a of p.accounts) {
    if (!a || typeof a !== 'object') throw new Error('Invalid account entry.');
    const acc = a as Record<string, unknown>;
    const id = String(acc.id || '').trim();
    const name = String(acc.name || '').trim();
    const type = String(acc.type || '').trim();
    const currency = String(acc.currency || 'USD').trim().toUpperCase();
    const balance = Number(acc.balance);

    if (!id || id.length > 50) throw new Error(`Invalid account ID: ${id}`);
    if (!name || name.length > 50) throw new Error(`Account "${id}" has invalid or too long name.`);
    if (!VALID_ACCOUNT_TYPES.includes(type)) throw new Error(`Account "${name}" has invalid type "${type}".`);
    if (!Number.isFinite(balance) || Math.abs(balance) > MAX_MONETARY_AMOUNT) {
      throw new Error(`Account "${name}" balance is out of allowable range.`);
    }

    accountIds.add(id);
    validatedAccounts.push({
      id,
      name,
      type: type as Account['type'],
      balance: Math.round(balance * 100) / 100,
      currency: currency.slice(0, 10),
    });
  }

  const validatedCategories: Category[] = [];
  const categoryIds = new Set<string>();

  for (const c of p.categories) {
    if (!c || typeof c !== 'object') throw new Error('Invalid category entry.');
    const cat = c as Record<string, unknown>;
    const id = String(cat.id || '').trim();
    const name = String(cat.name || '').trim();
    const type = String(cat.type || '').trim();
    const icon = String(cat.icon || 'tag').trim();
    const color = String(cat.color || '#8B6BE8').trim();

    if (!id || id.length > 50) throw new Error(`Invalid category ID: ${id}`);
    if (!name || name.length > 50) throw new Error(`Category "${id}" has invalid or too long name.`);
    if (!VALID_CATEGORY_TYPES.includes(type)) throw new Error(`Category "${name}" has invalid type "${type}".`);

    categoryIds.add(id);
    validatedCategories.push({
      id,
      name,
      type: type as Category['type'],
      icon: icon.slice(0, 30),
      color: color.slice(0, 20),
    });
  }

  const validatedTransactions: Transaction[] = [];

  for (const t of p.transactions) {
    if (!t || typeof t !== 'object') throw new Error('Invalid transaction entry.');
    const tx = t as Record<string, unknown>;
    const id = String(tx.id || '').trim();
    const type = String(tx.type || '').trim();
    const accountId = String(tx.accountId || '').trim();
    const toAccountId = tx.toAccountId ? String(tx.toAccountId).trim() : undefined;
    const categoryId = tx.categoryId ? String(tx.categoryId).trim() : undefined;
    const amount = Number(tx.amount);
    const date = String(tx.date || '').trim();
    const note = tx.note !== undefined && tx.note !== null ? String(tx.note).slice(0, 250) : undefined;
    const receiptUri = tx.receiptUri ? String(tx.receiptUri).slice(0, 500) : undefined;

    if (!id || id.length > 60) throw new Error('Transaction ID is invalid or missing.');
    if (!VALID_TX_TYPES.includes(type)) throw new Error(`Invalid transaction type: ${type}`);
    if (!accountIds.has(accountId)) {
      throw new Error(`Transaction "${id}" references non-existent account "${accountId}".`);
    }
    if (type === 'transfer' && toAccountId && !accountIds.has(toAccountId)) {
      throw new Error(`Transfer transaction "${id}" references non-existent destination account "${toAccountId}".`);
    }
    if (categoryId && !categoryIds.has(categoryId)) {
      throw new Error(`Transaction "${id}" references non-existent category "${categoryId}".`);
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_MONETARY_AMOUNT) {
      throw new Error(`Transaction "${id}" has invalid monetary amount.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
      throw new Error(`Transaction "${id}" has invalid date format: ${date}`);
    }

    validatedTransactions.push({
      id,
      type: type as Transaction['type'],
      accountId,
      toAccountId,
      categoryId,
      amount: Math.round(amount * 100) / 100,
      date,
      note,
      receiptUri,
    });
  }

  const validatedBudgets: Budget[] = [];

  for (const b of p.budgets) {
    if (!b || typeof b !== 'object') throw new Error('Invalid budget entry.');
    const bud = b as Record<string, unknown>;
    const id = String(bud.id || '').trim();
    const categoryId = String(bud.categoryId || '').trim();
    const amount = Number(bud.amount);
    const month = String(bud.month || '').trim();

    if (!id || id.length > 60) throw new Error('Budget ID is invalid.');
    if (!categoryIds.has(categoryId)) {
      throw new Error(`Budget references non-existent category "${categoryId}".`);
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_MONETARY_AMOUNT) {
      throw new Error(`Budget "${id}" has invalid amount.`);
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error(`Budget "${id}" has invalid month format: ${month}`);
    }

    validatedBudgets.push({
      id,
      categoryId,
      amount: Math.round(amount * 100) / 100,
      month,
    });
  }

  const validatedSettings: SettingItem[] = [];

  for (const s of p.settings) {
    if (!s || typeof s !== 'object') continue;
    const set = s as Record<string, unknown>;
    const key = String(set.key || '').trim().slice(0, 50);
    const value = String(set.value ?? '').trim().slice(0, 250);
    if (key) {
      validatedSettings.push({ key, value });
    }
  }

  return {
    app: 'The Day App',
    version: 1,
    exportedAt: obj.exportedAt as string,
    payload: {
      accounts: validatedAccounts,
      categories: validatedCategories,
      transactions: validatedTransactions,
      budgets: validatedBudgets,
      settings: validatedSettings,
    },
  };
}

/**
 * Creates and exports a structured, schema-versioned JSON backup of all application data.
 * Does not transmit data over the network; saves directly to device or system share sheet.
 */
export async function exportLocalBackup(db: SQLiteDatabase): Promise<boolean> {
  const [accounts, categories, transactions, budgets, settings] = await Promise.all([
    db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name'),
    db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name'),
    db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC'),
    db.getAllAsync<Budget>('SELECT * FROM budgets ORDER BY month DESC'),
    db.getAllAsync<SettingItem>('SELECT key, value FROM settings ORDER BY key'),
  ]);

  const backupData: TheDayAppBackupData = {
    app: 'The Day App',
    version: 1,
    exportedAt: new Date().toISOString(),
    payload: {
      accounts,
      categories,
      transactions,
      budgets,
      settings,
    },
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const fileName = `thedayapp-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  }

  // Native (iOS / Android)
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const fileUri = `${baseDir}${fileName}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save The Day App Backup',
        UTI: 'public.json',
      });
      return true;
    }
    return false;
  } finally {
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {
      // Cleanup failure tolerated
    }
  }
}

/**
 * Prompts the user to select a backup JSON file and safely restores it.
 * Entire restore is wrapped inside an atomic SQLite transaction to prevent partial imports.
 */
export async function restoreLocalBackup(
  db: SQLiteDatabase,
  onComplete: () => Promise<void>
): Promise<{ success: boolean; message?: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { success: false, message: 'Restore cancelled.' };
  }

  const asset = result.assets[0];
  let rawContent: string;

  try {
    if (Platform.OS === 'web') {
      if (asset.file) {
        rawContent = await asset.file.text();
      } else {
        const res = await fetch(asset.uri);
        rawContent = await res.text();
      }
    } else {
      rawContent = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      try {
        await FileSystem.deleteAsync(asset.uri, { idempotent: true });
      } catch {}
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown file reading error';
    throw new Error(`Failed to read the selected backup file: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('The selected file is not a valid JSON document.');
  }

  // Strict schema and integrity validation
  const valid = validateBackupData(parsed);

  // Execute atomic restore
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM accounts;
      DELETE FROM categories;
      DELETE FROM settings;
    `);

    for (const a of valid.payload.accounts) {
      await db.runAsync(
        'INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)',
        a.id,
        a.name,
        a.type,
        a.balance,
        a.currency
      );
    }

    for (const c of valid.payload.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
        c.id,
        c.name,
        c.type,
        c.icon,
        c.color
      );
    }

    for (const t of valid.payload.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, accountId, toAccountId, categoryId, amount, date, note, receiptUri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        t.id,
        t.type,
        t.accountId,
        t.toAccountId ?? null,
        t.categoryId ?? null,
        t.amount,
        t.date,
        t.note ?? null,
        t.receiptUri ?? null
      );
    }

    for (const b of valid.payload.budgets) {
      await db.runAsync(
        'INSERT INTO budgets (id, categoryId, amount, month) VALUES (?, ?, ?, ?)',
        b.id,
        b.categoryId,
        b.amount,
        b.month
      );
    }

    for (const s of valid.payload.settings) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        s.key,
        s.value
      );
    }
  });

  await onComplete();
  return {
    success: true,
    message: `Restored ${valid.payload.transactions.length} transactions, ${valid.payload.accounts.length} accounts, and ${valid.payload.categories.length} categories successfully.`,
  };
}

/**
 * Resets all user data to factory defaults.
 * Atomically clears transactions, budgets, custom accounts, and custom categories,
 * reseeds fresh defaults, and purges all receipt images.
 */
export async function factoryResetData(
  db: SQLiteDatabase,
  onComplete: () => Promise<void>
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM accounts;
      DELETE FROM categories;
      DELETE FROM settings;

      -- Default Accounts
      INSERT INTO accounts VALUES ('cash', 'Cash Wallet', 'cash', 0, 'USD');
      INSERT INTO accounts VALUES ('bank', 'Main Bank Account', 'bank', 0, 'USD');

      -- Default Categories
      INSERT INTO categories VALUES ('food', 'Food & Dining', 'expense', '🍴', '#8B6BE8');
      INSERT INTO categories VALUES ('transport', 'Transport', 'expense', '🚌', '#22C6A3');
      INSERT INTO categories VALUES ('rent', 'Rent & Utilities', 'expense', '⌂', '#78A4F9');
      INSERT INTO categories VALUES ('shopping', 'Shopping', 'expense', '♧', '#F27496');
      INSERT INTO categories VALUES ('entertainment', 'Entertainment', 'expense', '▣', '#2CB7BD');
      INSERT INTO categories VALUES ('subscriptions', 'Subscriptions', 'expense', '▣', '#E3B525');
      INSERT INTO categories VALUES ('salary', 'Salary', 'income', '↗', '#3ED598');
      INSERT INTO categories VALUES ('freelance', 'Freelance', 'income', '✦', '#789AF8');

      -- Default Settings
      INSERT INTO settings (key, value) VALUES ('currency', 'USD');
      INSERT INTO settings (key, value) VALUES ('username', 'User');
      INSERT INTO settings (key, value) VALUES ('onboarding', '1');
    `);
  });

  // Purge all stored receipts
  await clearAllReceiptStorage();

  // Trigger state refresh
  await onComplete();
}
