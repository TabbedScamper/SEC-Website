/* ============================================================
   SOUTHERN DESIGN GROUP — Creations showcase (design section)
   ------------------------------------------------------------
   Southern Design Group (SDG) is the in-house creative division of
   Southern Electric & Controls (the parent company); ICE is the
   controls/automation division. This showcase is SDG's work,
   organized by SKILL DOMAIN — each capability is a discipline and
   every item lists the tech/skills it was actually built with.

   Expanding "capability cards": a row of capabilities; click one
   and a dark stage slides open with that capability's work. Tiles
   reuse window.PF (card builder + lightbox) from projects.js.

   TO ADD WORK: find the capability below and add an item to its
   `items` array. Item fields: title, category, client, clientLogo,
   year, poster, hover, gallery[], compare{}, youtube, link{}, quote{},
   skills[], featured, description. Give a new capability an `icon`
   from the ICONS list (car · cube · film · web · game · camera · pen).
   ============================================================ */

window.SDG_CREATIONS = [
    {
        capability: 'BIM & CAD',
        icon: 'pen',
        blurb: 'Coordinated 3D MEP / electrical models and construction drawings.',
        items: [
            {
                title: 'BIM Coordination Model',
                category: '3D · BIM',
                client: 'Southern Electric & Controls',
                clientLogo: 'assets/images/logos/sec-logo.png',
                year: '2025',
                poster: 'assets/images/projects/sdg/bim-model.png',
                skills: ['Revit', 'AutoCAD', 'Navisworks', 'BIM Coordination'],
                gallery: ['assets/images/projects/sdg/bim-model.png'],
                description: 'Coordinated 3D MEP / electrical model built for clash detection and fabrication support — drawing-ready before crews mobilized on site.',
            },
        ],
    },
    {
        capability: '3D Modeling & Animation',
        icon: 'car',
        blurb: 'Ground-up 3D vehicle builds — modeled, rigged, textured and game-ready.',
        items: [
            {
                title: '2023 F-250 Super Baja',
                category: '3D Model · Animation',
                client: 'Shelby American',
                clientLogo: 'assets/images/projects/sdg/shelby-logo.png', // drop a logo here; falls back to wordmark
                year: '2023',
                poster: 'assets/images/projects/sdg/f250-poster.png',
                skills: ['3ds Max', 'MAXScript', 'Python', 'C#', 'Substance Painter', 'OpenIV'],
                compare: {
                    after:  'assets/images/projects/sdg/f250-render.png',
                    before: 'assets/images/projects/sdg/f250-wireframe.png',
                    afterLabel:  'Final Render',
                    beforeLabel: 'Wireframe',
                },
                gallery: [
                    'assets/images/projects/sdg/f250-gta-1.jpg',
                    'assets/images/projects/sdg/f250-gta-2.jpg',
                    'assets/images/projects/sdg/f250-gta-3.jpg',
                    'assets/images/projects/sdg/f250-gta-4.jpg',
                    'assets/images/projects/sdg/f250-gta-5.jpg',
                    'assets/images/projects/sdg/f250-gta-6.jpg',
                    'assets/images/projects/sdg/f250-gta-7.jpg',
                    'assets/images/projects/sdg/f250-gta-8.jpg',
                    'assets/images/projects/sdg/f250-gta-9.jpg',
                    'assets/images/projects/sdg/f250-gta-10.jpg',
                    'assets/images/projects/sdg/f250-gta-11.jpg',
                ],
                link: {
                    label: 'View in GTA V',
                    url: 'https://www.gta5-mods.com/vehicles/2023-ford-shelby-f-250-super-baja-75th-anniversary-edition-replace-enhanced',
                },
                featured: true,
                quote: {
                    text: 'Awesome mod! Great work and can’t wait to see what you do in the future.',
                    author: 'DrafterTechie · GTA5-Mods',
                },
                description: 'Full ground-up 3D model of the Shelby Super Baja F-250 — body, drivetrain, suspension, and a custom drift-rig animation, modeled, rigged and rendered in 3ds Max, automated with Python/MAXScript, and integrated into GTA V with custom C# tooling. 18,000+ downloads. Drag the slider to go from wireframe to final render.',
            },
            {
                title: 'Jeep Kaiser M715 — Trevor’s Truck',
                category: '3D Model · Game-Ready',
                client: 'GTA V Mod',
                year: '2025',
                poster: 'assets/images/projects/sdg/jeep-m715-1.jpg',
                skills: ['3ds Max', 'ZBrush', 'Python', 'OpenIV', 'Substance Painter'],
                gallery: [
                    'assets/images/projects/sdg/jeep-m715-1.jpg',
                    'assets/images/projects/sdg/jeep-m715-2.jpg',
                    'assets/images/projects/sdg/jeep-m715-3.jpg',
                    'assets/images/projects/sdg/jeep-m715-4.jpg',
                    'assets/images/projects/sdg/jeep-m715-5.jpg',
                ],
                link: {
                    label: 'View in GTA V',
                    url: 'https://www.gta5-mods.com/vehicles/wip-jeep-kaiser-m715-trevors-real-life-truck',
                },
                quote: {
                    text: 'This is awesome. Much better than the Bodhi.',
                    author: 'Bet Nimrod · GTA5-Mods',
                },
                description: 'A real-world build of Trevor’s in-game truck — a game-ready Jeep Kaiser M715 with lowered tuner and extreme off-road variants and full customization. Modeled and detailed in 3ds Max and ZBrush, textured in Substance Painter, and packaged for GTA V. 8,500+ downloads.',
            },
        ],
    },
    {
        capability: 'Video Production',
        icon: 'film',
        blurb: 'Cinematic trailers — editing, color grading, motion graphics and sound.',
        items: [
            {
                title: 'Shelby F-250 Super Baja — Mod Trailer',
                category: 'Trailer · Edit',
                client: 'YouTube',
                year: '2026',
                poster:  'assets/images/projects/sdg/video-1.jpg',
                youtube: 'icrrb_x-SeA',
                skills: ['Video Editing', 'Color Grading', 'Motion Graphics', 'Sound Design'],
                link: { label: 'Watch on YouTube', url: 'https://www.youtube.com/watch?v=icrrb_x-SeA' },
                description: 'Cinematic reveal trailer for the 2023 Shelby F-250 Super Baja GTA V mod — shot, cut, graded, and scored in-house.',
            },
            {
                title: 'Jeep Kaiser M715 — Mod Trailer',
                category: 'Trailer · Edit',
                client: 'YouTube',
                year: '2025',
                poster:  'assets/images/projects/sdg/video-2.jpg',
                youtube: 'a0-nY0A3g4o',
                skills: ['Video Editing', 'Color Grading', 'Motion Graphics'],
                link: { label: 'Watch on YouTube', url: 'https://www.youtube.com/watch?v=a0-nY0A3g4o' },
                description: 'Reveal trailer for the Jeep Kaiser M715 (Trevor’s real-life truck) GTA V mod — edited and produced end to end.',
            },
        ],
    },
    {
        capability: 'Web Development',
        icon: 'web',
        blurb: 'Fast, modern, framework-free custom websites.',
        items: [
            {
                title: 'Southern Electric & Controls — Website',
                category: 'Design · Build',
                client: 'Southern Electric & Controls',
                clientLogo: 'assets/images/logos/sec-logo.png',
                year: '2026',
                poster: 'assets/images/projects/sdg/sec-shot.png',
                skills: ['HTML', 'CSS', 'JavaScript', 'Responsive Design', 'Git'],
                description: 'This very site — a custom, framework-free build with a cinematic hero, building-automation spotlight, and this design showcase. Designed and coded in-house.',
            },
            {
                title: 'JM2 Engineering — Website',
                category: 'Design · Build',
                client: 'JM2 Engineering',
                year: '2026',
                poster: 'assets/images/projects/sdg/jm2-shot.png',
                skills: ['HTML', 'CSS', 'JavaScript', 'GSAP', 'GitHub Pages'],
                link: { label: 'Visit the live site', url: 'https://tabbedscamper.github.io/jm2-website/' },
                description: 'A custom site for JM2 Engineering — mechanical engineering, BIM, and 3D scanning — with GSAP scroll animations, a team carousel, and skewed zigzag service panels. Designed and built in-house.',
            },
        ],
    },
    {
        capability: 'Game Development',
        icon: 'game',
        blurb: 'Custom game maps, modes and mechanics — design through scripting.',
        items: [
            {
                title: 'Battlefield 6 — Undead Ground Zero',
                category: 'Game Mode · EA Published',
                client: 'Published by EA',
                year: '2026',
                poster:  'assets/images/projects/sdg/video-3.jpg',
                youtube: 'vVASAXqKC2Y',
                skills: ['TypeScript', 'Godot', 'Game Design', 'Level Design', 'Gameplay Scripting'],
                featured: true,
                gallery: ['assets/images/projects/sdg/bf6-model-1.jpg'],
                link: { label: 'Watch the trailer', url: 'https://www.youtube.com/watch?v=vVASAXqKC2Y' },
                quote: {
                    text: 'Slay the undead at St. Lydian Memorial: epicenter of the REDFALL outbreak. Power is dead, alarms are echoing through the halls, NATO is closing in.',
                    author: 'EA · Battlefield 6 Season 2 blog',
                },
                description: 'A full Battlefield 6 Portal experience I designed and built — “Undead Ground Zero” (experience code ZQ2V4), featured by EA in the official Season 2 blog. Maps and modes built with TypeScript and Godot: four playable classes, voted difficulty, waves of Undead, Sprinters, DeadBombs and Crawlers, a wall-weapon and Amp-a-Arsenal upgrade economy, 8 perks, power-ups, a fuse-box puzzle, and a VIP escort-and-extraction win condition.',
            },
        ],
    },
];

