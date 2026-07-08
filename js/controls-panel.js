/* SEC website — controls-panel.js
   3D UL 508A control-panel viewer for the ICE Industrial Controls section.
   The model (assets/models/control-panel.glb) has two named nodes:
     "Door" — pivot sits on the hinge axis; rotate local Z to swing open
     "Body" — enclosure, backplate, and all mounted devices
   PERF: nothing loads until the section is ~400px from the viewport, and the
   render loop only runs while the section is on screen.
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(() => {
    'use strict';

    const viewerEl = document.getElementById('panelViewer');
    const canvas   = document.getElementById('panelCanvas');
    const hintEl   = document.getElementById('panelHint');
    if (!viewerEl || !canvas) return;

    const DOOR_OPEN_RAD  = THREE.MathUtils.degToRad(-104); // matches hinge test in Max
    const IDLE_SPIN_RPS  = 0.10;   // idle turntable, revolutions per second-ish (rad/s)
    const EASE           = 4.0;    // exponential smoothing rate for door + focus
    const params         = new URLSearchParams(location.search);
    const reducedMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer, scene, camera, turntable, doorNode;
    // Door rest pose (captured at load). The GLB's Door node carries a
    // quantization-compensation translation/scale, so we can't just spin the
    // node — we rotate its rest pose about the hinge axis (the parent
    // wrapper's local Z, through the wrapper origin) instead.
    const doorRestPos  = new THREE.Vector3();
    const doorRestQuat = new THREE.Quaternion();
    const HINGE_AXIS   = new THREE.Vector3(0, 0, 1);
    const doorSwing    = new THREE.Quaternion();
    let booted = false, visible = false, rafId = null;
    let spinAngle = THREE.MathUtils.degToRad(-28); // start angled so depth reads
    let doorTarget = 0, doorCurrent = 0;
    let hovered = false, hintDismissed = false;
    let lastT = 0;
    // Camera framing: dolly out + pan left while the door is open so the
    // swung door doesn't clip the frame edge
    const camBase = new THREE.Vector3(), focusBase = new THREE.Vector3(), _camPos = new THREE.Vector3();
    let ZOOM_OPEN = 1.35;              // recomputed in resize(): portrait needs a much longer dolly
    const FOCUS_X_OPEN = -0.17;
    let camZoom = 1, focusX = 0;
    // Drag-to-spin state
    let dragging = false, userSpun = false, dragLastX = 0, dragMoved = 0, dragT0 = 0;
    // Intro: camera starts nose-to-screen on the HMI (ICE logo splash), then
    // pulls back to the hero framing while the section text slides in.
    const sectionEl = viewerEl.closest('.controls-spotlight');
    const introStartPos = new THREE.Vector3(), introStartLook = new THREE.Vector3(), _look = new THREE.Vector3();
    const INTRO_HOLD = 0.7, INTRO_ZOOM = 2.4;   // seconds
    let introReady = false, introDone = false, introT = 0;
    let introBackdrop = null;   // black plane behind the logo — makes frame one a pure splash
    // Door guard: corners of the FULLY-OPEN door in turntable space. Each
    // frame we predict where they'd land on screen for the current spin
    // angle; if the open door would reach the text overlay, it auto-closes.
    const textEl = sectionEl?.querySelector('.controls-text');
    const Y_AXIS = new THREE.Vector3(0, 1, 0);
    const _corner = new THREE.Vector3();
    let doorGuardCorners = null, doorBlocked = false, textEdgeNdc = null;

    // ---- Boot (called once, when the section approaches the viewport) ----
    const boot = () => {
        if (booted) return;
        booted = true;
        sectionEl?.classList.add('is-intro');   // hide the text column until the zoom-out lands

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);

        // Deterministic studio lighting — no IBL/PMREM, which renders
        // differently (or barely at all) across GPUs. Hemisphere gives the
        // painted steel its broad base; key/fill/rim add form.
        scene.add(new THREE.HemisphereLight(0xf4f6ff, 0x35353d, 1.2));
        const key = new THREE.DirectionalLight(0xfff1e4, 2.2);   // warm key, front-right-high
        key.position.set(1.6, 2.4, 2.6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xdfe8ff, 0.8);  // cool fill, front-left
        fill.position.set(-2.4, 1.1, 1.4);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 1.1);   // rim from behind-left
        rim.position.set(-1.2, 1.8, -2.2);
        scene.add(rim);

        turntable = new THREE.Group();
        scene.add(turntable);

        // Bump ?v= whenever the model is re-exported — busts any stale browser cache
        // PERF: fetch + parse the GLB once, shared with the ICE company-card
        // mini viewer. Each consumer clones the (4-node) tree — geometries and
        // materials are shared by reference, so the expensive work happens once.
        (window.__panelGLB ||= new Promise((resolve, reject) =>
            new GLTFLoader().load('assets/models/control-panel.glb?v=4', resolve, undefined, reject)
        )).then((gltf) => {
            const model = gltf.scene.clone(true);
            doorNode = model.getObjectByName('Door');
            if (doorNode) {
                doorRestPos.copy(doorNode.position);
                doorRestQuat.copy(doorNode.quaternion);
            }

            // Center the panel on the turntable axis, feet at y=0
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;

            turntable.add(model);

            // Frame the camera off the model's real size — tight, so the
            // panel dominates the column
            const size = box.getSize(new THREE.Vector3());
            const midY = size.y * 0.52;
            camera.position.set(0.6, midY + 0.32, 1.36);
            camera.lookAt(0, midY, 0);
            camBase.copy(camera.position);
            focusBase.set(0, midY, 0);
            resize();
            // Wide stage: truck the camera right so the panel rests
            // left-of-center, clearing room for the text overlay
            if (camera.aspect > 1.2) {
                const shift = 0.23;
                camBase.x += shift;
                focusBase.x += shift;
            }

            resize();

            // ---- Door guard footprint: swing the door fully open once,
            // record its bounding corners (turntable space), swing it back.
            if (doorNode) {
                doorSwing.setFromAxisAngle(HINGE_AXIS, DOOR_OPEN_RAD);
                doorNode.quaternion.copy(doorSwing).multiply(doorRestQuat);
                doorNode.position.copy(doorRestPos).applyQuaternion(doorSwing);
                turntable.updateMatrixWorld(true);
                const ob = new THREE.Box3().setFromObject(doorNode);
                doorGuardCorners = [];
                for (let i = 0; i < 8; i++) {
                    doorGuardCorners.push(new THREE.Vector3(
                        i & 1 ? ob.max.x : ob.min.x,
                        i & 2 ? ob.max.y : ob.min.y,
                        i & 4 ? ob.max.z : ob.min.z));
                }
                doorNode.quaternion.copy(doorRestQuat);
                doorNode.position.copy(doorRestPos);
            }

            // ---- Intro setup: find the HMI screen (Ice_Screen material on the
            // door) and stage the splash — ICE logo filling the whole frame on
            // black, then the camera pulls back and the panel materializes.
            turntable.updateMatrixWorld(true);
            let screenMesh = null, screenArea = 0;
            doorNode?.traverse((o) => {
                if (o.isMesh && /Ice.?Screen/i.test(o.material?.name || '')) {
                    const bb = new THREE.Box3().setFromObject(o);
                    const s = bb.getSize(new THREE.Vector3());
                    if (s.x * s.y > screenArea) { screenArea = s.x * s.y; screenMesh = o; }
                }
            });
            const skipIntro = reducedMotion || params.has('panel-spin') || params.has('panel-door')
                || params.get('panel-intro') === 'off' || !screenMesh;
            if (!skipIntro) {
                const sb = new THREE.Box3().setFromObject(screenMesh);
                const sc = sb.getCenter(new THREE.Vector3());
                const ss = sb.getSize(new THREE.Vector3());
                spinAngle = 0;   // intro reads the screen head-on
                new THREE.TextureLoader().load(
                    encodeURI('Images/Ice Logo Upscaled.webp'),
                    (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        const logoAspect = tex.image.width / tex.image.height;
                        // Logo plane floated 2mm off the glass, riding the door
                        let w = ss.x * 0.86, h = w / logoAspect;
                        if (h > ss.y * 0.8) { h = ss.y * 0.8; w = h * logoAspect; }
                        const logo = new THREE.Mesh(
                            new THREE.PlaneGeometry(w, h),
                            new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
                        );
                        logo.position.set(sc.x, sc.y, sb.max.z + 0.002);
                        logo.renderOrder = 2;
                        scene.add(logo);
                        doorNode.attach(logo);
                        // Black backdrop just behind the logo — at the start
                        // distance it fills the frame, so frame one is a pure
                        // logo-on-black splash; it dissolves during the pull-back
                        introBackdrop = new THREE.Mesh(
                            new THREE.PlaneGeometry(2.4, 2.4),
                            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, toneMapped: false })
                        );
                        introBackdrop.position.set(sc.x, sc.y, sb.max.z + 0.001);
                        introBackdrop.renderOrder = 1;
                        scene.add(introBackdrop);
                        doorNode.attach(introBackdrop);
                        // Start distance: the logo spans ~96% of the frame width
                        const halfW = (w * 1.04) / 2;
                        const dist = halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
                        introStartLook.copy(sc);
                        introStartPos.set(sc.x, sc.y, sb.max.z + dist);
                        introReady = true;
                        renderOnce();
                    },
                    undefined,
                    () => finishIntro()   // logo missing → no splash, straight to hero
                );
            } else {
                finishIntro();
            }
            const doorParam = params.get('panel-door');
            if (doorParam === 'open') { doorTarget = DOOR_OPEN_RAD; doorCurrent = DOOR_OPEN_RAD; }
            else if (doorParam !== null && !isNaN(parseFloat(doorParam))) {
                doorTarget = doorCurrent = THREE.MathUtils.degToRad(parseFloat(doorParam));
            }
            if (doorTarget !== 0) { camZoom = ZOOM_OPEN; focusX = FOCUS_X_OPEN; } // debug: skip the ease
            if (params.has('panel-spin')) { spinAngle = THREE.MathUtils.degToRad(parseFloat(params.get('panel-spin')) || 0); }
            // Debug runs (screenshot verification) skip the fade-in so captures are deterministic
            if (params.has('panel-spin') || params.has('panel-door') || params.has('panel-intro')) viewerEl.style.transition = 'none';
            viewerEl.classList.add('is-loaded');
            start();
        }, (err) => {
            // Loading failed (old browser, blocked fetch…) — leave the CSS fallback
            console.error('control panel model failed to load', err);
            finishIntro();   // never leave the text column hidden
            viewerEl.classList.add('is-failed');
        });
    };

    // ---- Sizing ----
    const resize = () => {
        if (!renderer) return;
        const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        // Portrait (stacked mobile) has far less horizontal room — the open
        // door needs a much longer dolly-out to stay in frame
        ZOOM_OPEN = camera.aspect > 1.2 ? 1.35 : 2.15;
        // Left edge of the text overlay in NDC (only when it overlays the stage)
        textEdgeNdc = null;
        if (textEl && getComputedStyle(textEl).position === 'absolute') {
            const tr = textEl.getBoundingClientRect(), vr = viewerEl.getBoundingClientRect();
            if (vr.width > 2) textEdgeNdc = ((tr.left - vr.left) / vr.width) * 2 - 1 - 0.05;
        } else if (!textEl) {
            textEdgeNdc = 0.10;   // test harness: emulate the prod text edge
        }
    };
    new ResizeObserver(() => { resize(); renderOnce(); }).observe(viewerEl);

    // ---- Render loop (runs only while visible) ----
    const tick = (t) => {
        rafId = null;
        // PERF: the idle turntable renders at ~30fps; anything easing (intro,
        // drag, door swing, camera dolly) gets the full frame rate
        const idle = introDone && !dragging
            && Math.abs((doorBlocked ? 0 : doorTarget) - doorCurrent) < 0.005
            && Math.abs(camZoom - (doorTarget !== 0 && !doorBlocked ? ZOOM_OPEN : 1)) < 0.01;
        if (idle && t - lastT < 31) {
            if (visible) rafId = requestAnimationFrame(tick);
            return;
        }
        const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
        lastT = t;

        // ---- Intro: logo-on-black splash, then pull back to the hero shot
        if (!introDone) {
            if (!introReady) {   // logo texture still loading — hold blank
                if (visible) rafId = requestAnimationFrame(tick);
                return;
            }
            introT += dt;
            const p = params.get('panel-intro') === 'hold' ? 0
                : Math.min(Math.max((introT - INTRO_HOLD) / INTRO_ZOOM, 0), 1);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // cubic in-out
            turntable.rotation.y = spinAngle = 0;
            camera.position.lerpVectors(introStartPos, camBase, e);
            _look.lerpVectors(introStartLook, focusBase, e);
            camera.lookAt(_look);
            // Backdrop dissolves through the first half of the pull-back,
            // revealing the panel around the screen
            if (introBackdrop) {
                const f = Math.min(Math.max((p - 0.15) / 0.4, 0), 1);
                introBackdrop.material.opacity = 1 - f;
                introBackdrop.visible = f < 1;
            }
            renderer.render(scene, camera);
            if (p >= 1) finishIntro();
            if (visible) rafId = requestAnimationFrame(tick);
            return;
        }

        if (dragging) {
            // user is spinning it — hands off
        } else if (hovered && !userSpun) {
            // Ease the turntable to the nearest front-facing angle so the
            // open door and interior face the viewer.
            const front = Math.round(spinAngle / (Math.PI * 2)) * Math.PI * 2;
            spinAngle += (front - spinAngle) * Math.min(EASE * dt, 1);
        } else if (!hovered && !userSpun && !reducedMotion && !params.has('panel-spin')) {
            spinAngle += IDLE_SPIN_RPS * dt;
        }
        turntable.rotation.y = spinAngle;

        // Door guard: at this spin angle, would the fully-open door reach the
        // text overlay? If so, ease it shut; it reopens once the angle clears.
        // (Hysteresis keeps it from fluttering at the boundary.)
        if (doorGuardCorners && textEdgeNdc !== null && doorTarget !== 0) {
            camera.updateMatrixWorld();
            let maxX = -Infinity;
            for (const c of doorGuardCorners) {
                _corner.copy(c).applyAxisAngle(Y_AXIS, spinAngle).project(camera);
                if (_corner.x > maxX) maxX = _corner.x;
            }
            if (!doorBlocked && maxX > textEdgeNdc) doorBlocked = true;
            else if (doorBlocked && maxX < textEdgeNdc - 0.12) doorBlocked = false;
        } else {
            doorBlocked = false;
        }
        const doorGoal = doorBlocked ? 0 : doorTarget;

        // Dolly out while the door is open so the swing stays in frame
        const k = Math.min(EASE * dt, 1);
        camZoom += ((doorGoal !== 0 ? ZOOM_OPEN : 1) - camZoom) * k;
        focusX  += ((doorGoal !== 0 ? FOCUS_X_OPEN : 0) - focusX) * k;
        _camPos.copy(camBase).sub(focusBase).multiplyScalar(camZoom).add(focusBase);
        camera.position.copy(_camPos);
        camera.lookAt(focusBase.x + focusX, focusBase.y, focusBase.z);

        doorCurrent += (doorGoal - doorCurrent) * Math.min(EASE * dt, 1);
        if (doorNode) {
            // Swing the door's rest pose about the hinge (wrapper origin, local Z)
            doorSwing.setFromAxisAngle(HINGE_AXIS, doorCurrent);
            doorNode.quaternion.copy(doorSwing).multiply(doorRestQuat);
            doorNode.position.copy(doorRestPos).applyQuaternion(doorSwing);
        }

        renderer.render(scene, camera);
        if (visible) rafId = requestAnimationFrame(tick);
    };
    const start = () => {
        if (rafId == null && booted) {
            lastT = performance.now();
            rafId = requestAnimationFrame(tick);
        }
    };
    const stop = () => {
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    };
    const renderOnce = () => { if (renderer && scene && camera) renderer.render(scene, camera); };

    // ---- Door interaction ----
    const finishIntro = () => {
        if (introDone) return;
        introDone = true;
        if (introBackdrop) introBackdrop.visible = false;
        sectionEl?.classList.remove('is-intro');   // text column slides in
    };
    const setDoor = (open) => {
        if (!introDone) return;   // no interaction until the intro lands
        doorTarget = open ? DOOR_OPEN_RAD : 0;
        hovered = open;
        if (!open) userSpun = false;   // door closed → idle turntable resumes
        viewerEl.classList.toggle('is-open', open);
        if (open && !hintDismissed) {
            hintDismissed = true;
            hintEl?.classList.add('is-dismissed');
        }
    };
    // Leaving the stage hands the turntable back to the idle spin (only when
    // the door is closed — an open door holds its pose)
    viewerEl.addEventListener('pointerleave', () => { if (doorTarget === 0) userSpun = false; });

    // Drag to spin (mouse + touch). A click/tap (little movement, quick)
    // toggles the door. touch-action pan-y keeps page scroll working.
    canvas.style.touchAction = 'pan-y';
    const DRAG_RAD_PER_PX = 0.012;
    let resumeTimer = 0;
    viewerEl.addEventListener('pointerdown', (e) => {
        if (!introDone) return;
        clearTimeout(resumeTimer);
        dragging = true; dragLastX = e.clientX; dragMoved = 0; dragT0 = performance.now();
        viewerEl.setPointerCapture(e.pointerId);
        viewerEl.classList.add('is-dragging');
    });
    viewerEl.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragLastX;
        dragLastX = e.clientX;
        dragMoved += Math.abs(dx);
        if (dragMoved > 6) userSpun = true;   // real drag: stop auto-spin/auto-front
        spinAngle += dx * DRAG_RAD_PER_PX;
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        viewerEl.classList.remove('is-dragging');
        try { viewerEl.releasePointerCapture(e.pointerId); } catch (_) {}
        // Click / tap = toggle the door
        if (dragMoved < 8 && performance.now() - dragT0 < 350) {
            setDoor(doorTarget === 0);
        }
        // After a placement drag with the door closed, drift back to the
        // idle turntable after a few seconds of no interaction
        if (doorTarget === 0) {
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => { userSpun = false; }, 4000);
        }
    };
    viewerEl.addEventListener('pointerup', endDrag);
    viewerEl.addEventListener('pointercancel', endDrag);

    // ---- Lazy boot + visibility-gated rendering ----
    const bootIO = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { boot(); bootIO.disconnect(); }
        });
    }, { rootMargin: '400px 0px' });
    bootIO.observe(viewerEl);

    const visIO = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            visible = e.isIntersecting;
            if (visible) start(); else stop();
        });
    }, { threshold: 0.05 });
    visIO.observe(viewerEl);
})();
