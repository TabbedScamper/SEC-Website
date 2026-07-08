/* SEC website — company-panels.js
   The three-company explorer (#companies): SEC / ICE / SDG panels with live
   backgrounds (spinning logo · 3D control panel · the Shelby), plus the
   right-hand explore drawer that carries the condensed company content.
   PERF: the ICE mini-viewer reuses the same GLB as the Controls section
   (one download, browser-cached) and only renders while on screen.
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(() => {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================================================
    // 1. Explore drawer (Rockstar-style right slide-over)
    // ============================================================
    const drawer  = document.getElementById('exploreDrawer');
    const scrim   = document.getElementById('exploreScrim');
    const content = document.getElementById('exploreContent');
    const closeBtn = document.getElementById('exploreClose');

    const openDrawer = (name) => {
        const tpl = document.getElementById('tpl-' + name);
        if (!tpl || !drawer) return;
        content.replaceChildren(tpl.content.cloneNode(true));
        drawer.classList.add('is-open');
        scrim.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        drawer.scrollTop = 0;
        closeBtn?.focus();
    };
    const closeDrawer = () => {
        drawer?.classList.remove('is-open');
        scrim?.classList.remove('is-open');
        drawer?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };
    closeBtn?.addEventListener('click', closeDrawer);
    scrim?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    // In-page anchors inside the drawer: close it first, then let the
    // site's smooth-scroll handler take over
    content?.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (a) closeDrawer();
    });

    // SDG has its own experiences: the company panel scrolls to the SDG
    // spotlight section, and SDG service cards open the custom studio
    // overlay (sdg-creations.js). SEC and ICE use the explore drawer.
    // tpl-sdg stays as a fallback if the studio isn't around.
    const openCompany = (name) => {
        if (name === 'sdg' && window.SDGStudio) { window.SDGStudio.open(); return; }
        openDrawer(name);
    };
    const scrollToSection = (sel) => {
        const t = document.querySelector(sel);
        if (!t) return;
        const headerH = document.getElementById('header')?.offsetHeight || 0;
        window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - headerH + 1, behavior: 'smooth' });
    };

    // The totem (small logo / 3D panel / truck at the bottom of each card)
    // is the selection control — native buttons, so keyboard comes free.
    // ICE's 3D panel scrolls to the big 3D panel section; SDG's truck
    // scrolls to the design spotlight; SEC opens the explore drawer.
    const TOTEM_ACTIONS = {
        sec: () => openCompany('sec'),
        ice: () => scrollToSection('#controls'),
        sdg: () => scrollToSection('#design-group'),
    };
    document.querySelectorAll('.co-panel .co-totem').forEach(totem => {
        const name = totem.closest('.co-panel')?.dataset.drawer;
        const act = TOTEM_ACTIONS[name];
        if (act) totem.addEventListener('click', act);
    });

    // Service cards: each routes to the drawer of the company that does that
    // work — "more info" is one click away, matching the explorer pattern.
    const SERVICE_MAP = {
        'Electrical Installation':   'sec',
        'Switchgear & Distribution': 'sec',
        'Building Automation':       'ice',
        'Preventive Maintenance':    'sec',
        'Energy & Lighting':         'sec',
        'Code, Compliance & Safety': 'sec',
        'BIM & Revit Modeling':      'sdg',
        'CAD Drafting':              'sdg',
        'Design Documentation':      'sdg',
        'Estimating & Takeoffs':     'sec',
    };
    document.querySelectorAll('.service-card').forEach(card => {
        const key = card.querySelector('h3')?.textContent.trim();
        const target = SERVICE_MAP[key];
        if (!target) return;
        card.dataset.openDrawer = target;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', key + ' — more info');
    });

    // Anything tagged data-open-drawer opens the matching drawer: nav/footer
    // "Automation" links (href still scrolls to #companies underneath) and
    // the service cards tagged above.
    document.querySelectorAll('[data-open-drawer]').forEach(el => {
        el.addEventListener('click', () => openCompany(el.dataset.openDrawer));
        if (el.tagName !== 'A') {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCompany(el.dataset.openDrawer); }
            });
        }
    });

    // ============================================================
    // 2. SDG totem — the Shelby's wheels spin while hovered
    //    (reuses the truck WebP pair; sdg-truck.js is untouched)
    // ============================================================
    const sdgTotem = document.querySelector('.co-panel--sdg .co-totem');
    const truckImg = sdgTotem?.querySelector('.co-truck');
    if (sdgTotem && truckImg && !reducedMotion) {
        const DRIVE = 'assets/images/projects/sdg/truck-drive.webp';
        const STILL = 'assets/images/projects/sdg/truck-still.webp';
        sdgTotem.addEventListener('pointerenter', () => { truckImg.src = DRIVE; });
        sdgTotem.addEventListener('pointerleave', () => { truckImg.src = STILL; });
    }

    // ============================================================
    // 3. ICE panel — live 3D control panel, slow turntable
    // ============================================================
    const canvas = document.getElementById('coIceCanvas');
    const icePanel = document.querySelector('.co-panel--ice');
    if (!canvas || !icePanel) return;

    let renderer, scene, camera, turntable;
    let booted = false, visible = false, rafId = null, lastT = 0;
    let spin = -0.5;

    const boot = () => {
        if (booted) return;
        booted = true;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // small totem canvas — keep it crisp
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.05, 20);
        scene.add(new THREE.HemisphereLight(0xf4f6ff, 0x35353d, 1.2));
        const key = new THREE.DirectionalLight(0xfff1e4, 2.0);
        key.position.set(1.6, 2.4, 2.6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 1.0);
        rim.position.set(-1.2, 1.8, -2.2);
        scene.add(rim);

        turntable = new THREE.Group();
        scene.add(turntable);

        // PERF: shares one fetched+parsed GLB with the main Controls viewer
        (window.__panelGLB ||= new Promise((resolve, reject) =>
            new GLTFLoader().load('assets/models/control-panel.glb?v=4', resolve, undefined, reject)
        )).then((gltf) => {
            const model = gltf.scene.clone(true);
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            turntable.add(model);
            const size = box.getSize(new THREE.Vector3());
            const midY = size.y * 0.52;
            camera.position.set(0.5, midY + 0.28, 1.15);
            camera.lookAt(0, midY, 0);
            resize();
            icePanel.classList.add('is-3d-live');
            start();
        }, () => { /* background stays a plain gradient */ });
    };

    const resize = () => {
        if (!renderer) return;
        const holder = canvas.parentElement;
        const w = holder.clientWidth, h = holder.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvas.parentElement);

    const tick = (t) => {
        rafId = null;
        // PERF: decorative turntable — 30fps is plenty
        if (t - lastT < 31) {
            if (visible) rafId = requestAnimationFrame(tick);
            return;
        }
        const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
        lastT = t;
        if (!reducedMotion) spin += 0.22 * dt;
        turntable.rotation.y = spin;
        renderer.render(scene, camera);
        if (visible) rafId = requestAnimationFrame(tick);
    };
    const start = () => {
        if (rafId == null && booted && turntable.children.length) {
            lastT = performance.now();
            rafId = requestAnimationFrame(tick);
        }
    };
    const stop = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };

    new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { boot(); visible = true; start(); }
            else { visible = false; stop(); }
        });
    }, { rootMargin: '200px 0px' }).observe(icePanel);
})();
