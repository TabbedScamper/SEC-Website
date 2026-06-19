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
                { name: 'Your Name', title: 'Master Electrician', meta: '22 yrs in the field', bio: 'Runs SEC field crews on major distribution-center and plant builds — from service gear to final trim.', focus: ['Switchgear', 'Feeders', 'Material-Handling Power', 'Trim-Out'] },
                { name: 'Your Name', title: 'Field Foreman', meta: '18 yrs', bio: 'Keeps the job on schedule and the crew safe, from rough-in to the final walk.', focus: ['Crew Lead', 'Conduit & Rough-In', 'Lighting', 'QA / QC'] },
                { name: 'Your Name', title: 'Project Manager', meta: '16 yrs', bio: 'Owns the project from award to closeout — your single accountable point of contact.', focus: ['Scheduling', 'Submittals', 'Coordination', 'Closeout'] },
                { name: 'Your Name', title: 'Estimator', meta: '12 yrs', bio: 'Builds accurate, competitive bids so there are no surprises down the line.', focus: ['Takeoffs', 'Bidding', 'Value Engineering', 'Design-Build'] },
                { name: 'Your Name', title: 'Service Technician', meta: '9 yrs', bio: 'Handles service calls, upgrades, and the work that keeps plants running.', focus: ['Service Upgrades', 'Troubleshooting', 'Receptacles', 'Repairs'] },
                { name: 'Your Name', title: 'Apprentice', meta: '3 yrs', bio: 'Learning the trade the right way — hands-on and safety-first.', focus: ['Rough-In', 'Material Handling', 'Safety', 'Crew Support'] },
            ],
        },
        {
            key: 'ICE', name: 'Industrial Controls & Electrical',
            members: [
                { name: 'Your Name', title: 'Controls Engineer', meta: '15 yrs', bio: 'Designs and programs the control systems that automate plants and distribution centers.', focus: ['Niagara 4', 'PLC Programming', 'BMS / BAS', 'System Design'] },
                { name: 'Your Name', title: 'PLC Programmer', meta: '13 yrs', bio: 'Writes and commissions the logic that runs the line.', focus: ['PLC Programming', 'HMI', 'Sensors', 'Integration'] },
                { name: 'Your Name', title: 'BAS Technician', meta: '11 yrs', bio: 'Installs and dials in building automation across distribution centers.', focus: ['BMS Install', 'RTU / AHU Controls', 'Sensors', 'Commissioning'] },
                { name: 'Your Name', title: 'Commissioning Lead', meta: '17 yrs', bio: 'Makes sure every point works before the doors open.', focus: ['Commissioning', 'Point-to-Point', 'Startup', 'Documentation'] },
                { name: 'Your Name', title: 'Panel Builder', meta: '10 yrs', bio: 'Fabricates UL-listed control panels in-house, built to spec.', focus: ['Panel Fabrication', 'UL 508A', 'Wiring', 'Testing'] },
            ],
        },
        {
            key: 'SDG', name: 'Southern Design Group',
            members: [
                { name: 'Your Name', title: 'BIM / VDC Lead', meta: '11 yrs', bio: 'Coordinates the model so the field builds it once, not twice.', focus: ['Revit', 'BIM Coordination', 'Clash Detection', 'MEP'] },
                { name: 'Your Name', title: 'Revit Modeler', meta: '8 yrs', bio: 'Builds the electrical model the whole project runs on.', focus: ['Revit', 'Modeling', 'Families', 'Coordination'] },
                { name: 'Your Name', title: 'AutoCAD Drafter', meta: '9 yrs', bio: 'Turns the plan into shop drawings, risers, and panel schedules.', focus: ['AutoCAD', 'Shop Drawings', 'Riser Diagrams', 'Panel Schedules'] },
                { name: 'Your Name', title: '3D / Visualization', meta: '6 yrs', bio: 'Renders and animates the work so clients can see it before it is built.', focus: ['3D Modeling', 'Rendering', 'Animation', 'Visualization'] },
                { name: 'Your Name', title: 'Media & Web', meta: '7 yrs', bio: 'Builds the websites, videos, and visuals that tell SEC’s story.', focus: ['Web Development', 'Video', 'Media', 'Design'] },
            ],
        },
    ];
    const COLS = 3;

    const SIL = `<svg class="ts-sil" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path d="M6 120 C6 86 24 78 50 78 C76 78 94 86 94 120 Z"/>
        <circle cx="50" cy="50" r="19"/>
        <path class="ts-hat" d="M27 44 C27 25 38 20 50 20 C62 20 73 25 73 44 Z"/>
        <rect class="ts-hat" x="22" y="42" width="56" height="5" rx="2.5"/></svg>`;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const portrait = m => m.photo ? `<img class="ts-photo" src="${esc(m.photo)}" alt="${esc(m.name)}">` : SIL;

    /* ---------- build shell ---------- */
    root.innerHTML = `
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
                    <div class="ts-tag"></div>
                    <h3 class="ts-name"></h3>
                    <div class="ts-title"></div>
                    <p class="ts-bio"></p>
                    <ul class="ts-focus"></ul>
                </div>
                <span class="ts-flash" aria-hidden="true"></span>
            </div>
        </div>`;

    const tabs   = [...root.querySelectorAll('.ts-tab')];
    const grid   = root.querySelector('.ts-grid');
    const splash = root.querySelector('.ts-splash');
    const sMedia = root.querySelector('.ts-splash-portrait');
    const sTag   = root.querySelector('.ts-tag');
    const sName  = root.querySelector('.ts-name');
    const sTitle = root.querySelector('.ts-title');
    const sBio   = root.querySelector('.ts-bio');
    const sFocus = root.querySelector('.ts-focus');
    const canvas = root.querySelector('.ts-fx');
    const ctx    = canvas.getContext('2d');

    /* ---------- electricity circling the selected card ---------- */
    // per-division strand colours: [primary, secondary] — saturated so the arc reads;
    // "white" identity comes from the thin hot core, not the glow colour
    const DIV_COLORS = [
        ['#ff2b33', '#ff7a80'],   // SEC — red (bright + light red); white hot core
        ['#ff7a14', '#1f6dff'],   // ICE — orange + deep blue
        ['#ff5b62', '#d81e26'],   // SDG — red (already reads great)
    ];
    const MARGIN = 48;   // canvas bleeds past the component so edge glow isn't clipped
    let DPR = 1, raf = 0, running = false, fxBox = null;
    function sizeCanvas() {
        DPR = Math.min(2, window.devicePixelRatio || 1);
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
            const wob = Math.sin(t * 7 + i * 1.15 + seed * 2.3) * amp
                      + Math.sin(t * 19 + i * 2.9 + seed) * amp * 0.7
                      + (Math.random() - 0.5) * amp * 1.5;
            i ? ctx.lineTo(p.x + p.nx * wob, p.y + p.ny * wob)
              : ctx.moveTo(p.x + p.nx * wob, p.y + p.ny * wob);
        }
    }
    // stroke as lightning: tight colored glow -> crisp colored arc -> thin white-hot core
    function strokeNeon(col, coreA) {
        ctx.strokeStyle = col; ctx.shadowColor = col;
        ctx.shadowBlur = 18; ctx.lineWidth = 7;   ctx.globalAlpha = 0.14; ctx.stroke();   // soft outer glow
        ctx.shadowBlur = 10; ctx.lineWidth = 3.4; ctx.globalAlpha = 0.34; ctx.stroke();   // colored body
        ctx.shadowBlur = 5;  ctx.lineWidth = 1.6; ctx.globalAlpha = 0.92; ctx.stroke();   // crisp colored arc (the "bolt")
        ctx.strokeStyle = '#fff'; ctx.shadowColor = col;
        ctx.shadowBlur = 2;  ctx.lineWidth = 0.6; ctx.globalAlpha = coreA * 0.5; ctx.stroke();   // thin white-hot center
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
            ctx.strokeStyle = cols[s % cols.length]; ctx.shadowColor = cols[s % cols.length];
            ctx.shadowBlur = 12; ctx.lineWidth = 1.7; ctx.globalAlpha = on * 0.6; ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.shadowColor = cols[s % cols.length];
            ctx.shadowBlur = 5; ctx.lineWidth = 0.7; ctx.globalAlpha = on * 0.4; ctx.stroke();
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
            ctx.fillStyle = '#fff'; ctx.shadowColor = cols[0]; ctx.shadowBlur = 16; ctx.globalAlpha = pul * 0.6;
            ctx.beginPath(); ctx.arc(c[0], c[1], 1.9, 0, Math.PI * 2); ctx.fill();
        });
        // bright spark running around the perimeter
        const sp = pts[Math.floor((t * 0.4 % 1) * pts.length)];
        ctx.fillStyle = '#fff'; ctx.shadowColor = cols[0]; ctx.shadowBlur = 16; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(sp.x + sp.nx * 2, sp.y + sp.ny * 2, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    function loop(now) {
        if (!running) return;
        if (cur >= 0 && splash) {
            // the electric ring encloses the WHOLE profile card (portrait + name + bio + skills);
            // box() reads the live rect, so it follows the shrink/pop scale animation
            const tb = box(splash);
            if (!fxBox) fxBox = { ...tb };
            const k = 0.5;
            fxBox.x += (tb.x - fxBox.x) * k; fxBox.y += (tb.y - fxBox.y) * k; fxBox.w += (tb.w - fxBox.w) * k; fxBox.h += (tb.h - fxBox.h) * k;
            drawBorder(fxBox, now / 1000);
        }
        raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; sizeCanvas(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; clearAll(); }

    /* ---------- state ---------- */
    let curDiv = -1, cur = -1, cells = [];

    function renderDivision(di, fx) {
        if (di === curDiv) return;
        const keep = cur < 0 ? 0 : cur;   // carry the selected slot across teams
        curDiv = di; cur = -1; fxBox = null;
        tabs.forEach((t, k) => { t.classList.toggle('is-active', k === di); t.setAttribute('aria-selected', k === di); });
        const d = DIVISIONS[di];
        grid.innerHTML = d.members.map((m, i) => `
            <button class="ts-cell" role="option" data-i="${i}" type="button" aria-selected="false" style="--i:${i}">
                <span class="ts-cell-media">${portrait(m)}</span>
                <span class="ts-cell-name">${esc(m.title)}</span>
                <span class="ts-cell-ring" aria-hidden="true"></span>
            </button>`).join('');
        cells = [...grid.querySelectorAll('.ts-cell')];
        // selection only changes on an explicit pick (click / keyboard) — not on hover
        cells.forEach((c, i) => c.addEventListener('click', () => { select(i, true); c.focus({ preventScroll: true }); }));
        if (fx && !reduce) { grid.classList.remove('powering'); void grid.offsetWidth; grid.classList.add('powering'); }
        select(Math.min(keep, d.members.length - 1), fx);
    }

    let swapTimer = 0;
    function fillSplash(d, m) {
        sMedia.innerHTML = portrait(m);
        sTag.textContent = d.name;
        sName.textContent = m.name;
        sTitle.innerHTML = esc(m.title) + (m.meta ? ` <span class="ts-meta">· ${esc(m.meta)}</span>` : '');
        sBio.textContent = m.bio || '';
        sFocus.innerHTML = (m.focus || []).map((f, k) => `<li style="--i:${k}">${esc(f)}</li>`).join('');
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
    }

    /* ---------- interaction ---------- */
    tabs.forEach((t, i) => t.addEventListener('click', () => renderDivision(i, true)));
    grid.addEventListener('keydown', e => {
        const max = DIVISIONS[curDiv].members.length - 1;
        let n = cur < 0 ? 0 : cur;
        if (e.key === 'ArrowRight') n = Math.min(max, cur + 1);
        else if (e.key === 'ArrowLeft') n = Math.max(0, cur - 1);
        else if (e.key === 'ArrowDown') n = Math.min(max, cur + COLS);
        else if (e.key === 'ArrowUp') n = Math.max(0, cur - COLS);
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
