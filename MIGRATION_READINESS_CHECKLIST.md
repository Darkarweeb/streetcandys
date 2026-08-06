# Street Candy's — Migration Readiness Checklist

> **Purpose:** Single-page checklist for migrating away from Rocket.new to independent hosting.
> **Production URL:** `https://streetcandys.shop`
> **GitHub:** `https://github.com/Darkarweeb/streetcandys`
>
> This checklist references existing documentation — do not duplicate content found there.
> Full details for each section are in the documents listed under each heading.

---

## 1. Environment Variables
> Reference: `ENVIRONMENT_SETUP_GUIDE.md` §5 · `STREET_CANDYS_MIGRATION_PLAN.md` §2.6

- [ ] Export all real values from Rocket's environment panel to a secure vault before leaving
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — carry over to new host
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — carry over to new host
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — carry over to new host (**secret — server-side only**)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://streetcandys.shop` ✅ already set — verify it carries over
- [ ] `RESEND_API_KEY` — carry over to new host (**required for all auth emails**)
- [ ] `STRIPE_SECRET_KEY` — carry over to new host (**secret**)
- [ ] `STRIPE_WEBHOOK_SECRET` — will change after updating Stripe webhook endpoint (see §8)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — carry over; switch from `pk_test_` to `pk_live_` for production
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` — carry over (optional)
- [ ] `NEXT_PUBLIC_ADSENSE_ID` — carry over (optional)
- [ ] AI keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`) — carry over if/when needed

---

## 2. Supabase Project Configuration
> Reference: `STREET_CANDYS_MIGRATION_PLAN.md` §2.7 · `DEPLOYMENT_GUIDE.md` → Supabase Redirect URL Configuration

- [ ] **Site URL** — set to `https://streetcandys.shop` in Supabase Dashboard → Authentication → URL Configuration
- [ ] **Redirect URLs** — confirm `https://streetcandys.shop/**` is in the allowed list
- [ ] **Redirect URLs** — add new hosting preview URL (e.g. `https://streetcandys-git-main.vercel.app/**`) for staging
- [ ] **Redirect URLs** — remove `https://streetcand8616.builtwithrocket.new/**` after migration is confirmed stable
- [ ] **Storage CORS** — verify `https://streetcandys.shop` is allowed in Storage → Policies
- [ ] Confirm you can access the Supabase dashboard independently of Rocket

---

## 3. Resend Configuration
> Reference: `DEPLOYMENT_GUIDE.md` → Resend Email Configuration · `STREET_CANDYS_ARCHITECTURE.md` §5 → Email Templates

- [ ] `streetcandys.shop` is verified as a sender domain in Resend Dashboard → Domains
- [ ] DNS records for Resend domain verification are present at your domain registrar (TXT + MX)
- [ ] `RESEND_API_KEY` is set in the new hosting platform
- [ ] `FROM_EMAIL` = `CREW@streetcandys.shop` ✅ already configured in `src/lib/email/client.ts` — no code change needed
- [ ] Send a test registration to confirm the Welcome + Verification email is delivered
- [ ] Send a test password reset to confirm the Recovery email is delivered

---

## 4. Database Migrations
> Reference: `STREET_CANDYS_OPERATIONS_GUIDE.md` §3 · `BACKUP_AND_RECOVERY_GUIDE.md` §2

- [ ] All migrations in `supabase/migrations/` have been applied to the production Supabase project
- [ ] Latest migration applied: `20260805900000_fix_handle_new_user_exception_handling.sql`
- [ ] Run `supabase db push` from a linked local CLI to confirm no pending migrations
- [ ] Verify schema in Supabase Dashboard → Table Editor (28 tables expected)
- [ ] Confirm RLS is enabled on all tables (no table should have RLS disabled)
- [ ] Take a manual database backup before migration: Supabase Dashboard → Project Settings → Database → Backups

---

## 5. Storage Buckets
> Reference: `STREET_CANDYS_OPERATIONS_GUIDE.md` §3 → Storage Management · `BACKUP_AND_RECOVERY_GUIDE.md` §4

- [ ] `product-images` bucket exists and is publicly readable
- [ ] `blog-images` bucket exists and is publicly readable
- [ ] Storage URLs use `*.supabase.co` — these are independent of Rocket and require no changes
- [ ] `image-hosts.config.mjs` includes `*.supabase.co` and `*.supabase.in` wildcard entries ✅ already present

---

## 6. Images / Assets
> Reference: `STREET_CANDYS_MIGRATION_PLAN.md` §3 → `image-hosts.config.mjs`

