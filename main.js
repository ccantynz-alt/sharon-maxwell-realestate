/* ============================================
   SHARON MAXWELL — RAY WHITE — MAIN JS
   Hero slider, property carousel, animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHeroSlider();
    initPropertyCarousel();
    initStats();
    initFavourites();
    initScrollReveal();
    initContactForm();
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

/* ============ HERO SLIDER ============ */
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    let current = 0;
    let interval;

    function goTo(idx) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (idx + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startAuto() {
        interval = setInterval(next, 6000);
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
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
        });
    });
}

/* ============ SCROLL REVEAL ============ */
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
