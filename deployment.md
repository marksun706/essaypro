# DNS & Deployment Setup Guide for essayspro.org

This guide explains how to map your registered domain name **`essayspro.org`** to your frontend hosting provider.

---

## 1. Choose Your Hosting Provider

For modern React + Vite + Tailwind applications, we highly recommend **Vercel** or **GitHub Pages** for ultra-fast load times and seamless continuous deployment directly from your git repository.

### Option A: Vercel (Recommended - Fastest & Zero Setup)
1. Sign up/Log in to [Vercel](https://vercel.com).
2. Click **Add New** > **Project** and select your GitHub repository `marksun706/essaypro`.
3. In the project dashboard, go to **Settings** > **Domains**.
4. Add **`essayspro.org`** (Vercel will automatically suggest adding `www.essayspro.org` as well).
5. Vercel will analyze your domain and give you the exact DNS records to configure with your domain registrar (see Section 2).

### Option B: GitHub Pages (Free Hosting directly in GitHub)
1. Push your local main branch to remote.
2. In your GitHub repository page, go to **Settings** > **Pages**.
3. Under **Build and deployment**, set Source to **GitHub Actions** or select your `main` branch.
4. Under **Custom domain**, type **`essayspro.org`** and click **Save**.
5. The `public/CNAME` file we created will automatically verify the ownership.

---

## 2. Configure DNS Records with Your Registrar

Log into the registrar where you purchased **`essayspro.org`** (e.g., GoDaddy, Namecheap, Cloudflare, Alibaba Cloud) and navigate to the **DNS Management / DNS Zone Editor**.

Modify or add the following records to route your traffic:

### A Records (Apex Domain: essayspro.org)
Add an `A` record to point your naked apex domain `essayspro.org` to the hosting servers:

*   **Host/Name:** `@` (represents `essayspro.org`)
*   **Type:** `A`
*   **Value/IP Address:** 
    *   *For Vercel:* `76.76.21.21`
    *   *For GitHub Pages:* Add the following 4 IPs (create 4 separate A records):
        *   `185.199.108.153`
        *   `185.199.109.153`
        *   `185.199.110.153`
        *   `185.199.111.153`
*   **TTL:** `Default` or `600` (10 minutes)

### CNAME Record (Subdomain: www.essayspro.org)
Add a CNAME record so that users typing `www.essayspro.org` are redirected automatically:

*   **Host/Name:** `www`
*   **Type:** `CNAME`
*   **Value/Target:** 
    *   *For Vercel:* `cname.vercel-dns.com`
    *   *For GitHub Pages:* `marksun706.github.io` (your GitHub pages root)
*   **TTL:** `Default` or `600`

---

## 3. SSL/HTTPS Activation

Once DNS records are configured, modern hosting providers (both Vercel and GitHub Pages) **automatically generate a free Let's Encrypt SSL certificate** for your domain. 

*   This will automatically activate HTTPS routing (so users access a secure site via `https://essayspro.org`).
*   It typically takes anywhere from **2 minutes to a few hours** for global DNS changes to propagate. You can monitor the status directly in your hosting dashboard.

---

## 4. Verification Check

You can verify that your DNS records have successfully propagated using your terminal:

```bash
# Check A Record propagation
dig essayspro.org +short

# Check CNAME propagation
dig www.essayspro.org +short
```
