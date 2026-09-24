/* ============================================================
   SEC APPLICATION - the filled form shown on the review screen
   A white, printable replica of SEC's own application form, with the
   applicant's answers written into it. Mirrors the layout of the paper
   document (APPLICATION FOR EMPLOYMENT, 6 pages) section for section.

   Spelling is corrected against the paper original, which carries several
   typos: PRE-EMPLOYEMENT QUESTIONANAIRE, CORRESPONDANCE, BRANCE OF SERVICE,
   CONVICTIONAL RECORD, PREVIOS, LIABLITY, DSABILITIES.
   ============================================================ */
window.SEC_APPLY_DOC = (function () {
    'use strict';

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // An editable value. Everything written here goes straight back into the
    // answers object (see wireDoc in apply.js), so a correction made on the
    // finished form updates the wizard, the email and the PDF alike.
    const val = (name, value, opts = {}) => {
        const v = Array.isArray(value) ? value.join(', ') : (value == null ? '' : value);
        return `<span class="doc-value${opts.multi ? ' doc-value--multi' : ''}"
                      data-name="${esc(name)}"
                      contenteditable="plaintext-only"
                      role="textbox" tabindex="0"
                      ${opts.multi ? '' : 'data-single="1"'}
                      spellcheck="false">${esc(v)}</span>`;
    };

    // one labelled box in the form grid
    const cell = (label, name, a, span = 1, opts = {}) => {
        const cls = ['doc-cell', `doc-span-${span}`];
        if (opts.tall) cls.push('doc-cell--tall');
        return `<div class="${cls.join(' ')}">
                    <span class="doc-label">${esc(label)}</span>
                    ${val(name, a[name], opts)}
                </div>`;
    };

    // a cell holding more than one field, e.g. State / ZIP
    const cellPair = (label, names, a, span = 1, sep = ' ') => `
        <div class="doc-cell doc-span-${span}">
            <span class="doc-label">${esc(label)}</span>
            <span class="doc-pair">${names.map((n, i) =>
                (i ? `<span class="doc-sep">${esc(sep)}</span>` : '') + val(n, a[n])).join('')}</span>
        </div>`;

    // YES / NO pair, both clickable, as on the paper form
    const yesno = (label, name, a, span = 1) => {
        const v = a[name];
        return `<div class="doc-cell doc-span-${span}">
                    <span class="doc-label">${esc(label)}</span>
                    <span class="doc-ticks" data-tickgroup="${esc(name)}">
                        <button type="button" class="doc-tick${v === 'Yes' ? ' is-on' : ''}"
                                data-tick="${esc(name)}" data-value="Yes"
                                aria-label="Yes">${v === 'Yes' ? '&#10003;' : ''}</button> YES
                        <button type="button" class="doc-tick${v === 'No' ? ' is-on' : ''}"
                                data-tick="${esc(name)}" data-value="No"
                                aria-label="No">${v === 'No' ? '&#10003;' : ''}</button> NO
                    </span>
                </div>`;
    };

    const checkList = (options, chosen) => {
        const set = Array.isArray(chosen) ? chosen : [];
        return `<div class="doc-cell doc-span-6">
                    <span class="doc-label">How did you find out about this position?</span>
                    <div class="doc-checkgrid">
                        ${options.map(o => `<span class="doc-check">
                            <button type="button" class="doc-tick${set.includes(o) ? ' is-on' : ''}"
                                    data-check="howFound" data-value="${esc(o)}"
                                    aria-label="${esc(o)}">${set.includes(o) ? '&#10003;' : ''}</button>
                            ${esc(o)}</span>`).join('')}
                    </div>
                </div>`;
    };

    const row = (inner) => `<div class="doc-row">${inner}</div>`;
    const heading = (t) => `<h3 class="doc-heading">${esc(t)}</h3>`;

    // a former-employer block, repeated up to three times
    function employerBlock(a, i, label) {
        const n = (k) => `emp${i}_${k}`;
        if (!a[n('name')]) return '';
        return heading(label) +
            `<div class="doc-grid">
                ${row(cell('Name of employer', n('name'), a, 4) + cell('Job title', n('title'), a, 2))}
                ${row(cell('Address', n('street'), a, 3) + cell('City', n('city'), a, 1) +
                      cell('State', n('state'), a, 1) + cell('ZIP', n('zip'), a, 1))}
                ${row(cell('Starting date', n('startDate'), a, 2) + cell('Leaving date', n('leavingDate'), a, 2) +
                      cell('Weekly starting salary', n('startSalary'), a, 1) +
                      cell('Weekly leaving salary', n('finalSalary'), a, 1))}
                ${row(yesno('May we contact your supervisor?', n('mayContact'), a, 2) +
                      cell('Name of supervisor', n('supervisorName'), a, 2) +
                      cell('Title', n('supervisorTitle'), a, 1) + cell('Phone', n('supervisorPhone'), a, 1))}
                ${row(cell('Description of work', n('description'), a, 6, { tall: true, multi: true }))}
                ${row(cell('Reason for leaving', n('reasonLeaving'), a, 6))}
            </div>`;
    }

    function referenceRows(a) {
        let rows = '';
        for (let i = 1; i <= 4; i++) {
            const n = a[`ref${i}_name`] || '';
            if (!n && i > 2) continue;
            rows += `<tr>
                        <td class="doc-num">${i}</td>
                        <td>${val(`ref${i}_name`, n)}</td>
                        <td>${val(`ref${i}_address`, a[`ref${i}_address`])}</td>
                        <td>${val(`ref${i}_business`, a[`ref${i}_business`])}</td>
                        <td>${val(`ref${i}_phone`, a[`ref${i}_phone`])}</td>
                     </tr>`;
        }
        return rows;
    }

    const schoolRow = (level, a, p) => `<tr>
            <th scope="row">${esc(level)}</th>
            <td>${val(p + 'Name', a[p + 'Name'])}</td>
            <td class="doc-mid">${val(p + 'Years', a[p + 'Years'])}</td>
            <td class="doc-mid">${val(p + 'Graduated', a[p + 'Graduated'])}</td>
            <td>${val(p + 'Subjects', a[p + 'Subjects'])}</td>
        </tr>`;

    /** Build the whole filled form. `a` is the answers object. */
    function build(a, opts) {
        opts = opts || {};
        const howFoundOptions = ['Employment agency', 'State employment office', 'Newspaper advertising',
                                 'College placement', 'Friend', 'Walk in', 'Online ad', 'Other'];
        const signedOn = opts.signedOn || new Date().toLocaleDateString('en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' });

        return `
<article class="doc" id="applyDocPaper">
    <header class="doc-head">
        <img class="doc-logo" src="assets/images/logos/sec-logo-pdf.png" alt="Southern Electric &amp; Controls">
        <div class="doc-head-text">
            <h2>Application for Employment</h2>
            <p>Pre-employment questionnaire &middot; An equal opportunity employer</p>
        </div>
        <div class="doc-head-meta">
            <span>86 Volunteer Blvd, Jackson, TN 38305</span>
            <span>(731) 660-5980</span>
        </div>
    </header>

    ${heading('Personal information')}
    <div class="doc-grid">
        ${row(cellPair('Name (last name first)', ['lastName', 'firstName', 'middleName'], a, 4, ', ') +
              cell('Email', 'email', a, 2))}
        ${row(cell('Present address', 'presentStreet', a, 3) + cell('Apt no.', 'presentApt', a, 1) +
              cell('City', 'presentCity', a, 1) + cellPair('State / ZIP', ['presentState', 'presentZip'], a, 1))}
        ${row(cell('Permanent address', 'permanentStreet', a, 3) + cell('Apt no.', 'permanentApt', a, 1) +
              cell('City', 'permanentCity', a, 1) + cellPair('State / ZIP', ['permanentState', 'permanentZip'], a, 1))}
        ${row(cell('Previous address if less than 3 years', 'previousStreet', a, 3) + cell('Apt no.', 'previousApt', a, 1) +
              cell('City', 'previousCity', a, 1) + cellPair('State / ZIP', ['previousState', 'previousZip'], a, 1))}
        ${row(cell('Phone', 'phone', a, 2) + cell('Cell phone', 'cellPhone', a, 2) +
              yesno('18 years or older?', 'is18', a, 1) + yesno('Authorized to work in the US?', 'authorized', a, 1))}
        ${row(cell('Emergency contact', 'emergencyName', a, 3) + cell('Emergency phone', 'emergencyPhone', a, 3))}
    </div>

    ${heading('Desired employment')}
    <div class="doc-grid">
        ${row(cell('Position', 'position', a, 3) + cell('Date you can start', 'startDate', a, 2) +
              cell('Salary desired', 'salaryDesired', a, 1))}
        ${row(yesno('Are you employed now?', 'employedNow', a, 3) +
              yesno('If so, may we inquire of your present employer?', 'mayInquire', a, 3))}
        ${row(yesno('Ever applied to this company before?', 'appliedBefore', a, 2) +
              cell('Where?', 'appliedBeforeWhere', a, 2) + cell('When?', 'appliedBeforeWhen', a, 2))}
        ${row(yesno('Ever worked for this company before?', 'workedBefore', a, 2) +
              cell('Where?', 'workedBeforeWhere', a, 2) + cell('When?', 'workedBeforeWhen', a, 2))}
        ${row(cell('Reason for leaving', 'workedBeforeReason', a, 3) +
              cell('Name of last supervisor at this company', 'lastSupervisorHere', a, 3))}
        ${row(checkList(howFoundOptions, a.howFound))}
        ${(a.howFoundOther || (Array.isArray(a.howFound) && a.howFound.includes('Other')))
            ? row(cell('Other', 'howFoundOther', a, 6)) : ''}
    </div>

    ${heading('Education')}
    <table class="doc-table">
        <thead><tr>
            <th>School level</th><th>Name and location of school</th>
            <th class="doc-mid">Years attended</th><th class="doc-mid">Graduated?</th><th>Subjects studied</th>
        </tr></thead>
        <tbody>
            ${schoolRow('High school', a, 'hs')}
            ${schoolRow('College', a, 'college')}
            ${schoolRow('Trade, business or correspondence school', a, 'trade')}
        </tbody>
    </table>

    ${heading('General')}
    <div class="doc-grid">
        ${row(cell('Subjects of special study or research work', 'specialStudy', a, 6, { multi: true }))}
        ${row(cell('Special training, certifications, licenses', 'specialTraining', a, 6, { multi: true }))}
        ${row(cell('Special skills, foreign languages, etc.', 'specialSkills', a, 6, { multi: true }))}
    </div>

    <div class="doc-break"></div>
    ${heading('Former employers')}
    <p class="doc-note">Last three employers, starting with the most recent.</p>
    ${employerBlock(a, 1, 'Present or last employer')}
    ${employerBlock(a, 2, 'Previous employer')}
    ${employerBlock(a, 3, 'Previous employer')}

    ${heading('References')}
    <p class="doc-note">Professional references whom we may contact.</p>
    <table class="doc-table">
        <thead><tr><th class="doc-num">#</th><th>Name</th><th>Address</th><th>Business</th><th>Phone number</th></tr></thead>
        <tbody>${referenceRows(a)}</tbody>
    </table>

    ${heading('Service record')}
    <div class="doc-grid">
        ${row(yesno('Have you ever served in the U.S. Armed Forces?', 'served', a, 4) +
              cell('Branch of service', 'branch', a, 2))}
    </div>

    <div class="doc-grid doc-grid--tight">
        ${row(yesno('Have you ever been convicted of, plead guilty or no contest to, or had a suspended imposition of sentence for any offense (other than a minor traffic violation)?', 'convicted', a, 6))}
        ${row(cell('If yes, explain', 'convictedExplain', a, 6, { tall: true, multi: true }))}
    </div>
    <p class="doc-note doc-note--small">A conviction record will not necessarily exclude you from consideration.
       This information will be used only for job-related purposes and only to the extent permitted by law.</p>

    <div class="doc-break"></div>
    ${heading('Authorization')}
    <div class="doc-statement">
        <p>I certify that the facts contained in this application are true and complete to the best of my knowledge
           and understand that, if employed, falsified statements on this application shall be grounds for dismissal.</p>
        <p>I authorize investigation of all statements contained herein and the references and employers listed above
           to give you any and all information concerning my previous employment and any pertinent information they
           may have, personal or otherwise, and release the company from all liability for any damage that may result
           from utilization of such information.</p>
        <p>I also understand and agree that no representative of the company has any authority to enter into any
           agreement for employment for any specified period of time, or to make any agreement contrary to the
           foregoing, unless it is in writing and signed by an authorized company representative.</p>
        <p>This waiver does not permit the release or use of any disability-related or medical information in a manner
           prohibited by the Americans with Disabilities Act (ADA) and other relevant federal and state laws.</p>
    </div>
    <div class="doc-sign-row">
        <div class="doc-sign">
            ${a.signature ? `<img class="doc-sig-img" src="${a.signature}" alt="Signature">` : ''}
            <span class="doc-sign-line"></span>
            <span class="doc-label">Signature
                <button type="button" class="doc-resign" data-resign="1">re-sign</button></span>
        </div>
        <div class="doc-sign doc-sign--date">
            <span class="doc-sign-value">${esc(signedOn)}</span>
            <span class="doc-sign-line"></span>
            <span class="doc-label">Date</span>
        </div>
    </div>
    <p class="doc-foot">Southern Electric &amp; Controls &middot; Application for employment &middot; An equal opportunity employer</p>
</article>`;
    }

    return { build };
})();
