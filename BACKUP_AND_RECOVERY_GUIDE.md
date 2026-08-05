# STREET CANDYS — Backup & Recovery Guide

> This document covers backup procedures for all critical components of the Street Candys
> application: source code (GitHub), database (Supabase), storage assets, and configuration.
> **Last updated**: Reflects all 37 migrations through `20260804200000_harden_reward_transactions_rls.sql` as of August 2026.

---

## 1. GitHub Backup Process

### Repository location

- **Repository**: [https://github.com/Darkarweeb/streetcandys](https://github.com/Darkarweeb/streetcandys)
- **Primary branch**: `main`

### Keeping your local copy up to date

```bash
# Pull latest changes from GitHub
cd streetcandys
git pull origin main

# Verify you are on the correct branch
git branch
git log --oneline -10
```

### Creating a backup branch before major changes

```bash
# Create a timestamped backup branch
git checkout -b backup/$(date +%Y%m%d-%H%M%S)
git push origin backup/$(date +%Y%m%d-%H%M%S)

# Return to main
git checkout main
```

### Tagging stable releases

```bash
# Create an annotated tag for a stable version
git tag -a v1.0.0 -m "Production release 1.0.0 - $(date +%Y-%m-%d)"
git push origin v1.0.0

# List all tags
git tag -l
```

### Downloading a full repository archive

If you need a complete offline backup of the code:

```bash
# Download as a zip archive (no git history)
# GitHub → Code → Download ZIP

# Or clone with full history to a backup location
git clone --mirror https://github.com/Darkarweeb/streetcandys.git streetcandys-mirror.git
```

### What is NOT in the repository (must be backed up separately)

| Item | Location | Backup Method |
|---|---|---|
| Environment variables / secrets | `.env.local` (gitignored) | Store in a password manager or secrets vault |
| Supabase database data | Supabase cloud | See Section 2 |
| Uploaded product images | Supabase Storage | See Section 4 |
| Stripe configuration | Stripe Dashboard | Screenshot or export webhook settings |
| Resend API key | Resend Dashboard | Store in password manager |
| Resend verified domain DNS records | Domain registrar | Document DNS record values |

---

## 2. Supabase Database Backup

### 2.1 Automatic backups (Supabase managed)

Supabase automatically backs up your database based on your plan:

| Plan | Backup Frequency | Retention |
|---|---|---|
| Free | Daily | 7 days |
| Pro | Daily | 7 days |
| Team | Daily | 14 days |
| Enterprise | Custom | Custom |

To access automatic backups:
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your Street Candys project
3. Navigate to **Project Settings → Database → Backups**
4. Click **Download** next to any backup point

### 2.2 Manual database export (pg_dump)

For on-demand backups or before running migrations:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Log in
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Export the full database schema + data
supabase db dump --file backup-$(date +%Y%m%d-%H%M%S).sql

# Export schema only (no data)
supabase db dump --schema-only --file schema-$(date +%Y%m%d-%H%M%S).sql

# Export data only (no schema)
supabase db dump --data-only --file data-$(date +%Y%m%d-%H%M%S).sql
```

Alternatively, using `pg_dump` directly with your Supabase connection string:

```bash
# Find your connection string in:
# Supabase Dashboard → Project Settings → Database → Connection string → URI

pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --no-owner \
  --no-acl \
  --file backup-$(date +%Y%m%d-%H%M%S).sql
```

### 2.3 Recommended backup schedule

| Frequency | Method | Retention |
|---|---|---|
| Before every migration | Manual `supabase db dump` | Keep indefinitely |
| Weekly | Manual export or Supabase Dashboard download | 4 weeks |
| Before major deployments | Manual `supabase db dump` | Keep indefinitely |

### 2.4 Storing database backups

- Store `.sql` backup files in a secure location outside the repository
- Options: encrypted cloud storage (S3, Google Drive with encryption), local encrypted drive
- **Never commit database dumps to the GitHub repository** — they may contain PII

---

## 3. Migration Restoration

### Understanding the migration system

The project uses sequential SQL migrations in `supabase/migrations/`.
Each file is prefixed with a timestamp and must be applied in order.
The current migration state is tracked by Supabase in the `supabase_migrations` schema.

**Current migration count**: 37 files
**Base migration**: `20260802235150_street_candy_schema.sql`
**Latest migration**: `20260804200000_harden_reward_transactions_rls.sql`

### Complete migration inventory

```
supabase/migrations/
├── 20260802235150_street_candy_schema.sql              ← Base schema
├── 20260803000000_auth_rls_policies.sql
├── 20260803001000_cart_rls_policies.sql
├── 20260803020000_whatsapp_support_setting.sql
├── 20260803020001_whatsapp_support_full_config.sql
├── 20260803100000_add_price_crc_to_products.sql
├── 20260803200000_spin_leads.sql
├── 20260803300000_spin_to_win_settings.sql
├── 20260803400000_order_status_tracking.sql
├── 20260803500000_order_notifications_complete.sql
├── 20260803600000_addresses_rls_policies.sql
├── 20260803700000_rewards_program_backend.sql
├── 20260803800000_wishlist_rls_policies.sql
├── 20260803900000_blog_scheduled_publishing.sql
├── 20260803950000_blog_cannabis_articles_batch1.sql
├── 20260803960000_blog_cannabis_articles_batch2.sql
├── 20260804000000_blog_translate_to_spanish.sql
├── 20260804010000_strip_jsonld_from_article_content.sql
├── 20260804020000_final_blog_content_cleanup.sql
├── 20260804030000_blog_translate_remaining_articles.sql
├── 20260804040000_blog_spanish_educational_articles.sql
├── 20260804050000_admin_setup_system.sql
├── 20260804060000_admin_product_management.sql
├── 20260804070000_admin_operations_center.sql
├── 20260804080000_promotions_system.sql
├── 20260804090000_reviews_system.sql
├── 20260804100000_loyalty_dashboard.sql
├── 20260804110000_notification_center.sql
├── 20260804120000_confirm_super_admin_email.sql
├── 20260804130000_confirm_super_admin_backoffice.sql
├── 20260804140000_fix_super_admin_complete.sql
├── 20260804150000_fix_admin_rls_and_policies.sql
├── 20260804160000_fix_blog_cover_images.sql
├── 20260804170000_blog_unique_cover_images.sql
├── 20260804180000_email_confirmation_template.sql
├── 20260804190000_spin_leads_verification.sql
└── 20260804200000_harden_reward_transactions_rls.sql   ← Latest (security hardening)
```

> ⚠️ **Critical**: Migration `20260804200000_harden_reward_transactions_rls.sql` must be
> applied. It restricts direct browser INSERT/UPDATE on `rewards` and `reward_transactions`
> to service role only. Without it, authenticated users can manipulate their own points balance.

### Restoring from a SQL dump

If you need to restore the database to a previous state:

```bash
# 1. Connect to your Supabase database
# (use the connection string from Supabase Dashboard → Settings → Database)

# 2. Restore from a dump file
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  < backup-YYYYMMDD-HHMMSS.sql
```

> ⚠️ **Warning**: Restoring a full dump will overwrite all existing data.
> Always take a fresh backup before restoring.

### Re-applying migrations to a fresh database

If you are setting up a new Supabase project from scratch:

```bash
# Option A — Supabase CLI (recommended)
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase db push

# Option B — Manual via SQL Editor
# Apply each file in supabase/migrations/ in timestamp order
# using the Supabase Dashboard → SQL Editor
```

### Rolling back a specific migration

Supabase does not support automatic rollbacks. To undo a migration:

1. Identify what the migration changed (open the `.sql` file)
2. Write a reverse SQL script manually (e.g., `DROP TABLE` for a `CREATE TABLE` migration)
3. Apply the reverse script via the SQL Editor or `supabase db execute`
4. Remove or rename the original migration file to prevent it from being re-applied

> ⚠️ **Special note for `20260804200000_harden_reward_transactions_rls.sql`**: Rolling back
> this migration removes the security hardening on rewards tables. Only do this if you are
> replacing it with equivalent protection.

---

## 4. Asset Restoration

### 4.1 Static assets (in repository)

These assets are stored in the GitHub repository and are restored automatically with `git clone`:

```
public/
├── favicon.ico
├── manifest.json
├── assets/
│   ├── streetcandys-logo-dark.svg
│   ├── streetcandys-logo-light.svg
│   └── images/
│       ├── hero-banner-streetcandys.png
│       ├── og-image-streetcandys.png
│       ├── og-image-streetcandys-premium.png
│       ├── og-image-streetcandys-spanish.png
│       ├── og-image-streetcandys-new.png
│       ├── app-icon-streetcandys.png
│       ├── splash-screen-streetcandys.png
│       ├── no_image.png
│       └── blog-*.png  (all blog cover images — 20+ files)
```

To restore: `git clone https://github.com/Darkarweeb/streetcandys.git`

### 4.2 Supabase Storage assets (product images, user uploads)

These are stored in Supabase Storage buckets and are **not** in the GitHub repository.

#### Downloading all storage assets

```bash
# Install Supabase CLI
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# List all buckets
supabase storage ls

# Download all files from each bucket
supabase storage cp --recursive ss://product-images ./backup/product-images/
supabase storage cp --recursive ss://blog-images ./backup/blog-images/
supabase storage cp --recursive ss://avatars ./backup/avatars/
```

#### Restoring storage assets to a new project

```bash
# Link to the new project
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Upload files back
supabase storage cp --recursive ./backup/product-images/ ss://product-images/
supabase storage cp --recursive ./backup/blog-images/ ss://blog-images/
supabase storage cp --recursive ./backup/avatars/ ss://avatars/
```

#### Recommended storage backup schedule

| Frequency | Method |
|---|---|
| Weekly | `supabase storage cp --recursive` to local or cloud storage |
| Before major migrations | Full bucket download |
| After bulk product uploads | Incremental backup of new files |

---

## 5. Emergency Recovery Steps

Use this section if the application is down or data has been lost.

### Scenario A — Application is down (code issue)

```bash
# 1. Check the deployment logs
# Vercel: Dashboard → Deployments → click failed deployment → View logs
# Netlify: Dashboard → Deploys → click failed deploy → Deploy log
# VPS: pm2 logs streetcandys

# 2. Roll back to the last working deployment
# Vercel: Dashboard → Deployments → find last successful → ⋯ → Redeploy
# Netlify: Dashboard → Deploys → find last successful → Publish deploy
# VPS:
git log --oneline -10
git checkout <last-working-commit-hash>
npm ci && npm run build && pm2 restart streetcandys

# 3. If the issue is a bad migration, restore from the pre-migration database backup
# (see Section 3 — Restoring from a SQL dump)
```

### Scenario B — Database data loss

```bash
# 1. Stop the application immediately to prevent further writes
# Vercel/Netlify: pause deployments or set maintenance mode
# VPS: pm2 stop streetcandys

# 2. Assess the damage
# - Log in to Supabase Dashboard → Table Editor
# - Identify which tables are affected

# 3. Restore from the most recent backup
# Option A — Supabase automatic backup (last 7 days):
#   Supabase Dashboard → Settings → Database → Backups → Download → Restore

# Option B — Manual dump restore:
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  < backup-YYYYMMDD-HHMMSS.sql

# 4. Verify data integrity after restore
# Check key tables: products, orders, profiles, blog_posts, rewards, reward_transactions

# 5. Re-apply the hardened RLS migration if it was lost in the restore
# Apply: supabase/migrations/20260804200000_harden_reward_transactions_rls.sql

# 6. Restart the application
# VPS: pm2 start streetcandys
```

### Scenario C — Supabase project deleted or inaccessible

```bash
# 1. Create a new Supabase project at https://supabase.com/dashboard

# 2. Note the new project reference and credentials

# 3. Apply all 37 migrations to the new project
supabase link --project-ref NEW_PROJECT_REF
supabase db push

# 4. Restore data from the most recent SQL dump
psql "postgresql://postgres:[PASSWORD]@db.[NEW_PROJECT_REF].supabase.co:5432/postgres" \
  < backup-YYYYMMDD-HHMMSS.sql

# 5. Restore storage assets
supabase link --project-ref NEW_PROJECT_REF
supabase storage cp --recursive ./backup/product-images/ ss://product-images/
supabase storage cp --recursive ./backup/blog-images/ ss://blog-images/
supabase storage cp --recursive ./backup/avatars/ ss://avatars/

# 6. Update environment variables with new Supabase credentials
# Update NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# in your deployment platform (Vercel/Netlify/VPS .env.local)

# 7. Redeploy the application

# 8. Update Supabase Auth URL Configuration:
#    Site URL: https://streetcandys.shop
#    Redirect URLs: https://streetcandys.shop/**, http://localhost:4028/**
```

### Scenario D — GitHub repository deleted or corrupted

```bash
# If you have a local clone:
cd streetcandys-local-copy
git remote set-url origin https://github.com/Darkarweeb/streetcandys.git
# (or create a new repository and push)
git push --mirror origin

# If you have a mirror backup:
cd streetcandys-mirror.git
git push --mirror https://github.com/Darkarweeb/streetcandys.git
```

### Scenario E — Environment variables lost

1. **Supabase credentials**: Retrieve from Supabase Dashboard → Project Settings → API
2. **Stripe keys**: Retrieve from Stripe Dashboard → Developers → API Keys
3. **Stripe webhook secret**: Retrieve from Stripe Dashboard → Developers → Webhooks → your endpoint
4. **Resend API key**: Retrieve from Resend Dashboard → API Keys (or generate a new one)
5. **Google Analytics ID**: Retrieve from Google Analytics → Admin → Data Streams
6. **AI API keys**: Retrieve from the respective provider dashboards (OpenAI, Google AI Studio, Anthropic, Perplexity)

> **Best practice**: Store all environment variable values in a password manager
> (1Password, Bitwarden, etc.) as a secure note. Update it whenever keys are rotated.

### Scenario F — Emails stop being delivered

If transactional emails (welcome, order, rewards) stop working:

1. **Check `RESEND_API_KEY`**: Verify it is set to a real value (not `your-resend-api-key-here`)
2. **Check Resend Dashboard → Logs**: Look for failed delivery attempts and error messages
3. **Check domain verification**: Resend Dashboard → Domains — confirm `streetcandys.shop` shows "Verified"
4. **Check `FROM_EMAIL`** in `src/lib/email/client.ts`: Must use a verified domain address, not `onboarding@resend.dev`
5. **Check API key permissions**: The Resend API key must have "Send emails" permission
6. **Regenerate API key** if compromised: Resend Dashboard → API Keys → Create new key → Update `RESEND_API_KEY` in deployment platform

---

## 6. Backup Verification Checklist

Run this checklist monthly to confirm your backups are valid:

- [ ] Latest database dump file exists and is less than 7 days old
- [ ] Database dump can be opened and contains expected table names (including `rewards`, `reward_transactions`, `spin_leads`)
- [ ] All 37 migration files are present in `supabase/migrations/` including `20260804200000_harden_reward_transactions_rls.sql`
- [ ] GitHub repository has been pushed within the last week
- [ ] At least one tagged release exists in the repository
- [ ] Supabase automatic backup is enabled and shows recent backup dates
- [ ] Storage bucket files have been downloaded to a local backup location
- [ ] Environment variables are documented in a secure password manager (including `RESEND_API_KEY`)
- [ ] Resend domain verification status is "Verified" in Resend Dashboard
- [ ] Recovery steps have been tested in a staging environment (quarterly)
