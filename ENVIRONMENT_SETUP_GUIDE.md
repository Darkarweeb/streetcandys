# STREET CANDYS — Environment Setup Guide

> **Framework**: Next.js 15 · **Language**: TypeScript 5 · **Runtime**: Node.js
> **Last updated**: Reflects Resend email integration, hardened RLS policies (migration `20260804200000`), and all codebase changes as of August 2026.

---

## 1. Required Node Version

| Requirement | Value |
|---|---|
| Minimum Node.js | **18.x LTS** |
| Recommended Node.js | **20.x LTS** |
| npm | **9.x or higher** (bundled with Node 20) |

### Check your current version

```bash
node -v   # should be v18.x or v20.x
npm -v    # should be 9.x or higher
```

### Install Node.js (if needed)

**Option A — nvm (recommended):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install and use Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

**Option B — Official installer:**
Download from https://nodejs.org/en/download (choose "LTS" version)

---

## 2. npm Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Darkarweeb/streetcandys.git
cd streetcandys

# 2. Install all dependencies
npm install

# 3. Verify installation
npm list --depth=0
```

> **Note**: The project includes `@dhiwise/component-tagger` which is a Rocket platform package.
> If you are migrating away from the Rocket platform, this package must be removed from
> `package.json` and its webpack loader removed from `next.config.mjs` before `npm install`
> will succeed in a standalone environment.

---

## 3. Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port **4028** |
| `npm run build` | Create optimised production build |
| `npm run start` | Start production server (requires `npm run build` first) |
| `npm run serve` | Alias for `npm run start` |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run format` | Format source files with Prettier |
| `npm run type-check` | Run TypeScript compiler check without emitting files |
| `npm run test` | Run all Vitest unit/integration tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Open Vitest UI in browser |

### Development server

```bash
npm run dev
# → http://localhost:4028
```

### Production build

```bash
npm run build
npm run start
# → http://localhost:3000
```

---

## 4. Production Build Commands

```bash
# Full production deployment sequence
npm ci                # clean install (preferred over npm install in CI)
npm run build         # compile and optimise
npm run start         # serve on port 3000
```

> `npm ci` is preferred in CI/CD pipelines because it uses `package-lock.json` exactly
> and fails if the lockfile is out of sync with `package.json`.

---

## 5. Required Environment Variables

Create a `.env.local` file in the project root (see Section 6 for instructions).

### 5.1 Public Variables (exposed to the browser — prefix `NEXT_PUBLIC_`)

These values are embedded in the client-side JavaScript bundle and are visible to end users.

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe to expose) | ✅ Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used for auth email redirects | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side Stripe.js | ✅ Yes (payments) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 Measurement ID (e.g. `G-XXXXXXXXXX`) | ⚠️ Optional |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense publisher ID (e.g. `ca-pub-XXXXXXXXXX`) | ⚠️ Optional |

### 5.2 Private Variables (server-side only — never exposed to the browser)

These values are only available in Next.js API routes, Server Components, and middleware.
They are **never** included in the client bundle.

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — bypasses RLS. **Keep secret.** Used by `createAdminClient()` for rewards writes and admin operations. | ✅ Yes |
| `RESEND_API_KEY` | Resend API key for transactional email delivery (welcome, order status, rewards). Get from [resend.com/api-keys](https://resend.com/api-keys). | ✅ Yes (email) |
| `STRIPE_SECRET_KEY` | Stripe secret key for server-side payment operations | ✅ Yes (payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `/api/pagos/webhook` | ✅ Yes (payments) |
| `OPENAI_API_KEY` | OpenAI API key | ⚠️ Optional |
| `GEMINI_API_KEY` | Google Gemini API key | ⚠️ Optional |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | ⚠️ Optional |
| `PERPLEXITY_API_KEY` | Perplexity AI API key | ⚠️ Optional |

### 5.3 Email Variables — Important Notes

The email system uses **Resend** (`src/lib/email/client.ts`). All authentication emails are sent via the Supabase Admin API `generateLink` method — Supabase's built-in email delivery is bypassed entirely.

| Item | Current Value | Status |
|---|---|---|
| `RESEND_API_KEY` | Real value set | ✅ Configured — must remain set |
| `FROM_EMAIL` (hardcoded) | `CREW@streetcandys.shop` | ✅ Already configured — no code change needed |

> ⚠️ **Critical**: `RESEND_API_KEY` must remain set to a real value. Without it, **no transactional emails will be delivered** — welcome/verification emails and password recovery emails all fail silently.

> ⚠️ **Domain verification**: The `streetcandys.shop` sender domain must be verified in the Resend Dashboard → Domains. If the domain is not verified, emails will be rejected or bounced.

### 5.4 Build-time Variables (optional)

| Variable | Description | Default |
|---|---|---|
| `DIST_DIR` | Custom Next.js build output directory | `.next` |

---

## 6. Creating a Local `.env.local` File

Next.js loads environment variables from `.env.local` automatically in development.
This file is **gitignored** and should never be committed to version control.

```bash
# Create the file
touch .env.local
```

Paste the following template into `.env.local` and fill in your actual values:

```dotenv
# ─── Supabase ────────────────────────────────────────────────────────────────
# Find these in: Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Site URL ────────────────────────────────────────────────────────────────
# IMPORTANT: Must match the domain configured in Supabase Auth → URL Configuration
# Use https://streetcandys.shop for production
# Use http://localhost:4028 for local development
NEXT_PUBLIC_SITE_URL=http://localhost:4028

# ─── Resend (Transactional Email) ────────────────────────────────────────────
# Get your API key from: https://resend.com/api-keys
# Required for: welcome emails, order status emails, rewards notifications
# Without this, all emails fail silently — no errors shown to customers
RESEND_API_KEY=re_...

# ─── Stripe ──────────────────────────────────────────────────────────────────
# Find these in: Stripe Dashboard → Developers → API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
# Find this in: Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Analytics (optional) ────────────────────────────────────────────────────
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX

# ─── AI APIs (optional — only needed if AI features are used) ─────────────────
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
```

### Variable loading priority (Next.js)

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` — base defaults (committed to git, no secrets)
2. `.env.local` — local overrides (gitignored, your actual secrets)
3. `.env.development` / `.env.production` — environment-specific defaults
4. `.env.development.local` / `.env.production.local` — environment-specific local overrides

> **Rule**: Always put real secret values in `.env.local` or `.env.production.local`.
> Never commit files containing real API keys to version control.

---

## 7. Verifying Your Setup

After creating `.env.local` and running `npm install`:

```bash
# 1. Type-check the project
npm run type-check

# 2. Start development server
npm run dev

# 3. Open browser
# http://localhost:4028

# 4. Run tests
npm run test
```

If the development server starts without errors and the homepage loads, your environment is correctly configured.

---

## 8. Post-Migration Security Notes

Migration `20260804200000_harden_reward_transactions_rls.sql` (applied August 2026) hardened
the RLS policies on `reward_transactions` and `rewards` tables:

- **Direct browser INSERT/UPDATE on `rewards` and `reward_transactions` is now blocked** for all
  regular authenticated users.
- All rewards writes go through `src/lib/rewards/rewards-service.ts` which uses
  `createAdminClient()` (service role key) server-side.
- This means `SUPABASE_SERVICE_ROLE_KEY` is **required** for the rewards system to function.
  If this variable is missing, reward points will not be awarded after order delivery.
