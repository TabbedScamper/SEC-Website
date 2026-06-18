/* ============================================================
   SDG TRUCK BURNOUT
   The Shelby Super Baja is an interactive accent on the
   "See What SDG Can Do" button.

   Desktop (hover-capable):
     • hover  -> truck drifts in from the right, parks just left
       of the button, and pours a continuous grey/white burnout
       of tire smoke over the button (wheels spin via the WebP).
     • leave  -> stop making smoke (the live puffs finish and
       dissipate) and freeze the truck in place (swap to a still
       frame so the wheels stop).

   Mobile / no-hover:
     • the truck simply slides in once when the button scrolls
       into view, gives a quick puff, and freezes.

   Decorative only — the layer is pointer-events:none so the
   button stays clickable. Honors prefers-reduced-motion.
   ============================================================ */
(() => {
    'use strict';

    const cta = document.querySelector('.design-group-cta');
    const btn = document.getElementById('sdgStudioOpen');
    if (!cta || !btn) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ANIM  = 'assets/images/projects/sdg/truck-drive.webp';
    const STILL = 'assets/images/projects/sdg/truck-still.webp';
    const DRIVE_MS = 1400;   // keep in sync with the CSS drive-in duration

    const fx = document.createElement('div');
    fx.className = 'sdg-truck-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<img class="sdg-truck" alt="" draggable="false">';
    btn.appendChild(fx);
    const truck = fx.querySelector('.sdg-truck');

    const setAnim  = () => { if (truck.getAttribute('src') !== ANIM)  truck.src = ANIM; };
    const setStill = () => { if (truck.getAttribute('src') !== STILL) truck.src = STILL; };

    const rand = (a, b) => a + Math.random() * (b - a);

    // ---- tire smoke: spawn self-removing puffs across the button ----
    let smokeTimer = null;
    const spawnPuff = () => {
        const p = document.createElement('span');
        p.className = 'sdg-puff';
        const size = rand(70, 120);                  // small at birth; grows via --sc
        p.style.left = rand(-12, 4) + '%';           // born at the rear tire (toward the back, a bit left)
        p.style.bottom = rand(-10, 0) + 'px';        // tire contact patch
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.setProperty('--dx', rand(110, 210) + 'px');  // billow further out to the right
        p.style.setProperty('--sc', rand(1.8, 2.6));         // and grow big
        p.style.animationDuration = rand(1.1, 1.6) + 's';
        p.addEventListener('animationend', () => p.remove());
        fx.appendChild(p);
    };
    const startSmoke = () => {
        if (smokeTimer) return;
        spawnPuff(); spawnPuff();
        smokeTimer = window.setInterval(spawnPuff, 110);
    };
    const stopSmoke = () => {            // live puffs finish + fade on their own
        window.clearInterval(smokeTimer);
        smokeTimer = null;
    };

    let arrived = false;
    const driveIn = () => {
        if (fx.classList.contains('is-driving')) return;
        fx.classList.add('is-driving');
        window.setTimeout(() => { arrived = true; }, DRIVE_MS);
    };

    const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (hoverCapable) {
        let hovering = false;
        const enter = () => {
            hovering = true;
            setAnim();                  // wheels spin again
            if (arrived || fx.classList.contains('is-driving')) {
                if (arrived) startSmoke();           // already parked -> burnout now
                else window.setTimeout(() => { if (hovering) startSmoke(); }, DRIVE_MS);
            } else {
                driveIn();
                window.setTimeout(() => { if (hovering) startSmoke(); }, DRIVE_MS);
            }
        };
        const leave = () => {
            hovering = false;
            stopSmoke();
            setStill();                 // freeze the truck (stop the wheels)
        };
        btn.addEventListener('mouseenter', enter);
        btn.addEventListener('mouseleave', leave);
        btn.addEventListener('focus', enter);
        btn.addEventListener('blur', leave);
    } else {
        // No hover: slide in once on scroll-into-view, quick puff, then freeze.
        let played = false;
        const run = () => {
            if (played) return;
            played = true;
            setAnim();
            driveIn();
            window.setTimeout(startSmoke, DRIVE_MS - 350);
            window.setTimeout(stopSmoke,  DRIVE_MS + 350);
            window.setTimeout(setStill,   DRIVE_MS + 250);   // freeze at the stop
        };
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries, obs) => {
                entries.forEach(e => { if (e.isIntersecting) { run(); obs.disconnect(); } });
            }, { threshold: 0.5 });
            io.observe(cta);
        } else {
            run();
        }
    }

    // ---- public hook for the tow sequence (js/sdg-tow.js) ----
    const reset = () => {
        stopSmoke();
        fx.classList.remove('is-driving', 'is-leaving');
        arrived = false;
        truck.removeAttribute('src');   // hidden; a later hover reloads + drives it in fresh
    };
    window.SDGTruck = {
        // Hand the parked truck to the tow sequence so it can drive it in
        // lock-step with the studio. Returns the element, or null if not parked.
        beginTow() {
            if (!arrived && !fx.classList.contains('is-driving')) return null;
            stopSmoke();
            setAnim();                                        // wheels spin as it pulls
            fx.classList.remove('is-driving', 'is-leaving');  // release CSS control of transform
            // pin opacity + transform inline — without is-driving the base rule's
            // opacity:0 (entrance state) would otherwise make the truck vanish.
            truck.style.opacity = '1';
            truck.style.transform = 'translateX(-78%) translateX(0) rotate(0deg)';  // hold parked
            return truck;
        },
        // Done towing: clear the inline styles and reset so a later hover
        // re-drives the truck in fresh.
        endTow() {
            truck.style.opacity = '';
            truck.style.transform = '';
            reset();
        },
    };
})();
