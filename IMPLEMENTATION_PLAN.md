# Lumina Finance — Phases 2, 3 & 5 Implementation Plan

Complete the Lumina Finance personal finance app from its current Phase 1 foundation through Phase 5 (production release). 

> [!IMPORTANT]
> **100% Offline First:** The app will run completely locally on the user's mobile device using SQLite. No online database or backend is required.

---

## Decisions Made

- **Currency:** The Welcome screen will have a dropdown allowing users to select `USD`, `LKR`, or input a custom currency. This selection will dictate the currency used dynamically throughout the entire app.
- **Credit Card Payments:** We are keeping it simple. No special "pay credit card" transaction flows will be added for now.

---

## Proposed Changes (Step-by-Step)

We will proceed with these changes one by one. 

### Phase 2 — Complete Local Finance Workflow & Premium Polish

This phase polishes what already exists, fixes gaps in the UX, and introduces premium animations across the app.

---

#### Step 2.1: App-Wide Animations & Polish

To give the app a premium, dynamic feel:
- Introduce smooth entry animations (fade and slide) for list items.
- Add micro-animations (scale on press) to buttons and tabs.
- Ensure page transitions are fluid.

##### [MODIFY] ui.tsx
- Enhance the `Screen` component with more dynamic entry animations.
- Create an `AnimatedPressable` component for buttons to provide tactile feedback (scaling down slightly when pressed).

---

#### Step 2.2: Welcome Screen & Currency Selection

##### [NEW] welcome.tsx
- A beautiful 3-step swipeable welcome screen: Introduction → Choose Currency (USD/LKR/Custom) → Set up first account.
- Show only on first launch.
- Include rich animations and illustrations to WOW the user on first open.

##### [MODIFY] database.ts & money-context.tsx
- Add a mechanism (e.g. `settings` table) to save the globally selected currency.
- Expose `currency` through the context to dynamically update UI everywhere.

##### [MODIFY] _layout.tsx
- Check if onboarding/currency selection has been completed; redirect to `welcome.tsx` if not.

---

#### Step 2.3: Fix the Settings tab → proper settings hub

##### [MODIFY] settings.tsx
- Convert to a proper settings hub with rows for: "Manage Categories", "Manage Accounts", "Export Data", "About"
- Each row navigates to a dedicated screen.

##### [NEW] category-list.tsx
- Move the current category grid UI from `settings.tsx` into this dedicated screen.

---

#### Step 2.4: Improve transaction list with proper date grouping

##### [MODIFY] index.tsx
- Group transactions by date dynamically.
- Add a month selector at the top (previous/next month arrows) with smooth transition animations.
- Filter transactions to the selected month.
- Show an animated empty state when no transactions exist.

---

#### Step 2.5: Add validation, loading states, and date picker

##### [MODIFY] add-entry.tsx
- Add a **date picker** field.
- Show a loading spinner while saving.

##### [MODIFY] Forms (account-form.tsx, category-form.tsx)
- Add saving states/loading indicators.

---

#### Step 2.6: Clean up leftover template files

##### [DELETE] explore.tsx
- Leftover Expo template file, not used anywhere in the app.

---

### Phase 3 — Finance Features

Power-user features: search, filters, receipt photos, CSV/PDF export.

---

#### Step 3.1: Transaction search and filters

##### [NEW] transaction-search.tsx
- Full-screen search modal with text search across transaction notes.
- Filter chips: by account, category, transaction type, date range.
- Results list with tap-to-edit.

---

#### Step 3.2: Monthly dashboard and date-range analytics

##### [MODIFY] stats.tsx
- Add month navigation (prev/next arrows).
- Filter transactions and budgets by the selected month.
- Add net-worth trend section.

---

#### Step 3.3: Receipt photo attachment

##### [MODIFY] Types & Context (types.ts, database.ts, money-context.tsx)
- Add `receiptUri?: string | null` to the `Transaction` type.

##### [MODIFY] add-entry.tsx
- Add "Attach receipt" button using Expo Image Picker.

---

#### Step 3.4: CSV and PDF Export + Local Backup

##### [NEW] export-utils.ts
- Export all transactions as CSV.
- **Generate a PDF report** of the monthly transactions using `expo-print`.
- Create JSON backup of entire database / Restore from JSON backup.

##### [MODIFY] settings.tsx
- Add "Export to CSV", "Export to PDF", "Backup Data", "Restore Data" buttons.
- Use `expo-sharing` to share the exported files.

---

### Phase 5 — Production Release

Prepare the app for store submission.

---

#### Step 5.1: App branding and splash screen

##### [MODIFY] app.json
- Update app name to "Lumina Finance".
- Configure proper splash screen colors and icon paths.
- Set Android adaptive icon with Lumina branding.

---

#### Step 5.2: Error handling and monitoring

##### [NEW] error-boundary.tsx
- Global error boundary component wrapping the app.

---

#### Step 5.3: Final polish and store preparation

- Test on physical Android and iOS devices.
- Performance audit: ensure smooth scrolling, fast transitions.
- Build production APK/AAB and IPA using `eas build`.

---

## Verification Plan (Incremental)

We will verify after each step is complete:
1. Ensure animations feel smooth and performant.
2. Confirm the Welcome screen shows only once and correctly saves the global currency.
3. Validate settings routing and category list rendering.
4. Test dynamic date grouping and empty states.
5. Save a transaction with a date picker.
6. Export both CSV and PDF formats and verify them using the native share sheet.
