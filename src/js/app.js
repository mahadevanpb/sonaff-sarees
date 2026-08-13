/* ============================================
   SONAFF SAREES  App JavaScript v3
   Shopify Storefront API (Headless CMS)
   ============================================ */

'use strict';

// ============================================
// ★ SHOPIFY CONFIGURATION
//   Fill these in with your store credentials.
//   storeDomain  → your-store.myshopify.com
//   accessToken  → Storefront API public token
// ============================================
// ⚠ Domain must be just the hostname  no https:// prefix, no trailing slash
const SHOPIFY_DOMAIN     = 'dacfkb-0r.myshopify.com';
const STOREFRONT_TOKEN   = '99253b45465195716e0d9ae1ad39887f';
const STOREFRONT_API_VER = '2026-04';
const STOREFRONT_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${STOREFRONT_API_VER}/graphql.json`;

// ============================================
// ★ EMAILJS CONFIGURATION (Contact Form)
//   Sign up at https://www.emailjs.com/
//   To test with your account or switch to a client's account,
//   simply replace these 3 strings with your actual EmailJS keys!
// ============================================
const EMAILJS_SERVICE_ID  = 'service_tmo4003';  // e.g. service_xxxxxx
const EMAILJS_TEMPLATE_ID = 'template_dalyl0k'; // e.g. template_xxxxxx
const EMAILJS_PUBLIC_KEY  = '4Z8LH5nJ2ZSUz0hEz';  // e.g. xxxxxxxxxxxxxxxx

// ============================================
// CONFIG
// ============================================
const CONFIG = {
  whatsappNumber: '916235128492', // country code + number, no + or spaces
  storeName: 'SonAff Saree',
};

// ============================================
// GRAPHQL QUERY
// Fetches first 20 products with all fields
// needed by the UI.
// ============================================
const PRODUCTS_QUERY = `
  query FetchProductsAndCollections {
    collections(first: 50) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
    products(first: 50) {
      edges {
        node {
          id
          title
          handle
          onlineStoreUrl
          productType
          tags
          descriptionHtml
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                priceV2 {
                  amount
                  currencyCode
                }
                compareAtPriceV2 {
                  amount
                }
              }
            }
          }
          images(first: 6) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

// ============================================
// SHOPIFY FETCH
// Returns mapped PRODUCTS array or falls back
// to the hardcoded demo set on any error.
// ============================================
async function fetchShopifyProducts() {
  try {
    const response = await fetch(STOREFRONT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors && json.errors.length) {
      throw new Error(`GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`);
    }

    const edges = json?.data?.products?.edges ?? [];
    const collectionEdges = json?.data?.collections?.edges ?? [];
    const fetchedCollections = collectionEdges.map(e => e.node);

    if (!edges.length) {
      throw new Error('No products returned from Shopify.');
    }

    if (fetchedCollections.length) {
      renderCollectionFilterTabs(fetchedCollections);
    }

    return mapShopifyProducts(edges);

  } catch (err) {
    console.warn('[SonAff] Shopify fetch failed  using demo data.', err.message);
    return DEMO_PRODUCTS; // graceful fallback
  }
}

// ============================================
// DATA MAPPER
// Converts Shopify GraphQL shape → UI shape.
// ============================================
function mapShopifyProducts(edges) {
  return edges.map((edge, index) => {
    const node = edge.node;
    const variant = node.variants?.edges?.[0]?.node;
    const image = node.images?.edges?.[0]?.node;
    const tags = node.tags ?? [];

    // --- Price ---
    const rawAmount = parseFloat(variant?.priceV2?.amount ?? 0);
    const formattedPrice = `₹${rawAmount.toLocaleString('en-IN')}`;

    // --- Original / compare-at price ---
    const compareAt = variant?.compareAtPriceV2?.amount;
    const formattedOriginal = compareAt
      ? `₹${parseFloat(compareAt).toLocaleString('en-IN')}`
      : null;

    // --- Collections ---
    const productCollections = node.collections?.edges?.map(e => e.node) ?? [];
    const collectionHandles = productCollections.map(c => c.handle);

    // --- Category (from productType, tags, title AND collections) ---
    const rawType = (node.productType ?? '').toLowerCase().trim();
    const rawTitle = (node.title ?? '').toLowerCase().trim();
    const category = normaliseCategoryTag(rawType, tags, rawTitle, productCollections);

    // --- Type label (for display) ---
    // Prefer a tag that starts with "type:" e.g. "type:Pure Silk"
    const typeTag = tags.find(t => t.toLowerCase().startsWith('type:'));
    const typeLabel = typeTag
      ? typeTag.split(':')[1].trim()
      : (node.productType || 'Authentic Weave');

    // --- Region label ---
    const regionTag = tags.find(t => t.toLowerCase().startsWith('region:'));
    const region = regionTag ? regionTag.split(':')[1].trim() : 'India';

    // --- Featured flag ---
    const featured = tags.some(t => t.toLowerCase() === 'featured');

    // --- Stable numeric-ish id from Shopify GID ---
    // Shopify GIDs look like: gid://shopify/Product/1234567890
    const gidParts = (node.id ?? '').split('/');
    const numericId = parseInt(gidParts[gidParts.length - 1], 10) || (index + 1);

    // --- Images array ---
    const allImages = node.images?.edges?.map(e => e.node.url).filter(Boolean) || [];
    const mainImage = allImages[0] ?? 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80';
    if (!allImages.length) allImages.push(mainImage);

    // --- Description ---
    const defaultDesc = `An authentic Indian heritage saree sourced directly from master weavers in ${region}. Handpicked for exceptional drape, rich texture, and timeless craftsmanship.`;
    const description = node.descriptionHtml || defaultDesc;

    const shopifyUrl = node.onlineStoreUrl || (node.handle ? `https://${SHOPIFY_DOMAIN}/products/${node.handle}` : null);
    return {
      id: numericId,
      shopifyGid: node.id,
      handle: node.handle ?? '',
      shopifyUrl: shopifyUrl,
      name: node.title ?? 'Saree',
      type: typeLabel,
      region: region,
      price: formattedPrice,
      priceOriginal: formattedOriginal,
      priceNumeric: rawAmount,
      category: category,
      image: mainImage,
      imageAlt: image?.altText ?? node.title,
      images: allImages,
      description: description,
      featured: featured,
      // Shopify has no ratings  use sensible defaults
      rating: 4.9,
      reviews: Math.floor(Math.random() * 180) + 30,
    };
  });
}

// Log a category breakdown table to the console so you can
// verify every product is in the right filter bucket.
function logCategoryBreakdown(products) {
  const counts = { silk: 0, handloom: 0, ikat: 0, cotton: 0 };
  products.forEach(p => {
    if (counts[p.category] !== undefined) counts[p.category]++;
    else counts[p.category] = 1;
  });
  console.groupCollapsed('[SonAff] Category breakdown');
  console.table(counts);
  products.forEach(p => console.log(`  ${p.category.padEnd(10)} | ${p.name}`));
  console.groupEnd();
}

// ============================================
// CATEGORY NORMALISER
// Checks productType, tags AND product title so
// category works even without Shopify metadata.
// Keys: 'silk' | 'handloom' | 'ikat' | 'cotton'
// ============================================
function normaliseCategoryTag(rawType, tags, rawTitle = '', collections = []) {
  const collectionNames = collections.map(c => (c.title || c.handle || '').toLowerCase());
  const combined = [
    rawType,
    rawTitle,
    ...tags.map(t => t.toLowerCase()),
    ...collectionNames
  ].join(' ');

  if (/katti[\s-]?georgette/.test(combined)) return 'katti-georgette';
  if (/katti[\s-]?crepe/.test(combined)) return 'katti-crepe';
  if (/ho[\s-]?crepe|handloom[\s-]?crepe/.test(combined)) return 'ho-crepe';
  if (/mysore[\s-]?crepe/.test(combined)) return 'mysore-crepe';
  if (/raw[\s-]?mango/.test(combined)) return 'raw-mango';
  if (/katan/.test(combined)) return 'katan-silk';
  if (/banarasi/.test(combined)) return 'banarasi-silk';
  if (/kanjivaram|kanjeevaram/.test(combined)) return 'kanjivaram-silk';
  if (/chanderi/.test(combined)) return 'chanderi-silk';
  if (/ikat|patola|pochampally/.test(combined)) return 'ikat-patola';
  if (/tussar|bhagalpur/.test(combined)) return 'tussar-handloom';

  return 'banarasi-silk';
}

// ============================================
// DEMO / FALLBACK PRODUCTS
// Shown when Shopify credentials are not yet
// configured or the API call fails.
// ============================================
const DEMO_PRODUCTS = [
  {
    id: 1, shopifyGid: null,
    name: 'Banarasi Silk Saree with Gold Zari',
    type: 'Pure Silk', region: 'Varanasi, UP',
    price: '₹28,500', priceOriginal: '₹32,000', priceNumeric: 28500,
    category: 'banarasi-silk', image: 'images/product_banarasi.png',
    imageAlt: 'Banarasi Silk Saree', featured: true, rating: 4.9, reviews: 142,
    images: ['images/product_banarasi.png', 'images/hero_saree_model.png', 'images/product_kanjivaram.png'],
    description: 'An heirloom Banarasi pure silk saree featuring intricate Kadwa weave gold zari florals across the body and a regal pallu. Woven by master artisans in Varanasi, this timeless weave embodies opulence and heritage elegance.'
  },
  {
    id: 2, shopifyGid: null,
    name: 'Kanjivaram Silk Saree Magenta Mustard Border',
    type: 'Pure Silk', region: 'Kanchipuram, TN',
    price: '₹34,000', priceOriginal: '₹38,500', priceNumeric: 34000,
    category: 'kanjivaram-silk', image: 'images/product_kanjivaram.png',
    imageAlt: 'Kanjivaram Silk Saree', featured: true, rating: 5.0, reviews: 89,
    images: ['images/product_kanjivaram.png', 'images/hero_saree_model.png'],
    description: 'A traditional Kanchipuram pure mulberry silk saree characterized by its distinctive Korvai weave contrasting mustard yellow border against a jewel-toned magenta body. Renowned for its durability and rich luster.'
  },
  {
    id: 3, shopifyGid: null,
    name: 'Chanderi Silk Saree Pink Lotus Floral Pattern',
    type: 'Silk Cotton', region: 'Chanderi, MP',
    price: '₹14,500', priceOriginal: null, priceNumeric: 14500,
    category: 'chanderi-silk', image: 'images/product_chanderi.png',
    imageAlt: 'Chanderi Silk Saree', featured: true, rating: 4.8, reviews: 217,
    images: ['images/product_chanderi.png'],
    description: 'Feather-light Chanderi silk cotton weave originating from Madhya Pradesh, adorned with delicate gold zari lotus motifs (buttis) and a sheer, luxurious drape perfect for celebrations and festive gatherings.'
  },
  {
    id: 4, shopifyGid: null,
    name: 'Tussar Handloom Saree Natural Ivory Terracotta',
    type: 'Handloom Silk', region: 'Bhagalpur, Bihar',
    price: '₹9,800', priceOriginal: '₹12,000', priceNumeric: 9800,
    category: 'tussar-handloom', image: 'images/product_tussar.png',
    imageAlt: 'Tussar Handloom Saree', featured: true, rating: 4.7, reviews: 63,
    images: ['images/product_tussar.png'],
    description: 'Authentic Bhagalpuri Tussar wild silk saree showcasing a natural textured ivory weave complemented by organic terracotta borders and traditional tribal-inspired block prints.'
  },
  {
    id: 5, shopifyGid: null,
    name: 'Patola Silk Saree Royal Blue Crimson Double Ikat',
    type: 'Double Ikat', region: 'Patan, Gujarat',
    price: '₹55,000', priceOriginal: '₹62,000', priceNumeric: 55000,
    category: 'ikat-patola', image: 'images/product_patola.png',
    imageAlt: 'Patola Silk Saree', featured: true, rating: 5.0, reviews: 38,
    images: ['images/product_patola.png', 'images/product_pochampally.png'],
    description: 'A masterpiece of precision weaving, this Patan Double Ikat Patola silk saree features intricate geometric jewel-box patterns where both warp and weft threads are resist-dyed prior to weaving.'
  },
  {
    id: 6, shopifyGid: null,
    name: 'Pochampally Ikat Silk Saree Teal Purple Geometric',
    type: 'Ikat Silk', region: 'Pochampally, Telangana',
    price: '₹18,500', priceOriginal: '₹22,000', priceNumeric: 18500,
    category: 'ikat-patola', image: 'images/product_pochampally.png',
    imageAlt: 'Pochampally Ikat Saree', featured: true, rating: 4.9, reviews: 104,
    images: ['images/product_pochampally.png'],
    description: 'Vibrant Pochampally silk saree crafted in Telangana using traditional single-ikat tie-dye techniques. Features striking geometric diamond patterns in rich teal and royal purple.'
  },
  {
    id: 7, shopifyGid: null,
    name: 'Maheshwari Cotton Silk Saree Indigo Stripe',
    type: 'Cotton Silk', region: 'Maheshwar, MP',
    price: '₹8,200', priceOriginal: null, priceNumeric: 8200,
    category: 'ho-crepe',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4a5792?w=600&h=800&fit=crop&q=80',
    imageAlt: 'Maheshwari Cotton Silk Saree', featured: false, rating: 4.6, reviews: 55,
    images: ['https://images.unsplash.com/photo-1594938298603-c8148c4a5792?w=600&h=800&fit=crop&q=80'],
    description: 'Classic Maheshwari cotton-silk blend saree featuring signature reversible zari borders (bugdi) and sophisticated indigo stripes. Breathable, lightweight, and effortlessly elegant.'
  },
  {
    id: 8, shopifyGid: null,
    name: 'Gadwal Silk Cotton Saree Emerald Contrast Border',
    type: 'Silk Cotton', region: 'Gadwal, Telangana',
    price: '₹12,500', priceOriginal: '₹15,000', priceNumeric: 12500,
    category: 'banarasi-silk',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80',
    imageAlt: 'Gadwal Silk Cotton Saree', featured: false, rating: 4.8, reviews: 76,
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80'],
    description: 'Traditional Gadwal weave combining a lightweight cotton body in emerald green with rich contrasting pure silk borders and an elaborate zari pallu joined using the signature kuttu technique.'
  },
];

// ============================================
// GLOBAL STATE
// PRODUCTS starts empty  populated after the
// Shopify fetch resolves.
// ============================================
let PRODUCTS = [];

let currentView = 'home';
let currentFilter = 'all';
let currentRegion = 'all';
let currentSort = 'default';
let wishlist = new Set(JSON.parse(localStorage.getItem('sonaff_wishlist') || '[]'));
let cart = JSON.parse(localStorage.getItem('sonaff_cart') || '[]');
let searchOpen = false;
let mobileMenuOpen = false;

// Carousel state
let carouselIndex = 0;
let carouselItems = [];
let carouselVisible = 3;

// ============================================
// VIEW MANAGEMENT & PAGE TRANSITIONS
// ============================================
function triggerPageTransition(updateFn) {
  const bar = document.getElementById('page-transition-bar');
  if (bar) {
    bar.classList.remove('active');
    void bar.offsetWidth;
    bar.classList.add('active');
    setTimeout(() => {
      bar.classList.remove('active');
    }, 350);
  }

  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => {
      updateFn();
    });
  } else {
    updateFn();
  }
}