(() => {
    'use strict';

    const data  = window.SDG_CREATIONS || [];
    const capsEl  = document.getElementById('sdgCaps');
    const stageEl = document.getElementById('sdgStage');
    const gridEl  = stageEl?.querySelector('.sdg-stage-grid');
    if (!capsEl || !stageEl || !gridEl || !data.length || !window.PF) return;

    const ICONS = {
        car:  '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5M5 13h14v4H5z" fill="none"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>',
        cube: '<path d="M12 2 3 7v10l9 5 9-5V7z" fill="none"/><path d="M3 7l9 5 9-5M12 12v10" fill="none"/>',
        film: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16" fill="none"/>',
        web:  '<rect x="3" y="4" width="18" height="16" rx="2" fill="none"/><path d="M3 9h18M7 6.5h.01M9.5 6.5h.01" fill="none"/>',
        game: '<rect x="2" y="7" width="20" height="10" rx="5" fill="none"/><path d="M6.5 10.5v3M5 12h3" fill="none"/><circle cx="16" cy="11.4" r="0.9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.4" r="0.9" fill="currentColor" stroke="none"/>',
        camera:'<path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none"/><circle cx="12" cy="13" r="3.2" fill="none"/>',
        pen:  '<path d="M4 20l4-1L19 8a2 2 0 0 0 0-3l-.9-.9a2 2 0 0 0-3 0L4 15z" fill="none"/>',
    };

    let activeIdx = -1;

    const capButtons = data.map((cap, i) => {
        const btn = document.createElement('button');
        btn.className = 'sdg-cap';
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = `
            <span class="sdg-cap-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"
                     stroke-linecap="round" stroke-linejoin="round">${ICONS[cap.icon] || ICONS.cube}</svg>
            </span>
            <span class="sdg-cap-text">
                <span class="sdg-cap-name">${window.PF.esc(cap.capability)}</span>
                <span class="sdg-cap-blurb">${window.PF.esc(cap.blurb || '')}</span>
            </span>
            <span class="sdg-cap-meta">
                <span class="sdg-cap-count">${cap.items.length}</span>
                <span class="sdg-cap-chev" aria-hidden="true">
                    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M6 9l6 6 6-6"/></svg>
                </span>
            </span>`;
        btn.addEventListener('click', () => toggle(i));
        capsEl.appendChild(btn);
        return btn;
    });

    function renderStage(i) {
        gridEl.innerHTML = '';
        data[i].items.forEach((item, k) => {
            const card = window.PF.buildCard(item, window.PF.openLightbox);
            card.style.setProperty('--stagger', `${k * 0.07}s`);
            card.classList.add('is-in');
            gridEl.appendChild(card);
        });
    }

    function open(i) {
        activeIdx = i;
        capButtons.forEach((b, k) => {
            b.classList.toggle('is-active', k === i);
            b.setAttribute('aria-expanded', String(k === i));
        });
        renderStage(i);
        stageEl.classList.add('is-open');
    }

    function close() {
        activeIdx = -1;
        capButtons.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-expanded', 'false'); });
        stageEl.classList.remove('is-open');
    }

    function toggle(i) {
        if (i === activeIdx) close();
        else open(i);
    }

    // Open the first capability by default so the showcase isn't empty.
    open(0);
})();

/* ============================================================
   SDG Studio overlay — "See What SDG Can Do" fades in the panel
   ============================================================ */
(() => {
    'use strict';
    const openBtn  = document.getElementById('sdgStudioOpen');
    const closeBtn = document.getElementById('sdgStudioClose');
    const overlay  = document.getElementById('sdgStudioOverlay');
    if (!openBtn || !overlay) return;

    let lastFocus = null;
    const open = () => {
        lastFocus = document.activeElement;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('sdg-studio-open');
        overlay.scrollTop = 0;
        closeBtn?.focus();
    };
    const close = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('sdg-studio-open');
        (lastFocus || openBtn).focus();
    };

    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
})();
