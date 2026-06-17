/* ============================================================
   PROJECTS — field work grid + shared portfolio helpers
   ------------------------------------------------------------
   This file does two jobs:
     1. Renders the #projects sub-tab grid from window.PROJECTS
        (Southern Electric & Controls field work).
     2. Exposes a shared `window.PF` toolkit (card builder +
        lightbox) that js/sdg-creations.js reuses, so both the
        projects grid and the design-section showcase look and
        behave identically.

   TO ADD A FIELD PROJECT: copy a block in window.PROJECTS and
   edit it. Reuse a `category` string to group it under a tab.

   FIELDS
     title       (req)  Project name
     category    (req)  Drives the sub-tabs
     client      (req)  Company / building — shown as hover badge
     clientLogo  (opt)  Logo png (alpha). Omit → clean text wordmark
     poster      (req)  Card image (16:10 looks best)
     hover       (opt)  GIF/img swapped in on hover (lazy-loaded)
     gallery     (opt)  Array of images for the lightbox
     description (req)  Short paragraph
     featured    (opt)  true = card spans two columns
   ============================================================ */

window.PROJECTS = [
    {
        title: 'PepsiCo',
        category: 'Electrical',
        client: 'PepsiCo',
        clientLogo: 'assets/images/logos/clients/pepsi.svg',
        description: 'A long-running PepsiCo partner across multiple plants — lighting and high-bay retrofits, air-compressor power, EV chargers, exhaust fans, pallet-inverter and rack lighting, and data-rack receptacles.',
    },
    {
        title: 'Walmart — Distribution & Facilities',
        category: 'Building Automation',
        client: 'Walmart',
        clientLogo: 'assets/images/logos/clients/walmart.svg',
        poster: 'assets/images/projects/industrial/walmart-gray-1-e1753291372130.png',
        gallery: [
            'assets/images/projects/industrial/walmart-gray-1-e1753291372130.png',
            'assets/images/projects/awarded/walmart-ks-1.jpg',
        ],
        description: 'Niagara 4 building automation and Honeywell sensors across a 1M+ sq-ft distribution center, plus rooftop air-rotation-unit controls (Siemens / Ranco) — installs and commissioning across Walmart facilities nationwide.',
    },
    {
        title: 'Milwaukee Tool — Geek+ Automation',
        category: 'Industrial',
        client: 'Milwaukee Tool',
        clientLogo: 'assets/images/logos/clients/milwaukee.svg',
        poster: 'assets/images/projects/awarded/milwaukee-geek-1.jpg',
        gallery: [
            'assets/images/projects/awarded/milwaukee-geek-1.jpg',
            'assets/images/projects/awarded/milwaukee-geek-2.jpg',
            'assets/images/projects/awarded/milwaukee-geek-3.jpg',
        ],
        description: 'Power and controls for a Geek+ automated storage-and-retrieval system — high-bay racking, robotic-shuttle charging stations, and panel / HMI integration at Milwaukee Tool’s distribution operation.',
    },
    {
        title: 'FedEx Ground Distribution Centers',
        category: 'Building Automation',
        client: 'FedEx',
        clientLogo: 'assets/images/logos/clients/fedex.svg',
        poster: 'assets/images/projects/industrial/wide-fedex-1-e1753291202150.png',
        description: 'Conveyor power, lighting, building automation, and commissioning across multi-site FedEx Ground hubs.',
    },
    {
        title: 'AutoZone Distribution Center',
        category: 'Electrical',
        client: 'AutoZone',
        clientLogo: 'assets/images/logos/clients/autozone.png',
        poster: 'assets/images/projects/industrial/wide-autozone-2-e1753290080400.png',
        description: 'Complete electrical install for a full-scale distribution center: switchgear, feeders, branch wiring, and material-handling power.',
    },
    {
        title: 'Nissan — Decherd Powertrain Plant',
        category: 'Electrical',
        client: 'Nissan',
        clientLogo: 'assets/images/logos/clients/nissan.svg',
        poster: 'assets/images/projects/sec/nissan-dechard_orig-r833xw2hnqyqen7dvdn2ljhw2835pll1jyysdbf98o.jpg',
        description: "Critical-process electrical and controls work supporting Nissan's North American engine manufacturing operations.",
    },
    {
        title: 'Nike Adapt',
        category: 'Electrical',
        client: 'Nike',
        clientLogo: 'assets/images/logos/clients/nike.svg',
        description: 'Electrical for a Nike Adapt restroom expansion — branch wiring, lighting, and devices on a fast-tracked fit-out.',
    },
    {
        title: 'ERMCO Transformer Manufacturing',
        category: 'Industrial',
        client: 'ERMCO',
        poster: 'assets/images/projects/industrial/wide-ermco-1-e1753290005447.png',
        description: "Long-term industrial electrical partner: production-line power, control upgrades, the Titan office building (mechanical & electrical), and ongoing service for one of the country's largest transformer builders.",
    },
    {
        title: 'Amazon',
        category: 'Electrical',
        client: 'Amazon',
        clientLogo: 'assets/images/logos/clients/amazon.svg',
        description: 'Receptacle and power work supporting an Amazon facility — installed to spec on a tight operational schedule.',
    },
    {
        title: 'Hexpol Compounding',
        category: 'Industrial',
        client: 'Hexpol',
        poster: 'assets/images/projects/industrial/wide-hexpol-1-e1753291319891.png',
        description: 'Process electrical, motor controls, and plant-wide automation integration for a polymer compounding facility.',
    },
];

