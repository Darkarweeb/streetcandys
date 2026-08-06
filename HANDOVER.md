# Street Candy's — Final Project Handover

> **Document Type:** Final Developer Handover  
> **Date:** August 2026  
> **Prepared for:** Future developers taking ownership of the Street Candy's platform  
> **Repository:** [https://github.com/Darkarweeb/streetcandys](https://github.com/Darkarweeb/streetcandys)  
> **Production URL:** [https://streetcandys.shop](https://streetcandys.shop)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Production Environment](#3-production-environment)
4. [Architecture Index](#4-architecture-index)
5. [Database Index](#5-database-index)
6. [Authentication Summary](#6-authentication-summary)
7. [Email System Summary](#7-email-system-summary)
8. [Deployment Summary](#8-deployment-summary)
9. [Backup & Recovery](#9-backup--recovery)
10. [Migration Summary](#10-migration-summary)
11. [Future Enhancements](#11-future-enhancements)
12. [Maintenance Notes](#12-maintenance-notes)

---

## 1. Executive Summary

### Project Purpose

Street Candy's is a **premium hemp-derived products ecommerce platform** serving customers in Colombia (CO) and Costa Rica (CR). The platform provides:

- A full-featured online store for hemp/CBD products with multi-currency pricing (COP and CRC)
- A tiered loyalty rewards program to incentivize repeat purchases
- An educational blog in Spanish covering cannabis/hemp topics
- A complete customer account area (orders, addresses, wishlist, reviews, notifications)
- A full admin backoffice for store operations (products, orders, inventory, promotions, analytics)
- A Capacitor-wrapped mobile app shell (iOS/Android) — see `MOBILE_BUILD_GUIDE.md`

### Current Production Status

The application is **production-ready and fully deployed** at `https://streetcandys.shop`.

| System | Status |
|---|---|
| Authentication (login, register, verify, recovery) | ✅ Complete |
| Transactional email (welcome, verification, recovery, orders) | ✅ Complete |
| Product catalog & checkout | ✅ Complete |
| Loyalty rewards program | ✅ Complete |
| Admin backoffice | ✅ Complete |
| Blog (Spanish, SEO-optimized) | ✅ Complete |
| Rocket.new platform dependencies | ✅ Removed |
| Database migrations (47 total) | ✅ Applied |

The platform has been fully migrated away from the Rocket.new development environment. All Rocket-specific runtime scripts, packages, and configuration have been removed from the codebase.

---

## 2. Technology Stack

### Core Framework

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.18 |
| Language | TypeScript | ^5.x |
| UI Library | React | 19.0.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Font | DM Sans (Google Fonts) | variable |

### External Services

| Service | Purpose | Dashboard |
|---|---|---|
| **Supabase** | PostgreSQL database, authentication, storage, realtime | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **Resend** | Transactional email delivery | [resend.com](https://resend.com) |
| **Stripe** | Payment processing (CO + CR) | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Google Analytics** | Web analytics (GA4) | [analytics.google.com](https://analytics.google.com) |
| **Google AdSense** | Ad monetization (optional) | [adsense.google.com](https://adsense.google.com) |

### Key Libraries

| Library | Purpose |
|---|---|
| `@supabase/supabase-js` 2.111.0 | Supabase client |
| `@supabase/ssr` 0.12.4 | Supabase SSR helpers for Next.js |
| `stripe` (latest) | Stripe server-side SDK |
| `recharts` ^2.15.2 | Admin analytics charts |
| `@heroicons/react` ^2.2.0 | UI icons |
| `@tailwindcss/typography` ^0.5.16 | Blog article prose styling |
| `@capacitor/core` 8.x | Mobile app shell (iOS/Android) |
| `vitest` + `@testing-library/react` | Unit and integration testing |

---

## 3. Production Environment

### Required Environment Variables

All variables below must be set in the hosting platform's environment settings. **Never commit real values to the repository.**

#### Required for Core Functionality

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase service role key — bypasses RLS; required for rewards, admin operations |
| `NEXT_PUBLIC_SITE_URL` | Public | Must be `https://streetcandys.shop` in production |
| `RESEND_API_KEY` | **Secret** | Resend API key — required for all auth and transactional emails |

#### Required for Payments

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe publishable key (use `pk_live_` in production) |
| `STRIPE_SECRET_KEY` | **Secret** | Stripe secret key (use `sk_live_` in production) |
| `STRIPE_WEBHOOK_SECRET` | **Secret** | Stripe webhook signing secret — regenerated when creating a new webhook endpoint |

#### Optional

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 (`G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense (`ca-pub-XXXXXXXXXX`) |
| `OPENAI_API_KEY` | OpenAI — not active in production |
| `GEMINI_API_KEY` | Google Gemini — not active in production |
| `ANTHROPIC_API_KEY` | Anthropic Claude — not active in production |
| `PERPLEXITY_API_KEY` | Perplexity AI — not active in production |

> **Full variable documentation:** `ENVIRONMENT_SETUP_GUIDE.md` §5

### External Service Configuration (Non-Code)

Before going live on a new host, confirm these three external settings:

1. **Supabase Auth → URL Configuration:** Site URL = `https://streetcandys.shop`; Redirect URLs include `https://streetcandys.shop/**`
2. **Resend → Domains:** `streetcandys.shop` is verified as a sender domain; DNS records (TXT + MX) are present at the domain registrar
3. **Stripe → Webhooks:** Endpoint registered at `https://streetcandys.shop/api/pagos/webhook`; `STRIPE_WEBHOOK_SECRET` updated with the new signing secret

---

## 4. Architecture Index

> **Full documentation:** `STREET_CANDYS_ARCHITECTURE.md`

The application uses **Next.js 15 App Router** with React Server Components. Key architectural decisions:

- **Service/Repository pattern** — all business logic is in `src/lib/*/service.ts`; database access is in `src/lib/*/repository.ts`; API routes call services, never the database directly
- **API Routes** — ~50 REST endpoints in `src/app/api/` organized by domain
- **Global state** — only authentication state is global (via `AuthContext` in `src/contexts/AuthContext.tsx`); cart state is local via `useCartPersistence` hook
- **Admin protection** — `src/middleware.ts` enforces role-based access; admin routes require `role = 'admin'` in the `profiles` table
- **Session token** — injected via `x-sb-token` header (custom fetch patch for iframe/sandbox compatibility — can be reviewed post-migration)

**Folder structure reference:** `STREET_CANDYS_ARCHITECTURE.md` §3  
**Data flow diagram:** `STREET_CANDYS_ARCHITECTURE.md` §2  
**All business systems:** `STREET_CANDYS_ARCHITECTURE.md` §6–§9

---

## 5. Database Index

> **Full documentation:** `STREET_CANDYS_ARCHITECTURE.md` §4 · `BACKUP_AND_RECOVERY_GUIDE.md` §2–§3 · `LOCAL_DEVELOPMENT_CHECKLIST.md` §3

- **Database:** Supabase PostgreSQL (hosted, independent of any deployment platform)
- **Migrations:** 47 SQL files in `supabase/migrations/`, applied in timestamp order
- **Base migration:** `20260802235150_street_candy_schema.sql`
- **Latest migration:** `20260805900000_fix_handle_new_user_exception_handling.sql`
- **Apply migrations:** `supabase link --project-ref YOUR_REF && supabase db push`

**Critical migration note:** `20260804200000_harden_reward_transactions_rls.sql` restricts direct browser INSERT/UPDATE on `rewards` and `reward_transactions` to service role only. This migration must always be present — rolling it back re-opens a security vulnerability.

**Schema overview:** `STREET_CANDYS_ARCHITECTURE.md` §4  
**Migration restoration procedures:** `BACKUP_AND_RECOVERY_GUIDE.md` §3  
**Storage buckets** (`product-images`, `blog-images`, `avatars`): `STREET_CANDYS_OPERATIONS_GUIDE.md` §3

---

## 6. Authentication Summary

> **Full documentation:** `STREET_CANDYS_ARCHITECTURE.md` §5

The authentication system uses **Supabase Auth** with a fully custom email delivery layer via **Resend**. Supabase's built-in email delivery is bypassed entirely.

| Flow | Route | Mechanism |
|---|---|---|
| Registration | `/registro` → `/api/auth/signup` | Admin API `generateLink` → Resend welcome+verification email |
| Email verification | `/verificar-email`, `/email-verificado`, `/auth/confirmar` | Three-path callback: `token_hash`, PKCE code, implicit hash |
| Login | `/iniciar-sesion` | `signInWithPassword`; role-based redirect (admin → `/admin`, customer → `/`) |
| Password recovery | `/recuperar-contrasena` → `/api/auth/reset-password` | Admin API `generateLink` (token_hash) → Resend recovery email — no PKCE |
| New password | `/nueva-contrasena` | `supabase.auth.updateUser({ password })` with session guard |

**Auth callback route:** `src/app/auth/callback/route.ts` — uses request `origin`, adapts automatically to any domain  
**Middleware protection:** `src/middleware.ts` — admin routes, authenticated-user redirect from auth pages, protected customer routes

---

## 7. Email System Summary

> **Full documentation:** `STREET_CANDYS_ARCHITECTURE.md` §5 → Email Templates · `DEPLOYMENT_GUIDE.md` → Resend Email Configuration

All transactional emails are sent via **Resend** from `CREW@streetcandys.shop`.

| Email | Trigger | Template Location |
|---|---|---|
| Welcome + Email Verification | New user registration | `src/lib/email/templates/welcome.ts` |
| Password Recovery | Password reset request | `src/app/api/auth/reset-password/route.ts` (inline) |
| Order Confirmation | Order created via checkout | `src/lib/email/templates/order.ts` |
| Rewards Notification | Rewards earned/redeemed | `src/lib/email/templates/rewards.ts` |

**Email client:** `src/lib/email/client.ts` — validates `RESEND_API_KEY` at runtime; throws clearly if missing  
**FROM_EMAIL:** `CREW@streetcandys.shop` — hardcoded in `src/lib/email/client.ts`; no code change needed  
**Domain verification:** `streetcandys.shop` must be verified in Resend Dashboard → Domains

---

## 8. Deployment Summary

> **Full documentation:** `DEPLOYMENT_GUIDE.md`

Three hosting options are documented:

| Option | Notes |
|---|---|
| **Vercel** (recommended) | Best Next.js 15 support; zero-config; auto-deploys from GitHub `main` |
| **Netlify** | `@netlify/plugin-nextjs` already in `devDependencies`; pre-configured |
| **VPS / Self-hosted** | Ubuntu 22.04 + Node 20 + PM2 + Nginx; full setup in `DEPLOYMENT_GUIDE.md` |

**Build command:** `npm run build`  
**Start command:** `npm run start` (or `npm run serve`)  
**Node version:** 20.x LTS  
**Dev port:** 4028 (Rocket convention — change to 3000 post-migration if preferred)

**Domain DNS records:** `DEPLOYMENT_GUIDE.md` → Domain Configuration  
**Stripe webhook setup:** `DEPLOYMENT_GUIDE.md` → Stripe Webhook Configuration  
**Post-deployment verification checklist:** `MIGRATION_READINESS_CHECKLIST.md` §9

---

## 9. Backup & Recovery

> **Full documentation:** `BACKUP_AND_RECOVERY_GUIDE.md`

| Asset | Backup Method | Location |
|---|---|---|
| Source code | GitHub repository | [github.com/Darkarweeb/streetcandys](https://github.com/Darkarweeb/streetcandys) |
| Database | Supabase automatic daily backups + manual `supabase db dump` | Supabase Dashboard → Project Settings → Database → Backups |
| Product/blog images | Supabase Storage (independent of hosting) | Supabase Dashboard → Storage |
| Environment variables / secrets | Password manager or secrets vault | Not in repository |
| Stripe configuration | Stripe Dashboard | Screenshot or export webhook settings |

**Before any migration or major change:** take a manual database backup via `supabase db dump`.  
**Rollback procedure:** `BACKUP_AND_RECOVERY_GUIDE.md` §3 · `MIGRATION_READINESS_CHECKLIST.md` §10

---

## 10. Migration Summary

> **Full documentation:** `MIGRATION_READINESS_CHECKLIST.md` · `STREET_CANDYS_MIGRATION_PLAN.md`

The platform has been migrated away from Rocket.new. All Rocket-specific dependencies have been removed:

- `@dhiwise/component-tagger` package and webpack loader — removed
- Rocket analytics/platform runtime scripts (`rocket-web.js`, `rocket-shot.js`) — removed
- Rocket CDN `dns-prefetch` — removed
- `rocketCritical` metadata block — removed
- `NEXT_PUBLIC_SITE_URL` — already set to `https://streetcandys.shop`

**Remaining post-migration cleanup (low priority):**
- Remove `img.rocket.new` from `image-hosts.config.mjs` once confirmed no Rocket-hosted images remain in use
- Remove `https://streetcand8616.builtwithrocket.new/**` from Supabase Auth redirect URLs after migration is confirmed stable

**Full migration checklist (10 sections):** `MIGRATION_READINESS_CHECKLIST.md`  
**Rocket dependency inventory:** `STREET_CANDYS_MIGRATION_PLAN.md` §1  
**Recommended migration order:** `STREET_CANDYS_MIGRATION_PLAN.md` §6

---

## 11. Future Enhancements

The following are **optional improvements** — none are required for production operation.

### AI Features
- Activate `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or `PERPLEXITY_API_KEY` to enable AI-powered features (product recommendations, blog content generation, customer support chatbot). Keys are already wired into the environment; no code scaffolding is needed.

### Mobile App Publication
- The Capacitor shell (`capacitor.config.ts`) is configured for iOS and Android builds. See `MOBILE_BUILD_GUIDE.md` for the full build and publication workflow. Scripts are in `scripts/build-android.sh` and `scripts/build-ios.sh`.

### Analytics & Monetization
- Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to activate Google Analytics 4 pageview tracking (the `GoogleAnalytics` component is already in the root layout).
- Set `NEXT_PUBLIC_ADSENSE_ID` to activate Google AdSense ad units.

### Payment Expansion
- The payment provider layer (`src/lib/payment/providers/`) supports multiple providers. A `manual-provider.ts` (WhatsApp/cash on delivery) and `stripe-provider.ts` are implemented. Additional payment providers (e.g., PayU for Colombia, SINPE for Costa Rica) can be added by implementing the provider interface.

### Resend Verification Scalability
- `/api/email/resend-verification/route.ts` uses `listUsers({ perPage: 1000 })` and filters in-memory. For user bases exceeding 1,000, replace with a direct database query by email to avoid missing users beyond the first page.

### `nueva-contrasena` Timer Cleanup
- After a successful password update, a `setTimeout` fires a redirect after 3 seconds. Adding a `useEffect` cleanup would prevent the timer from firing if the user navigates away before it completes. Low risk, cosmetic improvement.

### Dead Code Removal
- `src/app/auth/pkce-debug/page.tsx` exists but redirects to `/` — it is safe to delete.
- `capacitor.config.ts` in the project root is only needed for mobile builds; it can be moved to a `mobile/` subdirectory if desired.

---

## 12. Maintenance Notes

Critical information for any developer making changes to this codebase.

### Before Making Any Changes

1. **Read `STREET_CANDYS_ARCHITECTURE.md` first.** It is the authoritative technical reference for all systems. Do not make architectural decisions without consulting it.
2. **Take a database backup before running migrations.** Use `supabase db dump` or the Supabase Dashboard backup tool. Migrations are irreversible without a restore.
3. **Never modify `src/styles/index.css`.** Only modify `src/styles/tailwind.css` and `tailwind.config.js` for styling changes.
4. **Never add navigation components to `src/app/layout.tsx`.** The root layout is for providers and global wrappers only (AuthProvider, fonts, analytics). Navigation belongs in individual page components.
5. **Never add HTTP security headers** to `next.config.mjs`. The application runs in contexts where security headers can break functionality. Headers are managed externally.

### Authentication System

- The auth system uses **server-side Admin API** for registration and password recovery — not Supabase's built-in email delivery. Any change to auth flows must preserve the `generateLink` + Resend pattern.
- The `SUPABASE_SERVICE_ROLE_KEY` is used in `src/lib/supabase/admin.ts` (`createAdminClient()`). It bypasses all RLS policies. Only use it in server-side API routes — never in client components.
- The `x-sb-token` header injection in the custom fetch patch (`src/app/layout.tsx`) was added for iframe/sandbox compatibility. Review whether it is still needed after full migration to independent hosting.

### Database & RLS

- **All tables must have RLS enabled.** Never disable RLS on a table without adding explicit policies.
- **`rewards` and `reward_transactions`** have hardened RLS (migration `20260804200000`) — INSERT/UPDATE is restricted to service role only. Any rewards logic must go through the server-side service layer, not direct client queries.
- **New migrations** must follow the timestamp naming convention: `YYYYMMDDHHMMSS_description.sql`. Apply via `supabase db push` after linking the CLI.

### Email System

- `FROM_EMAIL` is hardcoded as `CREW@streetcandys.shop` in `src/lib/email/client.ts`. If the sender address changes, update this file and re-verify the domain in Resend.
- If `RESEND_API_KEY` is missing or invalid, **all transactional emails fail silently** — no error is shown to customers. Always verify the key is set after any environment variable migration.

### Payments

- Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) is tied to a specific webhook endpoint URL. If the production domain changes or a new endpoint is created in Stripe, the secret must be updated in the hosting environment.
- Use `pk_test_` / `sk_test_` Stripe keys in development and `pk_live_` / `sk_live_` in production. Never use live keys in development.

### Testing

- The test suite (`src/__tests__/`) uses Vitest with mocked Supabase calls — no live database connection is required. Run `npm test` before pushing any changes.
- Tests cover order workflows, order status transitions, and API routes. Add tests for any new business logic.

### Operations Reference

- **Day-to-day operations** (content management, product management, admin operations): `STREET_CANDYS_OPERATIONS_GUIDE.md`
- **Local development setup from scratch**: `LOCAL_DEVELOPMENT_CHECKLIST.md`
- **SEO implementation details**: `SEO_IMPLEMENTATION_SUMMARY.md`
- **Mobile build process**: `MOBILE_BUILD_GUIDE.md`

---

## Documentation Index

| Document | Purpose |
|---|---|
| `STREET_CANDYS_ARCHITECTURE.md` | Complete technical architecture reference |
| `STREET_CANDYS_OPERATIONS_GUIDE.md` | Day-to-day operations handbook |
| `STREET_CANDYS_MIGRATION_PLAN.md` | Migration away from Rocket.new |
| `DEPLOYMENT_GUIDE.md` | Hosting deployment (Vercel, Netlify, VPS) |
| `ENVIRONMENT_SETUP_GUIDE.md` | Environment variables and local setup |
| `BACKUP_AND_RECOVERY_GUIDE.md` | Backup procedures and disaster recovery |
| `MIGRATION_READINESS_CHECKLIST.md` | Pre-migration checklist (10 sections) |
| `LOCAL_DEVELOPMENT_CHECKLIST.md` | Step-by-step local dev setup |
| `SEO_IMPLEMENTATION_SUMMARY.md` | SEO layer documentation |
| `MOBILE_BUILD_GUIDE.md` | iOS/Android Capacitor build guide |
| `HANDOVER.md` | **This document** — final handover index |

---

*Street Candy's — Final Handover Document · August 2026*
