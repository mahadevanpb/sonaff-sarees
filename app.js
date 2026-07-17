/* ============================================
   SONAFF SAREES — App JavaScript v3
   Shopify Storefront API (Headless CMS)
   ============================================ */

'use strict';

// ============================================
// ★ SHOPIFY CONFIGURATION
//   Fill these in with your store credentials.
//   storeDomain  → your-store.myshopify.com
//   accessToken  → Storefront API public token
// ============================================
// ⚠ Domain must be just the hostname — no https:// prefix, no trailing slash
const SHOPIFY_DOMAIN     = 'dacfkb-0r.myshopify.com';
const STOREFRONT_TOKEN   = '99253b45465195716e0d9ae1ad39887f';
const STOREFRONT_API_VER = '2026-04';
const STOREFRONT_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${STOREFRONT_API_VER}/graphql.json`;

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
  query FetchProducts {
    products(first: 20) {
      edges {
        node {
          id
          title
          productType
          tags
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
          images(first: 1) {
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

    if (!edges.length) {
      throw new Error('No products returned from Shopify.');
    }

    return mapShopifyProducts(edges);

  } catch (err) {
    console.warn('[SonAff] Shopify fetch failed — using demo data.', err.message);
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

    // --- Category (from productType, tags AND title) ---
    const rawType = (node.productType ?? '').toLowerCase().trim();
    const rawTitle = (node.title ?? '').toLowerCase().trim();
    const category = normaliseCategoryTag(rawType, tags, rawTitle);

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

    return {
      id: numericId,
      shopifyGid: node.id,
      name: node.title ?? 'Saree',
      type: typeLabel,
      region: region,
      price: formattedPrice,
      priceOriginal: formattedOriginal,
      priceNumeric: rawAmount,
      category: category,
      image: image?.url ?? 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80',
      imageAlt: image?.altText ?? node.title,
      featured: featured,
      // Shopify has no ratings — use sensible defaults
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
function normaliseCategoryTag(rawType, tags, rawTitle = '') {
  // Combine every text source into one searchable string
  const combined = [
    rawType,
    rawTitle,
    ...tags.map(t => t.toLowerCase()),
  ].join(' ');

  // Order matters — more specific patterns first
  if (/ikat|pochampally|patola|double[\s-]?ikat/.test(combined))          return 'ikat';
  if (/handloom|tussar|gadwal|maheshwari|linen|jamdani|sambalpuri/.test(combined)) return 'handloom';
  if (/cotton|khadi|mul[\s-]?mul/.test(combined))                          return 'cotton';
  if (/silk|banarasi|kanjivaram|kanjeevaram|chanderi|mysore|bhagalpuri|uppada/.test(combined)) return 'silk';

  return 'silk'; // safe default
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
    category: 'silk', image: 'images/product_banarasi.png',
    imageAlt: 'Banarasi Silk Saree', featured: true, rating: 4.9, reviews: 142,
  },
  {
    id: 2, shopifyGid: null,
    name: 'Kanjivaram Silk Saree Magenta Mustard Border',
    type: 'Pure Silk', region: 'Kanchipuram, TN',
    price: '₹34,000', priceOriginal: '₹38,500', priceNumeric: 34000,
    category: 'silk', image: 'images/product_kanjivaram.png',
    imageAlt: 'Kanjivaram Silk Saree', featured: true, rating: 5.0, reviews: 89,
  },
  {
    id: 3, shopifyGid: null,
    name: 'Chanderi Silk Saree Pink Lotus Floral Pattern',
    type: 'Silk Cotton', region: 'Chanderi, MP',
    price: '₹14,500', priceOriginal: null, priceNumeric: 14500,
    category: 'silk', image: 'images/product_chanderi.png',
    imageAlt: 'Chanderi Silk Saree', featured: true, rating: 4.8, reviews: 217,
  },
  {
    id: 4, shopifyGid: null,
    name: 'Tussar Handloom Saree Natural Ivory Terracotta',
    type: 'Handloom Silk', region: 'Bhagalpur, Bihar',
    price: '₹9,800', priceOriginal: '₹12,000', priceNumeric: 9800,
    category: 'handloom', image: 'images/product_tussar.png',
    imageAlt: 'Tussar Handloom Saree', featured: true, rating: 4.7, reviews: 63,
  },
  {
    id: 5, shopifyGid: null,
    name: 'Patola Silk Saree Royal Blue Crimson Double Ikat',
    type: 'Double Ikat', region: 'Patan, Gujarat',
    price: '₹55,000', priceOriginal: '₹62,000', priceNumeric: 55000,
    category: 'ikat', image: 'images/product_patola.png',
    imageAlt: 'Patola Silk Saree', featured: true, rating: 5.0, reviews: 38,
  },
  {
    id: 6, shopifyGid: null,
    name: 'Pochampally Ikat Silk Saree Teal Purple Geometric',
    type: 'Ikat Silk', region: 'Pochampally, Telangana',
    price: '₹18,500', priceOriginal: '₹22,000', priceNumeric: 18500,
    category: 'ikat', image: 'images/product_pochampally.png',
    imageAlt: 'Pochampally Ikat Saree', featured: true, rating: 4.9, reviews: 104,
  },
  {
    id: 7, shopifyGid: null,
    name: 'Maheshwari Cotton Silk Saree Indigo Stripe',
    type: 'Cotton Silk', region: 'Maheshwar, MP',
    price: '₹8,200', priceOriginal: null, priceNumeric: 8200,
    category: 'cotton',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4a5792?w=600&h=800&fit=crop&q=80',
    imageAlt: 'Maheshwari Cotton Silk Saree', featured: false, rating: 4.6, reviews: 55,
  },
  {
    id: 8, shopifyGid: null,
    name: 'Gadwal Silk Cotton Saree Emerald Contrast Border',
    type: 'Silk Cotton', region: 'Gadwal, Telangana',
    price: '₹12,500', priceOriginal: '₹15,000', priceNumeric: 12500,
    category: 'handloom',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80',
    imageAlt: 'Gadwal Silk Cotton Saree', featured: false, rating: 4.8, reviews: 76,
  },
];

// ============================================
// GLOBAL STATE
// PRODUCTS starts empty — populated after the
// Shopify fetch resolves.
// ============================================
let PRODUCTS = [];

let currentView = 'home';
let currentFilter = 'all';
let wishlist = new Set();
let searchOpen = false;
let mobileMenuOpen = false;

// Carousel state
let carouselIndex = 0;
let carouselItems = [];
let carouselVisible = 3;

// ============================================
// VIEW MANAGEMENT
// ============================================
function showView(viewName, event) {
  if (event) event.preventDefault();

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
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileMenu();
  setTimeout(initIntersectionObserver, 120);

  const titles = {
    home: 'SonAff Saree — Authentic Indian Heritage Sarees',
    catalog: 'Full Collection — SonAff Saree',
    contact: 'Contact Us — SonAff Saree',
  };
  document.title = titles[viewName] || titles.home;
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
  // Content is replaced by actual render calls — nothing extra needed.
}

// ============================================
// WHATSAPP
// ============================================
function buyViaWhatsApp(productName, price) {
  const message = `Hello! I'm interested in purchasing the *${productName}* (${price}) from ${CONFIG.storeName}. Is it available? Please share more details.`;
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
      <div class="product-img-wrap">
        <img
          src="${product.image}"
          alt="${product.imageAlt || product.name}"
          class="product-img"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80'"
        />
        <span class="product-region-tag">${product.region}</span>
        <button
          class="product-wishlist-btn ${wished ? 'active' : ''}"
          onclick="toggleWishlist(${product.id}, this)"
          aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-type">${product.type}</div>
        <h3 class="product-name">${product.name}</h3>
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
        <button
          class="btn-product-whatsapp"
          onclick="buyViaWhatsApp('${safeName}', '${product.price}')"
          id="wa-btn-${product.id}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          Buy via WhatsApp
        </button>
      </div>
    </article>
  `;
}

// ============================================
// CAROUSEL
// ============================================
function getCarouselVisible() {
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth <= 1100) return 2;
  return 3;
}

function buildCarousel() {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!track || !dotsContainer) return;

  // Use products tagged "featured" in Shopify.
  // If none are tagged, fall back to the first 6 products so the carousel
  // is never empty (common when first connecting a Shopify store).
  carouselItems = PRODUCTS.filter(p => p.featured);
  if (!carouselItems.length) {
    carouselItems = PRODUCTS.slice(0, 6);
  }

  carouselVisible = getCarouselVisible();
  carouselIndex = 0;

  track.innerHTML = carouselItems.map(renderProductCard).join('');

  const totalPages = Math.ceil(carouselItems.length / carouselVisible);
  dotsContainer.innerHTML = '';
  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement('button');
    dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.onclick = () => goToSlide(i * carouselVisible);
    dotsContainer.appendChild(dot);
  }

  updateCarouselPosition();
}

function slideCarousel(dir) {
  carouselVisible = getCarouselVisible();
  const max = Math.max(0, carouselItems.length - carouselVisible);
  carouselIndex = Math.max(0, Math.min(carouselIndex + dir, max));
  updateCarouselPosition();
}

function goToSlide(index) {
  carouselVisible = getCarouselVisible();
  const max = Math.max(0, carouselItems.length - carouselVisible);
  carouselIndex = Math.max(0, Math.min(index, max));
  updateCarouselPosition();
}

function updateCarouselPosition() {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!track) return;

  const cards = track.querySelectorAll('.product-card');
  if (!cards.length) return;

  const viewport = document.getElementById('carousel-viewport');
  const gap = 24;
  const viewW = viewport ? viewport.offsetWidth : 0;
  const cardW = (viewW - gap * (carouselVisible - 1)) / carouselVisible;
  const offset = carouselIndex * (cardW + gap);

  track.style.transform = `translateX(-${offset}px)`;
  cards.forEach(c => { c.style.flex = `0 0 ${cardW}px`; });

  const max = Math.max(0, carouselItems.length - carouselVisible);
  if (prevBtn) prevBtn.disabled = carouselIndex === 0;
  if (nextBtn) nextBtn.disabled = carouselIndex >= max;

  const currentPage = Math.floor(carouselIndex / carouselVisible);
  if (dotsContainer) {
    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
    });
  }
}

let carouselTimer;
function startCarouselAutoPlay() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    carouselVisible = getCarouselVisible();
    const max = Math.max(0, carouselItems.length - carouselVisible);
    carouselIndex = carouselIndex >= max ? 0 : carouselIndex + 1;
    updateCarouselPosition();
  }, 4500);
}

function stopCarouselAutoPlay() { clearInterval(carouselTimer); }

function initCarouselSwipe() {
  const viewport = document.getElementById('carousel-viewport');
  if (!viewport) return;
  let startX = 0;
  viewport.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    stopCarouselAutoPlay();
  }, { passive: true });
  viewport.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) slideCarousel(diff > 0 ? 1 : -1);
    startCarouselAutoPlay();
  }, { passive: true });
}

// ============================================
// CATALOG
// ============================================
function renderCatalogProducts(filter = 'all') {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

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
        No sarees found in this category.<br/>
        <span style="font-family:var(--font-sans);font-size:0.85rem;">
          Tip: add a matching tag or set the Product Type in your Shopify Admin.
        </span>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(renderProductCard).join('');
  setTimeout(initIntersectionObserver, 80);
}

function filterProducts(category, btn) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCatalogProducts(category);
}

// Dim filter buttons that have zero matching products so the
// user can see at a glance which categories have inventory.
function updateFilterButtonCounts() {
  const categories = ['silk', 'handloom', 'ikat', 'cotton'];
  categories.forEach(cat => {
    const btn = document.getElementById(`filter-${cat}`);
    if (!btn) return;
    const count = PRODUCTS.filter(p => p.category === cat).length;
    if (count === 0) {
      btn.style.opacity = '0.4';
      btn.title = `No products in this category yet`;
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

function handleSearch(value) {
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
}

// ============================================
// WISHLIST
// ============================================
function toggleWishlist(productId, btn) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    btn.classList.remove('active');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    btn.setAttribute('aria-label', 'Add to wishlist');
    showToast('Removed from wishlist');
  } else {
    wishlist.add(productId);
    btn.classList.add('active');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    btn.setAttribute('aria-label', 'Remove from wishlist');
    showToast('❤️ Added to wishlist');
  }
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
  setTimeout(() => {
    form.reset();
    if (successEl) successEl.classList.remove('hidden');
    if (submitBtn) { submitBtn.textContent = 'Send Message'; submitBtn.disabled = false; }
    showToast("✓ Message sent! We'll reply within 24 hours.");
  }, 1200);
}

// ============================================
// MOBILE MENU
// ============================================
function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('overlay');
  if (mobileMenuOpen) {
    menu.classList.add('open');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    closeMobileMenu();
  }
}

function closeMobileMenu() {
  mobileMenuOpen = false;
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('overlay');
  menu && menu.classList.remove('open');
  overlay && overlay.classList.add('hidden');
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
function initIntersectionObserver() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    }),
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => observer.observe(el));
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

// ============================================
// SKELETON LOADER CSS (injected dynamically)
// ============================================
(function injectSkeletonStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .skeleton-card {
      background: var(--warm-white);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(44,42,39,0.08);
    }
    .skeleton-img {
      aspect-ratio: 3/4;
      background: linear-gradient(90deg, #ede8e0 25%, #f5f0e8 50%, #ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .skeleton-body { padding: 1.25rem; }
    .skeleton-line {
      height: 14px; border-radius: 4px; margin-bottom: 10px;
      background: linear-gradient(90deg, #ede8e0 25%, #f5f0e8 50%, #ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .skeleton-line.short  { width: 40%; }
    .skeleton-line.medium { width: 65%; }
    .skeleton-btn {
      height: 40px; border-radius: 4px; margin-top: 16px;
      background: linear-gradient(90deg, #ede8e0 25%, #f5f0e8 50%, #ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================
// ★ INITIALISATION — Async entry point
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Show the page shell immediately
  showView('home');
  showLoadingState();

  // 2. Fetch products from Shopify (or fall back to demo data)
  PRODUCTS = await fetchShopifyProducts();

  // 3. Boot all product-dependent UI
  renderCatalogProducts('all');
  buildCarousel();
  startCarouselAutoPlay();
  initCarouselSwipe();
  updateFilterButtonCounts(); // dim buttons with no products

  // 4. Pause carousel autoplay on hover
  const carouselWrapper = document.querySelector('.carousel-wrapper');
  if (carouselWrapper) {
    carouselWrapper.addEventListener('mouseenter', stopCarouselAutoPlay);
    carouselWrapper.addEventListener('mouseleave', startCarouselAutoPlay);
  }

  // 5. Global scroll + animation listeners
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  setTimeout(initIntersectionObserver, 200);

  console.log('%c✦ SonAff Saree ✦', 'font-family:serif;font-size:18px;color:#C9A227;font-weight:bold;');
  // Detect whether we fell back to demo data (Shopify products always have a shopifyGid)
  const isLiveData = PRODUCTS.length > 0 && PRODUCTS[0].shopifyGid !== null;
  console.log(
    `%c${isLiveData
      ? `✓ ${PRODUCTS.length} products loaded from Shopify`
      : '⚠ Demo data active — check Shopify credentials in app.js'}`,
    `font-family:sans-serif;font-size:12px;color:${isLiveData ? '#2E7D32' : '#C0392B'};`
  );
  // Print each product's assigned category so you can verify
  logCategoryBreakdown(PRODUCTS);
});