function showView(viewName, event) {
  if (event) event.preventDefault();
  if (currentView === viewName && viewName !== 'product') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileMenu();
    return;
  }

  triggerPageTransition(() => {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${viewName}`);
    if (activeLink) activeLink.classList.add('active');

    currentView = viewName;
    document.body.setAttribute('data-view', viewName);
    if (viewName !== 'product') {
      document.body.classList.remove('viewing-product');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    closeMobileMenu();
    setTimeout(initIntersectionObserver, 120);

    const titles = {
      home: 'SonAff Saree  Authentic Indian Heritage Sarees',
      catalog: 'Full Collection  SonAff Saree',
      about: 'About Us  SonAff Saree',
      contact: 'Contact Us  SonAff Saree',
    };
    document.title = titles[viewName] || titles.home;
  });
}

function scrollToProducts() {
  const el = document.getElementById('featured-products');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// LOADING STATE
// ============================================
function showLoadingState() {
  const grid = document.getElementById('products-grid');
  const trackEl = document.getElementById('carousel-track');
  const placeholder = `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>`;
  const skeletons = Array(6).fill(placeholder).join('');

  if (grid) grid.innerHTML = skeletons;
  if (trackEl) trackEl.innerHTML = Array(3).fill(placeholder).join('');
}

function hideLoadingState() {
  // Content is replaced by actual render calls  nothing extra needed.
}

// ============================================
// WHATSAPP
// ============================================
function buyViaWhatsApp(productName, price, productId) {
  let product = null;
  if (productId !== undefined && productId !== null) {
    product = PRODUCTS.find(p => p.id === productId || p.shopifyGid === productId);
  }
  if (!product && productName) {
    const cleanName = productName.toLowerCase().trim();
    product = PRODUCTS.find(p => p.name.toLowerCase().trim() === cleanName || p.name.toLowerCase().includes(cleanName) || cleanName.includes(p.name.toLowerCase()));
  }

  let linkText = '';
  if (product) {
    const fallbackHandle = product.handle || encodeURIComponent(product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const shopifyLink = product.shopifyUrl || `https://${SHOPIFY_DOMAIN}/products/${fallbackHandle}`;
    const isLiveWeb = window.location.protocol !== 'file:' && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1') && window.location.host !== '';

    if (isLiveWeb) {
      const baseUrl = window.location.origin + window.location.pathname;
      const webLink = `${baseUrl}#product-${product.id}`;
      linkText = `\n\n🔗 Website Link: ${webLink}\n🛒 Store Link: ${shopifyLink}`;
    } else {
      linkText = `\n\n🔗 Product Link: ${shopifyLink}`;
    }
  } else if (window.location.protocol !== 'file:') {
    linkText = `\n\n🔗 Link: ${window.location.href}`;
  }

  const message = `Hello! I'm interested in purchasing the *${productName}* (${price}) from ${CONFIG.storeName}.${linkText}\n\nIs it available? Please share more details.`;
  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('Opening WhatsApp…');
}

