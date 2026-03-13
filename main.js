/* ============================================
   MAXWELL LUXURY REAL ESTATE — MAIN JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initStats();
    initFilters();
    initFavourites();
    initScrollReveal();
    initContactForm();
});

/* Navigation */
function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
            toggle.classList.toggle('active');
        });

        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.classList.remove('active');
            });
        });
    }
}

/* Animated Stat Counters */
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

/* Property Filters */
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.property-card');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            cards.forEach(card => {
                const match = filter === 'all' || card.dataset.category === filter;
                card.style.opacity = match ? '1' : '0';
                card.style.transform = match ? 'scale(1)' : 'scale(0.95)';
                card.style.pointerEvents = match ? 'auto' : 'none';
                setTimeout(() => {
                    card.style.display = match ? '' : 'none';
                }, match ? 0 : 300);
            });
        });
    });
}

/* Favourite Buttons */
function initFavourites() {
    document.querySelectorAll('.property-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
        });
    });
}

/* Scroll Reveal Animation */
function initScrollReveal() {
    const elements = document.querySelectorAll(
        '.property-card, .service-card, .testimonial-card, .about-grid, .contact-grid, .section-header'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
}

/* Contact Form — saves to localStorage for CRM */
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
                description: 'Contact form submission: ' + (form.interest.value || 'General enquiry'),
                date: new Date().toISOString()
            }]
        };

        // Save to CRM localStorage
        const contacts = JSON.parse(localStorage.getItem('maxwell_crm_contacts') || '[]');
        contacts.push(data);
        localStorage.setItem('maxwell_crm_contacts', JSON.stringify(contacts));

        // Show success
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Enquiry Sent ✓';
        btn.style.background = '#22c55e';
        btn.disabled = true;

        form.reset();

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);
    });
}
