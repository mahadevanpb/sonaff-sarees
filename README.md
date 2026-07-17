# SonAff Sarees — Website Documentation

> A premium static e-commerce website for an Indian heritage saree brand.  
> Built with pure HTML, CSS, and vanilla JavaScript — **no build step required**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Running the Website Locally](#3-running-the-website-locally)
4. [How the Website Works](#4-how-the-website-works)
5. [Shopify Integration](#5-shopify-integration)
6. [Managing Products](#6-managing-products)
7. [Updating Images](#7-updating-images)
8. [Updating Contact Details](#8-updating-contact-details)
9. [Troubleshooting](#9-troubleshooting)
10. [Browser Support](#10-browser-support)
11. [Backup](#11-backup)

---

## 1. Project Overview

SonAff Sarees is a static website that showcases and sells heritage Indian sarees. It connects to a **Shopify store** to display live product listings — but if the connection fails for any reason, it automatically falls back to a built-in set of demo products so the site never appears broken.

**No coding knowledge is needed** to add products, update prices, or manage inventory. All of that is done through the Shopify Admin panel.

---

## 2. File Structure

```
Sonaff Sarees/
├── index.html                      # Main website (all pages in one file)
├── style.css                       # All styles and design
├── app.js                          # All website logic and Shopify connection
├── images/
│   ├── logo_white.jpg              # Brand logo (used in header & footer)
│   ├── hero_lifestyle_banner.png   # Home page hero/banner image
│   ├── product_banarasi.png        # Demo product images (fallback only)
│   ├── product_kanjivaram.png
│   ├── product_chanderi.png
│   ├── product_tussar.png
│   ├── product_patola.png
│   └── product_pochampally.png
└── README.md                       # This file
```

---

## 3. Running the Website Locally

### ⚠️ Do Not Open `index.html` Directly

If you double-click `index.html` to open it in a browser, it will load — but the **Shopify product connection will not work** because browsers block API calls from local files (`file://` URLs) for security reasons. The site will fall back to demo products.

To see live Shopify products, use a local server:

**Option A — Python (usually pre-installed on Mac/Linux):**
```bash
python -m http.server 8080
```

**Option B — Node.js:**
```bash
npx serve .
```

**Option C — VS Code (recommended for beginners):**
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → click **"Open with Live Server"**

Then open your browser and visit: **`http://localhost:8080`**

---

## 4. How the Website Works

The website is a **Single Page Application (SPA)** — meaning all three pages (Home, Catalog, Contact) exist inside a single `index.html` file. Only one page is shown at a time; clicking navigation links simply hides the current page and shows the next one instantly, with no full page reload.

### Pages / Views

| View | Content |
|------|---------|
| **Home** | Hero banner, featured product carousel, brand story section |
| **Catalog** | Full product grid with category filters and live search |
| **Contact** | Studio address, phone, email, WhatsApp button |

### Key Features

- **Featured Carousel** — Products tagged `featured` in Shopify appear in the home page carousel. If none are tagged, the first 6 products are shown.
- **Category Filters** — Products are automatically sorted into four categories based on keywords in their title, type, and tags (see [Shopify Tag Conventions](#shopify-tag-conventions)).
- **Live Search** — Typing in the search box instantly filters the product grid.
- **WhatsApp Button** — Opens a WhatsApp chat with a pre-filled enquiry message.
- **Wishlist** — Customers can heart/save products during their session. Wishlist resets on page refresh.
- **Toast Notifications** — Small slide-up messages confirm actions (e.g., "Added to wishlist").
- **Skeleton Loaders** — While products are being fetched from Shopify, placeholder cards are shown so the page never looks empty.

---

## 5. Shopify Integration

### Configuration

The Shopify connection is configured at the top of `app.js` (lines 14–15):

```js
const SHOPIFY_DOMAIN   = 'dacfkb-0r.myshopify.com';
const STOREFRONT_TOKEN = '99253b45465195716e0d9ae1ad39887f';
```

The website automatically connects to:
```
https://dacfkb-0r.myshopify.com/api/2026-04/graphql.json
```

> **Do not share the Storefront Token publicly** if you make this repository public. It grants read-only access to your product catalogue.

### Required Shopify Permissions

In **Shopify Admin → Settings → Apps and sales channels → Develop apps → Storefront API**, ensure these permissions are enabled:

| Permission | Purpose |
|-----------|---------|
| `unauthenticated_read_product_listings` | **Required** — reads products to display on the site |
| `unauthenticated_read_product_inventory` | Optional — shows stock availability |

### Shopify Tag Conventions

Tags you add to products in Shopify control how they appear on the website:

| Tag Format | Effect |
|-----------|--------|
| `featured` | Product appears in the **home page carousel** |
| `region:Varanasi, UP` | Shows a **region chip** on the product card |
| `type:Pure Silk` | Shows a **type label** on the product card |

### Automatic Category Detection

The website auto-assigns each product to a filter category based on keywords found in its **Title**, **Product Type**, or **Tags**. You do not need to set this manually.

| Category | Keywords detected |
|----------|------------------|
| **Silk** | silk, banarasi, kanjivaram, kanjeevaram, chanderi, mysore, bhagalpuri, uppada |
| **Handloom** | handloom, tussar, gadwal, maheshwari, linen, jamdani, sambalpuri |
| **Ikat** | ikat, pochampally, patola, double ikat |
| **Cotton** | cotton, khadi, mul mul |

**Example:** A product titled *"Pochampally Ikat Silk Saree"* will be placed in the **Ikat** category.

### Offline / Demo Fallback

If the Shopify connection fails (wrong credentials, no internet, CORS issue when opening via `file://`), the website silently loads a built-in set of **demo products** so it always looks presentable. No error is shown to visitors.

---

## 6. Managing Products

> **All product management is done in Shopify Admin — no code changes needed.**

### Adding a New Product

1. Go to [Shopify Admin → Products](https://admin.shopify.com) → **Add product**
2. Fill in the **Title** — use clear keywords so the category is auto-detected (e.g., *"Banarasi Pure Silk Saree in Deep Red"*)
3. Set the **Product Type** (e.g., `Pure Silk`, `Handloom`, `Ikat Silk`, `Cotton`)
4. Add **Tags** as needed:
   - `featured` — to show it in the home carousel
   - `region:City, State` — e.g., `region:Varanasi, UP`
   - `type:Display Label` — e.g., `type:Pure Silk`
5. Upload at least **one image** and set a **price**
6. Click **Save** and make sure the product is **Active** (published)

The product will appear on the website the next time someone loads the page. **No website edits needed.**

### Editing or Removing a Product

- **Edit**: Update price, description, images, or tags directly in Shopify Admin. Changes appear on the website on the next page load.
- **Remove**: Set the product status to **Draft** or **Archived** in Shopify Admin. It will no longer appear on the website.

### Verifying the Shopify Connection

After loading the website in a browser, open **DevTools → Console** (press `F12`) and look for:

| Console Message | Meaning |
|----------------|---------|
| `✓ N products loaded from Shopify` (green) | ✅ Live Shopify data is working |
| `⚠ Demo data active` (red) | ❌ Shopify fetch failed — check credentials or use a local server |
| `[SonAff] Category breakdown` | Expandable table showing product counts per filter category |

---

## 7. Updating Images

### Changing the Logo

The logo appears in the **header** and **footer**.

**Quick method (recommended):** Replace the file `images/logo_white.jpg` with your new logo, keeping the **exact same filename**.

**Alternative:** If you want to use a different filename, open `index.html` and search for `logo_white.jpg`. Update the `src` attribute in all occurrences (approximately lines 31, 190, 262, and 374).

> **Tip:** The logo is displayed on a dark background. A white or light-coloured logo works best. Use a `.png` with a transparent background for the cleanest result (and update the filename to `.png` accordingly).

### Changing the Hero Banner

The large banner image on the home page is `images/hero_lifestyle_banner.png`.

**Quick method:** Replace the file, keeping the same filename `hero_lifestyle_banner.png`.

**Alternative:** Open `index.html` and find the hero section (~line 74). Update the `src` attribute to point to your new image file.

> **Recommended size:** At least **1400 × 700 px**, landscape orientation, under 500 KB for fast loading.

### Demo Product Images

The images in the `images/` folder prefixed with `product_` are only used when the Shopify connection is unavailable (demo mode). When Shopify is connected, product images come directly from Shopify. You do not need to update these unless you want to change what appears in offline/demo mode.

---

## 8. Updating Contact Details

### Studio Address, Phone & Email

Open `index.html` and search for the **contact section** (~line 285). Update the address, phone number, email, and studio hours directly in the HTML.

### WhatsApp Number

The WhatsApp button is configured in **two places** — both must be updated together:

1. **`app.js`, line 23:**
   ```js
   const CONFIG = { whatsappNumber: '916235128492', ... }
   ```
   Format: country code followed by number, **no `+`, no spaces**.  
   Example for India (+91) 98765 43210: `919876543210`

2. **`index.html`** — Search for `wa.me` and update the number in the URL if it appears as a hardcoded link.

---

## 9. Troubleshooting

### Products are not loading / only demo products show

| Possible Cause | Fix |
|---------------|-----|
| Opened `index.html` directly (via `file://`) | Use a local server — see [Section 3](#3-running-the-website-locally) |
| Shopify Storefront API permissions not set | Enable `unauthenticated_read_product_listings` in Shopify Admin |
| Products are set to Draft in Shopify | Make sure all products are **Active** / published |
| Wrong domain or token in `app.js` | Double-check lines 14–15 of `app.js` |

### WhatsApp button doesn't open a chat

- Verify `CONFIG.whatsappNumber` in `app.js` (line 23) is correct — no `+`, no spaces, starts with country code.
- Test the URL manually: `https://wa.me/916235128492`

### Category filter shows no products for a category

- Check that the product **Title**, **Product Type**, or **Tags** contain one of the category keywords listed in [Section 5](#automatic-category-detection).
- Open the browser Console and look for the `[SonAff] Category breakdown` log to see how many products are in each bucket.

### Images are not displaying

- Make sure image filenames in `index.html` match exactly (filenames are **case-sensitive** on some servers).
- Ensure the image files are in the `images/` folder alongside `index.html`.

### The page looks broken / unstyled

- Make sure `style.css` is in the same folder as `index.html`.
- Check the browser Console for any 404 errors on resource files.

### Changes to `index.html` or `app.js` aren't showing

- Do a **hard refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) to bypass the browser cache.

---

## 10. Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Apple Safari | 14+ |
| Microsoft Edge | 90+ |
| Internet Explorer | ❌ Not supported |

---

## 11. Backup

A backup of the original website (before Shopify integration was added) is saved at:

```
C:\Users\Mahadevan\Desktop\sonaff sarees v1\
```

If anything goes wrong with the current version, you can restore files from there.

---

*Last updated: July 2026*
