/* ============================================
   DNYANAAVISHKAR FOUNDATION — SCRIPT
   Tata Trusts-inspired interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ================================
    // PRELOADER
    // ================================
    const preloader = document.querySelector('.site-preloader');
    if (preloader) {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        window.setTimeout(() => {
            preloader.classList.add('site-preloader--exit');
        }, 2500);

        window.setTimeout(() => {
            preloader.remove();
            document.body.style.overflow = prevOverflow;
        }, 3100);
    }

    // ================================
    // NAVBAR — scroll shadow
    // ================================
    const navbar = document.getElementById('navbar');

    function handleNavScroll() {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    }
    window.addEventListener('scroll', handleNavScroll, { passive: true });

    // ================================
    // MOBILE MENU
    // ================================
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
        });
    });

    // ================================
    // ACTIVE NAV LINK
    // ================================
    const sections = document.querySelectorAll('section[id]');
    const navLinksList = document.querySelectorAll('.nav-link:not(.nav-cta)');

    function setActiveLink() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 140;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinksList.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }
    window.addEventListener('scroll', setActiveLink, { passive: true });

    // ================================
    // HERO STATIC (Slider removed)
    // ================================


    // ================================
    // HERO STAT COUNTER ANIMATION (runs once on page load)
    // ================================
    function animateAllHeroCounters() {
        const allBoxes = document.querySelectorAll('.hero-stat-box');
        allBoxes.forEach(box => {
            const target = parseInt(box.dataset.heroCount, 10);
            const counter = box.querySelector('.hero-counter');
            if (!counter || !target) return;

            counter.textContent = '0';

            setTimeout(() => {
                const duration = 2000;
                const startTime = performance.now();

                function step(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                    const current = Math.round(eased * target);
                    counter.textContent = current;

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        counter.textContent = target;
                        box.classList.add('counted');
                    }
                }

                requestAnimationFrame(step);
            }, 1200);
        });
    }

    // Animate all counters once on page load
    animateAllHeroCounters();

    // Pause on hover
    const heroSlider = document.querySelector('.hero-slider');
    heroSlider.addEventListener('mouseenter', () => {
        clearInterval(slideTimer);
        clearInterval(progressTimer);
    });

    heroSlider.addEventListener('mouseleave', () => {
        // Resume from where we left off
        const remaining = slideDuration - progressTime;
        progressTimer = setInterval(() => {
            progressTime += progressStep;
            const pct = (progressTime / slideDuration) * 100;
            progressBar.style.width = Math.min(pct, 100) + '%';
        }, progressStep);

        slideTimer = setTimeout(() => {
            nextSlide();
        }, Math.max(remaining, 100));
    });

    // ================================
    // SCROLL REVEAL
    // ================================
    const revealTargets = document.querySelectorAll(
        '.latest-card, .about-left, .about-right, .stats-bar, ' +
        '.mission-inner, .pillar, .area-card, .story-card, ' +
        '.voices-inner, .contact-info, .cta-card, ' +
        '.latest-header, .stories-header, .areas-header'
    );

    revealTargets.forEach(el => el.classList.add('reveal-up'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger siblings for grid items
                const siblings = entry.target.parentElement.querySelectorAll('.reveal-up');
                let delay = 0;
                siblings.forEach((sib, idx) => {
                    if (sib === entry.target) delay = idx * 80;
                });

                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
            }
        });
    }, { threshold: 0.1 });

    revealTargets.forEach(el => revealObserver.observe(el));

    // ================================
    // STAT COUNTER ANIMATION
    // ================================
    const statItems = document.querySelectorAll('.stat-item');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;

        statItems.forEach(item => {
            const target = parseInt(item.dataset.count, 10);
            const counter = item.querySelector('.counter');
            if (!counter || !target) return;

            let current = 0;
            const duration = 2000;
            const stepTime = Math.max(Math.floor(duration / target), 15);

            const interval = setInterval(() => {
                current += Math.ceil(target / (duration / stepTime));
                if (current >= target) {
                    current = target;
                    clearInterval(interval);
                }
                counter.textContent = current;
            }, stepTime);
        });

        countersAnimated = true;
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
            }
        });
    }, { threshold: 0.3 });

    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) statsObserver.observe(statsBar);

    // ================================
    // SMOOTH SCROLL
    // ================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const offset = navbar.offsetHeight + 10;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ================================
    // KEYBOARD NAV for slider
    // ================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
        if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);
    });
});
