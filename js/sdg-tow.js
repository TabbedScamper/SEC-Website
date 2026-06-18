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

    // Open the studio with the "towed in from the right" entrance.
    const openStudio = () => {
        document.body.classList.add('sdg-studio-open');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.scrollTop = 0;
        overlay.classList.add('is-open', 'tow-enter');
        // Only react to the studio's OWN slide finishing — animationend bubbles,
        // so a child's entrance animation would otherwise yank tow-enter early
        // and snap the slide to its end.
        const done = (e) => {
            if (e.target !== overlay || e.animationName !== 'sdgStudioTowIn') return;
            overlay.classList.remove('tow-enter');
            overlay.removeEventListener('animationend', done);
        };
        overlay.addEventListener('animationend', done);
        // preventScroll: focusing the fixed close button otherwise yanks the
        // document to the top and you miss the tow happening mid-page.
        closeBtn && closeBtn.focus({ preventScroll: true });
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

        // anchor behind the truck's tailgate (button's left), target high on the right
        const A = { x: rect.left + rect.width * 0.05, y: rect.top + rect.height * 0.45 };
        const T = { x: W * 0.99,                       y: Math.max(50, rect.top - 90) };
        const tailX = rect.left + rect.width * 0.20;   // tailgate edge: rope is hidden left of this

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
        let phase = 'shoot', shrinkT0 = 0, pullT0 = 0, Ax0 = A.x, towed = false;

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
                    window.SDGTruck && window.SDGTruck.driveOff();
                }
                A.x = Ax0 - k * (W * 0.55);            // truck hauls the rope off-screen left
                head = T;
                integrate(); constrain(); draw(1 - k); // fade as the studio covers it
                if (k >= 1) { cleanup(); return; }
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);

        // Safety net: make sure the studio opens even if a frame loop stalls.
        window.setTimeout(() => { if (!towed) { towed = true; openStudio(); window.SDGTruck && window.SDGTruck.driveOff(); } }, SHOOT + SHRINK + 260);
        window.setTimeout(() => { if (document.body.contains(canvas)) cleanup(); }, SHOOT + SHRINK + PULL + 600);
    }
})();
