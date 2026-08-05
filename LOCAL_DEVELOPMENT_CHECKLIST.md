# STREET CANDYS — Local Development Checklist

> Use this checklist when setting up the project from a fresh clone in a local VS Code environment.
> Complete each section in order — later sections depend on earlier ones.
> **Last updated**: Reflects Resend integration, hardened RLS (migration `20260804200000`), and all codebase changes as of August 2026.

---

## ✅ SECTION 1 — Fresh Clone Setup

### Prerequisites

- [ ] Node.js 18.x LTS or 20.x LTS installed (`node -v`)
- [ ] npm 9.x or higher installed (`npm -v`)
- [ ] Git installed (`git --version`)
- [ ] VS Code installed with recommended extensions:
  - ESLint (`dbaeumer.vscode-eslint`)
  - Prettier (`esbenp.prettier-vscode`)
  - Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
  - TypeScript and JavaScript Language Features (built-in)

### Clone and install

- [ ] Clone the repository:
  ```bash
  git clone https://github.com/Darkarweeb/streetcandys.git
  cd streetcandys
  ```
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Confirm no install errors in the terminal output
- [ ] Confirm `node_modules/` directory was created

### Create local environment file

- [ ] Copy the template and create `.env.local`:
  ```bash
  touch .env.local
  ```
- [ ] Open `.env.local` and add all required variables (see `ENVIRONMENT_SETUP_GUIDE.md`)
- [ ] Confirm `.env.local` is listed in `.gitignore` (it should be — never commit it)

---

## ✅ SECTION 2 — Supabase Connection Setup

### Locate your Supabase credentials

- [ ] Log in to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Open your **Street Candys** project
- [ ] Navigate to **Project Settings → API**
- [ ] Copy the following values into `.env.local`:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` — Project URL (e.g. `https://xxxx.supabase.co`)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` / `public` key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (**keep secret** — required for rewards writes and admin operations)

### Configure Auth URL settings

- [ ] In Supabase Dashboard → **Authentication → URL Configuration**:
  - [ ] Set **Site URL** to `http://localhost:4028` for local development
  - [ ] Add `http://localhost:4028/**` to **Redirect URLs**
  - [ ] Add `https://streetcandys.shop/**` to **Redirect URLs** (for production)
  - [ ] Add `https://streetcand8616.builtwithrocket.new/**` to **Redirect URLs** (for Rocket preview)

### Set `NEXT_PUBLIC_SITE_URL` for local development

- [ ] In `.env.local`, set:
  ```dotenv
  NEXT_PUBLIC_SITE_URL=http://localhost:4028
  ```
  > ⚠️ This controls where auth email links (verification, password reset) redirect to.
  > Using the wrong URL here means email links will redirect to the wrong domain.
  > After email confirmation, users are redirected to `/cuenta` (not `/`).

### Verify connection

- [ ] Start the dev server: `npm run dev`
- [ ] Open `http://localhost:4028`
- [ ] Navigate to `/iniciar-sesion` — the login form should load without errors
- [ ] Open browser DevTools → Console — confirm no Supabase connection errors

---

## ✅ SECTION 3 — Database Migration Execution

### Understanding the migration files

The project uses Supabase migrations located in `supabase/migrations/`.
Migrations are numbered by timestamp and must be applied in order.

Current migration files (apply in this order):
```
20260802235150_street_candy_schema.sql          ← Base schema
20260803000000_auth_rls_policies.sql
20260803001000_cart_rls_policies.sql
20260803020000_whatsapp_support_setting.sql
20260803020001_whatsapp_support_full_config.sql
20260803100000_add_price_crc_to_products.sql
20260803200000_spin_leads.sql
20260803300000_spin_to_win_settings.sql
20260803400000_order_status_tracking.sql
20260803500000_order_notifications_complete.sql
20260803600000_addresses_rls_policies.sql
20260803700000_rewards_program_backend.sql
20260803800000_wishlist_rls_policies.sql
20260803900000_blog_scheduled_publishing.sql
20260803950000_blog_cannabis_articles_batch1.sql
20260803960000_blog_cannabis_articles_batch2.sql
20260804000000_blog_translate_to_spanish.sql
20260804010000_strip_jsonld_from_article_content.sql
20260804020000_final_blog_content_cleanup.sql
20260804030000_blog_translate_remaining_articles.sql
20260804040000_blog_spanish_educational_articles.sql
20260804050000_admin_setup_system.sql
20260804060000_admin_product_management.sql
20260804070000_admin_operations_center.sql
20260804080000_promotions_system.sql
20260804090000_reviews_system.sql
20260804100000_loyalty_dashboard.sql
20260804110000_notification_center.sql
20260804120000_confirm_super_admin_email.sql
20260804130000_confirm_super_admin_backoffice.sql
20260804140000_fix_super_admin_complete.sql
20260804150000_fix_admin_rls_and_policies.sql
20260804160000_fix_blog_cover_images.sql
20260804170000_blog_unique_cover_images.sql
20260804180000_email_confirmation_template.sql
20260804190000_spin_leads_verification.sql
20260804200000_harden_reward_transactions_rls.sql  ← Security hardening (latest)
```

