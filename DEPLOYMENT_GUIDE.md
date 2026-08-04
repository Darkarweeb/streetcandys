# STREET CANDYS — Deployment Guide

> **Production domain**: `https://streetcandys.shop`
> **Framework**: Next.js 15 (App Router)
> **Database**: Supabase (hosted)
> **Email**: Resend (transactional)
> **Payments**: Stripe
> **Last updated**: Reflects Resend integration, hardened RLS (migration `20260804200000`), and all codebase changes as of August 2026.

---

## Pre-Deployment Checklist

Before deploying to any environment, complete these steps:

- [ ] All environment variables have real values (no placeholders)
- [ ] `NEXT_PUBLIC_SITE_URL` is set to the production domain (`https://streetcandys.shop`)
- [ ] `RESEND_API_KEY` is set to a real Resend API key (not `your-resend-api-key-here`)
- [ ] `FROM_EMAIL` in `src/lib/email/client.ts` uses a verified custom domain address (not `onboarding@resend.dev`)
- [ ] Supabase Auth redirect URLs include the production domain
- [ ] All 37 database migrations have been applied to the production Supabase project (through `20260804200000_harden_reward_transactions_rls.sql`)
- [ ] Stripe webhook endpoint is registered for the production domain
- [ ] `npm run build` completes without fatal errors locally

---

## Option 1 — Vercel (Recommended)

Vercel is the official hosting platform for Next.js and provides the best compatibility
with Next.js 15 features including Server Components, Edge Middleware, and Image Optimization.

### Setup

