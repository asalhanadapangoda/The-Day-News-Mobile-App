import type { SQLiteDatabase } from 'expo-sqlite';
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  let currentVersion = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (currentVersion < 1) { await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE accounts (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, balance REAL NOT NULL, currency TEXT NOT NULL);
    CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL);
    CREATE TABLE transactions (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, accountId TEXT NOT NULL, toAccountId TEXT, categoryId TEXT, amount REAL NOT NULL, date TEXT NOT NULL, note TEXT);
    INSERT INTO accounts VALUES ('cash', 'Cash Wallet', 'cash', 0, 'USD'); INSERT INTO accounts VALUES ('bank', 'Main Bank Account', 'bank', 0, 'USD');
    INSERT INTO categories VALUES ('food', 'Food & Dining', 'expense', '🍴', '#8B6BE8'); INSERT INTO categories VALUES ('transport', 'Transport', 'expense', '🚌', '#22C6A3'); INSERT INTO categories VALUES ('rent', 'Rent & Utilities', 'expense', '⌂', '#78A4F9'); INSERT INTO categories VALUES ('shopping', 'Shopping', 'expense', '♧', '#F27496'); INSERT INTO categories VALUES ('entertainment', 'Entertainment', 'expense', '▣', '#2CB7BD'); INSERT INTO categories VALUES ('subscriptions', 'Subscriptions', 'expense', '▣', '#E3B525'); INSERT INTO categories VALUES ('salary', 'Salary', 'income', '↗', '#3ED598'); INSERT INTO categories VALUES ('freelance', 'Freelance', 'income', '✦', '#789AF8');
    PRAGMA user_version = 1;`); currentVersion = 1; }
  if (currentVersion < 2) await db.execAsync(`CREATE TABLE budgets (id TEXT PRIMARY KEY NOT NULL, categoryId TEXT NOT NULL, amount REAL NOT NULL, month TEXT NOT NULL, UNIQUE(categoryId, month)); PRAGMA user_version = 2;`);
  if (currentVersion < 3) await db.execAsync(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 3;`);
  if (currentVersion < 4) { await db.execAsync(`ALTER TABLE transactions ADD COLUMN receiptUri TEXT; PRAGMA user_version = 4;`); }
}
