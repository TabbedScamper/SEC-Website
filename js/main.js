/* SEC website - main.js
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
        '.company-card', '.co-panel', '.service-card', '.project-card', '.callout',
        '.contact-block', '.stat',
        '.hero-title', '.hero-lead', '.hero-cta', '.hero-eyebrow',
        '.automation-text', '.automation-badge',
        /* .controls-text and .controls-viewer animate themselves (intro-driven) */
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
        // Parse "35+", "1,200+", "24 / 7" - extract the leading number if any
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

    // PERF: the looping drone background (large file, preload="none") only appears AFTER the intro
    // clip finishes, so keep it out of the initial load. Start buffering it once the intro is actually
    // playing - it then has the intro's full duration to fill before the hand-off.
    if (heroVideo && heroDrone) {
        heroVideo.addEventListener('playing', () => heroDrone.load(), { once: true });
    }

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

    // ---- 5d. PERF: the drone loop would decode video forever once started.
    //          Pause it whenever the hero scrolls out of view, resume on return.
    if (heroDrone && heroSection && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (!heroDrone.classList.contains('is-in')) return;   // loop not started yet
                if (e.isIntersecting) {
                    const p = heroDrone.play();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } else {
                    heroDrone.pause();
                }
            });
        }).observe(heroSection);
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
        // How long the form was open. contact.php refuses submissions with no
        // timing or an impossibly quick one, which is what a bot posting
        // straight to the script looks like. The page measures the seconds
        // itself rather than sending a clock reading, so a visitor whose
        // computer clock is wrong is not caught out.
        const openedAt = Date.now();
        const elapsedField = contactForm.querySelector('input[name="_elapsed"]');
        const setElapsed = () => {
            if (elapsedField) elapsedField.value = String(Math.round((Date.now() - openedAt) / 1000));
        };
        setElapsed();
        contactForm.addEventListener('submit', setElapsed, true);

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

            // Primary endpoint is contact.php on this host. If the form carries a
            // non-empty data-fallback-action (e.g. a Formspree URL), a failed
            // primary post is retried against it once. Left empty the fallback
            // is skipped entirely, so there is no dead endpoint to fail into.
            const post = (url) => fetch(url, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            }).then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); });

            const fallback = (contactForm.dataset.fallbackAction || '').trim();

            post(contactForm.action)
            .catch(err => {
                if (!fallback) throw err;
                return post(fallback);
            })
            .then(() => {
                if (feedback) {
                    feedback.textContent = 'Thanks - your message is on its way. We’ll be in touch shortly.';
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

    // ---- 6c. Collapse the services list on phones ----
    // Ten cards is a long thumb-scroll on a phone. Show four, then let people
    // open the rest. Desktop is untouched, and the cards are only hidden when
    // the button is actually in play, so nothing is unreachable without JS.
    // Show the first few, with a button for the rest. Desktop is untouched,
    // and nothing is hidden unless the button is actually in place, so the
    // full list is always reachable.
    //
    // The cards are re-queried every time rather than captured once: the
    // project grid is rebuilt by js/projects.js whenever a filter is used,
    // so a captured list would go stale and the collapse would quietly stop
    // working (it did, on the first attempt).
    const collapseOnPhone = (container, cardSelector, keep, btnClass, noun) => {
        if (!container) return;
        const phone = window.matchMedia('(max-width: 720px)');
        let moreBtn = null;
        let expanded = false;

        const cards = () => [...container.querySelectorAll(cardSelector)];
        const label = () => expanded ? `Show fewer ${noun}` : `See all ${cards().length} ${noun}`;

        const paint = () => {
            const list = cards();
            if (!phone.matches || list.length <= keep) {
                list.forEach(c => c.classList.remove('is-collapsed'));
                if (moreBtn) moreBtn.hidden = true;
                return;
            }
            list.forEach((c, i) => c.classList.toggle('is-collapsed', !expanded && i >= keep));
            if (!moreBtn) {
                moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = btnClass;
                moreBtn.addEventListener('click', () => {
                    expanded = !expanded;
                    paint();
                    if (!expanded) container.scrollIntoView({ block: 'start', behavior: 'smooth' });
                });
                container.insertAdjacentElement('afterend', moreBtn);
            }
            moreBtn.hidden = false;
            moreBtn.textContent = label();
        };

        paint();
        phone.addEventListener('change', paint);
        // Re-apply whenever the list is rebuilt (project filters do this).
        new MutationObserver(() => paint()).observe(container, { childList: true });
    };

    collapseOnPhone(document.querySelector('.service-grid'), '.service-card', 4, 'services-more', 'services');
    // There are two project grids on the page (the showcase and the SDG set),
    // so collapse each of them rather than just the first one found.
    document.querySelectorAll('.pf-grid').forEach(grid =>
        collapseOnPhone(grid, '.pf-card', 4, 'projects-more', 'projects'));

    // ---- 7. Smooth-scroll offset for fixed header ----
    // Several sections use content-visibility:auto with an ESTIMATED height
    // (contain-intrinsic-size: auto 700px). Until a section has rendered once,
    // that estimate is wrong, so the page's height changes while you scroll -
    // which both aborted the native smooth scroll part-way (COMPANIES stopped
    // ~150px short) and moved the target after landing.
    // Fix: switch content-visibility off for the duration of the jump so every
    // section has its real height, scroll, then snap onto the exact mark and
    // hand the optimisation back. Sizes are remembered afterwards ("auto"),
    // so nothing jumps when it is re-enabled.
    // Jumping to a section, the awkward way, because this page fights the
    // plain version:
    //   * several sections use content-visibility:auto with an ESTIMATED
    //     height (contain-intrinsic-size: auto 700px). As they materialise the
    //     page's height changes, which ABORTS a native smooth scroll part-way
    //     - clicking COMPANIES used to stop ~150px short; and
    //   * late arrivals (deferred hero video, images) move the target after
    //     the scroll has landed on it.
    // So: turn the optimisation off for the jump so everything has its real
    // height, let the browser do the smooth scroll, then hand the optimisation
    // back, snap exactly onto the mark, and re-check a few times in case
    // something settles late. Any scrolling by the visitor cancels the rest.
    let navJumpToken = 0;
    const scrollToTarget = (target) => {
        if (!target) return;
        const myToken = ++navJumpToken;          // a newer jump cancels this one
        const root = document.documentElement;
        const dest = () =>
            target.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight || 0) + 1;

        let userTookOver = false;
        const yield_ = () => { userTookOver = true; };
        const events = ['wheel', 'touchstart', 'keydown'];
        events.forEach(ev => window.addEventListener(ev, yield_, { passive: true }));

        root.classList.add('is-nav-scrolling');
        void root.offsetHeight;                  // force the real layout now
        window.scrollTo({ top: dest(), behavior: 'smooth' });

        const correct = () => {
            if (userTookOver || myToken !== navJumpToken) return;
            const d = dest();
            if (Math.abs(window.scrollY - d) > 2) window.scrollTo(0, d);
        };
        setTimeout(() => {
            if (myToken !== navJumpToken) return;
            // Restore BEFORE measuring: sections go back to their estimated
            // heights here, which can shift the target.
            root.classList.remove('is-nav-scrolling');
            void root.offsetHeight;
            correct();
            [150, 400, 800].forEach(ms => setTimeout(correct, ms));

            // The hero plays an intro video and reveals its text afterwards,
            // which changes its height SECONDS after load and pushes every
            // section below it down - a jump made during the intro would
            // otherwise end up ~150px off. Rather than guess at timings, watch
            // for the page actually resizing and re-snap when it does.
            let ro = null;
            const stopWatching = () => {
                if (ro) { ro.disconnect(); ro = null; }
                events.forEach(ev => window.removeEventListener(ev, yield_));
            };
            if ('ResizeObserver' in window) {
                let first = true;
                ro = new ResizeObserver(() => {
                    if (first) { first = false; return; }   // fires once on observe
                    if (userTookOver || myToken !== navJumpToken) { stopWatching(); return; }
                    correct();
                });
                ro.observe(document.body);
            }
            setTimeout(stopWatching, 8000);
        }, 700);
    };

    // company-panels.js reuses this for its own jump links.
    window.SECScrollToTarget = scrollToTarget;

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            scrollToTarget(target);
        });
    });
})();
