/* ============================================================
   SEC TEAM — "Arc Select" fighting-game-style crew selector.
   Three faction tabs (SEC / ICE / SDG) each with a roster of
   powered-down crew portraits + a red selector that arcs lightning
   cell-to-cell; the picked crew member powers on in a splash panel
   with a short bio and "what they do" skill bubbles.

   Renders into #team-select. Vanilla — canvas lightning, CSS glow.
   Keyboard (arrows/enter) + mouse + touch.

   PLACEHOLDER DATA: swap DIVISIONS[].members for real names/titles/
   photos/bios. Give each member a `photo` (top-light headshot) to
   replace the silhouette; edit `focus` for the bubble tags.
   ============================================================ */
(() => {
    'use strict';
    const root = document.getElementById('team-select');
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DIVISIONS = [
        {
            key: 'SEC', name: 'Southern Electric',
            members: [
                // PLACEHOLDER bio/skills — confirm with Kevin. Owns all three divisions; lives in SEC.
                { name: 'Kevin Hatcher', title: 'Owner', photo: 'assets/images/team/kevin-hatcher.webp', epithet: 'The Big Cheese', bio: 'Owner of Southern Electric & Controls — SEC, ICE, and SDG all run under him, with the field side as home base. He sets the direction and the standard the whole team builds to.', focus: ['Leadership', 'Operations', 'Client Relations', 'Business Development'] },
                // Crew — names + silhouettes (guy/girl). Roles/bios/skills TBD; real photos to replace silhouettes once permission is given.
                { name: 'Cary Prince', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Rhyan McGhee', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'David Hatcher', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Jeremey Hensley', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Alan Ross', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Mike Evans', sil: 'male', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Jenny Gardner', sil: 'female', bio: 'Part of the Southern Electric field crew.' },
                { name: 'Anna Robertson', sil: 'female', bio: 'Part of the Southern Electric field crew.' },
            ],
        },
        {
            key: 'ICE', name: 'Industrial Controls & Electrical',
            members: [
                // Clint owns the ICE team
                { name: 'Clint Benedetto', title: 'Owner', sil: 'male', bio: 'Owner of Industrial Controls & Electrical.' },
                { name: 'Richard Moody', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Hunter Alistair', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Dillon Carson', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Joseph Autry', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Joey Henson', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Keith', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Uegene Finley', sil: 'male', bio: 'Part of the Industrial Controls & Electrical team.' },
                { name: 'Nicole Harris', sil: 'female', bio: 'Part of the Industrial Controls & Electrical team.' },
            ],
        },
        {
            key: 'SDG', name: 'Southern Design Group',
            // PLACEHOLDER titles/bios/skills — confirm with Mason & Eriana. Eriana needs a photo.
            members: [
                {
                    name: 'Mason Walton', title: 'Multi-field Designer', photo: 'assets/images/team/mason-walton.webp',
                    epithet: 'The Digital Fabricator',
                    bio: 'Raised in the JM2 workshop around blueprints, server racks, and the hum of machines — coordinating BIM models and pushing 3D environments to their limits by sixteen. From modding tools to fully rigged characters, vehicles, and entire gameplay systems, Mason doesn’t just build assets; he engineers worlds.',
                    focus: ['Precision Modeling', 'BIM Coordination', 'Systems Logic & Scripting', 'Tool & Pipeline Development'],
                },
                { name: 'Eriana Fleming', title: 'Designer', photo: 'assets/images/team/eriana-fleming.webp', bio: 'Always learning and evolving to pursue my dream goals and help others.', focus: ['Photoshop', 'AutoCAD', 'Navisworks', 'Revit', 'Architectural Drafting', '3D Modeling', 'Graphic Design'] },
            ],
        },
    ];
    let gridCols = 3;

    const SIL = `<svg class="ts-sil" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path d="M6 120 C6 86 24 78 50 78 C76 78 94 86 94 120 Z"/>
        <circle cx="50" cy="50" r="19"/>
        <path class="ts-hat" d="M27 44 C27 25 38 20 50 20 C62 20 73 25 73 44 Z"/>
        <rect class="ts-hat" x="22" y="42" width="56" height="5" rx="2.5"/></svg>`;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // real photo > branded silhouette (guy/girl + division hardhat) > generic SVG fallback
    const portrait = (m, divKey) => m.photo
        ? `<img class="ts-photo" src="${esc(m.photo)}" alt="${esc(m.name)}">`
        : (m.sil ? `<img class="ts-photo ts-photo--sil" src="assets/images/team/sil-${esc(m.sil)}-${esc(divKey)}.webp" alt="${esc(m.name)}">` : SIL);

    /* ---------- build shell ---------- */
    root.innerHTML = `
        <div class="ts-bg" aria-hidden="true"></div>
        <canvas class="ts-fx" aria-hidden="true"></canvas>
        <div class="ts-tabs" role="tablist" aria-label="Divisions">
            ${DIVISIONS.map((d, i) => `
                <button class="ts-tab" role="tab" data-d="${i}" type="button" aria-selected="false">
                    <span class="ts-tab-key">${esc(d.key)}</span>
                    <span class="ts-tab-name">${esc(d.name)}</span>
                </button>`).join('')}
        </div>
        <div class="ts-body">
            <div class="ts-grid" role="listbox" aria-label="Select a team member" tabindex="0"></div>
            <div class="ts-splash">
                <div class="ts-splash-media"><span class="ts-aura"></span><div class="ts-splash-portrait"></div></div>
                <div class="ts-splash-info">
                    <h3 class="ts-name"></h3>
                    <div class="ts-epithet"></div>
                    <ul class="ts-focus"></ul>
                    <p class="ts-bio"></p>
                </div>
                <span class="ts-flash" aria-hidden="true"></span>
            </div>
        </div>
        <div class="ts-mission">
            <span class="ts-mission-label">Our Mission</span>
            <span class="ts-mission-text">One team, three divisions — the field crews, controls specialists, and designers who design it, build it, and bring it to life. From the first blueprint to final commissioning, SEC delivers as one accountable team.</span>
        </div>`;

    const tabs   = [...root.querySelectorAll('.ts-tab')];
    const grid   = root.querySelector('.ts-grid');
    const splash = root.querySelector('.ts-splash');
    const sMedia = root.querySelector('.ts-splash-portrait');
    const sName  = root.querySelector('.ts-name');
    const sEpithet = root.querySelector('.ts-epithet');
    const sBio   = root.querySelector('.ts-bio');
    const sFocus = root.querySelector('.ts-focus');
    const tsBg   = root.querySelector('.ts-bg');
    const canvas = root.querySelector('.ts-fx');
    const ctx    = canvas.getContext('2d');
    // pre-baked WHITE ghost of each division logo (RGB forced white, alpha kept) so it reads as a
    // watermark on the dark panel. Plain background-image — reliable, unlike CSS mask of an external img.
    const DIV_LOGOS = {
        sec: 'assets/images/logos/ghost-sec.webp',
        ice: 'assets/images/logos/ghost-ice.webp',
        sdg: 'assets/images/logos/ghost-sdg.webp',
    };

    /* ---------- electricity circling the selected card ---------- */
    // per-division strand colours: [primary, secondary] — saturated so the arc reads;
    // "white" identity comes from the thin hot core, not the glow colour
    const DIV_COLORS = [
        ['#ff2b33', '#ff7a80'],   // SEC — red (bright + light red); white hot core
        ['#ff7a14', '#1f6dff'],   // ICE — orange + deep blue
        ['#ff5b62', '#d81e26'],   // SDG — red (already reads great)
    ];
    const MARGIN = 48;   // canvas bleeds past the component so edge glow isn't clipped
    // PERF: the glow is built from cheap wide additive ('lighter') strokes inside the canvas —
    // NO ctx.shadowBlur and NO CSS filter on the element. Both re-blur the whole surface every
    // frame and tanked this to ~40fps; without them the effect holds 160+fps.
    // precomputed crackle so jagPath never calls Math.random() per-vertex per-frame (no GC churn)
    const NOISE = Array.from({ length: 256 }, () => Math.random() - 0.5);
    let DPR = 1, raf = 0, running = false, fxBox = null, lastDraw = 0;
    function sizeCanvas() {
        DPR = Math.min(1.5, window.devicePixelRatio || 1);   // 1.5 is plenty once the CSS filter does the blur
        const r = root.getBoundingClientRect();
        const fw = r.width + MARGIN * 2, fh = r.height + MARGIN * 2;
        canvas.width = fw * DPR; canvas.height = fh * DPR;
        canvas.style.width = fw + 'px'; canvas.style.height = fh + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, MARGIN * DPR, MARGIN * DPR);   // (0,0) = component top-left
    }
    const clearAll = () => { const r = root.getBoundingClientRect(); ctx.clearRect(-MARGIN, -MARGIN, r.width + MARGIN * 2, r.height + MARGIN * 2); };
    const box = el => { const c = el.getBoundingClientRect(), r = root.getBoundingClientRect(); return { x: c.left - r.left, y: c.top - r.top, w: c.width, h: c.height }; };
    function perim(x, y, w, h, n) {
        const pts = [], edge = (ax, ay, bx, by, nx, ny) => { for (let i = 0; i < n; i++) { const f = i / n; pts.push({ x: ax + (bx - ax) * f, y: ay + (by - ay) * f, nx, ny }); } };
        edge(x, y, x + w, y, 0, -1); edge(x + w, y, x + w, y + h, 1, 0);
        edge(x + w, y + h, x, y + h, 0, 1); edge(x, y + h, x, y, -1, 0);
        return pts;
    }
    // trace a jagged filament loop into the current path (one strand) — sharp, crackling zigzag
    function jagPath(pts, amp, t, seed) {
        ctx.beginPath();
        for (let i = 0; i <= pts.length; i++) {
            const p = pts[i % pts.length];
            const nz = NOISE[(i * 7 + (t * 30 | 0) + (seed | 0) * 13) & 255];   // animated crackle, no per-vertex RNG
            const wob = Math.sin(t * 7 + i * 1.15 + seed * 2.3) * amp
                      + Math.sin(t * 19 + i * 2.9 + seed) * amp * 0.7
                      + nz * amp * 1.5;
            i ? ctx.lineTo(p.x + p.nx * wob, p.y + p.ny * wob)
              : ctx.moveTo(p.x + p.nx * wob, p.y + p.ny * wob);
        }
    }
    // stroke as lightning, glow faked with stacked translucent strokes under 'lighter' compositing
    // (no shadowBlur, no CSS filter): wide soft halo -> colored body -> crisp arc -> white-hot core.
    function strokeNeon(col, coreA) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 6.5; ctx.globalAlpha = 0.10; ctx.stroke();   // wide soft halo (the faux-glow)
        ctx.lineWidth = 3.2; ctx.globalAlpha = 0.26; ctx.stroke();   // colored body
        ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;  ctx.stroke();   // crisp colored arc (the "bolt")
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.6; ctx.globalAlpha = coreA * 0.7; ctx.stroke();   // thin white-hot center
    }
    // short lightning tendrils spiking outward from the frame
    function drawBranches(pts, cols, t) {
        const N = pts.length;
        for (let s = 0; s < 6; s++) {
            const on = Math.sin(t * 2.3 + s * 1.7) * 0.5 + 0.5;
            if (on < 0.5) continue;
            const p = pts[Math.floor((s / 6) * N + t * 3 + s) % N];
            const perpx = -p.ny, perpy = p.nx, len = 7 + on * 13, segs = 3;
            const bp = [{ x: p.x, y: p.y }];
            for (let k = 1; k <= segs; k++) {
                const f = k / segs, j = (Math.random() - 0.5) * 8 * (1 - f * 0.5);
                bp.push({ x: p.x + p.nx * len * f + perpx * j, y: p.y + p.ny * len * f + perpy * j });
            }
            ctx.beginPath(); ctx.moveTo(bp[0].x, bp[0].y);
            for (let k = 1; k < bp.length; k++) ctx.lineTo(bp[k].x, bp[k].y);
            ctx.strokeStyle = cols[s % cols.length]; ctx.lineWidth = 1.7; ctx.globalAlpha = on * 0.7; ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.7; ctx.globalAlpha = on * 0.5; ctx.stroke();
        }
    }
    const PAD = 12;   // outline gap between the card edge and the ring
    function drawBorder(b, t) {
        clearAll();
        const pts = perim(b.x - PAD, b.y - PAD, b.w + PAD * 2, b.h + PAD * 2, 16);
        const cols = DIV_COLORS[curDiv] || DIV_COLORS[0];
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'lighter';   // additive -> neon bloom where strands overlap
        // braided bundle: two filaments per colour
        cols.forEach((col, ci) => {
            jagPath(pts, 4.2, t, ci * 3 + 1); strokeNeon(col, 0.9);
            jagPath(pts, 2.6, t * 1.35, ci * 3 + 2); strokeNeon(col, 0.6);
        });
        drawBranches(pts, cols, t);
        // pulsing hot nodes at the corners
        const cx = b.x - PAD, cy = b.y - PAD, cw = b.w + PAD * 2, ch = b.h + PAD * 2;
        [[cx, cy], [cx + cw, cy], [cx + cw, cy + ch], [cx, cy + ch]].forEach((c, ci) => {
            const pul = 0.5 + Math.sin(t * 4 + ci * 1.3) * 0.35;
            ctx.fillStyle = '#fff'; ctx.globalAlpha = pul * 0.7;
            ctx.beginPath(); ctx.arc(c[0], c[1], 2.1, 0, Math.PI * 2); ctx.fill();
        });
        // bright spark running around the perimeter
        const sp = pts[Math.floor((t * 0.4 % 1) * pts.length)];
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(sp.x + sp.nx * 2, sp.y + sp.ny * 2, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
    function loop(now) {
        if (!running) return;
        raf = requestAnimationFrame(loop);
        if (now - lastDraw < 33) return;   // PERF: cap to ~30fps — lightning reads great strobed, halves the work
        lastDraw = now;
        if (cur >= 0 && splash) {
            // the electric ring encloses the WHOLE profile card (portrait + name + bio + skills);
            // box() reads the live rect, so it follows the shrink/pop scale animation
            const tb = box(splash);
            if (!fxBox) fxBox = { ...tb };
            const k = 0.5;
            fxBox.x += (tb.x - fxBox.x) * k; fxBox.y += (tb.y - fxBox.y) * k; fxBox.w += (tb.w - fxBox.w) * k; fxBox.h += (tb.h - fxBox.h) * k;
            drawBorder(fxBox, now / 1000);
        }
    }
    // reduced-motion users get a single static ring instead of a bare card (no animation loop)
    function drawStatic() { if (cur < 0 || !splash) return; sizeCanvas(); fxBox = box(splash); drawBorder(fxBox, 0); }
    function start() { if (reduce) { drawStatic(); return; } if (running) return; running = true; lastDraw = 0; sizeCanvas(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; clearAll(); }

    /* ---------- state ---------- */
    let curDiv = -1, cur = -1, cells = [];

    function renderDivision(di, fx) {
        if (di === curDiv) return;
        const keep = cur < 0 ? 0 : cur;   // carry the selected slot across teams
        curDiv = di; cur = -1; fxBox = null;
        tabs.forEach((t, k) => { t.classList.toggle('is-active', k === di); t.setAttribute('aria-selected', k === di); });
        const d = DIVISIONS[di];
        const dk = d.key.toLowerCase();
        if (tsBg && DIV_LOGOS[dk]) tsBg.style.backgroundImage = `url("${DIV_LOGOS[dk]}")`;   // white ghost watermark
        grid.innerHTML = d.members.map((m, i) => `
            <button class="ts-cell" role="option" data-i="${i}" type="button" aria-selected="false" style="--i:${i}">
                <span class="ts-cell-media">${portrait(m, dk)}</span>
                <span class="ts-cell-name">${esc(m.name)}${m.title ? `<span class="ts-cell-role">${esc(m.title)}</span>` : ''}</span>
                <span class="ts-cell-ring" aria-hidden="true"></span>
            </button>`).join('');
        gridCols = Math.min(d.members.length, 3);   // adapt columns to roster size (e.g. SDG has 2)
        grid.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
        cells = [...grid.querySelectorAll('.ts-cell')];
        // selection only changes on an explicit pick (click / keyboard) — not on hover
        cells.forEach((c, i) => c.addEventListener('click', () => { select(i, true); c.focus({ preventScroll: true }); }));
        if (fx && !reduce) { grid.classList.remove('powering'); void grid.offsetWidth; grid.classList.add('powering'); }
        select(Math.min(keep, d.members.length - 1), fx);
    }

    let swapTimer = 0;
    function fillSplash(d, m) {
        sMedia.innerHTML = portrait(m, d.key.toLowerCase());
        sName.textContent = m.name;
        sEpithet.textContent = m.epithet || '';
        sFocus.innerHTML = (m.focus || []).map((f, k) => `<li style="--i:${k}">${esc(f)}</li>`).join('');
        sBio.textContent = m.bio || '';
    }
    function select(i, fx) {
        const d = DIVISIONS[curDiv];
        if (i === cur || !d || !d.members[i]) return;
        cur = i;
        cells.forEach((c, k) => { c.classList.toggle('is-active', k === i); c.setAttribute('aria-selected', k === i); });
        const m = d.members[i];
        clearTimeout(swapTimer);
        if (fx && !reduce) {
            // shrink/fizzle the card out, swap the person at the bottom, then pop it back up
            splash.classList.remove('is-pop'); void splash.offsetWidth; splash.classList.add('is-pop');
            swapTimer = setTimeout(() => fillSplash(d, m), 150);
        } else {
            fillSplash(d, m);
        }
        if (reduce) drawStatic();   // no loop for reduced motion, so re-fit the static ring to the new card
    }

    /* ---------- interaction ---------- */
    tabs.forEach((t, i) => t.addEventListener('click', () => renderDivision(i, true)));
    grid.addEventListener('keydown', e => {
        const max = DIVISIONS[curDiv].members.length - 1;
        let n = cur < 0 ? 0 : cur;
        if (e.key === 'ArrowRight') n = Math.min(max, cur + 1);
        else if (e.key === 'ArrowLeft') n = Math.max(0, cur - 1);
        else if (e.key === 'ArrowDown') n = Math.min(max, cur + gridCols);
        else if (e.key === 'ArrowUp') n = Math.max(0, cur - gridCols);
        else return;
        e.preventDefault(); cells[n].focus(); select(n, true);
    });
    window.addEventListener('resize', sizeCanvas, { passive: true });

    sizeCanvas();
    renderDivision(0, false);
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? start() : stop()), { threshold: 0.12 });
        io.observe(root);
    } else { start(); }
})();
