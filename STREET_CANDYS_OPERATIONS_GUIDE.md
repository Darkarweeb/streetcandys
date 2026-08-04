# Street Candys — Operations Handbook

> **Version:** 1.0
> **Date:** 2026-08-04
> **Purpose:** Permanent operational reference for running, maintaining, and troubleshooting the Street Candys application. This document covers day-to-day operations, environment configuration, content management, and recovery procedures.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Environment Configuration](#2-environment-configuration)
3. [Supabase Operations](#3-supabase-operations)
4. [Content Management](#4-content-management)
5. [Product Management](#5-product-management)
6. [Admin Operations](#6-admin-operations)
7. [Deployment Process](#7-deployment-process)
8. [Troubleshooting](#8-troubleshooting)
9. [Backup and Recovery](#9-backup-and-recovery)

---

## 1. Local Development Setup

### Required Software

| Software | Version | Purpose |
|---|---|---|
| **Node.js** | 18.x or 20.x LTS | JavaScript runtime |
| **npm** | 9.x+ (bundled with Node) | Package manager |
| **Git** | 2.x+ | Version control |
| **Supabase CLI** | Latest | Database migrations and local dev |
| **VS Code** (recommended) | Latest | Code editor |

> **Node Version Note:** The project is tested on Node 18 LTS and Node 20 LTS. Node 22+ has not been validated. Use `nvm` (Node Version Manager) to switch versions if needed.

### Installation Process

```bash
# 1. Clone the repository
git clone https://github.com/Darkarweeb/streetcandys.git
cd streetcandys

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Then fill in the required values (see Section 2)

# 4. Install Supabase CLI (if not already installed)
npm install -g supabase

# 5. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server locally (requires build first) |
| `npm run lint` | Run ESLint to check code quality |

### Build Commands

```bash
# Production build
npm run build

# Start production server locally (for testing the build)
npm run start
```

A successful build outputs to `.next/`. The build will fail if there are TypeScript errors or ESLint violations.

### Testing Commands

| Command | Description |
|---|---|
| `npx vitest` | Run all tests once |
| `npx vitest --watch` | Run tests in watch mode (re-runs on file changes) |
| `npx vitest --reporter=verbose` | Run tests with detailed output |
| `npx vitest run src/__tests__/unit/` | Run only unit tests |
| `npx vitest run src/__tests__/integration/` | Run only integration tests |

> **Test Configuration:** Tests are configured in `vitest.config.ts`. The test setup file is `src/__tests__/setup.ts`. Supabase calls are mocked in tests — no live database connection is required to run the test suite.

---

## 2. Environment Configuration

### All Environment Variables

The `.env` file at the project root contains all configuration. Below is a complete reference.

---

#### Supabase (Database & Auth)

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** | The URL of your Supabase project. Used by the browser client and server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** | The anonymous (public) API key for Supabase. Safe to expose — Row Level Security (RLS) enforces data access. |
| `SUPABASE_SERVICE_ROLE_KEY` | **🔒 Private** | The service role key. Bypasses RLS entirely. Used only in server-side API routes and admin operations. **Never expose to the browser.** |

---

#### Stripe (Payments)

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Public** | Stripe publishable key. Used in the browser to initialize Stripe.js and render the payment form. |
| `STRIPE_SECRET_KEY` | **🔒 Private** | Stripe secret key. Used server-side to create payment intents and process charges. **Never expose to the browser.** |
| `STRIPE_WEBHOOK_SECRET` | **🔒 Private** | Webhook signing secret. Used to verify that incoming webhook events genuinely come from Stripe. |

---

#### AI Providers (Optional — for future features)

| Variable | Visibility | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | **🔒 Private** | OpenAI API key. Not currently active in production. |
| `GEMINI_API_KEY` | **🔒 Private** | Google Gemini API key. Not currently active in production. |
| `ANTHROPIC_API_KEY` | **🔒 Private** | Anthropic Claude API key. Not currently active in production. |
| `PERPLEXITY_API_KEY` | **🔒 Private** | Perplexity API key. Not currently active in production. |

---

#### Analytics & Advertising

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | **Public** | Google Analytics 4 Measurement ID (format: `G-XXXXXXXXXX`). Used by the `GoogleAnalytics` component in the root layout. |
| `NEXT_PUBLIC_ADSENSE_ID` | **Public** | Google AdSense publisher ID. Used for ad monetization if enabled. |

---

#### Site Configuration

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Public** | The canonical base URL of the site. Used for generating absolute URLs in SEO metadata, sitemaps, and OAuth redirect callbacks. Set to the production URL in production. |

---

### Public vs. Private Summary

**Public variables** (`NEXT_PUBLIC_*`) are embedded in the browser JavaScript bundle at build time. They are visible to anyone who inspects the page source. This is intentional and safe for the variables listed above.

**Private variables** (no `NEXT_PUBLIC_` prefix) are only available in the Node.js server runtime. They are never sent to the browser. These must be kept secret.

### Security Recommendations

1. **Never commit `.env` to Git.** Confirm `.env` is listed in `.gitignore`. Run `git ls-files .env` — if it returns output, the file is tracked and must be removed with `git rm --cached .env`.

2. **Rotate the `SUPABASE_SERVICE_ROLE_KEY` immediately** if it is ever accidentally exposed in a public repository, log file, or error message.

3. **Rotate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`** immediately if exposed. Stripe provides instant key rotation in the dashboard.

4. **Use separate Supabase projects** for development and production. Never point a local development environment at the production database.

5. **Set `NEXT_PUBLIC_SITE_URL`** to the correct production URL before deploying. An incorrect value will break OAuth callbacks and sitemap generation.

6. **Do not log environment variables** in API routes or server actions, even during debugging.

---

## 3. Supabase Operations

### Database Migrations Workflow

The project uses Supabase's migration system. All schema changes are tracked as numbered SQL files in `supabase/migrations/`. Migrations are applied in chronological order based on their filename timestamp prefix.

**Migration file naming convention:**
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

**Example:**
```
supabase/migrations/20260804060000_admin_product_management.sql
```

### How to Apply Migrations

#### Against the Hosted Supabase Project (Production/Staging)

```bash
# Link your local CLI to the Supabase project (one-time setup)
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations to the linked project
supabase db push
```

> **`YOUR_PROJECT_REF`** is the alphanumeric ID found in your Supabase project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

#### Creating a New Migration

```bash
# Create a new empty migration file with the correct timestamp
supabase migration new description_of_change

# This creates: supabase/migrations/YYYYMMDDHHMMSS_description_of_change.sql
# Edit the file to add your SQL, then push it
supabase db push
```

#### Applying Migrations Manually via Supabase Dashboard

1. Open the Supabase Dashboard → **SQL Editor**
2. Paste the contents of the migration file
3. Click **Run**
4. Verify the changes in **Table Editor** or **Database → Tables**

### How to Review Schema Changes

Before applying a migration to production:

1. **Read the SQL file** — every migration in `supabase/migrations/` is plain SQL and human-readable.
2. **Check for destructive operations** — look for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE` statements. These are irreversible.
3. **Check RLS policies** — new tables should always have RLS enabled and appropriate policies. Look for `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements.
4. **Test on a staging project first** — apply the migration to a non-production Supabase project before running it in production.

### Storage Management

The project uses Supabase Storage for product images and blog cover images.

**Storage buckets used:**
- `product-images` — Product photos uploaded via the admin panel
- `blog-images` — Blog article cover images

**Managing storage via the Supabase Dashboard:**
1. Go to **Storage** in the Supabase Dashboard
2. Select the bucket
3. Upload, delete, or organize files using the file browser

**Managing storage via the Admin Panel:**
- Product images: Admin → Products → Edit Product → Image section
- Blog images: Blog cover images are managed through the blog article editor

**Storage RLS:** Storage buckets have policies that allow public read access for product and blog images, but restrict write/delete operations to authenticated admin users.

### Backup Considerations

- **Supabase Pro plan** includes automated daily backups with point-in-time recovery (PITR).
- **Free plan** does not include automated backups — manual exports are required.
- To export the database manually: Supabase Dashboard → **Database** → **Backups** → **Download**.
- All schema changes are version-controlled in `supabase/migrations/` — the schema can always be reconstructed by replaying migrations on a fresh Supabase project.
- **Data** (products, orders, customers) is not in migrations and must be backed up separately via database export.

---

## 4. Content Management

### How to Add Blog Articles

Blog articles are stored in the `blog_articles` table in Supabase. They can be managed through:

1. **Admin Panel** → `/admin/blog` — the primary interface for creating and editing articles.
2. **Direct database insert** via the Supabase Dashboard SQL Editor (for bulk operations).

**Required fields for a new article:**
- `title` — Article title (Spanish)
- `slug` — URL-friendly identifier (e.g., `guia-principiantes-cannabis`). Must be unique.
- `content` — Full article body (HTML or Markdown depending on editor configuration)
- `excerpt` — Short summary shown in article cards and meta descriptions
- `cover_image` — URL to the cover image (see Image Management below)
- `category_id` — Foreign key to `blog_categories`
- `status` — `draft` (not visible) or `published` (visible on the blog)
- `published_at` — Timestamp for when the article should go live (supports scheduled publishing)

**Scheduled publishing:** Set `status = 'scheduled'` and `published_at` to a future timestamp. The system will automatically publish the article at the specified time.

### How to Manage Blog Categories

Blog categories are stored in the `blog_categories` table.

**To add a new category:**
1. Admin Panel → Blog → Categories section, or
2. Insert directly into `blog_categories` with `name` and `slug` fields.

**Category slugs** are used in URLs: `/blog/categoria/[slug]`. Changing a slug after articles are published will break existing links.

### How to Manage Images

**Blog cover images:**
- Images are stored in `public/assets/images/` in the repository for static images.
- Dynamic images uploaded through the admin are stored in Supabase Storage (`blog-images` bucket).
- The `cover_image` field in `blog_articles` stores either a relative path (`/assets/images/filename.png`) or a Supabase Storage URL.

**Product images:**
- Uploaded through Admin → Products → Edit Product.
- Stored in the `product-images` Supabase Storage bucket.
- Multiple images per product are supported; the first image is used as the primary display image.

**Image optimization:**
- All images are served through Next.js `<Image>` component (via `AppImage`) which automatically optimizes, resizes, and serves images in WebP format.
- Allowed external image domains are configured in `image-hosts.config.mjs`.

### How Featured Images Are Validated

Blog cover images go through a validation process defined in `src/lib/blog/blog-image-utils.ts`:

1. **Uniqueness check** — Each article must have a unique cover image. The system prevents two articles from sharing the same cover image URL (enforced by migration `20260804170000_blog_unique_cover_images.sql`).
2. **Existence check** — The system verifies the image URL is accessible before saving.
3. **Format validation** — Only standard image formats (PNG, JPG, WebP) are accepted.

If an article is saved without a valid cover image, the system falls back to a default placeholder image (`/assets/images/no_image.png`).

---

## 5. Product Management

### Creating Products

Products are managed through **Admin Panel → `/admin/productos`**.

**To create a new product:**
1. Click **New Product**
2. Fill in all required fields (see below)
3. Add at least one product image
4. Set the product status to `active` to make it visible in the store
5. Save

**Required product fields:**
- `name` — Product name
- `slug` — URL identifier (auto-generated from name, must be unique)
- `description` — Full product description
- `category_id` — Product category
- `status` — `active`, `inactive`, or `draft`
- `country_pricing` — Price per country (COP for Colombia, CRC for Costa Rica, USD optional)

### Categories

Product categories are managed through **Admin → `/admin/categorias`**.

- Categories have a `name`, `slug`, and optional `description` and `image`.
- Products belong to exactly one category.
- Category slugs are used in URLs and filters — do not change slugs after products are published.

### Variants

Products can have multiple variants (e.g., different weights, sizes, or flavors).

**To add variants:**
1. Edit a product → Variants section
2. Add variant with `name`, `sku`, `price_modifier`, and `stock` fields
3. Each variant has its own inventory count

**Variant pricing:** Variant prices are calculated as `base_price + price_modifier`. A negative modifier creates a discount variant.

### Inventory Updates

Inventory is managed at the variant level.

**To update stock:**
1. Admin → Inventory (`/admin/inventario`) — bulk inventory view
2. Or: Admin → Products → Edit Product → Variants → update stock per variant

**Inventory rules:**
- When stock reaches 0, the variant is automatically marked as out of stock and cannot be added to cart.
- Low stock threshold can be configured per product for admin alerts.
- Inventory is decremented automatically when an order is confirmed (payment received).
- Inventory is restored if an order is cancelled or refunded.

### Product Images

- Each product supports multiple images.
- Images are uploaded via the admin panel and stored in Supabase Storage (`product-images` bucket).
- The first image in the list is used as the primary product image in catalog listings.
- Images can be reordered by dragging in the admin interface.
- To delete an image: Edit Product → Images → click the delete icon on the image.

### Cannabinoid and Terpene Information

Products can include detailed cannabinoid and terpene profiles stored as structured data in the product record.

**Cannabinoid fields** (stored in `cannabinoid_profile` JSON column):
- `thc` — THC percentage
- `cbd` — CBD percentage
- `cbg`, `cbn`, `cbc` — Minor cannabinoid percentages
- `total_cannabinoids` — Total cannabinoid percentage

**Terpene fields** (stored in `terpene_profile` JSON column):
- Array of terpene objects with `name` and `percentage`
- Common terpenes: Myrcene, Limonene, Caryophyllene, Linalool, Pinene

These values are displayed on the product detail page and are used for educational content. They do not affect pricing or inventory logic.

---

## 6. Admin Operations

### Order Management

**Location:** Admin → Pedidos (`/admin/pedidos`)

**Order statuses and transitions:**

| Status | Meaning | Next Actions |
|---|---|---|
| `pending` | Order placed, payment not confirmed | Confirm payment or cancel |
| `confirmed` | Payment received | Mark as processing |
| `processing` | Being prepared | Mark as shipped |
| `shipped` | Dispatched to carrier | Mark as delivered |
| `delivered` | Received by customer | Complete or handle return |
| `cancelled` | Cancelled before shipment | Issue refund if paid |
| `refunded` | Refund issued | Terminal state |

**To update an order status:**
1. Admin → Pedidos → click the order
2. Use the status dropdown to advance the order
3. The customer receives an automatic notification on status change (if notifications are enabled)

**To process a refund:**
1. Admin → Pedidos → click the order → Refund section
2. Enter the refund amount (partial or full)
3. The refund is processed through Stripe (for card payments) or marked as manual (for cash/transfer payments)

### Customer Management

**Location:** Admin → Usuarios (`/admin/usuarios`)

**Available operations:**
- View customer list with order history and total spend
- Search customers by name, email, or phone
- View individual customer profile: orders, addresses, loyalty points, reviews
- Manually adjust loyalty points (for corrections or promotions)
- Deactivate a customer account (blocks login without deleting data)

### Reviews Moderation

**Location:** Admin → Reseñas (`/admin/resenas`)

**Review workflow:**
1. Customer submits a review after receiving an order
2. Review enters `pending` status — not visible on the product page
3. Admin reviews the submission in the moderation queue
4. Admin approves (status → `approved`, becomes visible) or rejects (status → `rejected`, not visible)
5. Approved reviews contribute to the product's average rating

**Moderation rules:**
- Only customers who have purchased the product can submit reviews (verified purchase)
- One review per customer per product
- Reviews cannot be edited after approval — only deleted

### Promotions

**Location:** Admin → Promociones (`/admin/promociones`)

**Promotion types:**
- **Percentage discount** — e.g., 20% off
- **Fixed amount discount** — e.g., $5,000 COP off
- **Free shipping** — waives shipping cost
- **Buy X get Y** — quantity-based promotions

**Promotion configuration:**
- `code` — Coupon code (optional; if blank, promotion applies automatically)
- `discount_type` — `percentage` or `fixed`
- `discount_value` — Amount or percentage
- `min_order_amount` — Minimum cart value to qualify
- `max_uses` — Total redemption limit (null = unlimited)
- `max_uses_per_customer` — Per-customer limit
- `starts_at` / `ends_at` — Active date range
- `applicable_products` / `applicable_categories` — Scope (null = store-wide)

### Rewards Management

**Location:** Admin → Recompensas (`/admin/recompensas`)

**Loyalty tiers:**

| Tier | Points Required | Benefits |
|---|---|---|
| Bronze | 0–499 | Base earn rate |
| Silver | 500–1,499 | 1.25x earn rate |
| Gold | 1,500–2,999 | 1.5x earn rate |
| Platinum | 3,000+ | 2x earn rate |

**Points earn rules:**
- Points are awarded when an order reaches `delivered` status
- Default earn rate: 1 point per 1,000 COP spent (configurable)
- Bonus points can be awarded manually by admins for special occasions

**Points redemption:**
- Customers redeem points at checkout for a discount
- Default redemption rate: 100 points = 1,000 COP discount (configurable)
- Minimum redemption: 100 points

**Admin operations:**
- View all customer point balances
- Manually add or deduct points with a reason note
- View full transaction history per customer
- Configure earn/redemption rates in Admin → Configuración

---

## 7. Deployment Process

The current deployment flow is managed through the **Rocket.new platform** (builtwithrocket.new). The platform handles the build and hosting pipeline automatically.

### Current Deployment Flow

1. **Code changes** are made through the Rocket.new interface or pushed to the connected GitHub repository (`Darkarweeb/streetcandys`).
2. **Automatic build** — Rocket triggers a Next.js production build (`npm run build`) on every push to the main branch.
3. **Deployment** — If the build succeeds, the new version is deployed to the live URL.
4. **Live URLs:**
   - Platform URL: `https://streetcand8616.builtwithrocket.new`
   - Published URL: `https://streetcandys.shop`

### Database Migrations on Deployment

Database migrations are **not** applied automatically during deployment. They must be applied manually:

1. Write the migration SQL file in `supabase/migrations/`
2. Apply it to the production Supabase project via `supabase db push` or the Supabase Dashboard SQL Editor
3. Deploy the application code after the migration is applied (never before, to avoid schema mismatches)

### Pre-Deployment Checklist

- [ ] All environment variables are set correctly in the deployment environment
- [ ] Any new database migrations have been applied to the production Supabase project
- [ ] `npm run build` passes locally without errors
- [ ] `npx vitest run` passes without failures
- [ ] `NEXT_PUBLIC_SITE_URL` is set to the production URL

---

## 8. Troubleshooting

### Common Issues

#### Application shows a blank white screen or "Application Error"

**Cause:** Usually a JavaScript bundle error or a failed API call during initial render.

**Steps:**
1. Open browser DevTools → Console tab — look for red error messages
2. Check for `ChunkLoadError` or `originalFactory.call` errors — these indicate stale cached JS bundles
3. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
4. Clear browser cache and reload
5. If the issue persists in production, check the deployment logs in Rocket.new

---

### Authentication Problems

#### Users cannot log in / "Invalid credentials" error

1. Verify the user exists in Supabase → Authentication → Users
2. Check that the user's email is confirmed (Supabase sends a confirmation email on registration)
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct in the environment
4. Check Supabase → Authentication → Logs for detailed error messages

#### OAuth redirect fails after login

1. Verify `NEXT_PUBLIC_SITE_URL` matches the actual site URL exactly (no trailing slash)
2. In Supabase Dashboard → Authentication → URL Configuration, confirm the redirect URL is in the allowed list
3. The auth callback route is at `/auth/callback` — verify this route exists and is not blocked by middleware

#### Admin users cannot access the admin panel

1. Verify the user has `role = 'admin'` or `role = 'super_admin'` in the `profiles` table
2. Check the middleware in `src/middleware.ts` — it protects `/admin/*` routes
3. Use Admin → Setup (`/admin/setup`) to diagnose and repair admin role assignments
4. The admin recovery API is at `/api/admin/recover` for emergency access restoration

---

### Database Issues

#### "relation does not exist" error

**Cause:** A migration has not been applied to the database.

**Fix:**
1. Check which migration introduced the missing table/column
2. Apply the migration: `supabase db push` or paste the SQL into the Supabase SQL Editor
3. Verify the table exists in Supabase → Table Editor

#### RLS policy blocking a legitimate operation

**Cause:** A Row Level Security policy is too restrictive.

**Diagnosis:**
1. Go to Supabase Dashboard → Database → Policies
2. Find the table and review the policies
3. Use the Supabase SQL Editor to test the query with `SET ROLE authenticated;` to simulate a logged-in user

**Fix:** Add or modify the RLS policy in a new migration file. Never disable RLS entirely on a table.

#### Supabase connection errors in production

1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
2. Check Supabase project status at `https://supabase.com/dashboard`
3. Verify the Supabase project is not paused (free tier projects pause after 1 week of inactivity)
4. Check API rate limits in Supabase → Settings → API

---

### Build Issues

#### `npm run build` fails with TypeScript errors

1. Run `npx tsc --noEmit` to see all TypeScript errors
2. Fix the reported type errors — do not use `@ts-ignore` unless absolutely necessary
3. Common causes: missing type imports, incorrect prop types, undefined variables

#### `npm run build` fails with ESLint errors

1. Run `npm run lint` to see all ESLint violations
2. Fix the reported issues
3. Common causes: unused variables, missing dependencies in `useEffect`, incorrect React patterns

#### Build fails with "Module not found" error

1. Verify the import path is correct (case-sensitive on Linux)
2. Run `npm install` to ensure all dependencies are installed
3. Check `tsconfig.json` path aliases — `@/*` maps to `src/*`

---

### Testing Issues

#### Tests fail with "Cannot find module" errors

1. Run `npm install` to ensure test dependencies are installed
2. Check `vitest.config.ts` for path alias configuration
3. Verify the import path in the failing test file

#### Tests fail with Supabase connection errors

Tests should not connect to a real Supabase instance. If they do:
1. Check `src/__tests__/setup.ts` — Supabase should be mocked here
2. Verify the test file imports from `src/__tests__/helpers/test-utils.ts` for mock utilities
3. Ensure no test is importing the real Supabase client without mocking it

#### Specific test suite is consistently failing

1. Run the failing test in isolation: `npx vitest run path/to/test.ts`
2. Add `--reporter=verbose` for detailed output
3. Check if the test depends on database state — integration tests may need mock data setup

---

## 9. Backup and Recovery

### GitHub Backup Strategy

The primary code backup is the GitHub repository at `https://github.com/Darkarweeb/streetcandys`.

**What is backed up in GitHub:**
- All application source code (`src/`)
- All database migration files (`supabase/migrations/`) — the complete schema history
- Configuration files (`next.config.mjs`, `tailwind.config.js`, `tsconfig.json`, etc.)
- Static assets (`public/assets/`)
- Mobile scripts and documentation (`scripts/`, `mobile/`)
- Documentation files (`*.md`)

**What is NOT in GitHub (by design):**
- `.env` file — contains secrets, must never be committed
- `node_modules/` — regenerated with `npm install`
- `.next/` — regenerated with `npm run build`
- Uploaded product/blog images in Supabase Storage — these are in the database, not the repo

**Backup frequency:** Every code change pushed to the `main` branch is automatically backed up. For critical changes, create a tagged release:

```bash
git tag -a v1.0.0 -m "Release 1.0.0 - initial production"
git push origin v1.0.0
```

### Database Backup Recommendations

**Schema backup (always current):**
The `supabase/migrations/` folder in GitHub is the authoritative schema backup. A fresh Supabase project can be fully reconstructed by running all migrations in order.

**Data backup (requires manual action):**

| Method | Frequency | How |
|---|---|---|
| Supabase Dashboard Export | Weekly minimum | Dashboard → Database → Backups → Download |
| Supabase PITR (Pro plan) | Continuous | Automatic — configure retention period in project settings |
| pg_dump via Supabase connection string | On-demand | `pg_dump "postgresql://..."` using the connection string from Supabase → Settings → Database |

**Critical tables to prioritize in backups:**
- `orders` and `order_items` — transaction records
- `profiles` — customer accounts
- `products` and `product_variants` — catalog
- `loyalty_transactions` — points history
- `blog_articles` — content

### Recovery Considerations

#### Recovering from a bad database migration

1. **If the migration has not been applied to production:** Delete or fix the migration file before pushing.
2. **If the migration was applied and is reversible:** Write a new "rollback" migration that undoes the changes (e.g., `DROP COLUMN` to undo an `ADD COLUMN`).
3. **If data was lost:** Restore from the most recent Supabase backup (Dashboard → Database → Backups).

#### Recovering the application from scratch

If the Rocket.new environment is lost, the application can be reconstructed:

1. Clone the repository: `git clone https://github.com/Darkarweeb/streetcandys.git`
2. Create a new Supabase project
3. Apply all migrations: `supabase link --project-ref NEW_REF && supabase db push`
4. Restore data from the most recent database backup
5. Configure environment variables with the new Supabase project credentials
6. Deploy to a new hosting environment with `npm run build && npm run start`

#### Recovering uploaded images

Images uploaded to Supabase Storage are not in the GitHub repository. To recover them:
1. Restore from a Supabase backup (Pro plan includes storage backups)
2. Or re-upload images manually through the admin panel

#### Emergency admin access recovery

If all admin accounts are locked out:
1. Use the Supabase Dashboard SQL Editor to directly update the `profiles` table:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
   ```
2. Or use the admin recovery API endpoint: `POST /api/admin/recover` (requires `SUPABASE_SERVICE_ROLE_KEY`)

---

*This document should be updated whenever significant operational changes are made to the Street Candys application.*
