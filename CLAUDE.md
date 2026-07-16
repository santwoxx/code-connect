# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CentralSync ERP — a Portuguese-language (pt-BR) business management system for a furniture retailer, covering sales/quotes, inventory, accounts payable/receivable, and delivery/assembly logistics with digital dual-signature proof of delivery. All UI text, comments, and business terminology in the code are in Portuguese.

Despite the root README describing a `/backend` (Node/Express on Render), **no `/backend` directory exists in this repo**. The only backend is Firebase (Firestore + Auth + Storage) accessed directly from the frontend. Treat README claims about a separate API server as aspirational/stale, not current architecture.

## Repository layout

- `frontend/` — the actual application: React 19 + Vite 6 + TypeScript SPA, styled with Tailwind CSS v4, deployed to Vercel. This is where nearly all work happens.
- `automation-bridge/` — a C# WinForms/HTTP app (`CentralSyncBridge.exe`, built from `AutomationEngine.cs`, `HttpServer.cs`, `MainForm.cs`) that runs locally on the user's Windows machine and listens on `http://localhost:7878`. The web app talks to it to push data into the desktop ERP "Alterdata". Not part of the Vite build; edited/compiled separately (see `automation-bridge/compile.bat`).
- `parse_products.js` / `products_parsed.json` (root) — one-off/offline script and its output used to seed the product catalog; `products_parsed.json` is also copied into `frontend/src/products_parsed.json` and imported directly by `frontend/src/db.ts` (`importCommercialCatalog`) to bulk-seed Firestore on first run.
- `scratch/` — throwaway/manual test scripts, not part of the build.

## Commands

All commands run from `frontend/`:

```bash
npm install       # install deps
npm run dev        # Vite dev server on http://localhost:3000
npm run build       # production build to dist/
npm run preview      # preview the production build
npm run lint        # tsc --noEmit (type-check only, no separate linter configured)
npm test          # vitest run (single run)
npm run test:watch     # vitest watch mode
```

Run a single test file: `npx vitest run src/utils/calculations.test.ts`. Tests currently only cover `src/utils/calculations.ts`.

There is no backend to run — `npm run dev` alone is a fully working environment against the live Firebase project (config in `frontend/src/firebase.ts` has hardcoded fallback values, so it works even without a local `.env`).

## Architecture

### State model: Firestore is the single source of truth, synced in real time

There is no REST/API layer between the UI and the database — components call Firestore directly through two files:

- `frontend/src/db.ts` — all Firestore reads/writes (`fetchX`/`saveX`/`removeX` per collection) plus a handful of **atomic multi-document transactions** for operations that must not partially apply: `invoiceSaleTransactionally`, `cancelSaleTransactionally`, `createBudgetTransactionally`. Any change that touches stock + payments + delivery + audit log together (e.g. invoicing a sale) must go through one of these `writeBatch` functions, not sequential individual writes — that's what keeps stock counts, financial ledgers, and the sale record consistent if something fails midway.
- `frontend/src/hooks/useFirestoreSync.ts` — owns 11 real-time `onSnapshot` listeners (products, categories, transactions, payments, deliveries, sellers, sales, audit logs, customers, purchase returns, deliverers). Which collections a given session subscribes to is **role-gated inside the hook itself** (e.g. `payments` and `audit_logs` only sync for admin/caixa roles; `sales`/`deliveries` are scoped by `where('sellerId'/'delivererId'/'assemblerId', ...)` for non-admin roles). When adding a new collection or changing who can see one, this hook and `firestore.rules` both need to agree.

`frontend/src/App.tsx` is the composition root: it wires `useFirestoreSync` state to handler functions (`handleAddProduct`, `handleInvoiceSale`, etc.) and passes them down as props to lazy-loaded view components in `frontend/src/components/`. Most handlers do an **optimistic local `setState` before awaiting the Firestore write** — preserve that ordering when touching these handlers, the UI is built assuming local state updates instantly and Firestore confirms in the background.

### Auth & role system

Authentication is Firebase Auth (Google Sign-In) layered with a custom role/session system — there is no simple "logged in = full access" model:

- `frontend/src/hooks/useAuthSession.ts` resolves a user's role (`admin`/`Proprietário / Adm Geral`, `vendedor`, `estoquista`, `caixa`, `entregador`, `montador`) and, for non-admin roles, matches the Firebase user to a specific business entity (Seller/Deliverer/Montador/etc. document) via `googleEmail` or a stored `entityId`.
- Several roles **share one Google account** (e.g. all sellers sign in as `vendacentralmoveis@gmail.com`) and are disambiguated by a second login step (username/PIN) stored in `localStorage['centralsync_custom_user']`. Don't assume `auth.currentUser.email` uniquely identifies a person — check `currentSeller`/`currentDeliverer`/`currentMontador` from the hook instead.
- A master-password/PIN "unlock" step (`sessionUnlocked`) gates access after Google login, tracked per-`uid` in `sessionStorage`.
- Non-admin, non-field-worker roles are blocked outside business hours (`isBusinessHours()` in `firebase.ts`, 06:00–18:00) and auto-logout after 5 minutes idle; field workers (`entregador`/`montador`) get 60 minutes idle timeout and no business-hours restriction, since they work on-site with the screen mostly idle.
- Owner/admin emails are centralized in `frontend/src/config/adminEmails.ts` (`OWNER_EMAILS`/`isOwnerEmail`) — this list is duplicated by necessity in `frontend/firestore.rules` (`isHardcodedAdmin()`), since security rules can't import app code. **Changing owner emails requires updating both files.**
- Signature images and delivery/assembly photos are sensitive and must stay admin-only in both the UI (`DeliveriesView` and friends) and `storage.rules`/`firestore.rules` — this is a stated product requirement (see README), not just a UI convention.

### CentralSync Bridge integration

`frontend/src/services/automation.ts` posts JSON to `http://localhost:7878` (the local `automation-bridge` C# app) to push sales/products into the desktop "Alterdata" ERP. `App.tsx` pings the bridge on load and, if it's not running, attempts to launch it via a registered custom URL protocol (`centralsync-bridge://start`). This integration only works on a Windows machine with the bridge installed — it fails silently (toast + console warning) in any other environment, which is expected in dev/CI.

### Path alias

`@/*` resolves to the `frontend/` root (configured in both `vite.config.ts` and `tsconfig.json`), not to `frontend/src/`.

### Firebase config caveat

`frontend/src/firebase.ts` has real Firebase project values (`centralsync-c5b50`) hardcoded as fallbacks for every `VITE_FIREBASE_*` env var. This means the app connects to the live/production Firebase project even without a configured `.env`. Be careful running destructive flows locally (`clearDatabaseForProduction`, `restoreDatabaseFromBackup`) — there is no separate local/staging Firestore instance to fall back to.
