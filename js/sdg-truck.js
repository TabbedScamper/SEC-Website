/* ============================================================
   SDG TRUCK DRIVE-IN
   The Shelby Super Baja drifts in from the right on a cloud of
   dust and parks on top of the "See What SDG Can Do" button.
   Plays once when the CTA scrolls into view, and replays on
   hover / focus of the button. Purely decorative — the truck
   layer is pointer-events:none so the button stays clickable.
   ============================================================ */
(() => {
    'use strict';

    const cta = document.querySelector('.design-group-cta');
    const btn = document.getElementById('sdgStudioOpen');
    if (!cta || !btn) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const fx = document.createElement('div');
    fx.className = 'sdg-truck-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML =
        '<span class="sdg-dust sdg-dust--1"></span>' +
        '<span class="sdg-dust sdg-dust--2"></span>' +
        '<span class="sdg-dust sdg-dust--3"></span>' +
        '<span class="sdg-dust sdg-dust--4"></span>' +
        '<img class="sdg-truck" alt="" draggable="false">';
    btn.appendChild(fx);

    // Load the (1.3 MB) animated truck only when it's first needed.
    const truck = fx.querySelector('.sdg-truck');
    const ensureLoaded = () => {
        if (!truck.src) truck.src = 'assets/images/projects/sdg/truck-drive.webp';
    };

    let busy = false;
    const play = () => {
        if (busy) return;
        ensureLoaded();
        busy = true;
        fx.classList.remove('is-driving');
        void fx.offsetWidth;          // restart the animation
        fx.classList.add('is-driving');
        // free it up once the drift settles so hover can replay it
        setTimeout(() => { busy = false; }, 1900);
    };

    // Drive in the first time the CTA scrolls into view.
    let played = false;
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting && !played) {
                    played = true;
                    play();
                    obs.disconnect();
                }
            });
        }, { threshold: 0.45 });
        io.observe(cta);
    } else {
        play();
    }

    // Replay on demand.
    btn.addEventListener('mouseenter', play);
    btn.addEventListener('focus', play);
})();
