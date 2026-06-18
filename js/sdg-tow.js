/* ============================================================
   SDG TOW-IN
   Clicking "See What SDG Can Do" fires a tow rope from the
   truck toward the right edge of the screen. The rope whips
   out with verlet-rope physics, bundles, then snaps taut;
   the page shakes on connection; then the studio is dragged
   in from the right while the truck drives off to the left.

   Closing the studio is left untouched (handled in
   js/sdg-creations.js). Honors prefers-reduced-motion and
   falls back to the plain open if anything is unsupported.
   ============================================================ */
(() => {
    'use strict';

    const btn      = document.getElementById('sdgStudioOpen');
    const overlay  = document.getElementById('sdgStudioOverlay');
    const closeBtn = document.getElementById('sdgStudioClose');
    if (!btn || !overlay) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canCanvas = !!document.createElement('canvas').getContext;

    // Make the studio visible and start it off the right edge; the rope loop
    // drives its translateX each frame (is-towing disables the transition).
    const openStudio = () => {
        document.body.classList.add('sdg-studio-open');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.scrollTop = 0;
        overlay.classList.add('is-open', 'is-towing');
        overlay.style.transform = 'translateX(100%)';
        // preventScroll: focusing the fixed close button otherwise yanks the
        // document to the top and you miss the tow happening mid-page.
        closeBtn && closeBtn.focus({ preventScroll: true });
    };
    const finishStudio = () => {
        overlay.style.transform = '';        // -> .is-open transform:none
        overlay.classList.remove('is-towing');
    };

    let playing = false;
    btn.addEventListener('click', (e) => {
        if (reduce || !canCanvas) return;          // let the plain open handler run
        e.preventDefault();
        e.stopImmediatePropagation();              // block sdg-creations' immediate open
        if (playing) return;
        playing = true;
        try { runTow(() => { playing = false; }); }
        catch (err) { openStudio(); playing = false; }
    }, true);

    // ---------- the rope sequence ----------
    function runTow(finish) {
        const rect = btn.getBoundingClientRect();
        const W = window.innerWidth, H = window.innerHeight;

        const canvas = document.createElement('canvas');
        canvas.className = 'sdg-rope-canvas';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * DPR; canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        // The rope is tied behind the truck and arcs up to the right. The anchor
        // and the tailgate-occlusion edge are read from the truck's live position
        // each frame, so the start stays attached as the truck moves.
        const truckEl = document.querySelector('.sdg-truck');
        const truckBox = () => {
            if (!truckEl) return null;
            const r = truckEl.getBoundingClientRect();
            return (r.width > 10 && r.height > 10) ? r : null;
        };
        const anchorAt = () => {
            const r = truckBox();
            return r ? { x: r.left + r.width * 0.30, y: r.top + r.height * 0.42 }
                     : { x: rect.left + rect.width * 0.05, y: rect.top + rect.height * 0.45 };
        };
        const tailEdge = () => {
            const r = truckBox();
            return r ? r.left + r.width * 0.78 : rect.left + rect.width * 0.20;
        };

        const a0 = anchorAt();
        const A = { x: a0.x, y: a0.y };
        const T = { x: W * 0.99, y: Math.max(50, rect.top - 90) };
        let tailX = tailEdge();   // rope is hidden left of this (behind the truck)

        const N = 46;
        const span = Math.hypot(T.x - A.x, T.y - A.y);
        const slackSeg = (span * 1.28) / (N - 1);   // extra length -> bundles/loops
        const tautSeg  = span / (N - 1);
        let seg = slackSeg;

        const pts = [];
        for (let i = 0; i < N; i++) pts.push({ x: A.x, y: A.y, px: A.x, py: A.y });

        const SHOOT = 520, PULL = 1700;
        const TAKEUP_T = 0.22;                          // first chunk of the pull = take up slack
        const D1 = Math.min(130, span * 0.16);          // forward nudge that pulls the rope taut
        const ease = k => 1 - Math.pow(1 - k, 3);
        const easeOut = k => 1 - (1 - k) * (1 - k);     // decelerate (truck slows as rope goes taut)
        const lerp = (a, b, k) => a + (b - a) * k;

        let anchored = false, head = T;
        const headDuring = (k) => {            // high arc up-and-over A -> T while shooting
            const e = ease(Math.min(1, k));
            return { x: lerp(A.x, T.x, e), y: lerp(A.y, T.y, e) - Math.sin(e * Math.PI) * 150 };
        };

        function integrate() {
            for (let i = 1; i < N - 1; i++) {
                const p = pts[i];
                const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985;
                p.px = p.x; p.py = p.y;
                p.x += vx; p.y += vy + 0.55;     // gravity
            }
        }
        function constrain() {
            for (let k = 0; k < 16; k++) {
                pts[0].x = A.x; pts[0].y = A.y;
                pts[N - 1].x = head.x; pts[N - 1].y = head.y;
                for (let i = 0; i < N - 1; i++) {
                    const a = pts[i], b = pts[i + 1];
                    let dx = b.x - a.x, dy = b.y - a.y;
                    const d = Math.hypot(dx, dy) || 0.001;
                    const diff = (d - seg) / d * 0.5, ox = dx * diff, oy = dy * diff;
                    const aFix = (i === 0), bFix = (i + 1 === N - 1);
                    if (!aFix) { a.x += ox; a.y += oy; }
                    if (!bFix) { b.x -= ox; b.y -= oy; }
                }
            }
        }
        function draw(alpha) {
            ctx.clearRect(0, 0, W, H);
            ctx.globalAlpha = alpha;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            // Draw the whole rope; the truck layer (above this canvas) hides the
            // tied-off end behind the body.
            ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = '#5c421f'; ctx.lineWidth = 6.5; ctx.stroke();      // rope core
            ctx.strokeStyle = 'rgba(196,156,96,0.85)'; ctx.lineWidth = 2.5; ctx.stroke(); // strand highlight
            const h = pts[N - 1];                                               // hook
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath(); ctx.arc(h.x, h.y, 6.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Hand the parked truck to the tow and lift it into a layer ABOVE the
        // rope canvas (but below the studio), so the rope renders behind the
        // truck and its tied-off end stays hidden behind the body — no visible
        // segment growth/shrink at the start.
        let towTruck = window.SDGTruck ? window.SDGTruck.beginTow() : null;
        let towLayer = null, truckHome = null;
        if (towTruck) {
            const tr = towTruck.getBoundingClientRect();
            truckHome = { parent: towTruck.parentNode, next: towTruck.nextSibling };
            towLayer = document.createElement('div');
            towLayer.className = 'sdg-truck-layer';
            document.body.appendChild(towLayer);
            towTruck.style.position = 'absolute';
            towTruck.style.left = tr.left + 'px';
            towTruck.style.top = tr.top + 'px';
            towTruck.style.bottom = 'auto';
            towTruck.style.width = tr.width + 'px';
            towTruck.style.height = tr.height + 'px';
            towTruck.style.transform = 'translate(0px, 0)';
            towLayer.appendChild(towTruck);
        }

        const t0 = performance.now();
        let phase = 'shoot', pullT0 = 0, towed = false;

        function shake() {
            document.body.classList.add('page-shake');
            window.setTimeout(() => document.body.classList.remove('page-shake'), 300);
        }
        function restore() {                 // put the truck back on the button
            if (towTruck && truckHome) {
                ['position', 'left', 'top', 'bottom', 'width', 'height'].forEach(p => { towTruck.style[p] = ''; });
                truckHome.parent.insertBefore(towTruck, truckHome.next);
                truckHome = null;
            }
            if (towLayer) { towLayer.remove(); towLayer = null; }
            window.SDGTruck && window.SDGTruck.endTow();
        }
        function cleanup() {
            canvas.remove();
            restore();
            finish && finish();
        }

        function frame(now) {
            const t = now - t0;
            const a = anchorAt(); A.x = a.x; A.y = a.y;   // rope start follows the truck

            if (phase === 'shoot') {
                head = headDuring(t / SHOOT);
                integrate(); constrain(); draw(1);
                if (t >= SHOOT) { anchored = true; head = T; phase = 'pull'; pullT0 = now; shake(); }
            } else if (phase === 'pull') {
                const k = Math.min(1, (now - pullT0) / PULL);
                if (!towed) { towed = true; openStudio(); }   // truck was handed off at start

                let truckOff, studioFrac, straight;
                if (k < TAKEUP_T) {
                    // Truck drives forward (left), decelerating, until the slack
                    // is gone and the rope snaps taut. Studio stays off-screen.
                    const tu = k / TAKEUP_T;
                    truckOff = easeOut(tu) * D1;
                    studioFrac = 1;
                    straight = false;
                    seg = lerp(slackSeg, tautSeg, tu); // rope visibly tightens
                } else {
                    // Taut now: slow to start under the studio's weight, then
                    // accelerate, hauling it in to cover the screen. Truck and
                    // studio move the same amount -> constant gap / tight rope.
                    const h = (k - TAKEUP_T) / (1 - TAKEUP_T);
                    const hp = Math.pow(h, 1.9);
                    truckOff = D1 + hp * W;
                    studioFrac = 1 - hp;
                    straight = true;
                }

                overlay.style.transform = `translateX(${studioFrac * 100}%)`;
                if (towTruck) towTruck.style.transform =
                    `translate(${-truckOff}px, 0) rotate(${-(truckOff / W) * 4}deg)`;
                head = { x: studioFrac * W, y: T.y };

                if (straight) {                        // lay the rope dead-straight = tight
                    for (let i = 0; i < N; i++) {
                        const f = i / (N - 1);
                        pts[i].x = lerp(A.x, head.x, f); pts[i].y = lerp(A.y, head.y, f);
                        pts[i].px = pts[i].x; pts[i].py = pts[i].y;
                    }
                    draw(1);
                } else {
                    integrate(); constrain(); draw(1);
                }
                if (k >= 1) {
                    finishStudio();
                    cleanup(); return;       // cleanup restores the truck + endTow
                }
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        // Safety net: make sure the studio ends up open even if the frame loop
        // stalls (snap it fully in and release the truck).
        window.setTimeout(() => {
            if (towed) return;
            towed = true;
            openStudio(); finishStudio(); cleanup();   // cleanup restores the truck + endTow
        }, SHOOT + PULL + 200);
        window.setTimeout(() => { if (document.body.contains(canvas)) cleanup(); }, SHOOT + PULL + 700);
    }
})();