// ============================================
// RENDER HELPERS
// ============================================
function createStars(rating) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += `<span class="star">${i <= Math.floor(rating) ? '★' : (i - 0.5 <= rating ? '★' : '☆')}</span>`;
  }
  return s;
}

function renderProductCard(product) {
  const wished = wishlist.has(product.id);
  const safeName = product.name.replace(/'/g, "\\'");
  return `
    <article class="product-card" data-category="${product.category}" data-id="${product.id}">
      <div class="product-img-wrap" style="cursor:pointer;" onclick="openProductDetail(${product.id})">
        <img
          src="${product.image}"
          alt="${product.imageAlt || product.name}"
          class="product-img"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80'"
        />
        <button
          class="product-quickview-btn"
          onclick="event.stopPropagation(); openQuickView(${product.id})"
          aria-label="Quick view ${safeName}"
        >
          👁 Quick View
        </button>
        <span class="product-region-tag">${product.region}</span>
        <button
          class="product-wishlist-btn ${wished ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleWishlist(${product.id}, this)"
          aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-type">${product.type}</div>
        <h3 class="product-name" style="cursor:pointer; transition:color 0.2s;" onclick="openProductDetail(${product.id})">${product.name}</h3>
        <div class="product-price-row">
          <div>
            <div class="product-price">${product.price}</div>
            ${product.priceOriginal ? `<div class="product-price-original">${product.priceOriginal}</div>` : ''}
          </div>
          <div class="product-rating">
            ${createStars(product.rating)}
            <span class="product-rating-count">(${product.reviews})</span>
          </div>
        </div>
        <div style="display:flex; gap:0.4rem; width:100%;">
          <button
            class="icon-btn btn-add-cart-card"
            style="width:38px; height:38px; border-radius:4px; flex-shrink:0; border:1.5px solid var(--gold); color:var(--gold); background:transparent;"
            onclick="event.stopPropagation(); addToCart(${product.id})"
            aria-label="Add to cart"
            title="Add to cart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
          </button>
          <button
            class="btn-product-whatsapp"
            style="flex:1;"
            onclick="event.stopPropagation(); buyViaWhatsApp('${safeName}', '${product.price}', ${product.id})"
            id="wa-btn-${product.id}"
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  `;
}

// ============================================
// PRODUCT DETAIL PAGE
// ============================================
function openProductDetail(productId) {
  const product = PRODUCTS.find(p => p.id == productId || String(p.id) === String(productId));
  if (!product) return;

  const contentEl = document.getElementById('product-detail-content');
  const breadcrumbEl = document.getElementById('breadcrumb-title');
  const relatedGrid = document.getElementById('related-products-grid');

  if (breadcrumbEl) breadcrumbEl.textContent = product.name;

  const wished = wishlist.has(product.id);
  const safeName = product.name.replace(/'/g, "\\'");
  const images = (product.images && product.images.length) ? product.images : [product.image];

  window.currentDetailImages = images;
  window.currentDetailIndex = 0;

  let thumbsHtml = '';
  if (images.length > 1) {
    thumbsHtml = `
      <div class="gallery-carousel-container">
        <button class="thumb-scroll-btn left" onclick="scrollThumbs(-1)" aria-label="Scroll thumbnails left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="product-gallery-thumbs" id="detail-gallery-thumbs">
          ${images.map((imgUrl, i) => `
            <button class="thumb-btn ${i === 0 ? 'active' : ''}" data-idx="${i}" onclick="selectDetailImage(${i})" aria-label="View photo ${i+1}">
              <img src="${imgUrl}" alt="${product.name} photo ${i+1}" class="thumb-img" onerror="this.src='https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80'" />
            </button>
          `).join('')}
        </div>
        <button class="thumb-scroll-btn right" onclick="scrollThumbs(1)" aria-label="Scroll thumbnails right">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    `;
  }

  if (contentEl) {
    contentEl.innerHTML = `
      <div class="product-media-col">
        <div class="main-image-wrap">
          <img src="${images[0]}" alt="${product.imageAlt || product.name}" id="detail-main-img" class="detail-main-img" onerror="this.src='https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80'" />
          ${images.length > 1 ? `
            <button class="gallery-nav-btn prev-btn" onclick="navigateDetailImage(-1)" aria-label="Previous photo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="gallery-nav-btn next-btn" onclick="navigateDetailImage(1)" aria-label="Next photo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <div class="gallery-counter" id="detail-img-counter">1 / ${images.length}</div>
          ` : ''}
        </div>
        ${thumbsHtml}
      </div>
      <div class="product-info-col">
        <div class="detail-badges">
          <span class="detail-region-badge">${product.region}</span>
          <span class="detail-type-badge">${product.type}</span>
        </div>
        <h1 class="detail-title">${product.name}</h1>
        <div class="detail-rating-row">
          <span class="detail-stars">${createStars(product.rating)}</span>
          <span class="detail-review-count">${product.rating.toFixed(1)} (${product.reviews} customer reviews)</span>
        </div>
        <div class="detail-price-row">
          <span class="detail-current-price">${product.price}</span>
          ${product.priceOriginal ? `<span class="detail-orig-price">${product.priceOriginal}</span> <span class="detail-discount-tag">Limited Offer</span>` : ''}
        </div>
        <div class="detail-actions">
          <div style="display:flex; flex-direction:column; gap:0.75rem; width:100%;">
            <button class="btn-primary" style="width:100%; justify-content:center; align-items:center; gap:0.65rem; padding:0.95rem 2rem; font-size:0.95rem; letter-spacing:0.08em; background:var(--gold); border:2px solid var(--gold); color:#fff; border-radius:6px; cursor:pointer;" onclick="addToCart(${product.id})">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
              <span>ADD TO SHOPPING BAG</span>
            </button>
            <button class="btn-detail-whatsapp" onclick="buyViaWhatsApp('${safeName}', '${product.price}', ${product.id})">
              <span>BUY VIA WHATSAPP</span>
            </button>
          </div>
          <div class="detail-secondary-actions">
            <button class="btn-detail-wishlist ${wished ? 'active' : ''}" onclick="toggleWishlist(${product.id}, this)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${wished ? 'Saved to Wishlist' : 'Add to Wishlist'}
            </button>
            <button class="btn-detail-share" onclick="shareProduct('${safeName}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Saree
            </button>
          </div>
        </div>
        <div class="detail-desc">
          ${product.description || 'An authentic Indian heritage saree sourced directly from master weavers. Handpicked for exceptional drape, rich texture, and timeless craftsmanship.'}
        </div>
      </div>
    `;
  }

  if (relatedGrid) {
    const related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
    const relatedToShow = related.length ? related : PRODUCTS.filter(p => p.id !== product.id).slice(0, 4);
    relatedGrid.innerHTML = relatedToShow.map(renderProductCard).join('');
  }

  // Phase 1: Populate Sticky Mobile Bar
  const stickyImg = document.getElementById('sticky-bar-img');
  const stickyTitle = document.getElementById('sticky-bar-title');
  const stickyPrice = document.getElementById('sticky-bar-price');
  const stickyBtn = document.getElementById('sticky-bar-btn');
  if (stickyImg) stickyImg.src = images[0];
  if (stickyTitle) stickyTitle.textContent = product.name;
  if (stickyPrice) stickyPrice.textContent = product.price;
  if (stickyBtn) stickyBtn.onclick = () => buyViaWhatsApp(product.name, product.price, product.id);
  document.body.classList.add('viewing-product');

  showView('product');
  setTimeout(initIntersectionObserver, 80);
}

function switchMainImage(url, thumbEl) {
  const mainImg = document.getElementById('detail-main-img');
  if (mainImg) mainImg.src = url;
  document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
  if (thumbEl) {
    thumbEl.classList.add('active');
    const idx = parseInt(thumbEl.getAttribute('data-idx') || '0', 10);
    if (!isNaN(idx) && window.currentDetailImages) {
      window.currentDetailIndex = idx;
      const counter = document.getElementById('detail-img-counter');
      if (counter) counter.textContent = `${idx + 1} / ${window.currentDetailImages.length}`;
    }
  }
}

function navigateDetailImage(direction) {
  if (!window.currentDetailImages || !window.currentDetailImages.length) return;
  window.currentDetailIndex = (window.currentDetailIndex + direction + window.currentDetailImages.length) % window.currentDetailImages.length;
  updateDetailImageDisplay();
}

function selectDetailImage(index) {
  if (!window.currentDetailImages || index < 0 || index >= window.currentDetailImages.length) return;
  window.currentDetailIndex = index;
  updateDetailImageDisplay();
}

function updateDetailImageDisplay() {
  const mainImg = document.getElementById('detail-main-img');
  const counter = document.getElementById('detail-img-counter');
  const stickyImg = document.getElementById('sticky-bar-img');

  if (!window.currentDetailImages || !window.currentDetailImages.length) return;
  const url = window.currentDetailImages[window.currentDetailIndex];

  if (mainImg) {
    mainImg.style.opacity = '0.3';
    setTimeout(() => {
      mainImg.src = url;
      mainImg.style.opacity = '1';
    }, 120);
  }
  if (stickyImg) stickyImg.src = url;
  if (counter) counter.textContent = `${window.currentDetailIndex + 1} / ${window.currentDetailImages.length}`;

  document.querySelectorAll('#detail-gallery-thumbs .thumb-btn').forEach((b, i) => {
    if (i === window.currentDetailIndex) {
      b.classList.add('active');
      if (b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      b.classList.remove('active');
    }
  });
}

function scrollThumbs(direction) {
  const container = document.getElementById('detail-gallery-thumbs');
  if (container && container.scrollBy) {
    container.scrollBy({ left: direction * 180, behavior: 'smooth' });
  }
}

function shareProduct(name) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    showToast(`✓ Link for "${name}" copied to clipboard!`);
  } else {
    showToast(`Share: ${name}`);
  }
}

// ============================================
// PHASE 2: QUICK-VIEW MODAL LOGIC
// ============================================
function openQuickView(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const modal = document.getElementById('quickview-modal');
  const bodyEl = document.getElementById('quickview-body');
  if (!modal || !bodyEl) return;

  const safeName = product.name.replace(/'/g, "\\'");
  const images = (product.images && product.images.length) ? product.images : [product.image];

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <img src="${images[0]}" alt="${product.name}" style="width:100%; height:380px; max-height:50vh; object-fit:cover; border-radius:8px; border:1px solid rgba(212,175,55,0.3);" id="qv-main-img" />
      ${images.length > 1 ? `
        <div style="display:flex; gap:0.5rem; overflow-x:auto;">
          ${images.map((img) => `
            <img src="${img}" style="width:50px; height:65px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid var(--gold);" onclick="document.getElementById('qv-main-img').src='${img}'" />
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div style="display:flex; flex-direction:column; justify-content:center; gap:1rem;">
      <div>
        <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--gold-dark); font-weight:700;">${product.region} • ${product.type}</span>
        <h2 style="font-family:var(--font-serif); font-size:1.6rem; color:var(--charcoal); margin:0.5rem 0;">${product.name}</h2>
        <div style="font-size:1.4rem; font-weight:700; color:var(--crimson);">${product.price}</div>
      </div>
      <p style="font-size:0.9rem; color:var(--charcoal-light); line-height:1.6; max-height:150px; overflow-y:auto;">${product.description || 'Authentic Indian handloom heritage weave crafted with pure silk and traditional motifs.'}</p>
      <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
        <div style="display:flex; gap:0.5rem;">
          <button class="btn-primary" style="flex:1; justify-content:center; padding:0.75rem 0.5rem; font-size:0.85rem;" onclick="addToCart(${product.id})">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
            <span>ADD TO BAG</span>
          </button>
          <button class="btn-primary" style="flex:1; justify-content:center; padding:0.75rem 0.5rem; font-size:0.85rem; background:var(--charcoal); border-color:var(--charcoal);" onclick="closeQuickView(); openProductDetail(${product.id});">View Details</button>
        </div>
        <button class="btn-detail-whatsapp" style="width:100%; justify-content:center; padding:0.75rem 1rem;" onclick="buyViaWhatsApp('${safeName}', '${product.price}', ${product.id})">
          <span>BUY VIA WHATSAPP</span>
        </button>
      </div>
    </div>
  `;
  modal.classList.add('active');
}

function closeQuickView(event) {
  if (event && event.target && !event.target.classList.contains('quickview-modal-overlay')) return;
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('active');
}

// ============================================
// CAROUSEL
// ============================================
function getCarouselVisible() {
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth <= 1100) return 2;
  return 3;
}

// ============================================
// ACCORDION GALLERY SHOWCASE (REACT BITS)
// ============================================
let accordionActiveIndex = 2;

function buildAccordionGallery() {
  const container = document.getElementById('accordion-gallery-root');
  if (!container) return;

  // Filter 5-6 featured products
  let items = PRODUCTS.filter(p => p.featured);
  if (!items.length || items.length < 5) {
    items = PRODUCTS.slice(0, 5);
  } else {
    items = items.slice(0, 6);
  }

  const count = items.length;
  accordionActiveIndex = Math.min(2, count - 1);

  // Render HTML
  let html = `<div class="accordion-gallery" id="accordion-gallery" role="list" aria-label="Featured Sarees Accordion Gallery">`;
  items.forEach((p, i) => {
    const isActive = i === accordionActiveIndex;
    html += `
      <div
        class="ag-panel ${isActive ? 'ag-panel--active' : ''}"
        data-index="${i}"
        data-id="${p.id}"
        role="listitem"
        tabindex="0"
        aria-current="${isActive ? 'true' : 'false'}"
        aria-label="${p.name}"
      >
        <span class="ag-panel__frame">
          <span class="ag-panel__media">
            <img src="${p.image}" alt="${p.name}" draggable="false" />
          </span>
          <span class="ag-panel__overlay" aria-hidden="true"></span>
        </span>
        <span class="ag-panel__label" aria-hidden="true">
          <span class="ag-panel__bar"></span>
          <div class="ag-panel__content">
            <span class="ag-panel__text">${p.name}</span>
            <span class="ag-panel__price">
              <span class="ag-price-val">${p.price}</span>
              <span class="ag-panel__cta">EXPLORE →</span>
            </span>
          </div>
        </span>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;

  // Attach interactive listeners and GSAP timeline layout
  initAccordionGalleryEvents(items);
}

function initAccordionGalleryEvents(items) {
  const galleryEl = document.getElementById('accordion-gallery');
  if (!galleryEl) return;

  const panels = galleryEl.querySelectorAll('.ag-panel');
  const count = panels.length;
  const expandRatio = 0.52;
  const duration = 0.55;
  const ease = 'power3.out';
  const tilt = 6;
  const stagger = 0.05;

  let currentTl = null;
  let wasMobile = window.innerWidth <= 768;

  const updateLayout = (activeIndex, animate = true) => {
    const isMobile = window.innerWidth <= 768;
    const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
    const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
    const dur = animate ? duration : 0;

    if (typeof gsap === 'undefined') return;

    // Clear inline GSAP props when switching between mobile and desktop
    if (wasMobile !== isMobile) {
      panels.forEach(panel => {
        const media = panel.querySelector('.ag-panel__media');
        const elements = panel.querySelectorAll('.ag-panel__bar, .ag-panel__eyebrow, .ag-panel__text, .ag-panel__price');
        gsap.set([panel, media, ...elements], { clearProps: 'all' });
      });
      wasMobile = isMobile;
    }

    if (currentTl) currentTl.kill();
    currentTl = gsap.timeline();

    panels.forEach((panel, i) => {
      const isActive = i === activeIndex;
      const media = panel.querySelector('.ag-panel__media');
      const bar = panel.querySelector('.ag-panel__bar');
      const eyebrow = panel.querySelector('.ag-panel__eyebrow');
      const text = panel.querySelector('.ag-panel__text');
      const price = panel.querySelector('.ag-panel__price');

      panel.classList.toggle('ag-panel--active', isActive);
      panel.setAttribute('aria-current', isActive ? 'true' : 'false');

      if (!isMobile) {
        const rot = isActive ? 0 : (i < activeIndex ? tilt : -tilt);
        currentTl.to(panel, { flexGrow: isActive ? grow : 1, rotateY: rot, height: '100%', duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, activeIndex - i));
          const shiftX = isActive ? 0 : drift * 12;
          const gray = isActive ? 0 : 1;
          currentTl.to(
            media,
            {
              top: '-5%',
              left: '-10%',
              width: '120%',
              height: '110%',
              xPercent: 0,
              yPercent: 0,
              scale: isActive ? 1.05 : 1.0,
              x: shiftX,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.4,
              duration: dur,
              ease
            },
            0
          );
        }

        if (bar && text && price) {
          const cta = panel.querySelector('.ag-panel__cta');
          currentTl.to(bar, { opacity: isActive ? 1 : 0.6, duration: dur, ease }, 0);
          currentTl.to(text, { opacity: isActive ? 1 : 0.85, x: 0, duration: dur, ease }, 0);
          currentTl.to(price, { opacity: 1, x: 0, duration: dur, ease }, 0);
          if (cta) {
            currentTl.to(cta, { opacity: isActive ? 1 : 0, x: isActive ? 0 : -8, duration: dur, ease }, 0);
          }
        }
      } else {
        // Mobile Vertical Accordion
        const targetHeight = isActive ? 280 : 84;
        currentTl.to(panel, { height: targetHeight, duration: dur, ease }, 0);

        if (media) {
          currentTl.to(
            media,
            {
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              xPercent: 0,
              yPercent: 0,
              x: 0,
              scale: isActive ? 1.05 : 1.0,
              '--ag-gray': isActive ? 0 : 0.3,
              '--ag-dim': isActive ? 0.15 : 0.4,
              duration: dur,
              ease
            },
            0
          );
        }

        if (bar && text && price) {
          const cta = panel.querySelector('.ag-panel__cta');
          currentTl.to(bar, { opacity: isActive ? 1 : 0.6, duration: dur, ease }, 0);
          currentTl.to(text, { opacity: 1, x: 0, duration: dur, ease }, 0);
          currentTl.to(price, { opacity: 1, y: 0, duration: dur, ease }, 0);
          if (cta) {
            currentTl.to(cta, { opacity: isActive ? 1 : 0, duration: dur, ease }, 0);
          }
        }
      }
    });
  };

  // Initial layout calculation
  updateLayout(accordionActiveIndex, false);

  // Panel hover & click handling
  panels.forEach((panel, i) => {
    panel.addEventListener('mouseenter', () => {
      if (window.innerWidth > 768) {
        accordionActiveIndex = i;
        updateLayout(i, true);
      }
    });

    panel.addEventListener('click', (e) => {
      const rawId = panel.getAttribute('data-id');
      const pId = isNaN(rawId) ? rawId : Number(rawId);
      if (accordionActiveIndex === i || e.target.closest('.ag-panel__cta')) {
        if (pId !== null && pId !== undefined) openProductDetail(pId);
      } else {
        accordionActiveIndex = i;
        updateLayout(i, true);
      }
    });

    panel.addEventListener('keydown', (e) => {
      const rawId = panel.getAttribute('data-id');
      const pId = isNaN(rawId) ? rawId : Number(rawId);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (pId !== null && pId !== undefined) openProductDetail(pId);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (i + 1) % count;
        accordionActiveIndex = next;
        panels[next].focus();
        updateLayout(next, true);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (i - 1 + count) % count;
        accordionActiveIndex = prev;
        panels[prev].focus();
        updateLayout(prev, true);
      }
    });
  });

  window.addEventListener('resize', () => {
    updateLayout(accordionActiveIndex, false);
  });
}

