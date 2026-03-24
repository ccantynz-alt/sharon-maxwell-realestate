/* ============================================
   SHARON MAXWELL — RAY WHITE — MAIN JS
   Hero slider, dynamic property feed, lightbox,
   parallax, carousel, animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHeroSlider();
    loadDynamicListings();
    initPropertyCarousel();
    initStats();
    initFavourites();
    initScrollReveal();
    initContactForm();
    initLightbox();
    initParallax();
});

/* ============ NAVIGATION ============ */
function initNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
        });

        links.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => links.classList.remove('open'));
        });
    }
}

/* ============ HERO SLIDER with Progress Bar ============ */
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    const progressBar = document.getElementById('heroProgress');
    let current = 0;
    let interval;
    const SLIDE_DURATION = 6000;

    function goTo(idx) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (idx + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
        resetProgress();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function resetProgress() {
        if (!progressBar) return;
        progressBar.classList.remove('animate');
        progressBar.style.width = '0%';
        // Force reflow
        void progressBar.offsetWidth;
        progressBar.classList.add('animate');
    }

    function startAuto() {
        resetProgress();
        interval = setInterval(next, SLIDE_DURATION);
    }

    function resetAuto() {
        clearInterval(interval);
        startAuto();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAuto(); });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            goTo(parseInt(dot.dataset.slide));
            resetAuto();
        });
    });

    // Touch/swipe support
    let touchStartX = 0;
    const slider = document.getElementById('heroSlider');
    if (slider) {
        slider.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        slider.addEventListener('touchend', e => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                diff > 0 ? next() : prev();
                resetAuto();
            }
        }, { passive: true });
    }

    startAuto();
}

/* ============================================================
   DYNAMIC PROPERTY FEED — pulls from CRM localStorage
   If CRM has properties, they replace the hardcoded cards.
   If no CRM data, the hardcoded HTML stays as-is.
   ============================================================ */
function loadDynamicListings() {
    const track = document.getElementById('listingsTrack');
    if (!track) return;

    const properties = JSON.parse(localStorage.getItem('maxwell_crm_properties') || '[]');

    // Only replace if CRM has properties
    if (properties.length === 0) return;

    // Filter to available/under_offer properties (not sold)
    const forSale = properties.filter(p => p.status !== 'sold');
    const sold = properties.filter(p => p.status === 'sold');

    // Render For Sale carousel
    if (forSale.length > 0) {
        track.innerHTML = forSale.map(p => renderListingCard(p)).join('');
    }

    // Render Sold grid if we have sold properties
    if (sold.length > 0) {
        const soldGrid = document.querySelector('.sold-grid');
        if (soldGrid) {
            soldGrid.innerHTML = sold.map(p => renderSoldCard(p)).join('');
        }
    }

    // Re-init favourites for new cards
    initFavourites();
}

