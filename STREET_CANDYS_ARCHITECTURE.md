# Street Candys — Developer Architecture Handbook

> **Version:** 1.0  
> **Date:** 2026-08-04  
> **Purpose:** Permanent technical reference for the Street Candys application. Covers architecture, database, all business systems, and development guidelines. This document is independent of any hosting platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Application Architecture](#2-application-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Database Architecture](#4-database-architecture)
5. [Authentication System](#5-authentication-system)
6. [Ecommerce Systems](#6-ecommerce-systems)
7. [Loyalty System](#7-loyalty-system)
8. [Blog System](#8-blog-system)
9. [Admin & Backoffice](#9-admin--backoffice)
10. [Important Business Rules](#10-important-business-rules)
11. [Testing](#11-testing)

---

## 1. Project Overview

### Purpose of the Application

Street Candys is a **premium hemp-derived products ecommerce platform** serving customers in Colombia (CO) and Costa Rica (CR). The application provides:

- A full-featured online store for hemp/CBD products with multi-currency pricing
- A loyalty rewards program to incentivize repeat purchases
- An educational blog focused on cannabis/hemp content in Spanish
- A complete customer account area (orders, addresses, wishlist, reviews, notifications)
- A full admin backoffice for store operations

The platform is bilingual-ready (Spanish primary) and multi-country by design, with separate pricing, payment methods, tax rates, and shipping configurations per country.

### Main Business Objectives

1. **Sell premium hemp products** online in Colombia and Costa Rica
2. **Educate customers** through a content-rich Spanish-language blog
3. **Build customer loyalty** through a tiered points-based rewards program
4. **Operate efficiently** through a comprehensive admin dashboard
5. **Support mobile users** via a Capacitor-wrapped iOS/Android native app

### Technology Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.18 |
| Language | TypeScript | ^5.x |
| UI Library | React | 19.0.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Database & Auth | Supabase (PostgreSQL) | @supabase/supabase-js 2.111.0 |
| Supabase SSR | @supabase/ssr | 0.12.4 |
| Payment Processing | Stripe | stripe (latest) |
| Charts | Recharts | ^2.15.2 |
| Icons | @heroicons/react | ^2.2.0 |
| Mobile | Capacitor | 8.x |
| Testing | Vitest + @testing-library/react | 3.2.7 / 16.3.2 |
| Font | DM Sans (Google Fonts) | variable |
| Typography Plugin | @tailwindcss/typography | ^0.5.16 |

---

## 2. Application Architecture

### Frontend Architecture

The frontend is built with **Next.js 15 App Router** using React Server Components (RSC) where possible, with Client Components (`'use client'`) for interactive UI.

**Key architectural decisions:**

- **App Router** — all pages live under `src/app/`. Each route is a `page.tsx` file.
- **Server Components by default** — data fetching happens server-side for SEO and performance.
- **Client Components** — used for interactive elements: cart drawer, auth forms, product filters, real-time order tracking.
- **Split pattern for complex pages** — pages with heavy client interactivity use a `page.tsx` (server shell) + `client.tsx` (client component) split. Example: `src/app/productos/[slug]/page.tsx` + `client.tsx`.
- **API Routes** — all business logic is exposed through `src/app/api/` REST endpoints. Pages call these endpoints rather than calling the database directly from client components.
- **Global state** — only authentication state is global (via `AuthContext`). Cart state is managed locally with `useCartPersistence` hook.

**Root Layout (`src/app/layout.tsx`):**
- Wraps the entire app in `AuthProvider` (global auth state)
- Loads `DM Sans` variable font
- Injects Google Analytics, Capacitor provider, offline banner
- Includes Organization Schema (JSON-LD) for SEO
- Contains a chunk error handler script for cache-busting on deployment

### Backend Architecture

The backend is a **serverless API layer** built entirely with Next.js API Routes:

- **`src/app/api/`** — ~50 REST endpoints organized by domain
- **`src/lib/`** — business logic layer (services + repositories), completely decoupled from HTTP
- **Supabase** — PostgreSQL database, authentication, storage, and realtime subscriptions
- **Stripe** — payment processing (card payments for CO and CR)

**Service/Repository Pattern:**
Every domain has a clean separation:
- `*-repository.ts` — raw database queries (Supabase calls)
- `*-service.ts` — business logic, validation, orchestration
- `index.ts` — public exports

API routes call services; services call repositories. No direct database access from API routes.

### Data Flow

```
Browser / Mobile App
       │
       ▼
Next.js Page (Server Component)
  → Fetches data server-side via API routes or direct service calls
       │
       ▼
Next.js API Route (src/app/api/*)
  → Validates request, calls service layer
       │
       ▼
Service Layer (src/lib/*/service.ts)
  → Business logic, validation, orchestration
       │
       ▼
Repository Layer (src/lib/*/repository.ts)
  → Supabase queries (anon client or admin client)
       │
       ▼
Supabase PostgreSQL
  → RLS policies enforce row-level security
  → Triggers auto-update timestamps, create profiles
  → Functions enforce business rules
```

**Authentication data flow:**
- Browser client uses `createBrowserClient` from `@supabase/ssr`
- Server components use `createServerClient` from `@supabase/ssr` with Next.js cookies
- Admin API routes use `createAdminClient()` with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Session token is injected into API requests via `x-sb-token` header (custom fetch patch for iframe/sandbox compatibility)

### Main Application Layers

| Layer | Location | Responsibility |
|---|---|---|
| Pages | `src/app/` | Routing, SSR data fetching, page composition |
| API Routes | `src/app/api/` | HTTP interface, request validation, response formatting |
| Services | `src/lib/*/service.ts` | Business logic, validation, orchestration |
| Repositories | `src/lib/*/repository.ts` | Database queries, data mapping |
| Contexts | `src/contexts/` | Global React state (auth only) |
| Hooks | `src/hooks/` | Reusable stateful logic |
| Components | `src/components/` | Reusable UI components |
| Middleware | `src/middleware.ts` | Route protection, auth checks |

---

## 3. Folder Structure

```
streetcandys/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Home page
│   │   ├── layout.tsx                # Root layout (AuthProvider, fonts, GA)
│   │   ├── not-found.tsx             # 404 page
│   │   ├── sitemap.ts                # Dynamic XML sitemap
│   │   ├── robots.ts                 # robots.txt
│   │   │
│   │   ├── admin/                    # Admin dashboard (protected)
│   │   │   ├── page.tsx              # Admin home / KPI dashboard
│   │   │   ├── pedidos/              # Order management
│   │   │   ├── productos/            # Product management (list + [id] edit)
│   │   │   ├── inventario/           # Inventory management
│   │   │   ├── categorias/           # Category management
│   │   │   ├── usuarios/             # Customer management
│   │   │   ├── blog/                 # Blog post management
│   │   │   ├── recompensas/          # Rewards management
│   │   │   ├── resenas/              # Review moderation
│   │   │   ├── promociones/          # Promotions management
│   │   │   ├── cupones/              # Coupon management
│   │   │   ├── anuncios/             # Announcement bar management
│   │   │   ├── analiticas/           # Sales analytics
│   │   │   ├── marketing/spin-to-win/ # Spin-to-win gamification
│   │   │   ├── configuracion/        # App settings
│   │   │   └── setup/                # First-admin setup (public)
│   │   │
│   │   ├── api/                      # REST API endpoints
│   │   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── blog/                 # Blog data endpoints
│   │   │   ├── carrito/              # Cart endpoints
│   │   │   ├── categorias/           # Category endpoints
│   │   │   ├── checkout/             # Checkout endpoints
│   │   │   ├── cuenta/               # Customer account endpoints
│   │   │   ├── ordenes/              # Order endpoints
│   │   │   ├── pagos/                # Payment + webhook endpoints
│   │   │   ├── productos/            # Product catalog endpoints
│   │   │   └── promociones/          # Promotion validation endpoints
│   │   │
│   │   ├── blog/                     # Blog public pages
│   │   │   ├── page.tsx              # Blog listing
│   │   │   ├── [slug]/               # Article detail (page.tsx + client.tsx)
│   │   │   ├── categoria/[slug]/     # Category listing
│   │   │   ├── tag/[tag]/            # Tag listing
│   │   │   ├── buscar/               # Blog search
│   │   │   └── rss.xml/route.ts      # RSS feed
│   │   │
│   │   ├── cuenta/                   # Customer account (protected)
│   │   │   ├── page.tsx              # Account dashboard
│   │   │   ├── perfil/               # Profile editing
│   │   │   ├── pedidos/              # Order history + [id] detail
│   │   │   ├── direcciones/          # Address book
│   │   │   ├── favoritos/            # Wishlist
│   │   │   ├── recompensas/          # Rewards dashboard
│   │   │   ├── loyalty/              # Loyalty rewards catalog
│   │   │   ├── resenas/              # Customer reviews
│   │   │   └── notificaciones/       # Notification center
│   │   │
│   │   ├── productos/                # Product catalog (public)
│   │   │   ├── page.tsx              # Product listing with filters
│   │   │   └── [slug]/               # Product detail page (page.tsx + client.tsx)
│   │   │
│   │   ├── checkout/page.tsx         # Checkout flow
│   │   ├── orden-confirmada/[id]/    # Order confirmation
│   │   ├── iniciar-sesion/           # Login
│   │   ├── registro/                 # Registration
│   │   ├── recuperar-contrasena/     # Password reset request
│   │   ├── nueva-contrasena/         # Password reset form
│   │   ├── auth/callback/route.ts    # OAuth/magic-link callback
│   │   ├── edad-legal/               # Age verification gate
│   │   └── [legal pages]/            # terminos, privacidad, cookies, reembolsos, envios, contacto
│   │
│   ├── components/                   # Shared UI components
│   │   ├── admin/AdminLayout.tsx     # Admin sidebar + navigation shell
│   │   ├── catalog/                  # Product catalog components
│   │   │   ├── CatalogProductCard.tsx
│   │   │   ├── FavoriteButton.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── ProductCardSkeleton.tsx
│   │   │   └── CatalogStates.tsx
│   │   ├── cuenta/CuentaLayout.tsx   # Customer account sidebar shell
│   │   ├── legal/LegalLayout.tsx     # Legal pages layout
│   │   ├── mobile/                   # Mobile-specific components
│   │   │   ├── CapacitorProvider.tsx # Capacitor initialization
│   │   │   └── OfflineBanner.tsx     # Offline detection banner
│   │   ├── ui/                       # Base UI primitives
│   │   │   ├── AppImage.tsx          # Next.js Image wrapper
│   │   │   ├── AppIcon.tsx           # Heroicons wrapper
│   │   │   └── AppLogo.tsx           # Brand logo component
│   │   │
│   │   # Home page section components:
│   │   ├── HeroSection.tsx
│   │   ├── AnnouncementBar.tsx
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CategorySection.tsx
│   │   ├── BlogSection.tsx
│   │   ├── RewardsSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── TrustSection.tsx
│   │   ├── BrandStorySection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── PressSection.tsx
│   │   ├── GivingCarousel.tsx
│   │   ├── FarmCarousel.tsx
│   │   ├── SpinToWin.tsx             # Spin-to-win gamification wheel
│   │   ├── CartDrawer.tsx            # Slide-out cart
│   │   ├── WhatsAppButton.tsx        # WhatsApp FAB
│   │   ├── SupportFab.tsx            # Support floating button
│   │   ├── ProductReviewsSection.tsx # Product reviews display
│   │   ├── GoogleAnalytics.tsx       # GA4 integration
│   │   └── ChunkErrorHandler.tsx     # JS chunk error recovery
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx           # Global auth state + all auth methods
│   │
│   ├── hooks/
│   │   ├── useCartPersistence.ts     # Cart state with localStorage persistence
│   │   ├── useOrderRealtime.ts       # Supabase Realtime order status subscription
│   │   ├── useFavorites.ts           # Wishlist state management
│   │   ├── useNotifications.ts       # In-app notification management
│   │   ├── useWhatsAppSettings.ts    # WhatsApp config from settings table
│   │   └── useSpinToWinSettings.ts   # Spin-to-win config from settings table
│   │
│   ├── lib/                          # Business logic layer
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client (cookie+localStorage fallback)
│   │   │   ├── server.ts             # Server Supabase client (Next.js cookies)
│   │   │   ├── admin.ts              # Admin client (service role key, bypasses RLS)
│   │   │   ├── helpers.ts            # Connection health check
│   │   │   └── index.ts              # Re-exports
│   │   │
│   │   ├── cart/
│   │   │   ├── cart-service.ts       # Cart business logic (add/update/remove/merge/validate)
│   │   │   ├── cart-repository.ts    # Cart database queries
│   │   │   ├── persistence.ts        # localStorage cart snapshot utilities
│   │   │   ├── utils.ts              # Cart calculation helpers
│   │   │   ├── types.ts              # Cart TypeScript types
│   │   │   └── index.ts
│   │   │
│   │   ├── payment/
│   │   │   ├── checkout-service.ts   # Checkout orchestration (cart → order → payment)
│   │   │   ├── payment-service.ts    # Payment lifecycle (create/confirm/refund/webhook)
│   │   │   ├── order-service.ts      # Order management (list/cancel/update status)
│   │   │   ├── checkout-repository.ts
│   │   │   ├── order-repository.ts
│   │   │   ├── payment-repository.ts
│   │   │   ├── logger.ts             # Structured payment logger
│   │   │   ├── utils.ts              # Tax/shipping/total calculations
│   │   │   ├── types.ts              # Payment TypeScript types
│   │   │   ├── index.ts
│   │   │   └── providers/
│   │   │       ├── stripe-provider.ts  # Stripe implementation
│   │   │       ├── manual-provider.ts  # Stub for non-card methods
│   │   │       └── index.ts            # Provider factory (by country)
│   │   │
│   │   ├── products/
│   │   │   ├── product-service.ts    # Product CRUD + search + related
│   │   │   ├── product-repository.ts # Product database queries
│   │   │   ├── category-service.ts   # Category management
│   │   │   ├── category-repository.ts
│   │   │   ├── inventory-service.ts  # Stock management
│   │   │   ├── reviews-service.ts    # Review submission + moderation
│   │   │   ├── reviews-repository.ts
│   │   │   ├── utils.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── rewards/
│   │   │   └── rewards-service.ts    # Points calculation + award on delivery
│   │   │
│   │   ├── promotions/
│   │   │   ├── promotions-service.ts # Promotion eligibility + discount calculation
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── blog/
│   │   │   └── blog-image-utils.ts   # Blog image library + slug→image mapping + validator
│   │   │
│   │   ├── price/
│   │   │   └── index.ts              # Multi-currency price formatting (COP/CRC)
│   │   │
│   │   ├── mobile/
│   │   │   └── index.ts              # Capacitor platform detection wrappers
│   │   │
│   │   └── order-status.ts           # Order status constants, transitions, notifications
│   │
│   ├── middleware.ts                  # Route protection (admin + customer routes)
│   ├── styles/
│   │   ├── index.css                 # Global CSS (do not modify)
│   │   └── tailwind.css              # Tailwind directives + CSS variables
│   │
│   └── __tests__/                    # Test suite
│       ├── setup.ts                  # Vitest global setup
│       ├── helpers/test-utils.ts     # Shared test utilities
│       ├── unit/                     # Unit tests
│       ├── integration/              # Integration tests
│       ├── ui/                       # Component/UI tests
│       ├── api/                      # API route tests
│       ├── edge-cases/               # Edge case tests
│       └── regression/               # Regression tests
│
├── supabase/
│   └── migrations/                   # 35 SQL migration files (chronological)
│
├── public/
│   ├── favicon.ico
│   ├── manifest.json                 # PWA manifest
│   ├── assets/
│   │   ├── streetcandys-logo-dark.svg
│   │   ├── streetcandys-logo-light.svg
│   │   └── images/                   # Blog covers, OG images, app icons, hero banner
│
├── scripts/                          # Mobile build scripts (iOS/Android)
├── mobile/                           # Mobile documentation
├── capacitor.config.ts               # Capacitor native app configuration
├── next.config.mjs                   # Next.js configuration
├── tailwind.config.js                # Design system tokens
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Test configuration
├── image-hosts.config.mjs            # Allowed remote image domains
└── package.json                      # Dependencies and scripts
```

---

## 4. Database Architecture

### Supabase Structure

- **Provider:** Supabase (hosted PostgreSQL)
- **Schema:** `public` (all application tables)
- **Auth:** `auth.users` (Supabase managed)
- **Storage:** `review-photos` bucket (public, 5MB limit, JPEG/PNG/WebP)
- **RLS:** Enabled on every table — no table is accessible without a policy
- **Migrations:** 35 files in `supabase/migrations/`, applied chronologically

### Main Tables (28 tables)

#### Core / Configuration

| Table | Purpose |
|---|---|
| `countries` | Supported countries: CO (Colombia) and CR (Costa Rica). Stores currency, tax rate, shipping config, payment methods, locale. |
| `settings` | Key-value application settings (WhatsApp number, Spin-to-Win config, etc.). `is_public=true` rows are readable by anyone. |

#### Users & Profiles

| Table | Purpose |
|---|---|
| `profiles` | Extended user data linked to `auth.users`. Stores full_name, phone, avatar, role, country_code, age_verified, referral_code. Auto-created by trigger on signup. |
| `addresses` | Customer shipping/billing addresses. Multiple per user, one can be default. |

#### Product Catalog

| Table | Purpose |
|---|---|
| `categories` | Hierarchical product categories (self-referencing `parent_id`). |
| `products` | Product catalog. Includes cannabinoid_profile (JSONB), terpene_profile (JSONB), effects (TEXT[]), tags (TEXT[]), COA URL, lab report URL, educational content, dual pricing (base_price COP + price_crc CRC). |
| `product_variants` | Product variants by type: size, flavor, strength, format. Each has a price_modifier. |
| `inventory` | Stock levels per product/variant. Tracks `quantity`, `reserved_quantity`, `low_stock_threshold`, `allow_backorder`. |

#### Cart

| Table | Purpose |
|---|---|
| `cart` | One cart per user (profile_id) or guest (session_id). Stores country_code, applied coupon, rewards points to use. |
| `cart_items` | Line items in a cart. Stores unit_price snapshot at time of adding. |

#### Orders

| Table | Purpose |
|---|---|
| `orders` | Complete order record. Stores full financial snapshot: subtotal, discount_amount, shipping_cost, tax_amount, total, currency_code, tax_rate_snapshot. Tracks status, payment_status, payment_method, payment_reference, tracking_number, status_history (JSONB array). |
| `order_items` | Snapshot of products at purchase time: product_name, variant_name, sku_snapshot, unit_price, total_price. Immutable after creation. |
| `order_internal_notes` | Admin-only notes on orders (not visible to customers). |

#### Promotions & Discounts

| Table | Purpose |
|---|---|
| `coupons` | Discount coupons: percentage or fixed amount, usage limits, per-user limits, expiry, country targeting. |
| `coupon_redemptions` | Tracks which coupon was used on which order by which user. |
| `promotions` | Advanced promotions: percentage, fixed_amount, free_shipping, buy_x_get_y, automatic_cart, coupon_code. Supports country targeting, product/category targeting, tier eligibility, scheduling. |
| `promotion_redemptions` | Tracks promotion usage per order. |

#### Reviews

| Table | Purpose |
|---|---|
| `reviews` | Product reviews with rating (1-5), title, body, photos (JSONB), status (pending/approved/rejected/hidden), admin_reply, is_featured. |

#### Loyalty & Rewards

| Table | Purpose |
|---|---|
| `rewards` | Customer loyalty balance: points_balance (spendable), points_lifetime (for tier calculation), current tier. |
| `reward_transactions` | Full history of points: earned_purchase, earned_review, earned_referral, redeemed, expired, adjusted. Each row stores points, balance_after, description, order_id. |
| `loyalty_rewards` | Catalog of redeemable rewards (discount coupons, free products, etc.) with points_required, eligible_tiers, stock_limit. |
| `loyalty_reward_redemptions` | Records when a customer redeems a loyalty reward. |

#### Wishlist & Notifications

| Table | Purpose |
|---|---|
| `wishlist` | Customer saved products (profile_id + product_id). |
| `notifications` | In-app notifications per user: type, title, body, is_read, metadata (JSONB). |

#### Blog

| Table | Purpose |
|---|---|
| `blog_categories` | Blog taxonomy: name, slug, description, meta_title, meta_description. |
| `blog_posts` | Blog articles: title, slug, content, excerpt, featured_image_url, status (draft/published/archived), author, tags (TEXT[]), read_time_minutes, view_count, is_featured, meta_title, meta_description, published_at. |

#### Gamification

| Table | Purpose |
|---|---|
| `spin_to_win_settings` | Configuration for the spin-to-win wheel (prizes, probabilities, enabled/disabled). |
| `spin_leads` | Email captures from the spin-to-win feature. |

### Relationships

```
auth.users
  └──→ profiles (CASCADE DELETE)
         ├──→ addresses
         ├──→ cart
         │     └──→ cart_items
         │           ├──→ products
         │           └──→ product_variants
         ├──→ orders
         │     ├──→ order_items
         │     ├──→ coupon_redemptions
         │     ├──→ promotion_redemptions
         │     └──→ reward_transactions
         ├──→ reviews
         ├──→ rewards
         │     └──→ reward_transactions
         ├──→ loyalty_reward_redemptions
         ├──→ wishlist
         └──→ notifications

categories (self-ref parent_id)
  └──→ products
         ├──→ product_variants
         ├──→ inventory (product_id + variant_id UNIQUE)
         ├──→ cart_items
         ├──→ order_items
         ├──→ reviews
         └──→ wishlist

blog_categories
  └──→ blog_posts

coupons
  ├──→ coupon_redemptions
  └──→ cart (applied coupon)

promotions
  └──→ promotion_redemptions

loyalty_rewards
  └──→ loyalty_reward_redemptions
```

### ENUM Types

| ENUM | Values |
|---|---|
| `user_role` | `customer`, `admin`, `staff` |
| `order_status` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded`, `partially_refunded` |
| `payment_method` | `stripe`, `pse`, `nequi`, `bancolombia`, `sinpe_movil`, `bank_transfer` |
| `notification_type` | `order_confirmed`, `order_shipped`, `order_delivered`, `order_cancelled`, `reward_earned`, `reward_redeemed`, `coupon_applied`, `review_approved`, `review_rejected`, `system` |
| `reward_transaction_type` | `earned_purchase`, `earned_review`, `earned_referral`, `redeemed`, `expired`, `adjusted` |
| `reward_tier` | `crew`, `og`, `legend`, `icon` |
| `blog_post_status` | `draft`, `published`, `archived` |
| `variant_type` | `size`, `flavor`, `strength`, `format` |
| `promotion_type` | `percentage`, `fixed_amount`, `free_shipping`, `buy_x_get_y`, `automatic_cart`, `coupon_code` |
| `review_status` | `pending`, `approved`, `rejected`, `hidden` |

### Important Business Rules (Database Level)

1. **Inventory constraint:** `inventory.quantity >= 0` and `reserved_quantity >= 0` enforced by CHECK constraints.
2. **Unique inventory per variant:** `UNIQUE(product_id, variant_id)` on `inventory` table.
3. **Duplicate reward prevention:** Unique partial index on `reward_transactions(order_id)` WHERE `transaction_type = 'earned_purchase'` — prevents double-awarding points for the same order.
4. **Country validation:** `is_allowed_country(CHAR(2))` function validates only `CO` and `CR` are accepted.
5. **Coupon uniqueness:** `coupons.code` is UNIQUE.
6. **Profile cascade:** Deleting `auth.users` row cascades to delete the `profiles` row and all dependent data.
7. **Order items are immutable:** `order_items` stores a snapshot (product_name, sku_snapshot, unit_price) — not foreign keys to live product data. This ensures historical accuracy even if products change.

### RLS Strategy

Every table has Row Level Security enabled. The strategy follows these patterns:

| Pattern | Tables | Rule |
|---|---|---|
| **Own-data only** | cart, orders, addresses, rewards, wishlist, notifications, reviews (own) | `auth.uid() = profile_id` |
| **Public read** | products (active), categories (active), blog_posts (published), coupons (active), countries, settings (is_public) | `USING (is_active = true)` or similar |
| **Admin full access** | All tables | `is_admin()` or `is_admin_or_staff()` SECURITY DEFINER functions |
| **Guest cart** | cart, cart_items | `session_id = current_setting('app.session_id', true)` |
| **Service role bypass** | All tables | Admin API routes use `createAdminClient()` which bypasses RLS entirely |

**Key RLS functions:**
- `is_admin()` — checks `auth.users` metadata for admin role (SECURITY DEFINER, no RLS recursion)
- `is_admin_or_staff()` — checks `profiles.role` for admin or staff
- `is_admin_user()` — alias used in promotions RLS
- `admin_exists()` — returns true if any admin profile exists (used by setup page)

### Database Functions & Triggers

| Function/Trigger | Type | Purpose |
|---|---|---|
| `handle_new_user()` | Trigger function | Auto-creates `profiles` row when `auth.users` INSERT fires |
| `on_auth_user_created` | Trigger | Fires `handle_new_user()` AFTER INSERT on `auth.users` |
| `set_updated_at()` | Trigger function | Auto-updates `updated_at` timestamp on row changes |
| `admin_exists()` | Function | Returns boolean — used by setup page to guard first-admin creation |
| `setup_first_admin(UUID)` | Function | Promotes a user to admin role — only works when no admin exists |
| `get_eligible_promotions(...)` | Function | Returns applicable promotions for a cart given subtotal, country, profile, products, tier |
| `validate_promotion_coupon(...)` | Function | Validates a coupon code with all business rules |
| `is_allowed_country(CHAR(2))` | Function | Validates country code is CO or CR |

---

## 5. Authentication System

### Provider

**Supabase Auth** with email/password only. No OAuth providers (Google, GitHub, etc.) are configured.

### Authentication UI

All authentication pages share a **unified visual system** using `/iniciar-sesion` as the single source of truth:

- Pink gradient background with decorative circles
- White `rounded-3xl` card with `#ffd6e8` border and shadow
- `AppLogo` branding centered at the top
- `#fff0f5` input backgrounds with pink focus rings
- Pink gradient submit button with loading spinner
- Pink-themed error and success message styles
- `© 2026 Street Candy's. Todos los derechos reservados.` footer on all auth pages

**Auth pages:** `/iniciar-sesion`, `/registro`, `/recuperar-contrasena`, `/nueva-contrasena`, `/email-verificado`

### Registration Flow

1. User submits registration form at `/registro` with: email, password, full_name, country_code (CO or CR)
2. Country validation: only `CO` and `CR` are accepted — throws error otherwise
3. Form calls `POST /api/auth/signup` (server-side Admin API route — bypasses Supabase's own email delivery)
4. API route calls `adminClient.auth.admin.generateLink({ type: 'signup', email, password, options: { data: { full_name, country_code, role: 'customer' } } })`
5. API route sends the verification link via **Resend** using the branded Welcome email template (`src/lib/email/templates/welcome.ts`)
6. **Trigger path:** `on_auth_user_created` trigger fires `handle_new_user()` which auto-creates the `profiles` row
7. **Fallback path:** If the trigger fails, the client-side code performs an upsert on `profiles` directly
8. User must confirm their email before they can log in

### Login Flow

1. User submits email + password at `/iniciar-sesion`
2. `supabase.auth.signInWithPassword()` is called
3. On success: `AuthContext` fetches the user's `profiles` row to get their role
4. If role is `admin` or `staff` → redirect to `/admin`
5. Otherwise → redirect to `nextPath` query param (or `/`)
6. Error messages are user-friendly: "Correo o contraseña incorrectos" / "Debes verificar tu correo"

### Password Recovery Flow

> **Architecture note:** Password recovery uses a fully **server-side** flow via the Supabase Admin API + Resend. It does **not** use `supabase.auth.resetPasswordForEmail()` or PKCE code exchange, which avoids PKCE-related redirect failures in sandboxed/iframe environments.

1. User submits email at `/recuperar-contrasena`
2. Form calls `POST /api/auth/reset-password`
3. API route calls `adminClient.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: 'https://streetcandys.shop/nueva-contrasena' } })`
4. API route sends the recovery link via **Resend** using the branded password recovery email template (inline in `src/app/api/auth/reset-password/route.ts`)
5. User clicks the `RESTABLECER CONTRASEÑA` CTA in the email
6. Link opens `/nueva-contrasena` with a `token_hash` query parameter
7. `/nueva-contrasena` calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` to establish a session
8. User submits new password → `supabase.auth.updateUser({ password: newPassword })`
9. On success: 3-second countdown then redirect to `/iniciar-sesion`

### Email Templates

All transactional authentication emails are **branded premium templates** sent via Resend. Supabase's built-in email delivery is bypassed entirely.

| Email | Trigger | Template Location | CTA |
|---|---|---|---|
| Welcome + Email Verification | New user registration | `src/lib/email/templates/welcome.ts` | `ACTIVAR MI CUENTA` |
| Password Recovery | Password reset request | `src/app/api/auth/reset-password/route.ts` (inline) | `RESTABLECER CONTRASEÑA` |

**Template design system:**
- Black `#0A0A0A` header with STREET CANDY'S wordmark + fuchsia pill badge
- Fuchsia (`#FF006E`) and green (`#00C853`) accent colors
- Branded CTAs (no generic Supabase-style wording)
- Clean backup link section (no raw URLs displayed)
- Footer: `© Street Candy's 2026 — Made for the Crew.`
- Sender: `CREW@streetcandys.shop` (verified custom domain)

### Session Handling

**Browser client (`src/lib/supabase/client.ts`):**
- Uses `createBrowserClient` from `@supabase/ssr`
- Custom cookie storage with fallback to `localStorage` (for iframe/sandboxed environments)
- Cookie test: tries to set/read a test cookie; if it fails, falls back to `localStorage` with `sb_` prefix
- Custom `fetch` patch: injects `x-sb-token` header into all same-origin requests so the server middleware can read the token even when cookies are blocked
- Singleton pattern: one client instance per browser session (prevents infinite re-renders)

**Server client (`src/lib/supabase/server.ts`):**
- Uses `createServerClient` from `@supabase/ssr` with Next.js `cookies()` store
- `SameSite=none; Secure` cookie attributes for cross-origin compatibility

**Admin client (`src/lib/supabase/admin.ts`):**
- Uses `createClient` from `@supabase/supabase-js` directly with `SUPABASE_SERVICE_ROLE_KEY`
- `autoRefreshToken: false`, `persistSession: false`
- **Only used server-side** in admin API routes — never exposed to the browser
- Bypasses all RLS policies

### User Roles

| Role | Description | Access |
|---|---|---|
| `customer` | Regular shopper | Own orders, cart, addresses, rewards, wishlist, notifications, reviews |
| `staff` | Store employee | Admin dashboard read access + limited operations |
| `admin` | Store owner/manager | Full admin dashboard + all CRUD operations + user management |

### Admin Protection (Middleware)

`src/middleware.ts` intercepts all requests matching the pattern `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`.

**Admin route protection logic:**
1. Whitelisted routes (no auth required): `/admin/setup`, `/api/admin/setup`, `/api/admin/diagnose`
2. For all `/admin/*` and `/api/admin/*` routes:
   - If no user session → redirect to `/iniciar-sesion?next={path}` (or 401 JSON for API routes)
   - If user exists → query `profiles.role` from database
   - If role is `admin` or `staff` → allow through
   - If profile query fails → check `user_metadata.role` as fallback
   - If no valid admin role → redirect to `/?error=forbidden` (or 403 JSON for API routes)
3. For `/cuenta/*` routes: redirect unauthenticated users to login
4. For auth pages (`/iniciar-sesion`, `/registro`, `/recuperar-contrasena`): redirect already-authenticated users away (admins → `/admin`, customers → `/`)

**First-admin setup:**
- `/admin/setup` is publicly accessible
- The `admin_exists()` database function returns `false` when no admin exists
- `setup_first_admin(user_id)` promotes a user to admin — blocked by the function if any admin already exists

---

## 6. Ecommerce Systems

### 6.1 Product Catalog

**Routes:** `/productos` (listing), `/productos/[slug]` (detail)  
**API:** `/api/productos/*`  
**Lib:** `src/lib/products/`

**Product data model highlights:**
- `base_price` (COP) — always required
- `price_crc` (CRC) — optional; product is invisible in Costa Rica if null
- `cannabinoid_profile` (JSONB) — e.g. `{ "CBD": "15%", "THC": "<0.3%" }`
- `terpene_profile` (JSONB) — e.g. `{ "Myrcene": "0.5%", "Limonene": "0.3%" }`
- `effects` (TEXT[]) — e.g. `["relaxing", "uplifting", "focused"]`
- `tags` (TEXT[]) — for search and filtering
- `coa_url` — Certificate of Analysis URL
- `lab_report_url` — Full lab report URL
- `intensity_level` (1-5) — product potency indicator

**Listing features:**
- Filter by: category, effects, price range, intensity level, country availability
- Sort by: newest, price asc/desc, name, featured, best-selling (7 sort options)
- Pagination: 12 products per page
- Search: full-text search via `/api/productos/buscar`
- Special lists: `/api/productos/destacados`, `/api/productos/nuevos`, `/api/productos/mas-vendidos`

**Product detail:**
- Full product info with variants, inventory status, reviews summary
- Related products (same category)
- Review submission (authenticated users only)
- Wishlist toggle

### 6.2 Categories

**API:** `/api/categorias`, `/api/categorias/[slug]`  
**Lib:** `src/lib/products/category-service.ts`, `category-repository.ts`

- Hierarchical structure: categories can have a `parent_id` referencing another category
- Each category has: name, slug, description, image_url, icon_name, meta_title, meta_description
- Products are filtered by `category_id` (resolved from slug in the service layer)

### 6.3 Product Variants

**Lib:** `src/lib/products/product-repository.ts` (varianteRepositorio)

- Variant types: `size`, `flavor`, `strength`, `format`
- Each variant has a `price_modifier` (added to base_price)
- Variants have their own `sku` and can have their own `images`
- Inventory is tracked per `(product_id, variant_id)` pair

### 6.4 Inventory

**Lib:** `src/lib/products/inventory-service.ts`  
**API:** `/api/productos/[slug]/inventario`, `/api/admin/productos/[id]/inventario`

- `quantity` — total physical stock
- `reserved_quantity` — items in active carts/pending orders
- Available stock = `quantity - reserved_quantity`
- `low_stock_threshold` — triggers admin alert when available stock falls below this
- `allow_backorder` — if true, items can be added to cart even when out of stock

### 6.5 Shopping Cart

**API:** `/api/carrito/*`  
**Lib:** `src/lib/cart/`  
**Hook:** `useCartPersistence`

**Cart types:**
- **Guest cart:** identified by `session_id` (UUID stored in localStorage)
- **Authenticated cart:** identified by `profile_id`
- **Cart merge:** when a guest logs in, their guest cart items are merged into their authenticated cart

**Cart operations:**
- Add item: validates inventory, checks max 20 unique items limit, prevents exceeding available stock
- Update quantity: re-validates inventory on every change
- Remove item: sets quantity to 0 or calls delete
- Apply coupon: validates code, expiry, usage limits, country, minimum order
- Apply rewards: validates user has sufficient points, caps at 20% of subtotal
- Estimate shipping: based on total weight and country
- Calculate tax: based on country tax rate

**Cart persistence (`useCartPersistence` hook):**
- Saves cart snapshot to `localStorage` on every change
- Restores snapshot on page load (SSR-safe: starts empty, restores after mount)
- Merges guest cart with authenticated cart on login
- Cart snapshots expire after a configurable TTL

### 6.6 Checkout

**Page:** `/checkout`  
**API:** `/api/checkout`, `/api/checkout/confirmar`, `/api/checkout/resumen`  
**Lib:** `src/lib/payment/checkout-service.ts`

**Checkout flow (server-side orchestration):**
1. Validate cart is not empty and all items are in stock
2. Calculate subtotal from cart items (unit_price + variant price_modifier × quantity)
3. Apply coupon discount (re-validates coupon is still active)
4. Apply rewards discount (capped at 20% of subtotal)
5. Calculate shipping cost (based on total weight and country)
6. Calculate tax (country tax rate × taxable amount)
7. Calculate final total
8. Create shipping address record
9. Generate order number (`SC-CO-YYYYMMDD-XXXX` format for Colombia, `SC-CR-...` for Costa Rica)
10. Create `orders` row with full financial snapshot
11. Create `order_items` rows (immutable product snapshot)
12. Create payment intent with the payment provider
13. Return `client_secret` to frontend for Stripe Elements

**Payment methods by country:**
- Colombia (CO): Card (Stripe), Nequi, PSE, Bancolombia
- Costa Rica (CR): Card (Stripe), SINPE Móvil

**WhatsApp fallback:** If the customer cannot complete payment online, a formatted WhatsApp message is generated with the full order details as a backup checkout method.

**Tip options:** 0%, 10%, 15%, 20% tip on order total (configurable in checkout UI).

### 6.7 Orders

**Customer pages:** `/cuenta/pedidos`, `/cuenta/pedidos/[id]`, `/orden-confirmada/[id]`  
**API:** `/api/ordenes/*`, `/api/admin/pedidos/*`  
**Lib:** `src/lib/payment/order-service.ts`, `order-repository.ts`

**Order status lifecycle:**
```
pending → confirmed → processing → shipped → delivered
                                           → cancelled
                                           → refunded
```

**Extended statuses (in order-status.ts):**
`pending` → `confirmed` → `preparing` → `ready` → `driver_assigned` → `out_for_delivery` → `delivered`

**Order features:**
- `status_history` (JSONB array): every status change is appended with timestamp and optional note
- `status_updated_at`: timestamp of last status change
- `estimated_delivery_time`: set by admin when dispatching
- `tracking_number`: set by admin when shipped
- Real-time status updates via `useOrderRealtime` hook (Supabase Realtime)
- Notifications generated on every status change
- WhatsApp messages generated on every status change

**Order cancellation rules:**
- Customers can cancel orders in `pending` or `confirmed` status only
- Orders in `processing`, `shipped`, `delivered` cannot be cancelled by customers
- Admins can cancel any order
- Cancellation generates a notification to the customer

**Refunds:**
- Processed via `/api/ordenes/[id]/reembolso`
- Calls `servicioPagos.procesarReembolso()` which delegates to the Stripe provider
- Supports partial refunds (sets status to `partially_refunded`)
- Full refunds set status to `refunded` and order status to `refunded`

### 6.8 Payments

**API:** `/api/pagos/webhook`, `/api/pagos/estado`  
**Lib:** `src/lib/payment/payment-service.ts`, `providers/`

**Provider abstraction:**
The payment system uses a `ProveedorPago` interface. The checkout service never imports Stripe directly — it always calls through the provider abstraction. This allows adding new payment providers without changing business logic.

**Provider factory (`providers/index.ts`):**
- Returns `ProveedorStripe` for card payments (both CO and CR)
- Returns `ProveedorManual` for non-card methods (Nequi, PSE, Bancolombia, SINPE) — **stub only, always returns `succeeded`**

**Stripe integration:**
- API version: `2025-06-30.basil`
- Payment Intent created with `statement_descriptor_suffix: 'STREET CANDY'`
- Amounts converted to smallest currency unit (centavos for COP, céntimos for CRC)
- Retry logic with exponential backoff for transient Stripe errors
- Webhook handler at `POST /api/pagos/webhook` validates signature with `STRIPE_WEBHOOK_SECRET`

**Webhook events handled:**
- `payment_intent.succeeded` → set payment_status to `paid`, order status to `confirmed`
- `payment_intent.payment_failed` → set payment_status to `failed`
- `payment_intent.canceled` → set payment_status to `failed`
- `charge.refunded` → set payment_status to `refunded`, order status to `refunded`

### 6.9 Customer Accounts

**Routes:** `/cuenta/*` (all protected by middleware)

| Sub-page | Purpose |
|---|---|
| `/cuenta` | Account dashboard (order summary, rewards balance) |
| `/cuenta/perfil` | Edit profile (name, phone, avatar, date of birth) |
| `/cuenta/pedidos` | Order history with pagination |
| `/cuenta/pedidos/[id]` | Order detail with real-time status tracking |
| `/cuenta/direcciones` | Address book (add/edit/delete/set default) |
| `/cuenta/favoritos` | Wishlist (add/remove products) |
| `/cuenta/recompensas` | Rewards dashboard (balance, tier, transaction history) |
| `/cuenta/loyalty` | Loyalty rewards catalog (redeem points for rewards) |
| `/cuenta/resenas` | Customer's submitted reviews |
| `/cuenta/notificaciones` | In-app notification center (mark read/unread) |

---

## 7. Loyalty System

### Overview

The loyalty system rewards customers with points for purchases. Points accumulate toward tiers that unlock benefits and can be redeemed for rewards.

### Points Calculation

Points are awarded when an order status changes to `delivered`.

| Country | Rate | Currency |
|---|---|---|
| Colombia (CO) | 1 point per 3,000 COP spent | COP |
| Costa Rica (CR) | 1 point per 500 CRC spent | CRC |

**Formula:** `Math.floor(order_total / rate_per_point)`

**Example:** A CO customer spends $90,000 COP → `Math.floor(90000 / 3000)` = **30 points**

### Tiers

| Tier | Lifetime Points Required | Description |
|---|---|---|
| `crew` | 0 (default) | Entry level |
| `og` | 500 | Regular customer |
| `legend` | 2,000 | Loyal customer |
| `icon` | 5,000 | VIP customer |

Tier is calculated from `points_lifetime` (cumulative, never decreases). Tier upgrades are automatic when lifetime points cross a threshold.

### Reward Transactions

Every points event creates a `reward_transactions` row:
- `transaction_type`: `earned_purchase`, `earned_review`, `earned_referral`, `redeemed`, `expired`, `adjusted`
- `points`: positive (earned) or negative (redeemed/expired)
- `balance_after`: running balance after this transaction
- `order_id`: linked order (for earned_purchase)
- `description`: human-readable description

**Duplicate prevention:** A unique partial index on `reward_transactions(order_id)` WHERE `transaction_type = 'earned_purchase'` ensures points are awarded exactly once per order, even if the status-change webhook fires multiple times.

### Rewards Redemption in Cart

- Customers can apply points at checkout
- Points are converted to currency: 1 point = 1 currency unit (COP or CRC)
- Maximum discount from rewards: **20% of cart subtotal**
- Points are deducted from `rewards.points_balance` when the order is confirmed

### Loyalty Rewards Catalog

The `loyalty_rewards` table stores redeemable rewards:
- `points_required`: cost in points
- `reward_type`: `discount`, `free_product`, etc.
- `reward_value`: monetary value of the reward
- `eligible_tiers`: which tiers can redeem this reward
- `stock_limit` / `stock_used`: optional stock control

Redemptions are tracked in `loyalty_reward_redemptions`.

---

## 8. Blog System

### Overview

An educational Spanish-language blog about hemp/cannabis products. 15 published articles across 6 categories.

### Content Structure

**Blog posts (`blog_posts`):**
- `title`, `slug` (unique), `content` (HTML), `excerpt`
- `featured_image_url` — must be unique per article (enforced by `BlogImageValidator`)
- `status`: `draft`, `published`, `archived`
- `published_at` — supports scheduled publishing (future date = not yet visible)
- `tags` (TEXT[]) — for tag-based filtering
- `category_id` — linked to `blog_categories`
- `read_time_minutes` — calculated from content length
- `view_count` — incremented on each article view
- `is_featured` — marks the hero article on the blog listing page
- `meta_title`, `meta_description` — SEO fields

**Blog categories (`blog_categories`):**
- 6 active categories
- Each has: name, slug, description, meta_title, meta_description

### Routes & API

| Route | Purpose |
|---|---|
| `/blog` | Blog listing (9 per page, featured article hero) |
| `/blog/[slug]` | Article detail with related articles |
| `/blog/categoria/[slug]` | Category-filtered listing |
| `/blog/tag/[tag]` | Tag-filtered listing |
| `/blog/buscar` | Full-text search |
| `/blog/rss.xml` | RSS feed for syndication |

| API Endpoint | Purpose |
|---|---|
| `GET /api/blog` | List posts with pagination, category, tag, search filters |
| `GET /api/blog/[slug]` | Single post + increments view_count |
| `GET /api/blog/[slug]/relacionados` | Related posts (same category) |
| `GET /api/blog/categorias` | All active categories |
| `GET /api/blog/tags` | All tags with post counts |

### Images

**`src/lib/blog/blog-image-utils.ts`** is the authoritative image management system:

- **`IMAGE_LIBRARY`**: 20 unique premium images, all local (`/assets/images/blog-*.png`), all 1600×900px
- **`SLUG_IMAGE_MAP`**: Maps each article slug to exactly one image key — no two articles share an image
- **`KEYWORD_MAP`**: Fallback mapping for future articles not yet in `SLUG_IMAGE_MAP`
- **`BlogImageValidator`**: Validates uniqueness, alt text presence, correct dimensions, no watermarks

**Visual standard:** Luxury editorial photography — botanical, modern, educational. Natural lighting, earthy green palette, warm wood textures. No third-party branding, logos, or watermarks.

### SEO Features

- Per-article Open Graph metadata (title, description, image)
- Twitter Card support
- `meta_title` and `meta_description` per article and category
- RSS feed at `/blog/rss.xml`
- Structured data (JSON-LD) via root layout
- Canonical URLs
- Dynamic sitemap includes all published blog posts

### Content Management

Blog posts are managed through the admin dashboard at `/admin/blog`. Admins can:
- Create/edit/delete posts
- Set status (draft/published/archived)
- Schedule publishing via `published_at`
- Manage categories
- Upload cover images

---

## 9. Admin & Backoffice

### Admin Dashboard

**Route:** `/admin` (protected — requires `admin` or `staff` role)  
**Layout:** `src/components/admin/AdminLayout.tsx` — sidebar navigation shell

**Home dashboard (`/admin`):**
- KPI cards: total orders, total revenue, active products, low-stock alerts
- Recent orders table with status badges
- Inventory alerts for products below `low_stock_threshold`
- Sales charts (Recharts bar/line charts)

### Product Management (`/admin/productos`)

- List all products with search and status filter
- Create new product with full form: name, slug, description, pricing (COP + CRC), category, variants, images, cannabinoid/terpene profiles, effects, tags, SEO fields
- Edit existing product
- Upload/delete product images to Supabase Storage
- Manage product variants (add/edit/delete)
- Update inventory levels per variant
- Activate/deactivate products

**API:** `/api/admin/productos/*`, `/api/admin/productos/[id]/variantes/*`, `/api/admin/productos/[id]/inventario`

### Order Management (`/admin/pedidos`)

- List all orders with filters: status, payment status, date range, search
- View order detail: items, customer info, addresses, payment info, status history
- Update order status with optional note and estimated delivery time
- Add internal notes (not visible to customer)
- Process refunds (full or partial)
- Generate WhatsApp message for order status update

**API:** `/api/admin/pedidos`, `/api/admin/pedidos/[id]`

### Customer Management (`/admin/usuarios`)

- List all customers with search
- View customer profile: orders, rewards balance, tier, addresses
- Edit customer profile
- Change customer role (customer/staff/admin)
- Activate/deactivate accounts

**API:** `/api/admin/clientes`, `/api/admin/clientes/[id]`

### Review Moderation (`/admin/resenas`)

- Moderation queue: pending reviews awaiting approval
- Approve, reject, or hide reviews
- Add admin reply to approved reviews
- Mark reviews as featured
- View review photos

**API:** `/api/admin/resenas`, `/api/admin/resenas/[id]`

### Promotions Management (`/admin/promociones`)

- Create/edit/delete promotions of all types:
  - `percentage` — percentage discount on cart total
  - `fixed_amount` — fixed currency discount
  - `free_shipping` — waives shipping cost
  - `buy_x_get_y` — buy X quantity, get Y free
  - `automatic_cart` — automatically applied to eligible carts
  - `coupon_code` — requires customer to enter a code
- Configure: start/end dates, usage limits, per-customer limits, minimum purchase, maximum discount
- Target by: country, product IDs, category IDs, customer tier
- View usage analytics: total_revenue_generated, total_discount_given

**API:** `/api/admin/promociones`, `/api/admin/promociones/[id]`

### Coupon Management (`/admin/cupones`)

- Separate from promotions — simpler discount codes
- Types: percentage or fixed amount
- Configure: usage limit, per-user limit, minimum order, expiry, country

### Analytics (`/admin/analiticas`)

- Sales analytics dashboard
- Revenue over time charts
- Order volume by status
- Top products by sales

**API:** `/api/admin/analiticas`

### Other Admin Sections

| Section | Route | Purpose |
|---|---|---|
| Inventory | `/admin/inventario` | Bulk inventory management, low-stock alerts |
| Categories | `/admin/categorias` | Product category CRUD |
| Blog | `/admin/blog` | Blog post management |
| Rewards | `/admin/recompensas` | Loyalty rewards catalog management |
| Announcements | `/admin/anuncios` | Announcement bar content management |
| Spin-to-Win | `/admin/marketing/spin-to-win` | Gamification wheel configuration |
| Settings | `/admin/configuracion` | App settings (WhatsApp number, etc.) |
| Setup | `/admin/setup` | First-admin setup (public, one-time use) |

---

## 10. Important Business Rules

Future developers must understand and preserve these rules:

### Multi-Country Rules

1. **Only CO and CR are supported.** The `is_allowed_country()` DB function enforces this. Registration, cart creation, and checkout all validate country code.
2. **Products are invisible in CR if `price_crc` is null.** The `isProductAvailableInCountry()` function in `src/lib/price/index.ts` enforces this. Never show a product in CR without a CRC price.
3. **Currency is country-specific:** CO uses COP (`$`), CR uses CRC (`₡`). All prices must be formatted with the correct symbol and locale.
4. **Payment methods differ by country:** CO supports Stripe + Nequi + PSE + Bancolombia. CR supports Stripe + SINPE Móvil.
5. **Tax rates are per-country** (stored in `countries.tax_rate`). Colombia: 19% IVA. Costa Rica: configured in DB.
6. **Free shipping thresholds:** CO: $350,000 COP. CR: ₡45,000 CRC.

### Inventory Rules

7. **Available stock = `quantity - reserved_quantity`.** Never show `quantity` directly to customers.
8. **Cart add validates available stock** before allowing the item. Error code `STOCK_INSUFICIENTE` is returned.
9. **Max 20 unique products per cart.** Enforced in `cart-service.ts`.
10. **`allow_backorder = true`** bypasses stock validation — use carefully.

### Pricing Rules

11. **Order items store a price snapshot** at time of purchase. Never recalculate order totals from current product prices.
12. **Coupon discounts are capped** by `maximum_discount` if set.
13. **Rewards discount is capped at 20% of subtotal.** This is a hard business rule in `checkout-service.ts`.
14. **Total sanity check:** If calculated total exceeds subtotal × 3 + 100,000, checkout throws an error (bug guard).

### Rewards Rules

15. **Points are awarded only when order status becomes `delivered`.** Never award points for pending, confirmed, or cancelled orders.
16. **Points are awarded exactly once per order.** The unique partial index on `reward_transactions(order_id)` WHERE type = `earned_purchase` prevents duplicates.
17. **Tier is based on `points_lifetime`**, not `points_balance`. Spending points does not lower your tier.
18. **Tier thresholds:** crew: 0, og: 500, legend: 2,000, icon: 5,000 lifetime points.

### Order Rules

19. **Customers can only cancel `pending` or `confirmed` orders.** Processing/shipped/delivered orders cannot be cancelled by customers.
20. **Order number format:** `SC-{COUNTRY}-{YYYYMMDD}-{RANDOM4}` (e.g., `SC-CO-20260804-A3F2`).
21. **Status history is append-only.** Every status change appends to `status_history` JSONB array — never overwrite.
22. **Notifications are generated on every status change.** The `STATUS_NOTIFICATION_TYPE` and `STATUS_NOTIFICATION_BODY` maps in `order-status.ts` define what notification is sent for each status.

### Review Rules

23. **Reviews default to `pending` status.** They are not visible to the public until an admin approves them.
24. **Only `approved` reviews are publicly visible** (RLS policy: `status = 'approved'`).
25. **Users can only edit/delete their own `pending` reviews.** Once submitted for moderation, they cannot be changed.

### Blog Rules

26. **Every article must have a unique cover image.** The `SLUG_IMAGE_MAP` in `blog-image-utils.ts` is the authoritative mapping. Never assign the same image to two articles.
27. **Blog images must be local** (`/assets/images/blog-*.png`), 1600×900px, no watermarks, no third-party branding.
28. **Scheduled publishing:** Articles with `published_at` in the future are not returned by the public API.

### Admin Rules

29. **First-admin setup is one-time only.** The `setup_first_admin()` DB function throws an exception if any admin already exists.
30. **Admin API routes use the service role client** (`createAdminClient()`), which bypasses RLS. This is intentional — admin operations need to read/write any user's data.
31. **`/admin/setup` and `/api/admin/diagnose` are publicly accessible** (whitelisted in middleware). Do not add sensitive operations to these routes.

### Authentication Rules

32. **Email confirmation is required before login.** Supabase Auth enforces this.
33. **Profile creation has a trigger + client-side fallback.** Both paths upsert on conflict — safe to run twice.
34. **The browser Supabase client uses a custom cookie/localStorage fallback.** This was built for iframe environments. On a standard deployment, test that auth cookies work correctly without the fallback.

---

## 11. Testing

### Existing Tests

All tests are in `src/__tests__/` and run with **Vitest** + **@testing-library/react**.

**Test files:**

| File | Type | Coverage |
|---|---|---|
| `unit/order-service.test.ts` | Unit | `servicioOrdenes`: obtenerOrden, listarOrdenesUsuario, cancelarOrden, actualizarEstadoOrden |
| `unit/order-repository.test.ts` | Unit | `repositorioOrdenes` database operations |
| `unit/order-status.test.ts` | Unit | Status constants, transitions, progress index, terminal status detection |
| `integration/order-workflow.test.ts` | Integration | Full order lifecycle: pending → confirmed → preparing → ready → driver_assigned → out_for_delivery → delivered. Verifies status history, notifications, WhatsApp messages at each step. |
| `ui/customer-order-detail.test.tsx` | UI | Customer order detail page rendering and interactions |
| `ui/admin-orders.test.tsx` | UI | Admin orders page rendering and interactions |
| `api/order-routes.test.ts` | API | Order API route handlers |
| `edge-cases/order-edge-cases.test.ts` | Edge cases | Cancellation of non-cancellable orders, duplicate reward prevention, invalid status transitions |
| `regression/existing-functionality.test.ts` | Regression | Guards against regressions in core order functionality |
| `helpers/test-utils.ts` | Utilities | Shared test helpers and mock factories |

### Testing Strategy

**Framework:** Vitest with jsdom environment  
**Component testing:** @testing-library/react  
**Mocking:** `vi.mock()` for Supabase clients, repositories, and external services  
**Test isolation:** Each test file mocks its dependencies independently

**Patterns used:**
- **Unit tests:** Mock all dependencies, test business logic in isolation. Use `vi.fn()` for repository methods.
- **Integration tests:** Use in-memory data structures to simulate the full workflow without a real database. Test that all side effects (notifications, WhatsApp messages, status history) are generated correctly.
- **UI tests:** Render components with `@testing-library/react`, mock API calls, verify DOM output.
- **Edge case tests:** Test boundary conditions: cancelling already-cancelled orders, awarding points twice for the same order, invalid status transitions.
- **Regression tests:** Verify that previously-fixed bugs do not reappear.

### Important Flows to Validate

When making changes, always validate these critical flows:

1. **Full checkout flow:** Add to cart → Apply coupon → Apply rewards → Checkout → Payment → Order confirmation → Points awarded on delivery
2. **Guest cart merge:** Add items as guest → Log in → Verify guest items merged into authenticated cart
3. **Order cancellation:** Customer cancels pending order → Status updated → Notification sent → Points NOT awarded
4. **Admin order status update:** Admin updates status → Customer sees real-time update via Supabase Realtime → Notification created
5. **Rewards points:** Order delivered → Points calculated correctly for CO and CR → Duplicate prevention works
6. **Blog image uniqueness:** Adding a new article → Image is unique → Validator passes
7. **Admin protection:** Unauthenticated user → Redirected to login. Non-admin user → Redirected to home with error.
8. **Multi-currency pricing:** CO customer sees COP prices. CR customer sees CRC prices. Products without `price_crc` are hidden in CR.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run a specific test file
npm run test -- src/__tests__/unit/order-service.test.ts

# Type checking (catches TypeScript errors)
npm run type-check
```

### Test Coverage Gaps

The following areas currently have **no test coverage** and should be prioritized:

- Cart service (add/remove/merge/validate)
- Checkout service (full flow)
- Payment service (Stripe integration)
- Rewards service (points calculation)
- Blog system
- Admin backoffice operations
- Authentication flows
- Product catalog filtering and search

---

*End of Street Candys Architecture Handbook — v1.0*