> ⚠️ **Critical**: Migration `20260804200000_harden_reward_transactions_rls.sql` is required.
> Without it, any authenticated user can directly INSERT/UPDATE their own rewards balance
> from the browser, bypassing server-side business logic.

### Option A — Apply via Supabase Dashboard (recommended for first-time setup)

- [ ] In Supabase Dashboard → **SQL Editor**
- [ ] Open each migration file from `supabase/migrations/` in timestamp order
- [ ] Paste the SQL content and click **Run**
- [ ] Confirm each migration runs without errors before proceeding to the next

### Option B — Apply via Supabase CLI

- [ ] Install Supabase CLI:
  ```bash
  npm install -g supabase
  ```
- [ ] Log in:
  ```bash
  supabase login
  ```
- [ ] Link to your project (replace `YOUR_PROJECT_REF` with your project reference):
  ```bash
  supabase link --project-ref YOUR_PROJECT_REF
  ```
- [ ] Push all migrations:
  ```bash
  supabase db push
  ```
- [ ] Confirm output shows all migrations applied successfully

### Verify database

- [ ] In Supabase Dashboard → **Table Editor** — confirm these tables exist:
  - `profiles`, `products`, `categories`, `orders`, `order_items`
  - `cart_items`, `addresses`, `reviews`, `blog_posts`, `blog_categories`
  - `promotions`, `coupons`, `rewards`, `reward_transactions`, `notifications`
  - `spin_leads`, `spin_to_win_settings`, `whatsapp_settings`
- [ ] Confirm RLS is **enabled** on `rewards` and `reward_transactions` tables
- [ ] Confirm INSERT/UPDATE policies on `rewards` and `reward_transactions` are restricted to service role only (from migration `20260804200000`)

---

## ✅ SECTION 4 — Storage Setup

### Create required storage buckets