// ============================================
// CATALOG
// ============================================
function renderCatalogProducts(filter = currentFilter) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let filtered = filter === 'all'
    ? PRODUCTS.slice()
    : PRODUCTS.filter(p => {
        if (p.category === filter) return true;
        const normalizedFilter = filter.replace(/-/g, ' ').toLowerCase();
        const combined = `${p.name} ${p.type} ${p.region} ${p.category}`.toLowerCase();
        return combined.includes(normalizedFilter);
      });

  if (currentRegion !== 'all') {
    filtered = filtered.filter(p => (p.region || '').toLowerCase().includes(currentRegion.toLowerCase()));
  }

  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => (a.priceNumeric || 0) - (b.priceNumeric || 0));
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => (b.priceNumeric || 0) - (a.priceNumeric || 0));
  } else if (currentSort === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="
        grid-column:1/-1;
        text-align:center;
        padding:4rem 2rem;
        color:var(--charcoal-muted);
        font-family:var(--font-serif);
        font-size:1.2rem;
        line-height:1.8;
      ">
        No sarees found matching your selection.<br/>
        <span style="font-family:var(--font-sans);font-size:0.85rem;cursor:pointer;color:var(--crimson);text-decoration:underline;" onclick="filterProducts('all', document.getElementById('filter-all')); filterByRegion('all', null);">
          Reset all filters
        </span>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(renderProductCard).join('');
  initCard3DTilt();
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(
      grid.querySelectorAll('.product-card'),
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out' }
    );
  }
  setTimeout(initIntersectionObserver, 80);
}

