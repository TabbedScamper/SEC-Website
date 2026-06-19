/* ============================================================
   SEC TEAM — "Arc Select" fighting-game-style crew selector.
   Three faction tabs (SEC / ICE / SDG) each with a roster of
   powered-down crew portraits + a red selector that arcs lightning
   cell-to-cell; the picked crew member powers on in a splash panel
   with electric stat bars.

   Renders into #team-select. Vanilla — canvas for lightning, CSS
   for the glow. Keyboard (arrows/enter) + mouse + touch.

   PLACEHOLDER DATA: swap DIVISIONS[].members for real names/titles/
   photos. Give each member a `photo` (top-light headshot) to replace
   the silhouette; tune stat values (0–5).
   ============================================================ */
(() => {
    'use strict';
    const root = document.getElementById('team-select');
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DIVISIONS = [
        {
            key: 'SEC', name: 'Southern Electric', blurb: 'Field & installation',
            members: [
                { name: 'Your Name', title: 'Master Electrician', years: 22, stats: { Controls: 3, Install: 5, BIM: 2, Safety: 5 } },
                { name: 'Your Name', title: 'Field Foreman',      years: 18, stats: { Controls: 3, Install: 5, BIM: 1, Safety: 5 } },
                { name: 'Your Name', title: 'Project Manager',    years: 16, stats: { Controls: 4, Install: 4, BIM: 3, Safety: 5 } },
                { name: 'Your Name', title: 'Estimator',          years: 12, stats: { Controls: 3, Install: 4, BIM: 3, Safety: 3 } },
                { name: 'Your Name', title: 'Service Technician', years: 9,  stats: { Controls: 4, Install: 5, BIM: 2, Safety: 4 } },
                { name: 'Your Name', title: 'Apprentice',         years: 3,  stats: { Controls: 2, Install: 3, BIM: 1, Safety: 4 } },
            ],
        },
        {
            key: 'ICE', name: 'Industrial Controls & Electrical', blurb: 'Automation & controls',
            members: [
                { name: 'Your Name', title: 'Controls Engineer',   years: 15, stats: { Controls: 5, Install: 3, BIM: 4, Safety: 4 } },
                { name: 'Your Name', title: 'PLC Programmer',       years: 13, stats: { Controls: 5, Install: 2, BIM: 3, Safety: 4 } },
                { name: 'Your Name', title: 'BAS Technician',       years: 11, stats: { Controls: 5, Install: 4, BIM: 2, Safety: 4 } },
                { name: 'Your Name', title: 'Commissioning Lead',   years: 17, stats: { Controls: 5, Install: 3, BIM: 3, Safety: 5 } },
                { name: 'Your Name', title: 'Panel Builder',        years: 10, stats: { Controls: 4, Install: 5, BIM: 2, Safety: 4 } },
            ],
        },
        {
            key: 'SDG', name: 'Southern Design Group', blurb: 'BIM, drafting & media',
            members: [
                { name: 'Your Name', title: 'BIM / VDC Lead',     years: 11, stats: { Controls: 3, Install: 2, BIM: 5, Safety: 3 } },
                { name: 'Your Name', title: 'Revit Modeler',      years: 8,  stats: { Controls: 2, Install: 2, BIM: 5, Safety: 2 } },
                { name: 'Your Name', title: 'AutoCAD Drafter',    years: 9,  stats: { Controls: 3, Install: 3, BIM: 4, Safety: 3 } },
                { name: 'Your Name', title: '3D / Visualization', years: 6,  stats: { Controls: 1, Install: 1, BIM: 5, Safety: 2 } },
                { name: 'Your Name', title: 'Media & Web',        years: 7,  stats: { Controls: 2, Install: 1, BIM: 4, Safety: 2 } },
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
                    <div class="ts-tag"></div><h3 class="ts-name"></h3><div class="ts-title"></div><div class="ts-stats"></div>
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
    const sStats = root.querySelector('.ts-stats');
    const canvas = root.querySelector('.ts-fx');
    const ctx    = canvas.getContext('2d');

    /* ---------- lightning ---------- */
    let DPR = 1, bolts = [], raf = 0;
    function sizeCanvas() {
        DPR = Math.min(2, window.devicePixelRatio || 1);
        const r = root.getBoundingClientRect();
        canvas.width = r.width * DPR; canvas.height = r.height * DPR;
        canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function jagged(x1, y1, x2, y2, d, out) {
        if (d < 5) { out.push([x2, y2]); return; }
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * d, my = (y1 + y2) / 2 + (Math.random() - 0.5) * d;
        jagged(x1, y1, mx, my, d / 2, out); jagged(mx, my, x2, y2, d / 2, out);
    }
    function arc(ax, ay, bx, by) {
        const pts = [[ax, ay]]; jagged(ax, ay, bx, by, Math.hypot(bx - ax, by - ay) * 0.32, pts);
        bolts.push({ pts, life: 1 });
        if (!raf) raf = requestAnimationFrame(draw);
    }
    function draw() {
        const r = root.getBoundingClientRect();
        ctx.clearRect(0, 0, r.width, r.height);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        bolts.forEach(b => {
            ctx.globalAlpha = Math.max(0, b.life);
            ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]);
            for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);
            ctx.strokeStyle = 'rgba(216,30,38,0.55)'; ctx.lineWidth = 6; ctx.shadowColor = '#ff3b43'; ctx.shadowBlur = 16; ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.shadowBlur = 6; ctx.stroke();
            b.life -= 0.08;
        });
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        bolts = bolts.filter(b => b.life > 0);
        raf = bolts.length ? requestAnimationFrame(draw) : 0;
    }
    const center = el => { const c = el.getBoundingClientRect(), r = root.getBoundingClientRect(); return [c.left - r.left + c.width / 2, c.top - r.top + c.height / 2]; };

    /* ---------- state ---------- */
    let curDiv = -1, cur = -1, cells = [];

    function renderDivision(di, fx) {
        if (di === curDiv) return;
        curDiv = di; cur = -1;
        tabs.forEach((t, k) => { t.classList.toggle('is-active', k === di); t.setAttribute('aria-selected', k === di); });
        const d = DIVISIONS[di];
        grid.innerHTML = d.members.map((m, i) => `
            <button class="ts-cell" role="option" data-i="${i}" type="button" aria-selected="false" style="--i:${i}">
                <span class="ts-cell-media">${portrait(m)}</span>
                <span class="ts-cell-name">${esc(m.title)}</span>
                <span class="ts-cell-ring" aria-hidden="true"></span>
            </button>`).join('');
        cells = [...grid.querySelectorAll('.ts-cell')];
        cells.forEach((c, i) => {
            c.addEventListener('mouseenter', () => select(i, true));
            c.addEventListener('focus', () => select(i, true));
            c.addEventListener('click', () => select(i, true));
        });
        if (fx && !reduce) { grid.classList.remove('powering'); void grid.offsetWidth; grid.classList.add('powering'); }
        select(0, false);
    }

    function select(i, fx) {
        const d = DIVISIONS[curDiv];
        if (i === cur || !d || !d.members[i]) return;
        const prev = cur; cur = i;
        cells.forEach((c, k) => { c.classList.toggle('is-active', k === i); c.setAttribute('aria-selected', k === i); });
        const m = d.members[i];
        sMedia.innerHTML = portrait(m);
        sTag.textContent = d.name;
        sName.textContent = m.name;
        sTitle.textContent = m.title;
        const rows = Object.entries(m.stats).concat([['Years', Math.min(5, m.years / 5)]]);
        sStats.innerHTML = rows.map(([k, v]) =>
            `<div class="ts-stat"><span class="ts-stat-k">${esc(k)}</span><span class="ts-stat-bar"><i style="--v:${v}"></i></span></div>`).join('');
        requestAnimationFrame(() => sStats.querySelectorAll('.ts-stat-bar i').forEach(el => el.classList.add('go')));
        splash.classList.remove('is-flash'); void splash.offsetWidth; splash.classList.add('is-flash');
        if (fx && !reduce && prev >= 0 && cells[prev]) {
            const [ax, ay] = center(cells[prev]), [bx, by] = center(cells[i]);
            arc(ax, ay, bx, by);
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
    renderDivision(0, false);   // first division up immediately so it's not empty
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es, o) => {
            es.forEach(en => { if (en.isIntersecting) { sizeCanvas(); o.disconnect(); } });
        }, { threshold: 0.2 });
        io.observe(root);
    }
})();