- [ ] All static assets are in `public/assets/` and committed to GitHub ✅
- [ ] Product images are in Supabase Storage — no migration needed ✅
- [ ] Blog cover images are in `public/assets/images/` and Supabase Storage ✅
- [ ] After migration: remove `img.rocket.new` from `image-hosts.config.mjs` if Rocket-hosted images are no longer used
- [ ] OG images (`og-image-streetcandys-premium.png`, etc.) are in `public/assets/images/` ✅

---

## 7. Domain / DNS
> Reference: `STREET_CANDYS_MIGRATION_PLAN.md` §2.5 · `DEPLOYMENT_GUIDE.md` → Domain Configuration

- [ ] `streetcandys.shop` is registered and you have access to the DNS settings
- [ ] New hosting platform is set up and a test build is passing before touching DNS
- [ ] Add `streetcandys.shop` as a custom domain in the new hosting platform
- [ ] Update DNS records at your domain registrar:
  - Vercel: A record `@` → `76.76.21.21` · CNAME `www` → `cname.vercel-dns.com`
  - Netlify: CNAME `www` → your Netlify subdomain · A record for apex
- [ ] SSL certificate provisioned automatically (Let's Encrypt) — verify padlock is active
- [ ] DNS propagation confirmed (up to 48 hours; typically 15–60 minutes)
- [ ] Resend domain verification DNS records (TXT + MX) are present alongside hosting DNS records

---

## 8. Deployment Steps
> Reference: `DEPLOYMENT_GUIDE.md` · `STREET_CANDYS_MIGRATION_PLAN.md` §6

Follow the phased migration order in `STREET_CANDYS_MIGRATION_PLAN.md` §6. Summary:

- [ ] **Phase 1 — Prepare:** Push all code to GitHub `main`; export env vars; run `npm run build` locally
- [ ] **Phase 2 — New host:** Import repo; add all env vars; trigger test build; verify staging URL loads
- [ ] **Phase 3 — External services:**
  - Update Supabase Auth Site URL + redirect URLs (see §2 above)
  - Create new Stripe webhook endpoint at `https://streetcandys.shop/api/pagos/webhook`; copy new `STRIPE_WEBHOOK_SECRET`
  - Test full auth cycle on staging URL
- [ ] **Phase 4 — DNS cutover:** Add custom domain; update DNS; wait for propagation; verify SSL
- [ ] **Phase 5 — Full validation:** (see §9 below)
- [ ] **Phase 6 — Cleanup:** Remove Rocket-specific code (see `STREET_CANDYS_MIGRATION_PLAN.md` §6, Phase 6)

---

## 9. Post-Deployment Verification
> Reference: `DEPLOYMENT_GUIDE.md` → Post-Deployment Verification

- [ ] Homepage loads at `https://streetcandys.shop` with valid SSL
- [ ] Products page loads data from Supabase
- [ ] **Auth — Registration:** New user registers → Welcome + Verification email received via Resend
- [ ] **Auth — Email verification:** Clicking `ACTIVAR MI CUENTA` link redirects to `/cuenta`
- [ ] **Auth — Login:** Login with verified account works; admin redirects to `/admin`
- [ ] **Auth — Password recovery:** Request reset → `RESTABLECER CONTRASEÑA` email received → new password set → redirect to login
- [ ] **Auth — New password:** `/nueva-contrasena` accepts `token_hash` from email link and updates password
- [ ] Admin panel accessible at `/admin` with admin credentials
- [ ] Stripe checkout flow works (test card `4242 4242 4242 4242`)
- [ ] Stripe webhook receives events (Stripe Dashboard → Webhooks → Recent deliveries)
- [ ] Rewards points awarded after order marked as delivered
- [ ] Google Analytics receives pageview events (GA4 Realtime report)
- [ ] WhatsApp button and checkout message work correctly
- [ ] Images load from Supabase Storage without errors

---

## 10. Rollback Plan
> Reference: `BACKUP_AND_RECOVERY_GUIDE.md` · `STREET_CANDYS_MIGRATION_PLAN.md` §5

**Trigger rollback if:** Critical auth flows fail, emails stop delivering, or data integrity issues are detected after DNS cutover.

- [ ] **Code rollback:** `git revert` or `git reset` to last known-good commit; push to `main` to trigger redeploy
- [ ] **DNS rollback:** Repoint DNS records back to Rocket.new (keep Rocket active until migration is confirmed stable for 1–2 weeks)
- [ ] **Supabase rollback:** Restore from a Supabase backup (Dashboard → Project Settings → Database → Backups); apply only if data was corrupted — schema rollbacks use the migration files in `supabase/migrations/`
- [ ] **Stripe rollback:** Stripe webhook endpoint can be toggled between active/disabled in the Stripe dashboard without deleting it
- [ ] **Zero-downtime rule:** Do not decommission Rocket until DNS has fully propagated and all post-deployment checks pass

---

*Last updated: August 2026. For full details on any section, refer to the linked documentation files.*