function initCard3DTilt() {
  const cards = document.querySelectorAll('.product-card');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) return;

  cards.forEach(card => {
    if (card.dataset.tiltInitialized) return;
    card.dataset.tiltInitialized = 'true';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -3.5;
      const rotateY = ((x - centerX) / centerX) * 3.5;

      card.style.transform = `perspective(1000px) translateY(-6px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function filterProducts(category, btn) {
  currentFilter = category;
  document.querySelectorAll('.cat-tab, .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCatalogProducts(category);
}

function filterByRegion(region, btn) {
  currentRegion = region;
  document.querySelectorAll('.region-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const selectEl = document.getElementById('region-select');
  if (selectEl && selectEl.value !== region) selectEl.value = region;
  renderCatalogProducts(currentFilter);
}

function sortProducts(sortVal) {
  currentSort = sortVal;
  renderCatalogProducts(currentFilter);
}

// Dim filter buttons that have zero matching products so the
// user can see at a glance which categories have inventory.
function renderCollectionFilterTabs(fetchedCollections = []) {
  const container = document.getElementById('category-tabs-wrap');
  if (!container) return;

  const defaultTabs = [
    { id: 'all', label: 'All Sarees' },
    { id: 'banarasi-silk', label: 'Banarasi Silk' },
    { id: 'katan-silk', label: 'Katan Silk' },
    { id: 'ho-crepe', label: 'HO Crepe' },
    { id: 'mysore-crepe', label: 'Mysore Crepe' },
    { id: 'raw-mango', label: 'Raw Mango Silk' },
    { id: 'katti-crepe', label: 'Katti Crepe' },
    { id: 'katti-georgette', label: 'Katti Georgette' }
  ];

  let tabs = [...defaultTabs];

  if (fetchedCollections.length) {
    fetchedCollections.forEach(col => {
      const exists = tabs.some(t => t.id === col.handle || t.label.toLowerCase() === col.title.toLowerCase());
      if (!exists) {
        tabs.push({ id: col.handle, label: col.title });
      }
    });
  }

  container.innerHTML = tabs.map(t => `
    <button class="cat-tab ${currentFilter === t.id ? 'active' : ''}" onclick="filterProducts('${t.id}', this)" id="filter-${t.id}">${t.label}</button>
  `).join('');

  updateFilterButtonCounts(tabs);
}

function updateFilterButtonCounts(tabsList) {
  const tabs = tabsList || [
    { id: 'all', label: 'All Sarees' },
    { id: 'banarasi-silk', label: 'Banarasi Silk' },
    { id: 'katan-silk', label: 'Katan Silk' },
    { id: 'ho-crepe', label: 'HO Crepe' },
    { id: 'mysore-crepe', label: 'Mysore Crepe' },
    { id: 'raw-mango', label: 'Raw Mango Silk' },
    { id: 'katti-crepe', label: 'Katti Crepe' },
    { id: 'katti-georgette', label: 'Katti Georgette' }
  ];

  tabs.forEach(cat => {
    if (cat.id === 'all') return;
    const btn = document.getElementById(`filter-${cat.id}`);
    if (!btn) return;
    const count = PRODUCTS.filter(p => p.category === cat.id || (p.name || '').toLowerCase().includes(cat.id.replace('-', ' '))).length;
    if (count === 0) {
      btn.style.opacity = '0.4';
      btn.title = `No products in this collection yet`;
    } else {
      btn.style.opacity = '';
      btn.title = `${count} product${count > 1 ? 's' : ''}`;
    }
  });
}

// ============================================
// SEARCH
// ============================================
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  const input = document.getElementById('search-input');
  searchOpen = !searchOpen;
  if (searchOpen) {
    bar.classList.add('open');
    setTimeout(() => input && input.focus(), 300);
  } else {
    bar.classList.remove('open');
    if (input) input.value = '';
  }
}

let _searchDebounce;
function handleSearch(value) {
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => {
    if (currentView !== 'catalog') showView('catalog');
    const q = value.toLowerCase().trim();
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const filtered = q === ''
      ? (currentFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === currentFilter))
      : PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );

    grid.innerHTML = filtered.map(renderProductCard).join('');
    setTimeout(initIntersectionObserver, 80);
  }, 220);
}

// ============================================
// WISHLIST & CART SYSTEM
// ============================================
function saveWishlist() {
  localStorage.setItem('sonaff_wishlist', JSON.stringify([...wishlist]));
  updateWishlistBadge();
}

function toggleWishlist(productId, btn) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      btn.setAttribute('aria-label', 'Add to wishlist');
    }
    showToast('Removed from wishlist');
  } else {
    wishlist.add(productId);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      btn.setAttribute('aria-label', 'Remove from wishlist');
    }
    showToast('❤️ Added to wishlist');
  }
  saveWishlist();
  if (document.getElementById('wishlist-modal')?.classList.contains('active')) {
    renderWishlistDrawer();
  }
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-badge');
  const drawerCount = document.getElementById('wishlist-drawer-count');
  const size = wishlist.size;
  if (badge) {
    badge.textContent = size;
    if (size > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  }
  if (drawerCount) drawerCount.textContent = `(${size})`;
}

function openWishlistModal() {
  const modal = document.getElementById('wishlist-modal');
  if (!modal) return;
  renderWishlistDrawer();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWishlistModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('wishlist-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function clearWishlist() {
  if (!wishlist.size) return;
  wishlist.clear();
  saveWishlist();
  showToast('❤️ Saved Wishlist cleared');
  renderWishlistDrawer();
}

function renderWishlistDrawer() {
  const body = document.getElementById('wishlist-drawer-body');
  const clearBtn = document.getElementById('btn-clear-wishlist');
  if (!body) return;

  if (clearBtn) {
    if (wishlist.size > 0) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  if (wishlist.size === 0) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">❤️</div>
        <h4 class="cart-empty-title">Your wishlist is empty</h4>
        <p>Save your favorite sarees to review or buy them later.</p>
        <button class="btn-primary" style="margin-top:0.5rem;" onclick="closeWishlistModal(); showView('catalog');">Explore Collection</button>
      </div>
    `;
    updateWishlistBadge();
    return;
  }

  let html = '';
  wishlist.forEach(id => {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    html += `
      <div class="cart-item-card">
        <img src="${p.image}" alt="${p.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div>
            <span class="cart-item-eyebrow">${p.region}</span>
            <h4 class="cart-item-title">${p.name}</h4>
            <div class="cart-item-price">${p.price}</div>
          </div>
          <div class="cart-item-actions">
            <button class="btn-primary" style="padding:0.4rem 0.85rem; font-size:0.75rem; display:inline-flex; align-items:center; gap:0.4rem;" onclick="addToCart(${p.id}); toggleWishlist(${p.id});">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
              <span>MOVE TO BAG</span>
            </button>
            <button class="cart-item-remove" onclick="toggleWishlist(${p.id})" aria-label="Remove item" title="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });
  body.innerHTML = html;
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(
      body.querySelectorAll('.cart-item-card'),
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' }
    );
  }
  updateWishlistBadge();
}

function saveCart() {
  localStorage.setItem('sonaff_cart', JSON.stringify(cart));
  updateCartBadge();
}

function syncCartWithProducts() {
  if (!PRODUCTS || !PRODUCTS.length) return;
  const initialLen = cart.length;
  cart = cart.filter(item => PRODUCTS.some(prod => String(prod.id) === String(item.id)));
  if (cart.length !== initialLen) {
    saveCart();
  } else {
    updateCartBadge();
  }
}

function updateCartBadge() {
  const badges = document.querySelectorAll('#cart-badge, .cart-badge-count');
  const drawerCounts = document.querySelectorAll('#cart-drawer-count');
  
  const validItems = (PRODUCTS && PRODUCTS.length)
    ? cart.filter(item => PRODUCTS.some(prod => String(prod.id) === String(item.id)))
    : cart;

  const totalQty = validItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  badges.forEach(badge => {
    badge.textContent = totalQty;
    if (totalQty > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  });
  drawerCounts.forEach(drawerCount => {
    drawerCount.textContent = `(${totalQty})`;
  });
}

function addToCart(productId) {
  const p = PRODUCTS.find(prod => String(prod.id) === String(productId));
  if (!p) return;
  const existing = cart.find(item => String(item.id) === String(productId));
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: p.id, quantity: 1 });
  }
  saveCart();
  showToast(`🛍️ Added ${p.name} to bag`);
  renderCartDrawer();
}

function removeFromCart(productId) {
  cart = cart.filter(item => String(item.id) !== String(productId));
  saveCart();
  showToast('Removed item from bag');
  renderCartDrawer();
}

function updateCartQty(productId, delta) {
  const existing = cart.find(item => String(item.id) === String(productId));
  if (!existing) return;
  existing.quantity += delta;
  if (existing.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
    renderCartDrawer();
  }
}

function toggleCartModal() {
  const modal = document.getElementById('cart-modal');
  if (!modal) return;
  if (modal.classList.contains('active')) {
    closeCartModal();
  } else {
    openCartModal();
  }
}

function openCartModal() {
  const modal = document.getElementById('cart-modal');
  if (!modal) return;
  renderCartDrawer();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('cart-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  saveCart();
  showToast('🛍️ Shopping bag cleared');
  renderCartDrawer();
}

function renderCartDrawer() {
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  const totalPriceEl = document.getElementById('cart-total-price');
  const clearBtn = document.getElementById('btn-clear-cart');
  if (!body) return;

  if (PRODUCTS && PRODUCTS.length) {
    const initialLen = cart.length;
    cart = cart.filter(item => PRODUCTS.some(prod => String(prod.id) === String(item.id)));
    if (cart.length !== initialLen) {
      saveCart();
    }
  }

  if (clearBtn) {
    if (cart.length > 0) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🛍️</div>
        <h4 class="cart-empty-title">Your shopping bag is empty</h4>
        <p>Explore our living heritage weaves and find your perfect saree.</p>
        <button class="btn-primary" style="margin-top:0.5rem;" onclick="closeCartModal(); showView('catalog');">Explore Collection</button>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    updateCartBadge();
    return;
  }

  if (footer) footer.style.display = 'block';

  let totalPriceVal = 0;
  let html = '';

  cart.forEach(item => {
    const p = PRODUCTS.find(prod => String(prod.id) === String(item.id));
    if (!p) return;
    const numPrice = parseInt(p.price.replace(/[^0-9]/g, ''), 10) || 0;
    const itemTotal = numPrice * item.quantity;
    totalPriceVal += itemTotal;

    html += `
      <div class="cart-item-card">
        <img src="${p.image}" alt="${p.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div>
            <span class="cart-item-eyebrow">${p.region}</span>
            <h4 class="cart-item-title">${p.name}</h4>
            <div class="cart-item-price">₹${itemTotal.toLocaleString('en-IN')} ${item.quantity > 1 ? `<span style="font-size:0.75rem; color:var(--charcoal-muted); font-weight:400;">(${p.price} ea)</span>` : ''}</div>
          </div>
          <div class="cart-item-actions">
            <div class="cart-qty-controls">
              <button class="cart-qty-btn" onclick="updateCartQty('${p.id}', -1)" aria-label="Decrease quantity">&minus;</button>
              <span class="cart-qty-val">${item.quantity}</span>
              <button class="cart-qty-btn" onclick="updateCartQty('${p.id}', 1)" aria-label="Increase quantity">&plus;</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${p.id}')" aria-label="Remove item" title="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  body.innerHTML = html;
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(
      body.querySelectorAll('.cart-item-card'),
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' }
    );
  }
  if (totalPriceEl) totalPriceEl.textContent = '₹' + totalPriceVal.toLocaleString('en-IN');
  updateCartBadge();
}

function checkoutCartViaWhatsApp() {
  if (cart.length === 0) {
    showToast('⚠️ Your shopping bag is empty!');
    return;
  }
  let totalItems = 0;
  let totalPriceVal = 0;
  let itemsText = '';

  cart.forEach((item, idx) => {
    const p = PRODUCTS.find(prod => String(prod.id) === String(item.id));
    if (!p) return;
    totalItems += item.quantity;
    const numPrice = parseInt(p.price.replace(/[^0-9]/g, ''), 10) || 0;
    const itemTotal = numPrice * item.quantity;
    totalPriceVal += itemTotal;

    itemsText += `${idx + 1}. *${p.name}*\n   • Region/Type: ${p.region} | ${p.type}\n   • Qty: ${item.quantity}\n   • Unit Price: ${p.price}\n   • Subtotal: ₹${itemTotal.toLocaleString('en-IN')}\n\n`;
  });

  const formattedTotal = '₹' + totalPriceVal.toLocaleString('en-IN');
  const message = `*Hello SonAff Saree!* I would like to order the following handloom sarees from my Shopping Bag:\n\n${itemsText}----------------------------------\n*Total Items:* ${totalItems}\n*Estimated Order Total:* ${formattedTotal}\n----------------------------------\n\nPlease confirm availability and share payment/shipping instructions. Thank you!`;

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  showToast('Opening WhatsApp Checkout…');
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ============================================
// NEWSLETTER & CONTACT
// ============================================
function handleNewsletter(event) {
  event.preventDefault();
  const input = event.target.querySelector('input[type="email"]');
  if (input && input.value) {
    showToast('✓ Subscribed! Welcome to SonAff Saree.');
    input.value = '';
  }
}

function handleContact(event) {
  event.preventDefault();
  const form = event.target;
  const successEl = document.getElementById('form-success');
  const submitBtn = document.getElementById('contact-submit-btn');
  if (submitBtn) { submitBtn.textContent = 'Sending…'; submitBtn.disabled = true; }

  if (typeof emailjs === 'undefined') {
    if (submitBtn) { submitBtn.textContent = 'Send Message'; submitBtn.disabled = false; }
    showToast("⚠ Error: EmailJS library not loaded! Press Ctrl+Shift+R to hard refresh.");
    console.error("EmailJS global object is undefined.");
    return;
  }

  // EmailJS is loaded, send the form
  try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) { console.warn('EmailJS init warning:', e); }
  emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form, EMAILJS_PUBLIC_KEY)
    .then((response) => {
      console.log('EmailJS Success:', response.status, response.text);
      form.reset();
      if (successEl) successEl.classList.remove('hidden');
      if (submitBtn) { submitBtn.textContent = 'Send Message'; submitBtn.disabled = false; }
      showToast("✓ Message sent! We'll reply within 24 hours.");
    })
    .catch((error) => {
      console.error('EmailJS Error:', error);
      if (submitBtn) { submitBtn.textContent = 'Send Message'; submitBtn.disabled = false; }
      const errMsg = error.text || error.message || (typeof error === 'string' ? error : 'Check console');
      showToast("⚠ EmailJS Error: " + errMsg);
    });
}