1. **Create a Vercel account** at [https://vercel.com](https://vercel.com)

2. **Import the repository**:
   - Click **Add New → Project**
   - Connect your GitHub account and select `Darkarweeb/streetcandys`
   - Vercel auto-detects Next.js — no framework configuration needed

3. **Configure environment variables** in Vercel Dashboard → Project → Settings → Environment Variables:

   | Variable | Environment | Value |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | Your Supabase service role key |
   | `NEXT_PUBLIC_SITE_URL` | Production | `https://streetcandys.shop` |
   | `NEXT_PUBLIC_SITE_URL` | Preview | Your Vercel preview URL |
   | `RESEND_API_KEY` | Production | `re_...` (from Resend Dashboard → API Keys) |
   | `RESEND_API_KEY` | Preview/Development | `re_...` (test key or same key) |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production | `pk_live_...` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Preview/Development | `pk_test_...` |
   | `STRIPE_SECRET_KEY` | Production | `sk_live_...` |
   | `STRIPE_SECRET_KEY` | Preview/Development | `sk_test_...` |
   | `STRIPE_WEBHOOK_SECRET` | Production | `whsec_...` (from Stripe webhook endpoint) |
   | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Production | `G-XXXXXXXXXX` |
   | `NEXT_PUBLIC_ADSENSE_ID` | Production | `ca-pub-XXXXXXXXXX` |

4. **Deploy**:
   - Click **Deploy**
   - Vercel runs `npm run build` automatically
   - First deployment takes ~2–3 minutes

### Domain configuration

1. In Vercel Dashboard → Project → Settings → **Domains**
2. Add `streetcandys.shop` and `www.streetcandys.shop`
3. Vercel provides DNS records — add them to your domain registrar:
   - For apex domain (`streetcandys.shop`): Add an **A record** pointing to `76.76.21.21`
   - For `www`: Add a **CNAME record** pointing to `cname.vercel-dns.com`
4. SSL certificate is provisioned automatically (Let's Encrypt)

### Subsequent deployments

Every push to the `main` branch triggers an automatic deployment.
Pull requests get preview deployments at unique URLs.

---

## Option 2 — Netlify

### Setup

1. **Create a Netlify account** at [https://netlify.com](https://netlify.com)

2. **Import the repository**:
   - Click **Add new site → Import an existing project**
   - Connect GitHub and select `Darkarweeb/streetcandys`

3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `20` (set in Environment Variables as `NODE_VERSION=20`)

4. **Install the Next.js plugin**:
   The project already has `@netlify/plugin-nextjs` in `devDependencies`.
   Create a `netlify.toml` file in the project root:
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

5. **Configure environment variables** in Netlify Dashboard → Site → Site configuration → Environment variables:
   Add all variables listed in the Vercel section above (including `RESEND_API_KEY`).

### Domain configuration

1. In Netlify Dashboard → Site → Domain management
2. Add custom domain `streetcandys.shop`
3. Update your domain registrar DNS:
   - Add a **CNAME record** for `www` pointing to your Netlify site URL
   - For apex domain: use Netlify DNS or add an **A record** to Netlify's load balancer IP
4. SSL is provisioned automatically

---

## Option 3 — VPS / Self-Hosted (Ubuntu/Debian)

Use this option if you need full server control, custom infrastructure, or are deploying
to a cloud provider like DigitalOcean, Linode, AWS EC2, or Hetzner.

### Server requirements

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Server setup

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 (process manager)
sudo npm install -g pm2

# 4. Install Nginx (reverse proxy)
sudo apt install -y nginx

# 5. Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### Application deployment

```bash
# 1. Clone the repository
git clone https://github.com/Darkarweeb/streetcandys.git /var/www/streetcandys
cd /var/www/streetcandys

# 2. Create environment file
nano .env.local
# (paste all environment variables — see ENVIRONMENT_SETUP_GUIDE.md)
# Ensure RESEND_API_KEY has a real value

# 3. Install dependencies
npm ci

# 4. Build the application
npm run build

# 5. Start with PM2
pm2 start npm --name "streetcandys" -- run start
pm2 save
pm2 startup  # follow the printed command to enable auto-start on reboot
```

### Nginx configuration

Create `/etc/nginx/sites-available/streetcandys`:

```nginx
server {
    listen 80;
    server_name streetcandys.shop www.streetcandys.shop;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/streetcandys /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Provision SSL certificate
sudo certbot --nginx -d streetcandys.shop -d www.streetcandys.shop
```

### Updating the application on VPS

```bash
cd /var/www/streetcandys
git pull origin main
npm ci
npm run build
pm2 restart streetcandys
```

---

## Required Environment Variables (All Platforms)

| Variable | Production Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_REF.supabase.co` | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Secret** — required for rewards writes (hardened RLS) |
| `NEXT_PUBLIC_SITE_URL` | `https://streetcandys.shop` | Must match Supabase Auth Site URL |
| `RESEND_API_KEY` | `re_...` | **Required** for all transactional emails — get from [resend.com/api-keys](https://resend.com/api-keys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | From Stripe Dashboard → Developers → API Keys |
| `STRIPE_SECRET_KEY` | `sk_live_...` | **Secret** — server-side only |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe Dashboard → Webhooks |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Optional — Google Analytics |
| `NEXT_PUBLIC_ADSENSE_ID` | `ca-pub-XXXXXXXXXX` | Optional — Google AdSense |

---

## Resend Email Configuration

The application uses **Resend** for all transactional emails. Three types of emails are sent:

| Email Type | Trigger | Template File |
|---|---|---|
| Welcome email | New user registration | `src/lib/email/templates/welcome.ts` |
| Order confirmation | Order created via checkout | `src/lib/email/templates/order.ts` |
| Order status updates | Order status changes (processing, shipped, delivered) | `src/lib/email/templates/order.ts` |
| Rewards notification | Points earned after delivery | `src/lib/email/templates/rewards.ts` |

### Production email setup

1. **Create a Resend account** at [https://resend.com](https://resend.com)
2. **Verify your domain** (`streetcandys.shop`) in Resend Dashboard → Domains:
   - Add the DNS TXT and MX records provided by Resend to your domain registrar
   - Wait for domain verification (usually 5–30 minutes)
3. **Generate an API key** in Resend Dashboard → API Keys
4. **Set `RESEND_API_KEY`** in your deployment platform environment variables
5. **Update `FROM_EMAIL`** in `src/lib/email/client.ts`:
   ```typescript
   // Change from:
   export const FROM_EMAIL = 'Street Candy\'s <onboarding@resend.dev>';
   // To:
   export const FROM_EMAIL = 'Street Candy\'s <noreply@streetcandys.shop>';
   ```

> ⚠️ **Important**: The `onboarding@resend.dev` sender address is a Resend sandbox address.
> In sandbox mode, emails are only delivered to the Resend account owner's email.
> All other recipients will not receive emails until a verified custom domain is configured.

---

## Domain Configuration

### DNS records summary

| Record Type | Host | Value | Purpose |
|---|---|---|---|
| A | `@` (apex) | Platform IP | Root domain |
| CNAME | `www` | Platform CNAME | www subdomain |

### SSL / HTTPS

- **Vercel**: Automatic (Let's Encrypt, auto-renewed)
- **Netlify**: Automatic (Let's Encrypt, auto-renewed)
- **VPS**: Certbot (`sudo certbot renew` — set up cron job for auto-renewal)

---

## Supabase Redirect URL Configuration

After deploying to production, update Supabase to allow redirects from your domain:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your Street Candys project
3. Navigate to **Authentication → URL Configuration**
4. Set **Site URL** to `https://streetcandys.shop`
5. Add all of the following to **Redirect URLs**:
   ```
   https://streetcandys.shop/**
   https://www.streetcandys.shop/**
   http://localhost:4028/**
   https://streetcand8616.builtwithrocket.new/**
   ```
6. Click **Save**

> ⚠️ If `NEXT_PUBLIC_SITE_URL` is not updated to `https://streetcandys.shop`, all auth
> email links (verification, password reset) will redirect users to the wrong domain.
> After email confirmation, users are redirected to `/cuenta` (the account dashboard).

---

## Stripe Configuration

### Webhook endpoint registration

Stripe webhooks notify your application of payment events (successful charges, refunds, etc.).
The webhook handler is at `/api/pagos/webhook`.

1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set **Endpoint URL** to `https://streetcandys.shop/api/pagos/webhook`
4. Select the following events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`) and add it as `STRIPE_WEBHOOK_SECRET`

### Live vs. test mode

| Environment | Publishable Key | Secret Key |
|---|---|---|
| Development / Staging | `pk_test_...` | `sk_test_...` |
| Production | `pk_live_...` | `sk_live_...` |

> Always use test keys in development. Switch to live keys only in the production environment.

### Stripe API version

The project uses Stripe API version `2025-06-30.basil` (configured in `src/lib/payment/providers/stripe-provider.ts`).
Verify this version is still supported in the Stripe Dashboard → Developers → API versions before going live.

---

## Post-Deployment Verification

After deploying, verify the following:

- [ ] Homepage loads at `https://streetcandys.shop`
- [ ] SSL certificate is valid (padlock icon in browser)
- [ ] Products page loads data from Supabase
- [ ] User registration and email verification work end-to-end
- [ ] Welcome email is received after registration (confirms Resend is working)
- [ ] Login and logout work correctly
- [ ] Email verification link redirects to `https://streetcandys.shop/cuenta`
- [ ] Coupon application in cart shows correct discount
- [ ] WhatsApp checkout message includes coupon discount and correct final total
- [ ] Admin panel accessible at `/admin` with admin credentials
- [ ] Stripe checkout flow works (use Stripe test card `4242 4242 4242 4242`)
- [ ] Stripe webhook receives events (check Stripe Dashboard → Webhooks → Recent deliveries)
- [ ] Rewards points are awarded after an order is marked as delivered
- [ ] Google Analytics receives pageview events (check GA4 Realtime report)
- [ ] Images load from Supabase Storage without errors
