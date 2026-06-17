/* SEC website — main.js
   Loading screen, sticky-header shrink, mobile nav, reveal-on-scroll,
   stat count-up.  No framework, no jQuery.
*/

(() => {
    'use strict';

    // ---- 1. Loading screen → hide after assets + 600ms cinematic pause ----
    const loadingScreen = document.getElementById('loadingScreen');
    window.addEventListener('load', () => {
        setTimeout(() => loadingScreen?.classList.add('hidden'), 600);
    });

    // ---- 2. Header shrink on scroll ----
    const header = document.getElementById('header');
    const onScroll = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ---- 3. Mobile nav toggle ----
    const menuToggle = document.getElementById('menuToggle');
    const mobileNav  = document.getElementById('mobileNav');
    const navOverlay = document.getElementById('navOverlay');
    const closeMobileNav = () => {
        menuToggle?.classList.remove('is-open');
        mobileNav?.classList.remove('is-open');
        navOverlay?.classList.remove('is-open');
        document.body.style.overflow = '';
    };
    menuToggle?.addEventListener('click', () => {
        const open = !menuToggle.classList.contains('is-open');
        menuToggle.classList.toggle('is-open', open);
        mobileNav?.classList.toggle('is-open', open);
        navOverlay?.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    });
    navOverlay?.addEventListener('click', closeMobileNav);
    mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));

    // ---- 4. Reveal on scroll (IntersectionObserver) ----
    // Auto-tag anything that looks like a card or section title so we don't
    // have to sprinkle data-reveal manually on every element.
    const autoSelectors = [
        '.section-title', '.section-eyebrow',
        '.company-card', '.service-card', '.project-card', '.callout',
        '.contact-block', '.stat',
        '.hero-title', '.hero-lead', '.hero-cta', '.hero-eyebrow',
        '.automation-text', '.automation-badge',
    ];
    autoSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach((el, i) => {
            if (!el.hasAttribute('data-reveal')) {
                el.setAttribute('data-reveal', '');
            }
            // Stagger siblings inside the same parent
            const idx = [...el.parentElement.children].indexOf(el);
            el.style.setProperty('--delay', `${Math.min(idx, 5) * 0.08}s`);
        });
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

    // ---- 5. Stat count-up when the stats grid scrolls into view ----
    const statNums = document.querySelectorAll('.stat-num');
    const numericTargets = new Map();
    statNums.forEach(el => {
        const txt = el.textContent.trim();
        // Parse "35+", "1,200+", "24 / 7" — extract the leading number if any
        const m = txt.match(/^([\d,]+)/);
        if (m) {
            // Preserve the source formatting: if the user wrote "1988" (no
            // comma) we render without one; "1,200" keeps thousands commas.
            const useCommas = m[1].includes(',');
            const n = parseInt(m[1].replace(/,/g, ''), 10);
            if (n > 0) {
                numericTargets.set(el, { target: n, suffix: txt.slice(m[0].length), useCommas });
                el.textContent = '0' + (txt.slice(m[0].length));
            }
        }
    });
    const statsSection = document.getElementById('stats');
    if (statsSection && numericTargets.size) {
        const statsIO = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                numericTargets.forEach(({ target, suffix, useCommas }, el) => {
                    const dur = 1100; // ms
                    const start = performance.now();
                    const tick = (now) => {
                        const t = Math.min((now - start) / dur, 1);
                        const eased = 1 - Math.pow(1 - t, 3);
                        const cur = Math.round(target * eased);
                        el.textContent = (useCommas ? cur.toLocaleString() : String(cur)) + suffix;
                        if (t < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                });
                statsIO.disconnect();
            });
        }, { threshold: 0.35 });
        statsIO.observe(statsSection);
    }

    // ---- 5b. Hero video → on `ended` fade the video out, then trigger the
    //          reveal: logo slides to the right + text slides in from the
    //          left.  The CSS transitions already have a 0.8s built-in delay
    //          so the slide-in starts partway through the video fade.
    //          If the browser blocks autoplay, mark finished immediately so
    //          the static composition shows as a graceful fallback. */
    const heroVideo = document.getElementById('heroVideo');
    const heroDrone = document.getElementById('heroDrone');
    const heroEl    = document.getElementById('hero');

    // Pick the matching hero sources (4:5 mobile vs 1920×500 desktop) before
    // anything loads, so the browser only downloads the one that's used.
    (() => {
        const useMobile = window.matchMedia('(max-width: 600px)').matches;
        [heroVideo, heroDrone].forEach((v) => {
            if (!v) return;
            const src = (useMobile && v.dataset.mobileSrc) ? v.dataset.mobileSrc : v.dataset.desktopSrc;
            if (src && !v.querySelector('source') && v.src !== src) v.src = src;
        });
    })();

    const revealHero = () => heroEl?.classList.add('is-revealed');
    const HERO_TRIM_END_SECONDS = 0.25;  // cut just before the natural end so the
                                         // instant hand-off lands on the final frame
    const finishHeroVideo = () => {
        if (!heroVideo || heroVideo.classList.contains('is-finished')) return;
        heroVideo.classList.add('is-finished');   // intro fades to black
        heroVideo.pause();
        revealHero();                             // logo settles into place on black
        // The drone loop is already playing underneath but hidden; once the intro
        // has faded to black, fade it in from black behind the logo (then it loops
        // with no further fades).
        if (heroDrone) {
            const dronePlay = heroDrone.play();
            if (dronePlay && typeof dronePlay.catch === 'function') {
                dronePlay.catch(() => {});
            }
            setTimeout(() => heroDrone.classList.add('is-in'), 1000);
        }
    };
    if (heroVideo) {
        heroVideo.addEventListener('ended', finishHeroVideo);
        // Trim the tail: cut over to the reveal HERO_TRIM_END_SECONDS before
        // the natural end, so the slide-in fires earlier.
        heroVideo.addEventListener('timeupdate', () => {
            if (heroVideo.classList.contains('is-finished')) return;
            const dur = heroVideo.duration;
            if (isFinite(dur) && heroVideo.currentTime >= dur - HERO_TRIM_END_SECONDS) {
                finishHeroVideo();
            }
        });
        const tryPlay = heroVideo.play();
        if (tryPlay && typeof tryPlay.catch === 'function') {
            tryPlay.catch(finishHeroVideo);
        }
    } else {
        revealHero();
    }

    // ---- 5c. Hero logo fades + lifts as the user scrolls past the hero.
    //          Logo's base centering uses `translate(-50%, -50%)`; the scroll
    //          delta and scale go through CSS vars so we don't overwrite it.
    const heroLogo = document.getElementById('heroLogo');
    const heroSection = document.getElementById('hero');
    if (heroLogo && heroSection) {
        let rafId = null;
        const updateHeroLogo = () => {
            rafId = null;
            const rect = heroSection.getBoundingClientRect();
            const heroH = rect.height || window.innerHeight;
            const scrolled = Math.max(0, -rect.top);
            const fadeStart = heroH * 0.05;
            const fadeEnd   = heroH * 0.60;
            const t = Math.min(1, Math.max(0, (scrolled - fadeStart) / (fadeEnd - fadeStart)));
            heroLogo.style.opacity = (1 - t).toFixed(3);
            heroLogo.style.setProperty('--logo-shift', `${(-t * 28).toFixed(1)}px`);
            heroLogo.style.setProperty('--logo-scale', (1 - t * 0.05).toFixed(3));
        };
        const requestUpdate = () => {
            if (rafId == null) rafId = requestAnimationFrame(updateHeroLogo);
        };
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
        updateHeroLogo();
    }

    // ---- 6. Footer year ----
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ---- 6b. Contact form (Formspree AJAX) ----
    //          If `data-ajax="true"` is on the form, we intercept the submit,
    //          POST via fetch, and show inline success/error feedback.  If
    //          the attribute is missing, the form submits the normal way.
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            const submitBtn = contactForm.querySelector('.submit-btn');
            const feedback  = contactForm.querySelector('.form-feedback');

            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }
            if (feedback) {
                feedback.classList.remove('success', 'error');
                feedback.style.display = 'none';
            }

            if (contactForm.dataset.ajax !== 'true') return;
            e.preventDefault();

            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            })
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(() => {
                if (feedback) {
                    feedback.textContent = 'Thanks — your message is on its way. We’ll be in touch shortly.';
                    feedback.classList.add('success');
                    feedback.style.display = 'block';
                }
                contactForm.reset();
            })
            .catch(() => {
                if (feedback) {
                    feedback.textContent = 'Something went wrong. Please try again or call (731) 660-5980.';
                    feedback.classList.add('error');
                    feedback.style.display = 'block';
                }
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            });
        });
    }

    // ---- 7. Smooth-scroll offset for fixed header ----
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const headerH = header?.offsetHeight || 0;
            const y = target.getBoundingClientRect().top + window.scrollY - headerH + 1;
            window.scrollTo({ top: y, behavior: 'smooth' });
        });
    });
})();
