# Sam + Jenni · Deploy to samandjenni.com

You bought `samandjenni.com` from Cloudflare. Here's the full path from "files on your laptop" to "live website."

## What's in this folder

```
deploy/
├── index.html              ← the website
├── CNAME                   ← tells GitHub Pages your custom domain (already done)
└── videos/
    ├── hero.mp4            ← main hero video (~6.4 MB)
    ├── full-reel.mp4       ← longer reel opened by "Watch full reel" (~11 MB)
    └── poster.jpg          ← fallback image while video loads
```

---

## Step 1 — Push files to GitHub

### Easiest path: GitHub web upload (no command line)

1. **Create a new repo** at github.com/new
   - Name: `samandjenni` (or anything you want — custom domain overrides this anyway)
   - **Public** (required for free GitHub Pages)
   - Check "Add a README" to initialize
   - Click **Create repository**

2. **Upload these files** to the repo:
   - Click "Add file" → "Upload files"
   - **Drag from this `deploy/` folder**:
     - `index.html`
     - `CNAME` (this file tells GitHub your domain is samandjenni.com)
     - The whole `videos/` folder
   - Wait for all uploads to finish (videos take ~30 sec total)
   - Commit message: "Initial site"
   - Click "Commit changes"

3. **Verify the file tree at the repo root** looks like:
   ```
   CNAME
   index.html
   videos/
     hero.mp4
     full-reel.mp4
     poster.jpg
   ```
   If `videos/` is missing or empty (this was the bug last time!), upload it again before continuing.

---

## Step 2 — Enable GitHub Pages

1. In your repo: **Settings → Pages** (left sidebar)
2. Under **Source**: pick "Deploy from a branch"
3. Branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Under "Custom domain", type: **samandjenni.com** → Save
   (This will use the CNAME file we already added)
6. GitHub will say "DNS check in progress" — that's expected. We'll fix DNS in Step 3.

---

## Step 3 — Configure Cloudflare DNS

Since your domain is registered AT Cloudflare, DNS is in the Cloudflare dashboard. Open dash.cloudflare.com and select your domain.

### Add these DNS records:

Go to **DNS → Records → Add record**. Add **5 records total**:

**Four A records** (point root domain to GitHub's IPs):

| Type | Name | IPv4 address | Proxy status |
|---|---|---|---|
| A | `@` | `185.199.108.153` | **DNS only** (gray cloud) |
| A | `@` | `185.199.109.153` | **DNS only** (gray cloud) |
| A | `@` | `185.199.110.153` | **DNS only** (gray cloud) |
| A | `@` | `185.199.111.153` | **DNS only** (gray cloud) |

**One CNAME** (point www subdomain to GitHub Pages):

| Type | Name | Target | Proxy status |
|---|---|---|---|
| CNAME | `www` | `tangjennii-wq.github.io` | **DNS only** (gray cloud) |

> **⚠️ IMPORTANT**: For each record, click the orange cloud icon → it turns **gray** (DNS only). If you leave it orange (proxied), GitHub Pages will fail to verify the domain and HTTPS won't work properly.
>
> You can turn proxying back on AFTER GitHub Pages confirms the domain and issues an SSL cert (Step 5).

### If you have any old DNS records pointing somewhere else (e.g. parking page), delete them.

---

## Step 4 — Wait for DNS to propagate

Usually 5–15 minutes with Cloudflare. To check:

1. Open Terminal on your Mac, type:
   ```
   dig samandjenni.com
   ```
   You should see GitHub's IPs (`185.199.108-111.153`) in the answer section.

2. Or use online: dnschecker.org → enter `samandjenni.com`

3. In GitHub Pages settings, the "DNS check" indicator should go from yellow → green.

---

## Step 5 — Enable HTTPS

Once GitHub confirms DNS:

1. Back in **Settings → Pages**
2. Check **"Enforce HTTPS"** (will be greyed out until DNS resolves — be patient)
3. GitHub auto-issues a Let's Encrypt SSL cert. Takes another 5-15 minutes.

Now `https://samandjenni.com` works.

### Optional: Re-enable Cloudflare proxy for caching

If you want Cloudflare to cache your videos for faster repeat loads:

1. After HTTPS is working, go back to Cloudflare DNS records
2. Click each gray cloud → turns orange (proxied)
3. **Critical**: Go to Cloudflare **SSL/TLS → Overview** → set to **"Full"** (not "Flexible" — that causes redirect loops)

This isn't required — you can leave proxy off and the site still works. Just speeds up repeat visits.

---

## Final result

- `https://samandjenni.com` → your site ✓
- `https://www.samandjenni.com` → redirects to root ✓
- SSL/HTTPS working ✓
- Free forever (GitHub Pages costs nothing for public repos)

---

## If something breaks

| Symptom | Likely cause |
|---|---|
| 404 on samandjenni.com | DNS not propagated yet OR records missing — recheck Step 3 |
| Videos show black | `videos/` folder missing from repo (the bug from last time) — re-upload Step 1 |
| Mixed-content warning | Cloudflare SSL set to "Flexible" — change to "Full" in Step 5 |
| "DNS check failed" in GitHub Pages settings | Orange cloud (proxy) is on — turn it gray (DNS only) |

Open Chrome DevTools (F12) → Console tab on the live site to see exact errors if anything's off.

## File sizes (well under all limits)

| File | Size |
|---|---|
| index.html | 16 KB |
| hero.mp4 | 6.4 MB |
| full-reel.mp4 | 11 MB |
| poster.jpg | 36 KB |
| **Total** | ~18 MB |

GitHub allows 100MB per file and 1GB per repo — we're nowhere near limits.