- [ ] In Supabase Dashboard → **Storage**
- [ ] Create the following buckets (if they don't already exist):

  | Bucket Name | Public | Description |
  |---|---|---|
  | `product-images` | ✅ Yes | Product photos |
  | `blog-images` | ✅ Yes | Blog post cover images |
  | `avatars` | ✅ Yes | User profile avatars |

- [ ] For each public bucket, confirm **Public bucket** is toggled ON

### Configure storage RLS policies

- [ ] In Supabase Dashboard → **Storage → Policies**
- [ ] For `product-images`:
  - [ ] Allow public SELECT (read) for all users
  - [ ] Allow INSERT/UPDATE/DELETE only for authenticated users with `admin` or `staff` role
- [ ] For `blog-images`:
  - [ ] Allow public SELECT for all users
  - [ ] Allow INSERT/UPDATE/DELETE only for admin/staff
- [ ] For `avatars`:
  - [ ] Allow public SELECT for all users
  - [ ] Allow authenticated users to INSERT/UPDATE their own avatar

### Verify image loading

- [ ] Start the dev server and navigate to the products page
- [ ] Confirm product images load from `*.supabase.co` storage URLs
- [ ] Check browser DevTools → Network tab for any 403/404 image errors

---

## ✅ SECTION 5 — Auth Configuration

### Email templates (optional but recommended)

- [ ] In Supabase Dashboard → **Authentication → Email Templates**
- [ ] Review and customise the following templates in Spanish:
  - **Confirm signup** — sent when a new user registers
  - **Reset password** — sent when a user requests a password reset
  - **Magic Link** — if magic link login is enabled
- [ ] Ensure all template links use `{{ .SiteURL }}` (not a hardcoded URL)

### Resend email setup

The application uses **Resend** for all transactional emails (welcome, order status, rewards).

- [ ] Create a Resend account at [https://resend.com](https://resend.com)
- [ ] Generate an API key in Resend Dashboard → API Keys
- [ ] Add `RESEND_API_KEY=re_...` to `.env.local`
- [ ] **For production**: Verify your custom domain (`streetcandys.shop`) in Resend Dashboard → Domains
- [ ] **For production**: Update `FROM_EMAIL` in `src/lib/email/client.ts` from `onboarding@resend.dev` to `noreply@streetcandys.shop` (or similar verified address)

> ⚠️ Without a real `RESEND_API_KEY`, all emails fail silently. Customers will not receive
> welcome emails, order confirmations, or rewards notifications. The app continues to work
> but no emails are sent.

### Admin user setup

- [ ] Navigate to `http://localhost:4028/admin/setup` in your browser
- [ ] Follow the on-screen setup wizard to create the first super admin account
- [ ] Alternatively, use the Supabase Dashboard → **Authentication → Users** to manually
  set a user's `role` to `admin` in the `profiles` table

### Verify auth flow

- [ ] Register a new test account at `/registro`
- [ ] Confirm verification email is received (check spam folder)
- [ ] Click the verification link — confirm it redirects to `http://localhost:4028/cuenta` (not `/`)
- [ ] Log in at `/iniciar-sesion` — confirm redirect to homepage or `/cuenta`
- [ ] Log in with admin credentials — confirm redirect to `/admin`
- [ ] Test password reset flow at `/recuperar-contrasena`
- [ ] Log out — confirm session is cleared and redirect to homepage

### Protected route verification

- [ ] Visit `/cuenta` without being logged in — should redirect to `/iniciar-sesion`
- [ ] Visit `/admin` without being logged in — should redirect to `/iniciar-sesion`
- [ ] Visit `/admin` logged in as a regular user — should redirect to `/` with `?error=forbidden`

---

## ✅ SECTION 6 — Testing Checklist

### Run automated tests

- [ ] Run the full test suite:
  ```bash
  npm run test
  ```
- [ ] Confirm all tests pass (or note any pre-existing failures)
- [ ] Run with coverage:
  ```bash
  npm run test:coverage
  ```

### TypeScript check

- [ ] Run type checking:
  ```bash
  npm run type-check
  ```
  > ⚠️ Note: `next.config.mjs` currently has `typescript.ignoreBuildErrors: true`.
  > `npm run type-check` runs `tsc --noEmit` directly and will surface real type errors.
  > Some errors may exist in the codebase — document them but do not block on them
  > unless they affect the feature you are working on.

### Lint check

- [ ] Run ESLint:
  ```bash
  npm run lint
  ```
  > Note: `eslint.ignoreDuringBuilds: true` means lint errors don't block `npm run build`.
  > Warnings about `any` types and `console.log` calls are expected.

### Manual smoke test

- [ ] Homepage (`/`) loads without errors
- [ ] Products page (`/productos`) loads and displays products from Supabase
- [ ] Product detail page (`/productos/[slug]`) loads correctly
- [ ] Cart drawer opens and items can be added
- [ ] Coupon code can be applied in the cart drawer (discount appears correctly)
- [ ] WhatsApp checkout button generates correct message with discount applied
- [ ] Checkout page (`/checkout`) loads and shows correct totals with coupon discount
- [ ] Blog page (`/blog`) loads and displays articles
- [ ] Spin-to-win modal works (verified emails receive coupon, unverified get pending state)
- [ ] Admin dashboard (`/admin`) accessible with admin credentials
- [ ] Admin products page (`/admin/productos`) loads product list
- [ ] Customer account (`/cuenta`) accessible after login
- [ ] Rewards page (`/cuenta/recompensas`) shows correct points balance and tier
- [ ] Order history (`/cuenta/pedidos`) shows only the logged-in user's orders

### Build verification

- [ ] Run a production build locally:
  ```bash
  npm run build
  ```
- [ ] Confirm build completes without fatal errors
- [ ] Start production server and verify:
  ```bash
  npm run start
  # → http://localhost:3000
  ```

---

## ✅ SECTION 7 — Common Issues & Solutions

| Issue | Cause | Solution |
|---|---|---|
| `npm install` fails with registry error | `@dhiwise/component-tagger` unavailable outside Rocket | Remove the package from `package.json` and its loader from `next.config.mjs` |
| Auth email links redirect to Rocket URL | `NEXT_PUBLIC_SITE_URL` still set to Rocket domain | Update to `http://localhost:4028` in `.env.local` |
| Email verification redirects to `/` instead of `/cuenta` | Old auth callback code | Confirm `auth/callback/route.ts` defaults `next` to `/cuenta` |
| No emails delivered (welcome, order, rewards) | `RESEND_API_KEY` is placeholder | Add real Resend API key to `.env.local` |
| Emails only reach Resend account owner | `FROM_EMAIL` uses `onboarding@resend.dev` sandbox | Verify custom domain in Resend and update `FROM_EMAIL` in `src/lib/email/client.ts` |
| Images not loading (403 error) | Storage bucket RLS policies not configured | Set bucket to public or add correct RLS policies |
| `/admin` redirects to homepage | User's `role` in `profiles` table is not `admin` or `staff` | Update role in Supabase Dashboard → Table Editor → `profiles` |
| Stripe checkout fails | Stripe keys are placeholders | Add real Stripe test keys to `.env.local` |
| Rewards points not awarded after delivery | `SUPABASE_SERVICE_ROLE_KEY` missing or rewards RLS migration not applied | Verify service role key and apply migration `20260804200000` |
| Coupon discount shows as 0 in WhatsApp message | Old CartDrawer code | Confirm `CartDrawer.tsx` reads `data.datos?.resumen?.descuento_cupon ?? cupon?.descuento_calculado ?? 0` |
| `npm run type-check` shows many errors | `ignoreBuildErrors: true` was hiding them | Fix TypeScript errors progressively; they don't block `npm run build` |
| Dev server crashes on start | `@dhiwise/component-tagger` webpack loader missing | See first row above |
