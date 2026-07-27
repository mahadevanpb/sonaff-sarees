/* ============================================
   SONAFF SAREES  App JavaScript v2
   ============================================ */

'use strict';

// ============================================
// CONFIG  Update your WhatsApp number here
// ============================================
const CONFIG = {
  whatsappNumber: '919999999999',
  storeName: 'SonAff Saree',
  carouselVisibleCount: 3, // how many cards show on desktop
};

// ============================================
// PRODUCT DATA
// ============================================
const PRODUCTS = [
  {
    id: 1,
    name: 'Banarasi Silk Saree with Gold Zari',
    type: 'Pure Silk',
    region: 'Varanasi, UP',
    price: '₹28,500',
    priceOriginal: '₹32,000',
    category: 'silk',
    image: 'images/product_banarasi.png',
    rating: 4.9,
    reviews: 142,
    featured: true,
  },
  {
    id: 2,
    name: 'Kanjivaram Silk Saree Magenta Mustard Border',
    type: 'Pure Silk',
    region: 'Kanchipuram, TN',
    price: '₹34,000',
    priceOriginal: '₹38,500',
    category: 'silk',
    image: 'images/product_kanjivaram.png',
    rating: 5.0,
    reviews: 89,
    featured: true,
  },
  {
    id: 3,
    name: 'Chanderi Silk Saree Pink Lotus Floral Pattern',
    type: 'Silk Cotton',
    region: 'Chanderi, MP',
    price: '₹14,500',
    priceOriginal: null,
    category: 'silk',
    image: 'images/product_chanderi.png',
    rating: 4.8,
    reviews: 217,
    featured: true,
  },
  {
    id: 4,
    name: 'Tussar Handloom Saree Natural Ivory Terracotta',
    type: 'Handloom Silk',
    region: 'Bhagalpur, Bihar',
    price: '₹9,800',
    priceOriginal: '₹12,000',
    category: 'handloom',
    image: 'images/product_tussar.png',
    rating: 4.7,
    reviews: 63,
    featured: true,
  },
  {
    id: 5,
    name: 'Patola Silk Saree Royal Blue Crimson Double Ikat',
    type: 'Double Ikat',
    region: 'Patan, Gujarat',
    price: '₹55,000',
    priceOriginal: '₹62,000',
    category: 'ikat',
    image: 'images/product_patola.png',
    rating: 5.0,
    reviews: 38,
    featured: true,
  },
  {
    id: 6,
    name: 'Pochampally Ikat Silk Saree Teal Purple Geometric',
    type: 'Ikat Silk',
    region: 'Pochampally, Telangana',
    price: '₹18,500',
    priceOriginal: '₹22,000',
    category: 'ikat',
    image: 'images/product_pochampally.png',
    rating: 4.9,
    reviews: 104,
    featured: true,
  },
  {
    id: 7,
    name: 'Maheshwari Cotton Silk Saree Indigo Stripe',
    type: 'Cotton Silk',
    region: 'Maheshwar, MP',
    price: '₹8,200',
    priceOriginal: null,
    category: 'cotton',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4a5792?w=600&h=800&fit=crop&q=80',
    rating: 4.6,
    reviews: 55,
    featured: false,
  },
  {
    id: 8,
    name: 'Gadwal Silk Cotton Saree Emerald Contrast Border',
    type: 'Silk Cotton',
    region: 'Gadwal, Telangana',
    price: '₹12,500',
    priceOriginal: '₹15,000',
    category: 'handloom',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&h=800&fit=crop&q=80',
    rating: 4.8,
    reviews: 76,
    featured: false,
  },
];

// ============================================
// STATE
// ============================================
let currentView = 'home';
let currentFilter = 'all';
let wishlist = new Set();
let searchOpen = false;
let mobileMenuOpen = false;

// Carousel state
let carouselIndex = 0;
let carouselItems = []; // featured products for the carousel
let carouselVisible = 3; // cards visible at once

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

  // Update nav
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.getElementById(`nav-${viewName}`);
  if (activeLink) activeLink.classList.add('active');

  currentView = viewName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileMenu();
  setTimeout(initIntersectionObserver, 120);

  const titles = {
    home: 'SonAff Saree  Authentic Indian Heritage Sarees',
    catalog: 'Full Collection  SonAff Saree',
    contact: 'Contact Us  SonAff Saree',
  };
  document.title = titles[viewName] || titles.home;
}