function renderListingCard(p) {
    const esc = s => {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    const statusBadge = p.status === 'under_offer' ? 'Under Offer' : 'For Sale';
    const price = p.price ? formatPrice(p.price) : 'By Negotiation';

    // Pick a property image based on category or use a default
    const images = {
        waterfront: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80&auto=format&fit=crop',
        lifestyle: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&auto=format&fit=crop',
        urban: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80&auto=format&fit=crop',
        rural: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop',
        residential: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&auto=format&fit=crop'
    };
    const imgUrl = p.imageUrl || images[p.category] || images.residential;

    return `
        <div class="listing-card">
            <div class="listing-image" data-lightbox-src="${esc(imgUrl)}" data-lightbox-caption="${esc(p.address)}">
                <img src="${esc(imgUrl)}" alt="${esc(p.address)}" loading="lazy">
                <span class="listing-badge">${esc(statusBadge)}</span>
                <button class="listing-save" aria-label="Save">♡</button>
            </div>
            <div class="listing-body">
                <h3 class="listing-address">${esc(p.address)}</h3>
                <p class="listing-suburb">${esc(p.category ? capitalise(p.category) : '')}</p>
                <div class="listing-features">
                    ${p.beds ? `<span><strong>${esc(String(p.beds))}</strong> Bed</span>` : ''}
                    ${p.baths ? `<span><strong>${esc(String(p.baths))}</strong> Bath</span>` : ''}
                    ${p.area ? `<span><strong>${esc(String(p.area))}</strong>m²</span>` : ''}
                </div>
                <div class="listing-footer">
                    <span class="listing-price">${esc(price)}</span>
                    <a href="#contact" class="listing-enquire">Enquire →</a>
                </div>
            </div>
        </div>
    `;
}

function renderSoldCard(p) {
    const esc = s => {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    const imgUrl = p.imageUrl || 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&q=80&auto=format&fit=crop';
    const details = [
        p.beds ? p.beds + ' Bed' : '',
        p.baths ? p.baths + ' Bath' : '',
    ].filter(Boolean).join(' · ');

    return `
        <div class="sold-card">
            <div class="sold-image">
                <img src="${esc(imgUrl)}" alt="${esc(p.address)}" loading="lazy">
                <div class="sold-banner">SOLD</div>
            </div>
            <div class="sold-body">
                <h3>${esc(p.address)}</h3>
                ${details ? `<p class="sold-detail">${esc(details)}</p>` : ''}
            </div>
        </div>
    `;
}

function formatPrice(n) {
    if (!n) return 'By Negotiation';
    return '$' + Number(n).toLocaleString('en-NZ');
}

function capitalise(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/* ============ PROPERTY CAROUSEL ============ */
function initPropertyCarousel() {
    const track = document.getElementById('listingsTrack');
    const prevBtn = document.getElementById('listingsPrev');
    const nextBtn = document.getElementById('listingsNext');
    if (!track) return;

    let position = 0;

    function getCardWidth() {
        const card = track.querySelector('.listing-card');
        if (!card) return 400;
        return card.offsetWidth + 24; // card + gap
    }

    function getVisibleCards() {
        const w = window.innerWidth;
        if (w < 768) return 1;
        if (w < 1024) return 2;
        return 3;
    }

    function getMaxPosition() {
        const total = track.querySelectorAll('.listing-card').length;
        return Math.max(0, total - getVisibleCards());
    }

    function slide(dir) {
        const max = getMaxPosition();
        position = Math.max(0, Math.min(position + dir, max));
        const offset = position * getCardWidth();
        track.style.transform = `translateX(-${offset}px)`;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => slide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => slide(1));

    // Touch swipe
    let startX = 0;
    const carousel = document.getElementById('listingsCarousel');
    if (carousel) {
        carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        carousel.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                slide(diff > 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    // Reset on resize
    window.addEventListener('resize', () => {
        position = Math.min(position, getMaxPosition());
        const offset = position * getCardWidth();
        track.style.transform = `translateX(-${offset}px)`;
    });
}

/* ============ ANIMATED STAT COUNTERS ============ */
function initStats() {
    const stats = document.querySelectorAll('.stat-number[data-target]');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
}

function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

/* ============ FAVOURITE BUTTONS ============ */
function initFavourites() {
    document.querySelectorAll('.listing-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
        });
    });
}

/* ============ SCROLL REVEAL with stagger ============ */
function initScrollReveal() {
    const elements = document.querySelectorAll(
        '.listing-card, .sold-card, .testimonial-card, .about-grid, .contact-grid, .section-header, .stat-item, .highlight, .appraisal-inner'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger animation
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, i * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    elements.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
}

/* ============ CONTACT FORM — saves to CRM localStorage ============ */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = {
            id: Date.now().toString(),
            firstName: form.firstName.value.trim(),
            lastName: form.lastName.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            interest: form.interest.value,
            message: form.message.value.trim(),
            stage: 'lead',
            source: 'website',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activities: [{
                type: 'note',
                description: 'Website contact form: ' + (form.interest.value || 'General enquiry'),
                date: new Date().toISOString()
            }]
        };

        const contacts = JSON.parse(localStorage.getItem('maxwell_crm_contacts') || '[]');
        contacts.push(data);
        localStorage.setItem('maxwell_crm_contacts', JSON.stringify(contacts));

        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.textContent = 'Enquiry Sent ✓';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        btn.disabled = true;
        form.reset();

        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 3000);
    });
}

/* ============================================================
   FULL-SCREEN LIGHTBOX — click any property image to expand
   ============================================================ */
function initLightbox() {
    // Create lightbox DOM
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
        <button class="lightbox-close" aria-label="Close lightbox">×</button>
        <div class="lightbox-content">
            <img src="" alt="">
            <div class="lightbox-caption"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector('img');
    const caption = overlay.querySelector('.lightbox-caption');

    function open(src, captionText) {
        img.src = src;
        img.alt = captionText || '';
        caption.textContent = captionText || '';
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Close on overlay click, close button, or Escape
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
            close();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    // Attach to all listing images (including dynamically added ones)
    document.addEventListener('click', (e) => {
        const imageWrap = e.target.closest('.listing-image');
        if (imageWrap && !e.target.closest('.listing-save') && !e.target.closest('.listing-badge')) {
            const src = imageWrap.dataset.lightboxSrc || imageWrap.querySelector('img')?.src;
            const cap = imageWrap.dataset.lightboxCaption || imageWrap.querySelector('img')?.alt;
            if (src) open(src, cap);
        }
    });
}

/* ============================================================
   PARALLAX — subtle depth effect on the appraisal section
   ============================================================ */
function initParallax() {
    const parallaxBg = document.querySelector('.appraisal-bg');
    if (!parallaxBg) return;

    // Only on desktop (reduce motion / mobile perf)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || window.innerWidth < 768) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const rect = parallaxBg.parentElement.getBoundingClientRect();
                const vh = window.innerHeight;
                if (rect.top < vh && rect.bottom > 0) {
                    const progress = (vh - rect.top) / (vh + rect.height);
                    const offset = (progress - 0.5) * 60;
                    parallaxBg.style.transform = `translateY(${offset}px) scale(1.1)`;
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}
