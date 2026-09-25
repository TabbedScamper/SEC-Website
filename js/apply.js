/* ============================================================
   SEC EMPLOYMENT APPLICATION - wizard
   Walks the applicant through js/apply-schema.js one card at a time,
   keeps answers in localStorage, shows the filled application for review,
   then posts it to apply.php which emails it with a PDF attached.
   ============================================================ */
(() => {
    'use strict';

    const SCHEMA  = window.SEC_APPLY_SCHEMA || [];
    const STARTED = Date.now();      // apply.php refuses impossibly quick submissions
    const STORAGE = 'sec-application-v1';
    const $ = (id) => document.getElementById(id);

    const el = {
        intro: $('applyIntro'), wizard: $('applyWizard'), review: $('applyReview'), done: $('applyDone'),
        stage: $('applyStage'), form: $('applyForm'),
        back: $('applyBack'), skip: $('applySkip'), next: $('applyNext'),
        bar: $('applyProgressBar'), sectionName: $('applySectionName'), stepCount: $('applyStepCount'),
        start: $('applyStart'), resume: $('applyResume'), resumeBtn: $('applyResumeBtn'), clearBtn: $('applyClearBtn'),
        reviewDoc: $('applyReviewDoc'), send: $('applySend'), backToEdit: $('applyBackToEdit'),
        jump: $('applyJump'), jumpPanel: $('applyJumpPanel'), toReview: $('applyToReview'),
        sending: $('applySending'), error: $('applyError'), doneLead: $('applyDoneLead'),
    };
    if (!el.stage) return;

    // ---------------------------------------------------------------- model
    // Flatten the schema: repeat groups (3 employers, 4 references) become
    // real cards with their field names prefixed - emp2_supervisorName etc.
    const CARDS = [];
    SCHEMA.forEach(section => {
        const rep = section.repeat;
        const rounds = rep ? rep.count : 1;
        for (let r = 1; r <= rounds; r++) {
            section.cards.forEach(card => {
                const label = rep ? (rep.labels[r - 1] || `${rep.prefix} ${r}`) : '';
                CARDS.push({
                    section: section.section,
                    group: rep ? rep.prefix : null,
                    round: r,
                    id: rep ? `${rep.prefix}${r}_${card.id}` : card.id,
                    title: (card.title || '').replace('{LABEL}', label),
                    hint: card.hint,
                    statement: card.statement,
                    // a repeat card can offer "no more" from round N onward
                    skippable: card.skippable || (card.skippableFrom && r >= card.skippableFrom),
                    terminates: !!(card.skippableFrom && r >= card.skippableFrom),
                    skipLabel: card.skipLabel || 'Skip',
                    fields: card.fields.map(f => ({
                        ...f,
                        name: rep ? `${rep.prefix}${r}_${f.name}` : f.name,
                        showIf: f.showIf
                            ? { ...f.showIf, field: rep ? `${rep.prefix}${r}_${f.showIf.field}` : f.showIf.field }
                            : null,
                    })),
                });
            });
        }
    });

    let answers = {};
    let index = 0;
    let stoppedGroups = {};      // { emp: 2 } = employers from round 2 on are skipped
    let maxReached = 0;          // furthest card seen, so the jump menu cannot skip ahead
    let returnToReview = false;  // came here from the review screen via Edit

    const save = () => {
        try {
            localStorage.setItem(STORAGE, JSON.stringify({ answers, index, stoppedGroups, maxReached, at: Date.now() }));
        } catch (e) { /* private mode - carry on without saving */ }
    };
    const load = () => {
        try {
            const raw = localStorage.getItem(STORAGE);
            if (!raw) return null;
            const data = JSON.parse(raw);
            return (data && data.answers) ? data : null;
        } catch (e) { return null; }
    };
    const wipe = () => { try { localStorage.removeItem(STORAGE); } catch (e) {} };

    // A card is live unless its repeat group was stopped earlier.
    const cardIsLive = (card) =>
        !(card.group && stoppedGroups[card.group] && card.round >= stoppedGroups[card.group]);
    const liveCards = () => CARDS.filter(cardIsLive);
    const fieldIsVisible = (f) => {
        if (!f.showIf) return true;
        const v = answers[f.showIf.field];
        if (f.showIf.equals !== undefined) return v === f.showIf.equals;
        if (f.showIf.includes !== undefined) return Array.isArray(v) && v.includes(f.showIf.includes);
        return true;
    };

    // ---------------------------------------------------------------- render
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function fieldHTML(f) {
        const val = answers[f.name];
        const wide = f.w ? ` apply-field--${f.w}` : '';
        const req  = f.required ? ' <span class="req">*</span>' : '';
        const lab  = f.label ? `<label for="f_${f.name}">${esc(f.label)}${req}</label>` : '';
        const hint = f.hint ? `<span class="apply-field-hint">${esc(f.hint)}</span>` : '';

        if (f.type === 'yesno' || f.type === 'choice') {
            const opts = f.type === 'yesno' ? ['Yes', 'No'] : (f.options || []);
            const btns = opts.map(o =>
                `<button type="button" class="apply-choice${val === o ? ' is-on' : ''}"
                         data-choice="${esc(f.name)}" data-value="${esc(o)}">${esc(o)}</button>`).join('');
            return `<div class="apply-field${wide}" data-field="${esc(f.name)}">${lab}
                        <div class="apply-choices">${btns}</div>${hint}
                        <span class="apply-field-error" hidden></span></div>`;
        }
        if (f.type === 'checks') {
            const chosen = Array.isArray(val) ? val : [];
            const btns = (f.options || []).map(o =>
                `<button type="button" class="apply-choice${chosen.includes(o) ? ' is-on' : ''}"
                         data-check="${esc(f.name)}" data-value="${esc(o)}">${esc(o)}</button>`).join('');
            return `<div class="apply-field${wide}" data-field="${esc(f.name)}">${lab}
                        <div class="apply-choices">${btns}</div>${hint}
                        <span class="apply-field-error" hidden></span></div>`;
        }
        if (f.type === 'check') {
            return `<div class="apply-field${wide}" data-field="${esc(f.name)}">
                        <label class="apply-check">
                            <input type="checkbox" id="f_${esc(f.name)}" data-name="${esc(f.name)}" ${val ? 'checked' : ''}>
                            <span>${esc(f.label)}${req}</span>
                        </label>${hint}
                        <span class="apply-field-error" hidden></span></div>`;
        }
        if (f.type === 'sig') {
            return `<div class="apply-field${wide}" data-field="${esc(f.name)}">${lab}
                        <div class="apply-sig-wrap">
                            <canvas class="apply-sig" id="applySig"></canvas>
                            <div class="apply-sig-line"></div>
                        </div>
                        <button type="button" class="apply-linkbtn apply-sig-clear" id="applySigClear">Clear signature</button>
                        <span class="apply-field-error" hidden></span></div>`;
        }
        if (f.type === 'textarea') {
            return `<div class="apply-field${wide}" data-field="${esc(f.name)}">${lab}
                        <textarea id="f_${esc(f.name)}" data-name="${esc(f.name)}"
                                  rows="4">${esc(val || '')}</textarea>${hint}
                        <span class="apply-field-error" hidden></span></div>`;
        }
        const extra = [
            f.max ? `maxlength="${f.max}"` : '',
            f.upper ? 'style="text-transform:uppercase"' : '',
            f.type === 'tel' ? 'inputmode="tel"' : '',
            f.type === 'email' ? 'inputmode="email" autocapitalize="off" spellcheck="false"' : '',
        ].join(' ');
        return `<div class="apply-field${wide}" data-field="${esc(f.name)}">${lab}
                    <input type="${f.type === 'date' ? 'date' : (f.type || 'text')}"
                           id="f_${esc(f.name)}" data-name="${esc(f.name)}"
                           value="${esc(val || '')}" ${extra}>${hint}
                    <span class="apply-field-error" hidden></span></div>`;
    }

    function render(direction) {
        const list = liveCards();
        const card = list[index];
        if (!card) { showReview(); return; }

        const old = el.stage.querySelector('.apply-card');
        const paint = () => {
            const fields = card.fields.filter(fieldIsVisible).map(fieldHTML).join('');
            const statement = card.statement
                ? `<div class="apply-statement">${card.statement.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : '';
            el.stage.innerHTML =
                `<div class="apply-card is-in${direction === 'back' ? ' is-in--back' : ''}">
                    <h2>${esc(card.title)}</h2>
                    ${card.hint ? `<p class="apply-card-hint">${esc(card.hint)}</p>` : ''}
                    ${statement}
                    <div class="apply-fields">${fields}</div>
                 </div>`;

            maxReached = Math.max(maxReached, index);
            el.toReview.hidden = !returnToReview;
            el.sectionName.textContent = card.group
                ? `${card.section}: ${card.title.split(':')[0]}` : card.section;
            el.stepCount.textContent = `${index + 1} of ${list.length}`;
            el.bar.style.width = `${((index) / list.length) * 100}%`;
            el.back.disabled = index === 0;
            el.back.style.visibility = index === 0 ? 'hidden' : 'visible';
            el.skip.hidden = !card.skippable;
            el.skip.textContent = card.skipLabel;
            el.next.textContent = (index === list.length - 1) ? 'Review' : 'Next';

            if (card.fields.some(f => f.type === 'sig')) initSignature();
            const first = el.stage.querySelector('input:not([type=checkbox]), textarea');
            if (first && window.matchMedia('(hover: hover)').matches) first.focus();
        };

        if (old) {
            old.classList.remove('is-in', 'is-in--back');
            old.classList.add(direction === 'back' ? 'is-out--back' : 'is-out');
            setTimeout(paint, 170);
        } else {
            paint();
        }
    }

    // ---------------------------------------------------------------- jumping
    // A 35-card form needs more than a one-step Back button. This groups the
    // cards by section (and by employer/reference round) and lets the
    // applicant hop to anything they have already reached.
    function jumpGroups() {
        const list = liveCards();
        const groups = [];
        list.forEach((card, i) => {
            const key = card.group ? `${card.section}: ${card.title.split(':')[0]}` : card.section;
            let g = groups.find(x => x.key === key);
            if (!g) groups.push(g = { key, first: i, cards: [] });
            g.cards.push({ card, i });
        });
        return groups;
    }

    function answeredCount(group) {
        let filled = 0, total = 0;
        group.cards.forEach(({ card }) => {
            card.fields.filter(fieldIsVisible).forEach(f => {
                total++;
                const v = answers[f.name];
                if (v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length)) filled++;
            });
        });
        return { filled, total };
    }

    function renderJumpPanel() {
        const groups = jumpGroups();
        el.jumpPanel.innerHTML = groups.map(g => {
            const { filled, total } = answeredCount(g);
            const reachable = g.first <= maxReached;
            const here = index >= g.first && index <= g.cards[g.cards.length - 1].i;
            const state = filled === 0 ? '' : (filled >= total ? 'is-done' : 'is-part');
            return `<button type="button" class="apply-jump-item ${state}${here ? ' is-here' : ''}"
                            data-jump="${g.first}" ${reachable ? '' : 'disabled'}>
                        <span class="apply-jump-mark" aria-hidden="true">${filled >= total && total ? '✓' : ''}</span>
                        <span class="apply-jump-label">${esc(g.key)}</span>
                        <span class="apply-jump-count">${reachable ? `${filled}/${total}` : 'not yet'}</span>
                    </button>`;
        }).join('');
    }

    function toggleJump(force) {
        const open = force !== undefined ? force : el.jumpPanel.hidden;
        if (open) renderJumpPanel();
        el.jumpPanel.hidden = !open;
        el.jump.setAttribute('aria-expanded', open ? 'true' : 'false');
        el.jump.classList.toggle('is-open', open);
    }

    el.jump.addEventListener('click', () => toggleJump());
    el.jumpPanel.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-jump]');
        if (!btn || btn.disabled) return;
        const target = parseInt(btn.dataset.jump, 10) || 0;
        const dir = target < index ? 'back' : 'fwd';
        index = target;
        toggleJump(false);
        save();
        render(dir);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.addEventListener('click', (e) => {
        if (el.jumpPanel.hidden) return;
        if (e.target.closest('#applyJumpPanel') || e.target.closest('#applyJump')) return;
        toggleJump(false);
    });

    // Picking an answer must NOT re-render the card: that replays the entrance
    // animation and the card visibly pops out and back in. Instead update in
    // place - repaint the choice buttons, then add or remove only the
    // follow-up fields whose showIf changed.
    function syncCard(card) {
        const wrap = el.stage.querySelector('.apply-fields');
        if (!wrap) return;
        const visible = card.fields.filter(fieldIsVisible);

        // drop fields whose condition no longer holds
        wrap.querySelectorAll('[data-field]').forEach(node => {
            if (!visible.some(f => f.name === node.dataset.field)) node.remove();
        });

        // add newly revealed fields, keeping schema order
        visible.forEach((f, i) => {
            let node = wrap.querySelector(`[data-field="${f.name}"]`);
            if (!node) {
                const tmp = document.createElement('div');
                tmp.innerHTML = fieldHTML(f);
                node = tmp.firstElementChild;
                node.classList.add('is-appearing');
                wrap.insertBefore(node, wrap.children[i] || null);
                if (f.type === 'sig') initSignature();
            } else if (wrap.children[i] !== node) {
                wrap.insertBefore(node, wrap.children[i] || null);
            }
        });

        // repaint the ticks
        wrap.querySelectorAll('[data-choice]').forEach(btn => {
            btn.classList.toggle('is-on', answers[btn.dataset.choice] === btn.dataset.value);
        });
        wrap.querySelectorAll('[data-check]').forEach(btn => {
            const chosen = answers[btn.dataset.check];
            btn.classList.toggle('is-on', Array.isArray(chosen) && chosen.includes(btn.dataset.value));
        });
    }

    // ---------------------------------------------------------------- input
    el.stage.addEventListener('input', (e) => {
        const name = e.target.dataset.name;
        if (!name) return;
        answers[name] = (e.target.type === 'checkbox') ? e.target.checked : e.target.value;
        clearError(e.target.closest('.apply-field'));
        save();
    });

    el.stage.addEventListener('click', (e) => {
        const choice = e.target.closest('[data-choice]');
        if (choice) {
            const name = choice.dataset.choice;
            // tapping the chosen answer again clears it
            answers[name] = (answers[name] === choice.dataset.value) ? undefined : choice.dataset.value;
            if (answers[name] === undefined) delete answers[name];
            clearError(choice.closest('.apply-field'));
            save();
            syncCard(liveCards()[index]);
            return;
        }
        const check = e.target.closest('[data-check]');
        if (check) {
            const name = check.dataset.check;
            const set = new Set(Array.isArray(answers[name]) ? answers[name] : []);
            set.has(check.dataset.value) ? set.delete(check.dataset.value) : set.add(check.dataset.value);
            answers[name] = [...set];
            clearError(check.closest('.apply-field'));
            save();
            syncCard(liveCards()[index]);
            return;
        }
        if (e.target.id === 'applySigClear') { clearSignature(); }
    });

    function clearError(fieldEl) {
        if (!fieldEl) return;
        fieldEl.classList.remove('is-invalid');
        const msg = fieldEl.querySelector('.apply-field-error');
        if (msg) { msg.hidden = true; msg.textContent = ''; }
    }
    function setError(name, text) {
        const fieldEl = el.stage.querySelector(`[data-field="${name}"]`);
        if (!fieldEl) return;
        fieldEl.classList.add('is-invalid');
        const msg = fieldEl.querySelector('.apply-field-error');
        if (msg) { msg.textContent = text; msg.hidden = false; }
    }

    function validate(card) {
        let ok = true, firstBad = null;
        card.fields.filter(fieldIsVisible).forEach(f => {
            if (!f.required) return;
            const v = answers[f.name];
            const empty = (v == null) || v === '' || v === false || (Array.isArray(v) && !v.length);
            if (empty) {
                setError(f.name, 'Please fill this in.');
                ok = false; firstBad = firstBad || f.name;
            } else if (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
                setError(f.name, 'That email address does not look right.');
                ok = false; firstBad = firstBad || f.name;
            }
        });
        if (firstBad) {
            const node = el.stage.querySelector(`[data-field="${firstBad}"]`);
            if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return ok;
    }

    // ---------------------------------------------------------------- moving
    el.form.addEventListener('submit', (e) => { e.preventDefault(); goNext(); });

    function goNext() {
        const list = liveCards();
        const card = list[index];
        if (!validate(card)) return;
        if (returnToReview) { returnToReview = false; save(); showReview(); return; }
        if (index >= list.length - 1) { showReview(); return; }
        index++; save(); render('fwd');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    el.back.addEventListener('click', () => {
        if (index === 0) return;
        index--; save(); render('back');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el.skip.addEventListener('click', () => {
        const list = liveCards();
        const card = list[index];
        card.fields.forEach(f => { delete answers[f.name]; });
        if (card.terminates && card.group) {
            // "No more employers" - drop this round and everything after it
            stoppedGroups[card.group] = card.round;
            CARDS.filter(c => c.group === card.group && c.round >= card.round)
                 .forEach(c => c.fields.forEach(f => { delete answers[f.name]; }));
            save();
            const stillHere = liveCards();
            if (index >= stillHere.length) { showReview(); return; }
            render('fwd');
            return;
        }
        save();
        if (index >= liveCards().length - 1) { showReview(); return; }
        index++; render('fwd');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ---------------------------------------------------------------- signature
    let sigCtx = null, sigDrawing = false, sigDirty = false;
    function initSignature() {
        const canvas = $('applySig');
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        sigCtx = canvas.getContext('2d');
        sigCtx.scale(ratio, ratio);
        sigCtx.lineWidth = 2.2; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round';
        sigCtx.strokeStyle = '#111';
        sigDirty = false;

        const saved = answers.signature;
        if (saved) {
            const img = new Image();
            img.onload = () => sigCtx.drawImage(img, 0, 0, rect.width, rect.height);
            img.src = saved;
            sigDirty = true;
        }

        const pos = (ev) => {
            const r = canvas.getBoundingClientRect();
            const p = ev.touches ? ev.touches[0] : ev;
            return { x: p.clientX - r.left, y: p.clientY - r.top };
        };
        const start = (ev) => { ev.preventDefault(); sigDrawing = true; const p = pos(ev);
                                sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
        const move  = (ev) => { if (!sigDrawing) return; ev.preventDefault(); const p = pos(ev);
                                sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); sigDirty = true; };
        const end   = () => {
            if (!sigDrawing) return;
            sigDrawing = false;
            if (sigDirty) {
                answers.signature = canvas.toDataURL('image/png');
                clearError(canvas.closest('.apply-field'));
                save();
            }
        };
        ['pointerdown', 'touchstart'].forEach(e => canvas.addEventListener(e, start, { passive: false }));
        ['pointermove', 'touchmove'].forEach(e => canvas.addEventListener(e, move, { passive: false }));
        ['pointerup', 'pointerleave', 'touchend', 'touchcancel'].forEach(e => canvas.addEventListener(e, end));
    }
    function clearSignature() {
        const canvas = $('applySig');
        if (!canvas || !sigCtx) return;
        sigCtx.clearRect(0, 0, canvas.width, canvas.height);
        delete answers.signature;
        sigDirty = false;
        save();
    }

    // ---------------------------------------------------------------- review
    function labelFor(name) {
        for (const c of CARDS) {
            const f = c.fields.find(x => x.name === name);
            if (f) return f.label || name;
        }
        return name;
    }

    function showReview() {
        el.bar.style.width = '100%';

        // The review is the finished form itself, on white paper, so the
        // applicant sees exactly what SEC receives and can print a copy.
        el.reviewDoc.innerHTML =
            `<div class="apply-doc-tools">
                <button type="button" class="apply-linkbtn" id="applyPrint">Print or save a copy</button>
                <span class="apply-doc-hint">Tap a red section heading to change an answer</span>
             </div>
             <div class="apply-paper-wrap">${window.SEC_APPLY_DOC.build(answers, {})}</div>`;

        // Make each red heading jump back to the cards that fill it in.
        const groups = jumpGroups();
        const used = new Set();
        const findGroup = (text) => {
            const t = text.trim().toLowerCase();
            const direct = groups.findIndex((g, i) =>
                !used.has(i) && g.key.toLowerCase() === t);
            if (direct !== -1) return direct;
            const loose = groups.findIndex((g, i) => {
                if (used.has(i)) return false;
                const k = g.key.toLowerCase();
                return k.startsWith(t) || k.includes(': ' + t) || t.startsWith(k);
            });
            return loose;
        };
        el.reviewDoc.querySelectorAll('.doc-heading').forEach(h => {
            const gi = findGroup(h.textContent);
            if (gi === -1) return;
            used.add(gi);
            h.dataset.goto = groups[gi].first;
            h.classList.add('is-linked');
            h.setAttribute('role', 'button');
            h.setAttribute('tabindex', '0');
            h.title = 'Change these answers';
        });

        wireDoc();

        el.wizard.hidden = true; el.intro.hidden = true; el.done.hidden = true;
        el.review.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // The finished form is editable in place. Anything typed or ticked here
    // writes straight back into `answers`, so a correction made on the form
    // is what the wizard shows, what the email says, and what the PDF prints.
    function wireDoc() {
        const paper = el.reviewDoc.querySelector('#applyDocPaper');
        if (!paper) return;

        const commit = (node) => {
            const name = node.dataset.name;
            if (!name) return;
            const text = node.textContent.replace(/\s+$/, '');
            if (text === '') delete answers[name]; else answers[name] = text;
            node.classList.toggle('is-edited', true);
            save();
        };

        paper.addEventListener('input', (e) => {
            const node = e.target.closest('[data-name]');
            if (node) commit(node);
        });

        // single-line fields: Enter finishes the field rather than adding a line
        paper.addEventListener('keydown', (e) => {
            const node = e.target.closest('[data-name]');
            if (!node) return;
            if (e.key === 'Enter' && node.dataset.single) { e.preventDefault(); node.blur(); }
            if (e.key === 'Escape') node.blur();
        });

        // paste as plain text, so pasted formatting cannot land in the form
        paper.addEventListener('paste', (e) => {
            const node = e.target.closest('[data-name]');
            if (!node) return;
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, node.dataset.single ? text.replace(/\s*\n+\s*/g, ' ') : text);
        });

        paper.addEventListener('click', (e) => {
            // YES / NO on the form: click to set, click again to clear
            const tick = e.target.closest('[data-tick]');
            if (tick) {
                const name = tick.dataset.tick;
                answers[name] = (answers[name] === tick.dataset.value) ? undefined : tick.dataset.value;
                if (answers[name] === undefined) delete answers[name];
                save();
                refreshDoc();
                return;
            }
            // the "how did you find out" list
            const check = e.target.closest('[data-check]');
            if (check) {
                const set = new Set(Array.isArray(answers.howFound) ? answers.howFound : []);
                set.has(check.dataset.value) ? set.delete(check.dataset.value) : set.add(check.dataset.value);
                answers.howFound = [...set];
                save();
                refreshDoc();
                return;
            }
            // back to the signature pad
            if (e.target.closest('[data-resign]')) {
                const list = liveCards();
                const sigCard = list.findIndex(c => c.fields.some(f => f.type === 'sig'));
                if (sigCard !== -1) {
                    index = sigCard;
                    returnToReview = true;
                    el.review.hidden = true; el.wizard.hidden = false;
                    render('back');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }

    // Redraw the paper after a tick changes, keeping the scroll position so
    // the page does not jump under the reader.
    function refreshDoc() {
        const y = window.scrollY;
        showReview();
        window.scrollTo({ top: y });
    }

    el.reviewDoc.addEventListener('click', (e) => {
        if (e.target.closest('#applyPrint')) { window.print(); return; }
        const btn = e.target.closest('[data-goto]');
        if (!btn) return;
        index = parseInt(btn.dataset.goto, 10) || 0;
        returnToReview = true;
        el.review.hidden = true; el.wizard.hidden = false;
        render('back');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el.toReview.addEventListener('click', () => {
        const card = liveCards()[index];
        if (!validate(card)) return;          // do not leave a half-filled card behind
        returnToReview = false;
        showReview();
    });

    el.backToEdit.addEventListener('click', () => {
        index = Math.max(0, liveCards().length - 1);
        el.review.hidden = true; el.wizard.hidden = false;
        render('back');
    });

    // ---------------------------------------------------------------- send
    el.send.addEventListener('click', async () => {
        el.error.hidden = true;
        el.send.disabled = true;
        el.sending.hidden = false;

        // Build a tidy, ordered payload the server can turn into the PDF.
        const payload = { fields: [], answers, signature: answers.signature || '', startedAt: STARTED };
        liveCards().forEach(card => {
            card.fields.filter(fieldIsVisible).forEach(f => {
                if (f.type === 'sig') return;
                const v = answers[f.name];
                payload.fields.push({
                    section: card.section,
                    group: card.group ? `${card.title.split(':')[0]}` : '',
                    label: f.label || f.name,
                    name: f.name,
                    value: Array.isArray(v) ? v.join(', ') : (v === true ? 'Yes' : (v || '')),
                });
            });
        });

        try {
            const res = await fetch('apply.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) throw new Error(data.error || 'Could not send.');
            wipe();
            el.review.hidden = true;
            el.done.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            el.error.textContent = (err && err.message) ? err.message
                : 'Something went wrong sending your application. Please call (731) 660-5980 and we will take it over the phone.';
            el.error.hidden = false;
        } finally {
            el.send.disabled = false;
            el.sending.hidden = true;
        }
    });

    // ---------------------------------------------------------------- start
    const begin = () => {
        el.intro.hidden = true;
        el.wizard.hidden = false;
        render();
    };
    el.start.addEventListener('click', () => { answers = {}; index = 0; stoppedGroups = {}; wipe(); begin(); });

    // apply.html?blank=1 renders an empty copy of the form for printing, so
    // walk-ins can fill one in by hand. Nothing else on the page runs.
    if (/(?:^|[?&])blank=1(?:&|$)/.test(location.search)) {
        el.intro.hidden = true;
        el.wizard.hidden = true;
        el.review.hidden = false;
        document.querySelector('.apply-review .section-eyebrow').textContent = 'Paper copy';
        document.querySelector('.apply-review h2').textContent = 'Application for employment';
        document.querySelector('.apply-review .apply-lead').textContent =
            'A blank form to print and fill in by hand.';
        el.reviewDoc.innerHTML =
            `<div class="apply-doc-tools">
                <button type="button" class="apply-linkbtn" id="applyPrint">Print this form</button>
                <a class="apply-linkbtn apply-linkbtn--muted" href="apply.html">Fill it in online instead</a>
             </div>
             <div class="apply-paper-wrap">${window.SEC_APPLY_DOC.build({}, { blank: true })}</div>`;
        el.reviewDoc.addEventListener('click', (e) => {
            if (e.target.closest('#applyPrint')) window.print();
        });
        document.querySelector('.apply-send-row').hidden = true;
        return;
    }

    const saved = load();
    if (saved) {
        el.resume.hidden = false;
        el.resumeBtn.addEventListener('click', () => {
            answers = saved.answers || {};
            index = Math.min(saved.index || 0, CARDS.length - 1);
            stoppedGroups = saved.stoppedGroups || {};
            maxReached = Math.max(saved.maxReached || 0, index);
            begin();
        });
        el.clearBtn.addEventListener('click', () => { wipe(); el.resume.hidden = true; });
    }
})();