// ============================================
// SCROLL TO PRODUCTS (from hero CTA)
// ============================================
function scrollToProducts() {
  const el = document.getElementById('featured-products');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
// RENDER
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
          alt="${product.name}"
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

  carouselItems = PRODUCTS.filter(p => p.featured);
  carouselVisible = getCarouselVisible();
  carouselIndex = 0;

  // Render cards
  track.innerHTML = carouselItems.map(renderProductCard).join('');

  // Build dots  one dot per possible "page"
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

  // Calculate card width from track items
  const cards = track.querySelectorAll('.product-card');
  if (!cards.length) return;

  // Use carouselViewport width to compute %
  const viewport = document.getElementById('carousel-viewport');
  const gap = 24; // 1.5rem in px
  const viewportW = viewport ? viewport.offsetWidth : 0;
  const cardW = (viewportW - gap * (carouselVisible - 1)) / carouselVisible;
  const offset = carouselIndex * (cardW + gap);

  track.style.transform = `translateX(-${offset}px)`;

  // Update each card's flex-basis to match computed width
  cards.forEach(c => { c.style.flex = `0 0 ${cardW}px`; });

  // Update arrows
  const max = Math.max(0, carouselItems.length - carouselVisible);
  if (prevBtn) prevBtn.disabled = carouselIndex === 0;
  if (nextBtn) nextBtn.disabled = carouselIndex >= max;

  // Update dots
  const currentPage = Math.floor(carouselIndex / carouselVisible);
  if (dotsContainer) {
    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
    });
  }
}

// Auto-play carousel
let carouselTimer;
function startCarouselAutoPlay() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    carouselVisible = getCarouselVisible();
    const max = Math.max(0, carouselItems.length - carouselVisible);
    if (carouselIndex >= max) {
      carouselIndex = 0;
    } else {
      carouselIndex++;
    }
    updateCarouselPosition();
  }, 4500);
}

function stopCarouselAutoPlay() {
  clearInterval(carouselTimer);
}

// Touch / swipe support
function initCarouselSwipe() {
  const viewport = document.getElementById('carousel-viewport');
  if (!viewport) return;

  let startX = 0;
  let isDragging = false;

  viewport.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
    stopCarouselAutoPlay();
  }, { passive: true });

  viewport.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) slideCarousel(diff > 0 ? 1 : -1);
    isDragging = false;
    startCarouselAutoPlay();
  }, { passive: true });
}

// ============================================
// CATALOG RENDER
// ============================================
function renderCatalogProducts(filter = 'all') {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--charcoal-muted);font-family:var(--font-serif);font-size:1.25rem;">No sarees found in this category.</div>`;
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
// NEWSLETTER
// ============================================
function handleNewsletter(event) {
  event.preventDefault();
  const input = event.target.querySelector('input[type="email"]');
  if (input && input.value) {
    showToast('✓ Subscribed! Welcome to SonAff Saree.');
    input.value = '';
  }
}

// ============================================
// CONTACT FORM
// ============================================
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
// RESIZE  rebuild carousel layout
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
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  showView('home');
  renderCatalogProducts('all');

  // Build carousel
  buildCarousel();
  startCarouselAutoPlay();
  initCarouselSwipe();

  // Pause autoplay on hover
  const carouselWrapper = document.querySelector('.carousel-wrapper');
  if (carouselWrapper) {
    carouselWrapper.addEventListener('mouseenter', stopCarouselAutoPlay);
    carouselWrapper.addEventListener('mouseleave', startCarouselAutoPlay);
  }

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  setTimeout(initIntersectionObserver, 200);

  console.log('%c✦ SonAff Saree ✦', 'font-family:serif;font-size:18px;color:#C9A227;font-weight:bold;');
  console.log('%cAuthentic Indian Heritage Sarees', 'font-family:sans-serif;font-size:12px;color:#6B6560;');
});
