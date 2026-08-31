export type EntryType = 'expense' | 'income' | 'transfer';
export interface Account { id: string; name: string; type: 'cash' | 'bank' | 'credit' | 'savings'; balance: number; currency: string; }
export interface Category { id: string; name: string; type: 'expense' | 'income'; icon: string; color: string; }
export interface Transaction { id: string; type: EntryType; accountId: string; toAccountId?: string | null; categoryId?: string | null; amount: number; date: string; note?: string | null; receiptUri?: string | null; }
export interface Budget { id: string; categoryId: string; amount: number; month: string; }
