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

        const SHOOT = 520, SHRINK = 360, PULL = 1500;   // SHRINK > shake so they don't overlap
        const ease = k => 1 - Math.pow(1 - k, 3);
        const lerp = (a, b, k) => a + (b - a) * k;

        // Slow to start, then accelerating off-screen to the left (ease-in).
        // Both the studio and the truck are driven by this single value, so they
        // move at the SAME rate and the gap (rope length) stays constant.
        const pullEase = (k) => Math.pow(Math.max(0, Math.min(1, k)), 2.4);

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
            // Start the visible rope where it clears the tailgate, so its
            // anchored end stays hidden behind the truck.
            let s = 0;
            while (s < N - 2 && pts[s].x < tailX) s++;
            ctx.beginPath(); ctx.moveTo(pts[s].x, pts[s].y);
            for (let i = s + 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = '#5c421f'; ctx.lineWidth = 6.5; ctx.stroke();      // rope core
            ctx.strokeStyle = 'rgba(196,156,96,0.85)'; ctx.lineWidth = 2.5; ctx.stroke(); // strand highlight
            const h = pts[N - 1];                                               // hook
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath(); ctx.arc(h.x, h.y, 6.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        const t0 = performance.now();
        let phase = 'shoot', shrinkT0 = 0, pullT0 = 0, towed = false, towTruck = null;

        function shake() {
            document.body.classList.add('page-shake');
            window.setTimeout(() => document.body.classList.remove('page-shake'), 300);
        }
        function cleanup() {
            canvas.remove();
            finish && finish();
        }

        function frame(now) {
            const t = now - t0;
            const a = anchorAt(); A.x = a.x; A.y = a.y;   // rope start follows the truck
            tailX = tailEdge();

            if (phase === 'shoot') {
                head = headDuring(t / SHOOT);
                integrate(); constrain(); draw(1);
                if (t >= SHOOT) { anchored = true; head = T; phase = 'shrink'; shrinkT0 = now; shake(); }
            } else if (phase === 'shrink') {
                const k = Math.min(1, (now - shrinkT0) / SHRINK);
                seg = lerp(slackSeg, tautSeg, k);     // rope tightens / bundle shrinks
                head = T;
                integrate(); constrain(); draw(1);
                if (k >= 1) { phase = 'pull'; pullT0 = now; }
            } else if (phase === 'pull') {
                const k = Math.min(1, (now - pullT0) / PULL);
                if (!towed) {                          // kick the haul on the first pull frame
                    towed = true;
                    openStudio();
                    towTruck = window.SDGTruck ? window.SDGTruck.beginTow() : null;
                }
                const pp = pullEase(k);                // shared progress -> equal rates, constant gap
                // Studio slides in from the right; truck + rope drive off-screen
                // left by the same amount (no fade), carrying it in on a tight rope.
                overlay.style.transform = `translateX(${(1 - pp) * 100}%)`;
                if (towTruck) towTruck.style.transform =
                    `translateX(-78%) translateX(0) translate(${-pp * W}px, 0) rotate(${-pp * 3}deg)`;
                head = { x: (1 - pp) * W, y: T.y };     // hooked to the studio's leading edge
                const d = Math.hypot(head.x - A.x, head.y - A.y);
                seg = (d / (N - 1)) * 0.97;             // just under distance -> tight/straight
                integrate(); constrain(); draw(1);      // no fade
                if (k >= 1) {
                    finishStudio();
                    window.SDGTruck && window.SDGTruck.endTow();
                    cleanup(); return;
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
            openStudio(); finishStudio();
            window.SDGTruck && window.SDGTruck.endTow();
        }, SHOOT + SHRINK + PULL + 200);
        window.setTimeout(() => { if (document.body.contains(canvas)) cleanup(); }, SHOOT + SHRINK + PULL + 700);
    }
})();
