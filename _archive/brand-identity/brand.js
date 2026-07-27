/* ============================================================
   brand.js  Sonaff Sarees Brand Identity Interactions
   ============================================================ */

/* ── NAV SCROLL ── */
const nav = document.getElementById('bi-nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

/* ── ACTIVE NAV LINKS ── */
const navLinks = document.querySelectorAll('.bi-nav-link');
const sections = document.querySelectorAll('[id]');

const observerNav = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' });

sections.forEach(section => observerNav.observe(section));

/* ── SCROLL REVEAL ── */
const revealElements = document.querySelectorAll('.reveal');

const observerReveal = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observerReveal.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -60px 0px'
});

revealElements.forEach(el => observerReveal.observe(el));

/* ── COLOR SWATCHES  Copy Hex on Click ── */
const colorVals = document.querySelectorAll('.bi-color-val, .bi-gradient-code');
colorVals.forEach(el => {
  el.style.cursor = 'pointer';
  el.title = 'Click to copy';
  el.addEventListener('click', () => {
    const text = el.textContent.trim().replace(/.*→\s*/, '').split(/[\s→]/)[0];
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied: ${text}`);
      });
    }
  });
});

/* ── TOAST ── */
function showToast(message) {
  let toast = document.getElementById('bi-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bi-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #2C2A27;
      color: #F9F6F0;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 0.75rem 1.5rem;
      border-radius: 100px;
      z-index: 9999;
      box-shadow: 0 8px 28px rgba(44,42,39,0.25);
      border: 1px solid rgba(215,140,47,0.3);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2500);
}

/* ── PARALLAX HERO ORBS ── */
const orbs = document.querySelectorAll('.bi-hero-orb');
window.addEventListener('mousemove', (e) => {
  const { clientX: x, clientY: y } = e;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (x - cx) / cx;
  const dy = (y - cy) / cy;
  orbs.forEach((orb, i) => {
    const factor = (i + 1) * 12;
    orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
  });
}, { passive: true });

/* ── SMOOTH ANCHOR NAVIGATION ── */
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ── COLOR CARD HOVER  Live Color Tint ── */
const colorCards = document.querySelectorAll('.bi-color-card');
colorCards.forEach(card => {
  const swatch = card.querySelector('.bi-color-swatch');
  if (!swatch) return;
  const bg = swatch.style.background;
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = `0 12px 40px rgba(44,42,39,0.15)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = '';
  });
});

/* ── PATTERN CARD  Subtle rotate on hover ── */
const patternCards = document.querySelectorAll('.bi-pattern-card');
patternCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    const preview = card.querySelector('.bi-pattern-preview');
    if (preview) preview.style.backgroundPosition = '10px 10px';
  });
  card.addEventListener('mouseleave', () => {
    const preview = card.querySelector('.bi-pattern-preview');
    if (preview) preview.style.backgroundPosition = '';
  });
});

/* ── PRINT HANDLER ── */
window.addEventListener('beforeprint', () => {
  revealElements.forEach(el => el.classList.add('visible'));
});

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  console.log('%c Sonaff Sarees  Brand Identity v2026.1 ', 
    'background:#2C2A27;color:#D78C2F;font-family:serif;font-size:1.25rem;padding:0.5rem 1rem;border-radius:4px;');
  console.log('%c Where Tradition Meets Grace ', 
    'color:#6B6560;font-style:italic;');
});
