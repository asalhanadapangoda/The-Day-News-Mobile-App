# Lumina Finance — Product & Implementation Plan

## 1. Product goal

Lumina Finance is a personal finance mobile app where people can record income, expenses, and account transfers; review balances and spending analytics; and eventually back up their data securely across devices.

The current app already contains the initial visual foundation, navigation tabs, transaction entry, and offline SQLite storage.

## 2. Core requirements

### Functional requirements

#### Accounts

- Support cash, bank, savings, and credit-card accounts.
- Create, edit, archive, and delete accounts.
- Store opening balances, currencies, and optional credit-card cut-off/payment-due dates.
- Calculate total net worth.

#### Categories

- Keep income and expense categories separate.
- Create, edit, reorder, archive, and delete categories.
- Choose an icon and color for each category.
- Require category reassignment before deleting a category used by transactions.

#### Transactions

- Record expenses, income, and transfers.
- Capture amount, date, account, category, note, and optional receipt photo.
- Edit and delete transactions.
- Search and filter by date, account, category, and transaction type.
- Update account balances correctly whenever a transaction changes.

#### Budgets

- Set a monthly overall spending budget.
- Set category-level budgets.
- Show progress and notify users when spending approaches or exceeds limits.

#### Analytics

- Show monthly income, expense, and net totals.
- Show spending by category with charts and progress bars.
- Show account balances and net-worth history.
- Support monthly and custom date-range filters.

#### Data and backup

- Keep the core app usable offline.
- Persist financial records in a local SQLite database.
- Export transaction history to CSV.
- Support backup and restore.
- Later, sync securely across devices after sign-in.

### Non-functional requirements

- Support Android and iOS through Expo and React Native.
- Work without an internet connection for normal daily use.
- Provide an accessible, responsive dark interface.
- Validate input and retain data during app updates or restarts.
- Use secure authentication and encrypted network traffic when cloud sync is added.

## 3. Recommended technology

| Area | Recommended choice |
| --- | --- |
| Mobile app | Expo SDK 57, React Native, TypeScript |
| Navigation | Expo Router |
| Offline database | Expo SQLite |
| Receipt photos | Expo Image Picker and Expo File System |
| Backend | Python with FastAPI |
| API | REST API |
| Server database | PostgreSQL |
| Authentication | JWT access and refresh tokens |
| File storage | S3-compatible storage or Supabase Storage |
| Initial deployment | Render, Railway, Fly.io, or a VPS |

The Python backend is not required for the first offline MVP. Build it after the local finance workflow is complete and tested.

## 4. Implementation roadmap

### Phase 1 — Offline MVP foundation

Status: started.

- Expo Router structure.
- Local SQLite database.
- Transaction dashboard.
- Accounts tab.
- Categories tab.
- Analytics tab.
- Add transaction modal.

### Phase 2 — Complete local finance workflow

- Make **New Category** functional.
- Add account creation and editing.
- Add transaction editing and deletion.
- Add a destination-account selector for transfers.
- Recalculate balances reliably after every transaction change.
- Add validation, loading states, and empty states.

This is the recommended next development phase.

### Phase 3 — Finance features

- Monthly and category budgets.
- Monthly dashboard and date filters.
- Transaction search and filters.
- Receipt photo attachment.
- CSV export and local backup/restore.

### Phase 4 — Python backend and cloud sync

- Create a FastAPI project.
- Design PostgreSQL tables and migrations.
- Implement user registration, login, and logout.
- Build secure REST API endpoints.
- Sync accounts, categories, budgets, and transactions.
- Handle conflicts when the same data changes on two devices.
- Upload and retrieve receipt images.

### Phase 5 — Production release

- Test on physical Android and iOS devices.
- Add error monitoring.
- Create onboarding, icon, splash screen, and store screenshots.
- Prepare privacy policy and app-store listings.
- Perform a security review.
- Build and submit Android and iOS releases.

## 5. Decisions to make early

- What is the default currency: USD, LKR, or user-selectable?
- Is the first version single-user only?
- Will family/shared budgets be supported later?
- Should credit-card payments be ordinary transfers or a dedicated action?
- Do accounts need multiple currencies in the first release?
- Is cloud backup required for version one, or can it be added after the offline MVP?

## Recommended immediate next step

Finish Phase 2 locally before building the backend. The next concrete task is to make category and account management functional, then add transaction edit/delete support.