// ============================================
// MOBILE MENU  fullscreen overlay
// ============================================
function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('btn-mobile-menu');
  if (mobileMenuOpen) {
    menu.classList.add('open');
    btn && btn.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    closeMobileMenu();
  }
}

function closeMobileMenu() {
  mobileMenuOpen = false;
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('btn-mobile-menu');
  menu && menu.classList.remove('open');
  btn  && btn.classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================
// TOAST
// ============================================
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
// Singleton observer — avoids creating a new instance on every call
let _scrollObserver = null;
function getScrollObserver() {
  if (_scrollObserver) return _scrollObserver;
  _scrollObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); _scrollObserver.unobserve(e.target); }
    }),
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  return _scrollObserver;
}
function initIntersectionObserver() {
  const obs = getScrollObserver();
  // Observe both .fade-up and .reveal elements (portfolio design system)
  document.querySelectorAll('.fade-up:not(.visible), .reveal:not(.visible)').forEach(el => obs.observe(el));
}

function handleHeaderScroll() {
  const header = document.getElementById('site-header');
  header && header.classList.toggle('scrolled', window.scrollY > 20);
}

// ============================================
// KEYBOARD
// ============================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (searchOpen) toggleSearch();
    if (mobileMenuOpen) closeMobileMenu();
  }
});