/* ============================================================
   SHARED PORTFOLIO TOOLKIT  →  window.PF
   ============================================================ */
window.PF = (() => {
    'use strict';

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- Card builder (used by both grids) ---------- */
    function buildCard(p, onOpen, opts = {}) {
        const hasPhoto = !!p.poster;
        const card = document.createElement('article');
        card.className = 'pf-card' +
                         (p.featured ? ' pf-card--featured' : '') +
                         (opts.reveal && hasPhoto ? ' pf-card--reveal' : '') +
                         (!hasPhoto ? ' pf-card--logotile' : '');
        card.dataset.category = p.category || '';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${p.title} — view project`);

        const logoMarkup = p.clientLogo
            ? `<img class="pf-badge-logo" src="${esc(p.clientLogo)}" alt="${esc(p.client)}"
                    onerror="this.parentElement.classList.add('pf-badge--text');this.remove();">`
            : '';

        const mediaBlock = hasPhoto ? `
                <img class="pf-thumb" src="${esc(p.poster)}" alt="${esc(p.title)}" loading="lazy"
                     ${p.hover ? `data-hover="${esc(p.hover)}"` : ''}>
                <span class="pf-shade" aria-hidden="true"></span>
                ${p.year ? `<span class="pf-year">${esc(p.year)}</span>` : ''}
                <span class="pf-badge ${p.clientLogo ? '' : 'pf-badge--text'}" aria-hidden="true">
                    ${logoMarkup}
                    <span class="pf-badge-word">${esc(p.client)}</span>
                </span>
                ${p.youtube ? '<span class="pf-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' : ''}
                <span class="pf-view">${p.youtube ? 'Watch' : 'View project'} <i>&rarr;</i></span>
            ` : `
                <div class="pf-thumb pf-thumb--logo">
                    ${p.clientLogo
                        ? `<img class="pf-logo-tile" src="${esc(p.clientLogo)}" alt="${esc(p.client)}">`
                        : `<span class="pf-logo-tile-word">${esc(p.client)}</span>`}
                </div>
                ${p.year ? `<span class="pf-year">${esc(p.year)}</span>` : ''}
                <span class="pf-view">View project <i>&rarr;</i></span>
            `;

        card.innerHTML = `
            <div class="pf-card-media">${mediaBlock}</div>
            <div class="pf-card-body">
                <span class="pf-card-cat">${esc(p.category || '')}</span>
                <h3 class="pf-card-title">${esc(p.title)}</h3>
                <p class="pf-card-client">${esc(p.client || '')}</p>
                ${(p.skills && p.skills.length) ? `<ul class="pf-skills">${
                    p.skills.slice(0, 4).map(s => `<li>${esc(s)}</li>`).join('') +
                    (p.skills.length > 4 ? `<li class="pf-skills-more">+${p.skills.length - 4}</li>` : '')
                }</ul>` : ''}
            </div>`;

        // Lazy-swap the hover media in on first hover so heavy GIFs only load
        // when someone actually mouses over the card.
        const thumb = card.querySelector('.pf-thumb');
        if (p.hover) {
            let swapped = false;
            const swap = () => {
                if (swapped) return;
                swapped = true;
                const hi = new Image();
                hi.onload = () => { thumb.src = p.hover; thumb.classList.add('is-animated'); };
                hi.src = p.hover;
            };
            card.addEventListener('mouseenter', swap);
            card.addEventListener('focus', swap);
        }

        const open = () => onOpen(p);
        card.addEventListener('click', open);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
        return card;
    }

    /* ---------- Shared lightbox ---------- */
    const lb       = document.getElementById('pfLightbox');
    const lbImg    = lb?.querySelector('.pf-lb-img');
    const lbCat    = lb?.querySelector('.pf-lb-cat');
    const lbTitle  = lb?.querySelector('.pf-lb-title');
    const lbClient = lb?.querySelector('.pf-lb-client');
    const lbDesc   = lb?.querySelector('.pf-lb-desc');
    const lbThumbs = lb?.querySelector('.pf-lb-thumbs');
    const lbClose  = lb?.querySelector('.pf-lb-close');
    let lastFocus = null;

    function setLbImage(src) {
        if (!lbImg) return;
        lbImg.classList.remove('is-in');
        void lbImg.offsetWidth;
        lbImg.src = src;
        lbImg.classList.add('is-in');
    }

    /* ---------- Before/after compare slider (e.g. wireframe → render) ---------- */
    function buildCompare(c) {
        const wrap = document.createElement('div');
        wrap.className = 'pf-compare';
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'slider');
        wrap.setAttribute('aria-label', 'Before / after comparison');
        wrap.innerHTML = `
            <img class="pf-compare-img" src="${esc(c.after)}" alt="" draggable="false">
            <div class="pf-compare-before"><img class="pf-compare-img" src="${esc(c.before)}" alt="" draggable="false"></div>
            <span class="pf-compare-tag pf-compare-tag--l">${esc(c.afterLabel || 'After')}</span>
            <span class="pf-compare-tag pf-compare-tag--r">${esc(c.beforeLabel || 'Before')}</span>
            <div class="pf-compare-divider"><span class="pf-compare-handle">&#8596;</span></div>
            <span class="pf-compare-hint">Drag to compare</span>`;
        const before  = wrap.querySelector('.pf-compare-before');
        const divider  = wrap.querySelector('.pf-compare-divider');
        let pct = 50;
        const set = (v) => {
            pct = Math.max(0, Math.min(100, v));
            before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            divider.style.left = pct + '%';
            wrap.setAttribute('aria-valuenow', Math.round(pct));
        };
        const fromEvent = (e) => {
            const r = wrap.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            set((x / r.width) * 100);
        };
        const move = (e) => { fromEvent(e); if (e.cancelable) e.preventDefault(); };
        const up = () => {
            wrap.classList.remove('is-dragging');
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
        const down = (e) => {
            wrap.classList.add('is-dragging');
            fromEvent(e);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
            window.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('touchend', up);
            if (e.cancelable) e.preventDefault();
        };
        wrap.addEventListener('mousedown', down);
        wrap.addEventListener('touchstart', down, { passive: false });
        wrap.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft')  { set(pct - 4); e.preventDefault(); }
            if (e.key === 'ArrowRight') { set(pct + 4); e.preventDefault(); }
        });
        set(50);
        return wrap;
    }

    function openLightbox(p) {
        if (!lb) return;
        const media = lb.querySelector('.pf-lb-media');
        lastFocus = document.activeElement;

        lbCat.textContent    = (p.year ? p.year + ' · ' : '') + (p.category || '');
        lbTitle.textContent  = p.title;
        lbClient.textContent = p.client || '';
        lbDesc.textContent   = p.description || '';

        // "Built with" skill stack (between client and description).
        lb.querySelector('.pf-lb-skills')?.remove();
        if (p.skills && p.skills.length) {
            const s = document.createElement('div');
            s.className = 'pf-lb-skills';
            s.innerHTML = `<span class="pf-lb-skills-label">Built with</span>` +
                `<ul>${p.skills.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
            lbClient.insertAdjacentElement('afterend', s);
        }

        // Optional testimonial / quote, then external link. Order in the
        // info panel: description → quote → link.
        lb.querySelector('.pf-lb-quote')?.remove();
        lb.querySelector('.pf-lb-link')?.remove();
        let anchorEl = lbDesc;
        if (p.quote && p.quote.text) {
            const q = document.createElement('figure');
            q.className = 'pf-lb-quote';
            q.innerHTML = `<blockquote>&ldquo;${esc(p.quote.text)}&rdquo;</blockquote>` +
                (p.quote.author ? `<figcaption>${esc(p.quote.author)}</figcaption>` : '');
            anchorEl.insertAdjacentElement('afterend', q);
            anchorEl = q;
        }
        if (p.link && p.link.url) {
            const a = document.createElement('a');
            a.className = 'pf-lb-link';
            a.href = p.link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.innerHTML = `${esc(p.link.label || 'View project')} <span aria-hidden="true">&rarr;</span>`;
            anchorEl.insertAdjacentElement('afterend', a);
        }

        // Media + thumbnails. The stage can show a YouTube embed, the compare
        // slider, or a still image; the thumbnail strip switches between them
        // (a ▶ video thumb, an A/B compare thumb, and one per gallery image).
        const galleryImgs = (p.gallery && p.gallery.length) ? p.gallery : [];
        lbThumbs.innerHTML = '';

        const clearOverlays = () => {
            media.querySelector('.pf-compare')?.remove();
            media.querySelector('.pf-lb-embed')?.remove();
            media.querySelector('.pf-lb-logo')?.remove();
        };
        const showEmbed = () => {
            clearOverlays();
            lbImg.style.display = 'none';
            const wrap = document.createElement('div');
            wrap.className = 'pf-lb-embed';
            wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(p.youtube)}?rel=0&modestbranding=1"
                title="${esc(p.title)}" loading="lazy" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>`;
            media.appendChild(wrap);
        };
        const showCompare = () => { clearOverlays(); lbImg.style.display = 'none'; media.appendChild(buildCompare(p.compare)); };
        const showImage   = (src) => { clearOverlays(); lbImg.style.display = ''; setLbImage(src); };
        const showLogoTile = (src) => {
            clearOverlays(); lbImg.style.display = 'none';
            const tile = document.createElement('div');
            tile.className = 'pf-lb-logo';
            tile.innerHTML = `<img src="${esc(src)}" alt="${esc(p.client || '')}">`;
            media.appendChild(tile);
        };

        clearOverlays();
        if (p.youtube)                            showEmbed();
        else if (p.compare)                       showCompare();
        else if (galleryImgs.length || p.poster)  showImage(galleryImgs[0] || p.poster);
        else if (p.clientLogo)                    showLogoTile(p.clientLogo);
        else                                      lbImg.style.display = 'none';

        const thumbs = [];
        if (p.youtube) thumbs.push({ kind: 'video',   src: p.poster });
        if (p.compare) thumbs.push({ kind: 'compare', src: p.compare.after });
        galleryImgs.forEach(src => thumbs.push({ kind: 'image', src }));

        if (thumbs.length > 1) {
            thumbs.forEach((def, gi) => {
                const t = document.createElement('button');
                t.className = 'pf-lb-thumb' + (gi === 0 ? ' is-active' : '') +
                              (def.kind === 'compare' ? ' pf-lb-thumb--compare' : '') +
                              (def.kind === 'video'   ? ' pf-lb-thumb--video'   : '');
                t.type = 'button';
                t.innerHTML = `<img src="${esc(def.src)}" alt="">` +
                    (def.kind === 'compare' ? '<span class="pf-lb-thumb-tag">A / B</span>' : '') +
                    (def.kind === 'video'   ? '<span class="pf-lb-thumb-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' : '');
                t.addEventListener('click', () => {
                    if (def.kind === 'video')        showEmbed();
                    else if (def.kind === 'compare') showCompare();
                    else                             showImage(def.src);
                    lbThumbs.querySelectorAll('.pf-lb-thumb').forEach(x => x.classList.remove('is-active'));
                    t.classList.add('is-active');
                });
                lbThumbs.appendChild(t);
            });
        }

        lb.classList.add('is-open');
        lb.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        lbClose.focus();
    }

    function closeLightbox() {
        if (!lb) return;
        lb.classList.remove('is-open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Tear down the YouTube iframe so audio stops on close.
        lb.querySelector('.pf-lb-embed')?.remove();
        lastFocus?.focus();
    }

    lbClose?.addEventListener('click', closeLightbox);
    lb?.addEventListener('click', (e) => {
        if (e.target === lb || e.target.classList.contains('pf-lb-backdrop')) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lb?.classList.contains('is-open')) closeLightbox();
    });

    return { esc, buildCard, openLightbox, closeLightbox };
})();

/* ============================================================
   #projects grid — sub-tabs + cards
   ============================================================ */
(() => {
    'use strict';
    const data   = window.PROJECTS || [];
    const grid   = document.getElementById('pfGrid');
    const tabsEl = document.getElementById('pfTabs');
    if (!grid || !tabsEl || !data.length || !window.PF) return;

    const categories = ['All', ...[...new Set(data.map(p => p.category))]];
    let activeCat = 'All';

    const indicator = document.createElement('span');
    indicator.className = 'pf-tab-indicator';
    tabsEl.appendChild(indicator);

    const tabButtons = categories.map(cat => {
        const btn = document.createElement('button');
        btn.className = 'pf-tab' + (cat === activeCat ? ' is-active' : '');
        btn.type = 'button';
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => setCategory(cat, btn));
        tabsEl.appendChild(btn);
        return btn;
    });

    const moveIndicator = (btn) => {
        if (!btn) return;
        indicator.style.width = `${btn.offsetWidth}px`;
        indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
    };

    const cards = data.map(p => {
        const card = window.PF.buildCard(p, window.PF.openLightbox, { reveal: true });
        grid.appendChild(card);
        return card;
    });

    function setCategory(cat, btn) {
        if (cat === activeCat) return;
        activeCat = cat;
        tabButtons.forEach(b => b.classList.toggle('is-active', b === btn));
        moveIndicator(btn);
        let shown = 0;
        cards.forEach(card => {
            const match = cat === 'All' || card.dataset.category === cat;
            if (match) {
                card.classList.remove('is-hidden');
                card.style.setProperty('--stagger', `${shown * 0.06}s`);
                card.classList.remove('is-in');
                void card.offsetWidth;
                card.classList.add('is-in');
                shown++;
            } else {
                card.classList.add('is-hidden');
                card.classList.remove('is-in');
            }
        });
    }

    cards.forEach((c, i) => {
        c.style.setProperty('--stagger', `${i * 0.06}s`);
        c.classList.add('is-in');
    });
    requestAnimationFrame(() => moveIndicator(tabButtons[0]));
    window.addEventListener('resize', () => {
        moveIndicator(tabButtons.find(b => b.classList.contains('is-active')));
    }, { passive: true });
})();

/* ============================================================
   FULL PROJECT INDEX — a simple list of every SEC job + year.
   Add a line here as projects are awarded; it renders grouped by
   year automatically. (Sourced from the awarded project records.)
   ============================================================ */
window.SEC_PROJECT_LIST = [
    // 2026
    { name: 'PepsiCo — Lighting Warranty', year: 2026 },
    { name: 'Amcor — Bird Projects', year: 2026 },
    { name: 'Northside Church — Youth Renovation', year: 2026 },
    { name: 'AEO — Ottawa Electrical Evaluation', year: 2026 },
    { name: 'USJ Maintenance Building', year: 2026 },
    { name: 'PepsiCo — Data Rack Receptacles', year: 2026 },
    { name: 'Hopkinsville', year: 2026 },
    { name: 'Jabil', year: 2026 },
    { name: 'ERMCO — Titan Office Building (Mechanical & Electrical)', year: 2026 },
    { name: 'S&S — New 400A Panel & Feeder', year: 2026 },
    { name: 'S&S — TVSS on Main Switchboard', year: 2026 },
    // 2025
    { name: 'Amazon — Receptacle', year: 2025 },
    { name: 'Ayers Asset Management', year: 2025 },
    { name: 'Berry Plastics — DECO Expansion', year: 2025 },
    { name: 'Black & Decker', year: 2025 },
    { name: 'Doxicom Global', year: 2025 },
    { name: 'JMCGH — Infectious Disease Unit', year: 2025 },
    { name: "Kirkland's", year: 2025 },
    { name: 'Milwaukee — Byhalia Battery Chargers', year: 2025 },
    { name: 'Milwaukee — Byhalia Office Power Pole', year: 2025 },
    { name: 'Northside Church — Time Clocks & Wall Packs', year: 2025 },
    { name: 'PepsiCo — Air Compressors', year: 2025 },
    { name: 'PepsiCo — Guardhouse Flood Lighting', year: 2025 },
    { name: 'PepsiCo — Pallet Inverter', year: 2025 },
    { name: 'PepsiCo — Rack Lighting', year: 2025 },
    { name: 'Phoenix Assurance — Cooler & Freezer', year: 2025 },
    { name: 'Quirch Foods — Lebanon, TN', year: 2025 },
    { name: 'Ross — HVAC, Carlisle PA', year: 2025 },
    { name: 'S&S Warehouse — Under-Mezzanine Lighting', year: 2025 },
    { name: 'Simon & Schuster — High Bay Lights', year: 2025 },
    { name: 'US Farathane — Jackson, TN', year: 2025 },
    { name: 'US Farathane — Dock Doors', year: 2025 },
    { name: 'Walmart — Brookhaven, MS', year: 2025 },
    { name: 'Walmart — Searcy, AR', year: 2025 },
    { name: 'Walmart — Sutherland, VA', year: 2025 },
    { name: 'Walmart — Winter Haven, FL', year: 2025 },
    { name: 'Walmart — Palestine, TX', year: 2025 },
    { name: 'Walmart — Seymour', year: 2025 },
    // 2024
    { name: 'Nike Adapt — Restroom Expansion', year: 2024 },
    { name: 'Milwaukee Tool — Geek+', year: 2024 },
    { name: 'Walmart — Hope Mills, NC', year: 2024 },
    { name: 'Walmart — KS', year: 2024 },
    { name: 'Walmart — Plainview, TX', year: 2024 },
    { name: 'PepsiCo — EV Chargers', year: 2024 },
    { name: 'PepsiCo — Exhaust Fans', year: 2024 },
    { name: 'PepsiCo', year: 2024 },
    { name: 'Georgia-Pacific — Johnson Equipment', year: 2024 },
    { name: 'Quantix — Air Compressor', year: 2024 },
    { name: 'Quirch Foods', year: 2024 },
    { name: 'Berry Plastics', year: 2024 },
    { name: 'Dollar Tree — HVAC, NC', year: 2024 },
    { name: 'Sprouts — Cooler Addition, Orlando FL', year: 2024 },
    { name: 'First Bank — Re-lighting', year: 2024 },
    { name: 'Milwaukee — Red Journey Maintenance Shop', year: 2024 },
    { name: 'Milwaukee — Byhalia Pole Light', year: 2024 },
    { name: 'Love & Truth — High Bay Replacement', year: 2024 },
    { name: 'Love & Truth', year: 2024 },
    { name: 'Southern States — Utility Trailer', year: 2024 },
    { name: 'Scotts Hill — Water Treatment', year: 2024 },
    { name: 'Baxter — 110V Circuit', year: 2024 },
    { name: 'Spa Vita', year: 2024 },
];

(() => {
    'use strict';
    const list = window.SEC_PROJECT_LIST || [];
    const host = document.getElementById('secProjectList');
    if (!host || !list.length) return;

    const esc = (window.PF && window.PF.esc) || ((s) => s);

    // Group by year, newest first.
    const byYear = new Map();
    list.forEach(item => {
        if (!byYear.has(item.year)) byYear.set(item.year, []);
        byYear.get(item.year).push(item);
    });
    const years = [...byYear.keys()].sort((a, b) => b - a);

    host.innerHTML = years.map(year => `
        <div class="sec-list-group">
            <div class="sec-list-year">${year}<span>${byYear.get(year).length} projects</span></div>
            <ul class="sec-list-items">
                ${byYear.get(year).map(it => `<li><span class="sec-list-name">${esc(it.name)}</span></li>`).join('')}
            </ul>
        </div>`).join('');

    const totalEl = document.getElementById('secProjectCount');
    if (totalEl) totalEl.textContent = list.length;
})();
