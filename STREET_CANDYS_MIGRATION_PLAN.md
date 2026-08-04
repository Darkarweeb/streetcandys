# Street Candys — Migration Plan
### Moving Away from Rocket.new to Independent Hosting

**Document Version:** 1.0  
**Created:** 2026-08-04  
**Purpose:** Enable a future developer to fully migrate the Street Candys application away from the Rocket.new platform using this document alone.  
**Current Rocket URL:** `https://streetcand8616.builtwithrocket.new`  
**Production Domain:** `https://streetcandys.shop`  
**GitHub Repository:** `https://github.com/Darkarweeb/streetcandys`

---

## Table of Contents

1. [Current Rocket Dependencies](#1-current-rocket-dependencies)
2. [Migration Requirements](#2-migration-requirements)
3. [Files Requiring Review Before Migration](#3-files-requiring-review-before-migration)
4. [Deployment Independence Checklist](#4-deployment-independence-checklist)
5. [Known Migration Risks](#5-known-migration-risks)
6. [Recommended Migration Order](#6-recommended-migration-order)

---

## 1. Current Rocket Dependencies

### 1.1 Rocket-Specific Files

| File | Purpose | Migration Action |
|------|---------|-----------------|
| `next.config.mjs` | Contains `@dhiwise/component-tagger` webpack loader (Rocket dev tool) | Remove the `@dhiwise/component-tagger` webpack rule from the `webpack()` function |
| `image-hosts.config.mjs` | Includes `img.rocket.new` as an allowed image host | Remove the `img.rocket.new` entry after migration |
| `package.json` | Contains `@dhiwise/component-tagger` as a dependency and `rocketCritical` metadata block | Remove `@dhiwise/component-tagger` from `dependencies`; the `rocketCritical` block is documentation-only and can be removed |
| `.env` | `NEXT_PUBLIC_SITE_URL` is set to `https://streetcand8616.builtwithrocket.new` | Update to `https://streetcandys.shop` |

### 1.2 Rocket-Specific Dependencies

```json
// In package.json — dependencies
"@dhiwise/component-tagger": "^1.0.16"
```

This package is a **Rocket.new development tool** that tags React components for the visual editor. It is injected via a webpack loader in `next.config.mjs` and is **only active in `dev` mode**. It has no effect on production builds, but it is safe to remove entirely after migration.

### 1.3 Rocket-Specific Configuration in `next.config.mjs`

The following webpack block is Rocket-specific and should be removed after migration:

```js
// REMOVE THIS BLOCK after migration
if (dev) {
  config.module.rules.push({
    test: /\.(jsx|tsx)$/,
    exclude: [/node_modules/],
    use: [{
      loader: '@dhiwise/component-tagger/nextLoader',
    }],
  });
  const ignoredPaths = (process.env.WATCH_IGNORED_PATHS || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  config.watchOptions = {
    ignored: ignoredPaths.length
      ? ignoredPaths.map((p) => `**/${p.replace(/^\/+|\/+$/g, '')}/**`)
      : undefined,
  };
}
```

The `WATCH_IGNORED_PATHS` environment variable is also Rocket-specific and can be removed.

### 1.4 Rocket-Specific Environment Variables

| Variable | Current Value | Action |
|----------|--------------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://streetcand8616.builtwithrocket.new` | **Must update** to `https://streetcandys.shop` |
| `WATCH_IGNORED_PATHS` | Set by Rocket internally | Remove entirely |

### 1.5 Platform-Specific Behavior

- **Preview Panel:** Rocket provides a live preview panel. After migration, use `npm run dev` locally and visit `http://localhost:4028`.
- **Build Execution:** Rocket runs `next build` automatically on save. After migration, builds must be triggered manually or via CI/CD.
- **Environment Variables:** Rocket manages `.env` through its UI. After migration, environment variables must be managed in the hosting platform's dashboard (Vercel, Netlify, etc.) or via a local `.env` file.
- **Dev Port:** The project is configured to run on port `4028` (`next dev -p 4028`). This is a Rocket convention. After migration, you may change this to the standard `3000` in `package.json` scripts.

---

## 2. Migration Requirements

### 2.1 Moving Development to VS Code

1. **Clone the repository** from GitHub:
   ```bash
   git clone https://github.com/Darkarweeb/streetcandys.git
   cd streetcandys
   ```
2. **Install Node.js** — use Node.js v20 LTS (matches `@types/node ^20.0.0`).
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a local `.env` file** — copy `.env` from Rocket's environment panel or the repository and fill in all real values (see Section 3 for variable list).
5. **Start the development server:**
   ```bash
   npm run dev
   # App runs at http://localhost:4028
   ```
6. **Recommended VS Code Extensions:**
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - TypeScript and JavaScript Language Features (built-in)

### 2.2 Running Locally

- Dev server: `npm run dev` → `http://localhost:4028`
- Production build test: `npm run build && npm run serve`
- Type checking: `npm run type-check`
- Linting: `npm run lint`
- Tests: `npm test`

> **Note:** The `start` script in `package.json` currently runs `next dev -p 4028` (not `next start`). For a true production server locally, use `npm run serve` which maps to `next start`.

### 2.3 GitHub-Based Workflow

The repository already exists at `https://github.com/Darkarweeb/streetcandys`.

**Recommended branch strategy:**
```
main          → production-ready code
develop       → integration branch
feature/*     → individual features
hotfix/*      → urgent production fixes
```

**Recommended CI/CD setup (GitHub Actions):**
- On push to `main`: run `npm run build` and deploy to hosting
- On pull request: run `npm run lint`, `npm run type-check`, `npm test`

### 2.4 Hosting Migration

**Recommended hosting platforms (in order of preference):**

| Platform | Notes |
|----------|-------|
| **Vercel** | Best Next.js support, zero-config, free tier available, automatic deployments from GitHub |
| **Netlify** | `@netlify/plugin-nextjs` is already installed in `devDependencies` — Netlify is pre-configured |
| **Railway** | Good for full-stack apps with environment variable management |
| **Render** | Free tier available, supports Node.js |

**For Netlify (already configured):**
- `@netlify/plugin-nextjs` is already in `devDependencies`
- Connect the GitHub repository in Netlify dashboard
- Set build command: `npm run build`
- Set publish directory: `.next`
- Add all environment variables in Netlify's environment settings

**For Vercel:**
- Import the GitHub repository at `vercel.com/new`
- Vercel auto-detects Next.js — no configuration needed
- Add all environment variables in Vercel's project settings

### 2.5 Domain Configuration

The production domain `streetcandys.shop` is already live. After migrating hosting:

1. **In your new hosting platform:** Add `streetcandys.shop` as a custom domain.
2. **In your DNS provider:** Update the DNS records to point to the new host:
   - For Vercel: Add a CNAME record pointing to `cname.vercel-dns.com`
   - For Netlify: Add a CNAME record pointing to your Netlify subdomain
3. **SSL/TLS:** Both Vercel and Netlify provision SSL certificates automatically via Let's Encrypt.
4. **Propagation:** DNS changes can take up to 48 hours to propagate globally.

> **Important:** Do not remove the old hosting until DNS has fully propagated and the new host is confirmed working.

### 2.6 Environment Variable Migration

All environment variables must be transferred to the new hosting platform. See the complete list:

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase service role key — never expose publicly |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe publishable key |
| `STRIPE_SECRET_KEY` | **Secret** | Stripe secret key — never expose publicly |
| `STRIPE_WEBHOOK_SECRET` | **Secret** | Stripe webhook signing secret |
| `NEXT_PUBLIC_SITE_URL` | Public | **Must change** from Rocket URL to `https://streetcandys.shop` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public | Google Analytics measurement ID |
| `NEXT_PUBLIC_ADSENSE_ID` | Public | Google AdSense ID |
| `OPENAI_API_KEY` | **Secret** | OpenAI API key (if used) |
| `GEMINI_API_KEY` | **Secret** | Google Gemini API key (if used) |
| `ANTHROPIC_API_KEY` | **Secret** | Anthropic Claude API key (if used) |
| `PERPLEXITY_API_KEY` | **Secret** | Perplexity API key (if used) |

> **Security Rule:** Variables prefixed `NEXT_PUBLIC_` are exposed to the browser. All others are server-side only and must be kept secret.

### 2.7 Supabase Configuration

Supabase is hosted independently of Rocket — the database, auth, and storage are **not tied to Rocket** and will continue working after migration. However, the following must be updated:

1. **Auth Redirect URLs** — In the Supabase dashboard:
   - Go to: `Authentication → URL Configuration`
   - **Site URL:** Change from `https://streetcand8616.builtwithrocket.new` to `https://streetcandys.shop`
   - **Redirect URLs (allowed list):** Add `https://streetcandys.shop/auth/callback` and remove the Rocket URL
   - Also add your new hosting URL (e.g., `https://your-app.vercel.app/auth/callback`) for staging

2. **Storage CORS** — In the Supabase dashboard:
   - Go to: `Storage → Policies`
   - Verify CORS allows requests from `https://streetcandys.shop`

3. **Row Level Security (RLS):** All RLS policies are stored in the database and are platform-independent — no changes needed.

### 2.8 Authentication Redirects

The auth callback route is at `src/app/auth/callback/route.ts`. It uses `origin` from the incoming request URL, so it automatically adapts to whatever domain the app is running on. **No code changes are needed** — only the Supabase dashboard URL configuration (see 2.7).

Password reset emails and magic links generated by Supabase will use the **Site URL** configured in the Supabase dashboard. Update that URL first.

### 2.9 Storage Configuration

Supabase Storage is used for product images and blog cover images. Storage buckets are:
- Independent of Rocket
- Accessible via the Supabase dashboard at `https://supabase.com/dashboard`

After migration, update `image-hosts.config.mjs` to remove `img.rocket.new` if it is no longer needed. The `*.supabase.co` and `*.supabase.in` wildcard entries cover all Supabase Storage URLs and do not need to change.

---

## 3. Files Requiring Review Before Migration

### `next.config.mjs`
**Why review:** Contains two Rocket-specific sections that must be removed:
1. The `@dhiwise/component-tagger` webpack loader rule (inside the `if (dev)` block)
2. The `WATCH_IGNORED_PATHS` watchOptions configuration

Also contains the `distDir: process.env.DIST_DIR || '.next'` — the `DIST_DIR` env var is set by Rocket internally. After migration, this will safely fall back to `.next` (the default), so no change is required.

**Action:** Remove the `@dhiwise/component-tagger` loader block and `watchOptions` block from the `webpack()` function.

---

### `package.json`
**Why review:** Contains:
1. `@dhiwise/component-tagger` in `dependencies` — Rocket-specific, safe to remove
2. `@netlify/plugin-nextjs` in `devDependencies` — keep if deploying to Netlify, remove if using Vercel
3. The `rocketCritical` metadata block — documentation only, can be removed
4. `"start": "next dev -p 4028"` — this runs the dev server, not a production server. For production, use `npm run serve` (which maps to `next start`). Consider renaming for clarity.
5. Port `4028` in the `dev` script — change to `3000` if you prefer the standard Next.js port

**Action:** Remove `@dhiwise/component-tagger`, clean up the `rocketCritical` block, and review scripts.

---

### `capacitor.config.ts`
**Why review:** The `server.allowNavigation` array includes:
```ts
allowNavigation: [
  'streetcandys.shop',
  '*.streetcandys.shop',
  'streetcand8616.builtwithrocket.new',  // ← REMOVE after migration
],
```
The Rocket URL (`streetcand8616.builtwithrocket.new`) must be removed from `allowNavigation` after migration to prevent the mobile app from navigating to the old Rocket URL.

**Action:** Remove `streetcand8616.builtwithrocket.new` from `allowNavigation`.

---

### Supabase Client Configuration (`src/lib/supabase/client.ts`)
**Why review:** The client uses a custom cookie/localStorage hybrid storage strategy specifically designed to work inside Rocket's iframe environment (which blocks third-party cookies). The `canUseCookies()` function and the `SameSite=Lax` cookie strategy were implemented to work around Rocket's iframe restrictions.

After migration to a standard hosting environment (Vercel/Netlify), cookies will work normally. The custom storage logic can be simplified to standard `@supabase/ssr` cookie handling — though leaving it as-is will also work correctly.

**Action:** Optional simplification after migration. The current code is functional in all environments.

---

### Authentication Files (`src/contexts/AuthContext.tsx`, `src/middleware.ts`, `src/app/auth/callback/route.ts`)
**Why review:**
- `AuthContext.tsx` — Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No Rocket-specific code. No changes needed.
- `middleware.ts` — Reads `NEXT_PUBLIC_SUPABASE_URL` to extract the Supabase project ref for cookie naming. No Rocket-specific code. No changes needed.
- `auth/callback/route.ts` — Uses `origin` from the request URL dynamically. No hardcoded URLs. No changes needed.

**Action:** No code changes required. Only Supabase dashboard URL configuration needs updating (see Section 2.7).

---

### Deployment Configuration Files
**Why review:**

| File | Reason |
|------|--------|
| `.env` | `NEXT_PUBLIC_SITE_URL` must be updated from the Rocket URL to `https://streetcandys.shop` |
| `image-hosts.config.mjs` | Contains `img.rocket.new` — remove after migration if Rocket-hosted images are no longer used |
| `public/manifest.json` | Check `start_url` and `scope` — should point to `https://streetcandys.shop` |
| `capacitor.config.ts` | Remove Rocket URL from `allowNavigation` (see above) |

---

## 4. Deployment Independence Checklist

### Before Leaving Rocket

- [ ] **Backup repository** — Ensure all code is pushed to `https://github.com/Darkarweeb/streetcandys` and the latest commit is on `main`
- [ ] **Export all environment variables** — Copy all real values from Rocket's environment panel to a secure local file (password manager or encrypted vault)
- [ ] **Verify Supabase access** — Confirm you can log into `https://supabase.com/dashboard` and access the Street Candys project independently of Rocket
- [ ] **Test authentication** — Verify login, registration, password reset, and admin access work on the live `https://streetcandys.shop` domain
- [ ] **Test database migrations** — Confirm all Supabase migrations in `supabase/migrations/` have been applied and the schema is up to date
- [ ] **Test production build** — Run `npm run build` locally and confirm it completes without errors
- [ ] **Document Stripe webhook endpoint** — Note the current Stripe webhook URL so it can be updated after migration
- [ ] **Screenshot/export Supabase Auth URL configuration** — Record the current Site URL and redirect URLs from the Supabase dashboard

### After Migration

- [ ] **`npm install`** — Install all dependencies in the new environment
- [ ] **`npm run dev`** — Confirm the development server starts without errors at `http://localhost:4028` (or `3000`)
- [ ] **`npm run build`** — Confirm the production build completes without TypeScript or build errors
- [ ] **Set all environment variables** — Add every variable from the export to the new hosting platform's dashboard
- [ ] **Update `NEXT_PUBLIC_SITE_URL`** — Set to `https://streetcandys.shop` in the new hosting platform
- [ ] **Update Supabase Auth URLs** — Change Site URL and redirect URLs in the Supabase dashboard to `https://streetcandys.shop`
- [ ] **Update Stripe webhook URL** — In the Stripe dashboard, update the webhook endpoint to `https://streetcandys.shop/api/pagos/webhook`
- [ ] **Authentication testing** — Test full auth cycle: register → verify email → login → logout → password reset
- [ ] **Admin testing** — Log in as admin, verify access to `/admin`, test product/order management
- [ ] **Ecommerce flow testing** — Add product to cart → checkout → payment → order confirmation → order status update
- [ ] **Mobile app testing** — If using Capacitor, rebuild the native app pointing to the new hosting URL
- [ ] **Remove Rocket URL from Supabase** — Delete `https://streetcand8616.builtwithrocket.new` from Supabase Auth redirect URLs
- [ ] **DNS verification** — Confirm `streetcandys.shop` resolves to the new host and SSL certificate is valid
- [ ] **Remove Rocket-specific code** — Remove `@dhiwise/component-tagger` and related webpack config

---

## 5. Known Migration Risks

### 5.1 TypeScript Build Configuration

**Risk:** `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` and `eslint: { ignoreDuringBuilds: true }`. This means TypeScript errors are silently ignored during builds on Rocket.

**Impact:** After migration, if you enable strict TypeScript checking (`ignoreBuildErrors: false`), the build may fail due to pre-existing type errors that were previously hidden.

**Mitigation:** Run `npm run type-check` before migration to identify all existing TypeScript errors. Fix them before enabling strict mode, or keep `ignoreBuildErrors: true` initially and address errors incrementally.

---

### 5.2 Stripe Configuration

**Risk:** Stripe webhook verification requires the `STRIPE_WEBHOOK_SECRET` to match the endpoint URL registered in the Stripe dashboard. After changing hosting, the webhook URL changes.

**Impact:** Payment webhooks (`/api/pagos/webhook`) will fail silently if the webhook secret doesn't match the new endpoint.

**Mitigation:**
1. In the Stripe dashboard, create a new webhook endpoint pointing to `https://streetcandys.shop/api/pagos/webhook`
2. Copy the new webhook signing secret
3. Update `STRIPE_WEBHOOK_SECRET` in the new hosting platform's environment variables
4. Test with a Stripe test event before going live

---

### 5.3 Auth Redirect URLs

**Risk:** Supabase sends password reset and email confirmation links to the **Site URL** configured in the Supabase dashboard. If this is not updated, users will be redirected to the old Rocket URL after clicking email links.

**Impact:** Email-based auth flows (registration confirmation, password reset) will break or redirect to a dead URL.

**Mitigation:** Update the Supabase Auth Site URL and redirect URL allowlist **before** decommissioning the Rocket deployment. The auth callback route (`/auth/callback`) is already dynamic and requires no code changes.

---

### 5.4 Capacitor / Mobile App Configuration

**Risk:** `capacitor.config.ts` has `server.url: 'https://streetcandys.shop'` — the mobile app loads the production website. If the production site goes down during migration, the mobile app will also break.

**Impact:** iOS and Android apps will show a blank screen or error during any production downtime.

**Mitigation:**
1. Ensure zero-downtime migration (new host live before old host removed)
2. After migration, remove `streetcand8616.builtwithrocket.new` from `allowNavigation`
3. Rebuild and resubmit the native apps to the App Store / Play Store after any `capacitor.config.ts` changes

---

### 5.5 Third-Party Integrations

| Integration | Risk | Mitigation |
|-------------|------|-----------|
| **Google Analytics** | `NEXT_PUBLIC_GA_MEASUREMENT_ID` must be set in new host | Copy from Rocket env panel; verify GA is receiving events post-migration |
| **Google AdSense** | `NEXT_PUBLIC_ADSENSE_ID` must be set in new host | Copy from Rocket env panel; AdSense may require domain re-verification |
| **WhatsApp Support** | WhatsApp number is stored in Supabase `settings` table — no migration needed | Verify WhatsApp button works after migration |
| **Supabase Storage** | Image URLs use `*.supabase.co` — independent of Rocket | No action needed; images will continue to load |
| **Supabase Realtime** | Order status real-time updates use Supabase channels — independent of Rocket | No action needed |

---

### 5.6 Cookie / Session Behavior

**Risk:** The Supabase client (`src/lib/supabase/client.ts`) uses a custom cookie strategy with `SameSite=Lax` specifically designed to work inside Rocket's iframe environment. In a standard hosting environment, the default `@supabase/ssr` cookie behavior is sufficient.

**Impact:** Sessions should work correctly after migration. However, if users experience unexpected logouts after migration, the custom cookie logic may need to be simplified.

**Mitigation:** Monitor auth session behavior after migration. If issues arise, simplify `client.ts` to use the standard `@supabase/ssr` `createBrowserClient` with default cookie handling.

---

## 6. Recommended Migration Order

Follow this sequence to minimize risk and ensure continuity of service.

### Phase 1 — Preparation (Do Before Touching Anything)

1. **Verify GitHub repository is up to date**
   ```bash
   git status
   git push origin main
   ```
2. **Export all environment variables** from Rocket's environment panel to a secure location
3. **Run a local production build** to confirm the codebase is healthy:
   ```bash
   npm install
   npm run type-check
   npm run build
   ```
4. **Document current Supabase Auth URLs** — screenshot the Site URL and redirect URLs from the Supabase dashboard
5. **Document current Stripe webhook URL** — screenshot from the Stripe dashboard

---

### Phase 2 — Set Up New Hosting (Parallel, No Downtime)

6. **Create account on new hosting platform** (Vercel or Netlify recommended)
7. **Import the GitHub repository** into the new hosting platform
8. **Add all environment variables** to the new hosting platform — use the export from Step 2
9. **Update `NEXT_PUBLIC_SITE_URL`** to `https://streetcandys.shop` in the new platform
10. **Trigger a test build** on the new platform — confirm it succeeds
11. **Access the staging URL** provided by the new host (e.g., `https://streetcandys-git-main.vercel.app`) and verify the app loads

---

### Phase 3 — Update External Services

12. **Update Supabase Auth URLs:**
    - Site URL → `https://streetcandys.shop`
    - Add to redirect URLs: `https://streetcandys.shop/auth/callback`
    - Add staging URL to redirect URLs for testing
13. **Update Stripe webhook:**
    - Add new endpoint: `https://streetcandys.shop/api/pagos/webhook`
    - Copy the new webhook signing secret
    - Update `STRIPE_WEBHOOK_SECRET` in the new hosting platform
14. **Test authentication on staging URL:**
    - Register a new test account
    - Verify email confirmation link works
    - Test login and logout
    - Test password reset flow
    - Test admin login and access to `/admin`

---

### Phase 4 — DNS Cutover

15. **Add custom domain** `streetcandys.shop` to the new hosting platform
16. **Update DNS records** at your domain registrar to point to the new host
17. **Wait for DNS propagation** (up to 48 hours; typically 15–60 minutes)
18. **Verify SSL certificate** is active on the new host for `streetcandys.shop`
19. **Test the live domain** — confirm the app loads at `https://streetcandys.shop`

---

### Phase 5 — Full Validation

20. **Run the full ecommerce flow:**
    - Browse products → add to cart → checkout → Stripe payment (use test card) → order confirmation
21. **Test admin panel:**
    - Login as admin → manage products → manage orders → update order status
22. **Test email flows:**
    - Registration confirmation email
    - Password reset email
    - Order confirmation email (if configured)
23. **Verify Google Analytics** is receiving events (check GA Real-Time dashboard)
24. **Test on mobile** — open the Capacitor app and confirm it loads correctly

---

### Phase 6 — Cleanup (After Confirming Everything Works)

25. **Remove Rocket URL from Supabase** redirect URLs allowlist
26. **Remove Rocket-specific code** from the codebase:
    - Remove `@dhiwise/component-tagger` from `package.json`
    - Remove the component-tagger webpack loader block from `next.config.mjs`
    - Remove `img.rocket.new` from `image-hosts.config.mjs`
    - Remove `streetcand8616.builtwithrocket.new` from `capacitor.config.ts`
    - Update `NEXT_PUBLIC_SITE_URL` in `.env` (local development)
27. **Rebuild and resubmit mobile apps** if `capacitor.config.ts` was changed
28. **Archive or close the Rocket project** once you've confirmed the migration is stable for 1–2 weeks

---

## Appendix: Quick Reference — Key URLs and Identifiers

| Item | Value |
|------|-------|
| Production domain | `https://streetcandys.shop` |
| Rocket dev URL | `https://streetcand8616.builtwithrocket.new` |
| GitHub repository | `https://github.com/Darkarweeb/streetcandys` |
| Auth callback route | `/auth/callback` |
| Stripe webhook route | `/api/pagos/webhook` |
| Admin panel | `/admin` |
| Capacitor App ID | `shop.streetcandys.app` |
| Dev server port | `4028` |
| Node.js version | `20 LTS` |
| Next.js version | `15.5.18` |
| Supabase client library | `@supabase/supabase-js 2.111.0` |

---

*This document was generated on 2026-08-04 and reflects the state of the codebase at that time. Verify all file paths and configurations against the actual repository before executing any migration steps.*