// ============================================
// RESIZE
// ============================================
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    carouselVisible = getCarouselVisible();
    updateCarouselPosition();
  }, 150);
});

// Skeleton styles are already defined in style.css — no injection needed.

// ============================================
// ★ INITIALISATION  Async entry point
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Show the page shell immediately
  showView('home');
  showLoadingState();

  // 2. Fetch products from Shopify (or fall back to demo data)
  PRODUCTS = await fetchShopifyProducts();

  // 3. Boot all product-dependent UI
  renderCatalogProducts('all');
  buildAccordionGallery();
  updateFilterButtonCounts(); // dim buttons with no products
  syncCartWithProducts();
  updateWishlistBadge();

  // 5. Global scroll + animation listeners
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  setTimeout(initIntersectionObserver, 200);

  console.log('%c✦ SonAff Saree ✦', 'font-family:serif;font-size:18px;color:#D78C2F;font-weight:bold;');
  // Detect whether we fell back to demo data (Shopify products always have a shopifyGid)
  const isLiveData = PRODUCTS.length > 0 && PRODUCTS[0].shopifyGid !== null;
  console.log(
    `%c${isLiveData
      ? `✓ ${PRODUCTS.length} products loaded from Shopify`
      : '⚠ Demo data active  check Shopify credentials in app.js'}`,
    `font-family:sans-serif;font-size:12px;color:${isLiveData ? '#2E7D32' : '#A6192E'};`
  );
  // Print each product's assigned category so you can verify
  logCategoryBreakdown(PRODUCTS);
});
