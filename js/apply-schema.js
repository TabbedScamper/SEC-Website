/* ============================================================
   SEC EMPLOYMENT APPLICATION - question schema
   Rebuilt from the Adams 9288 paper form (Jan 2007), minus:
     * the Social Security Number  (pending Kevin's call - it is not needed
       until hire, when the W-4 / I-9 collect it on paper)
     * page 4, "FOR INTERVIEWER'S USE ONLY"
   One CARD per screen. Keep cards short: a card is either a single question
   or a tight group that belongs on one line (city / state / zip).
   Field types: text, tel, email, date, textarea, yesno, choice, checks, sig
   ============================================================ */
window.SEC_APPLY_SCHEMA = [
    // ---------------------------------------------------- resume
    // First card on purpose: most people have one ready and want it off their
    // chest. It is optional and only travels with a completed application -
    // a resume on its own would be an open door for junk.
    {
        section: 'Resume',
        cards: [
            { id: 'resume', title: 'Have a resume? Attach it now.',
              hint: 'Optional. It is sent with your finished application, and you can also add it at the end. PDF, Word document or a clear photo, up to 4 MB.',
              skippable: true, skipLabel: 'No resume', fields: [
                { name: 'resume', label: 'Resume', type: 'file' },
            ]},
        ]
    },
    // ---------------------------------------------------- personal
    {
        section: 'Personal information',
        cards: [
            { id: 'name', title: 'What is your name?', fields: [
                { name: 'lastName',  label: 'Last name',  type: 'text', required: true,  w: 'half' },
                { name: 'firstName', label: 'First name', type: 'text', required: true,  w: 'half' },
                { name: 'middleName',label: 'Middle',     type: 'text', required: false, w: 'half' },
            ]},
            { id: 'contact', title: 'How do we reach you?',
              hint: 'We will use these to follow up on your application.', fields: [
                { name: 'phone',     label: 'Phone',      type: 'tel',   required: true,  w: 'half' },
                { name: 'cellPhone', label: 'Cell phone', type: 'tel',   required: false, w: 'half' },
                { name: 'email',     label: 'Email',      type: 'email', required: true,  w: 'full' },
            ]},
            { id: 'presentAddress', title: 'Where do you live now?', fields: [
                { name: 'presentStreet', label: 'Street address', type: 'text', required: true, w: 'full' },
                { name: 'presentApt',    label: 'Apt no.',        type: 'text', required: false, w: 'third' },
                { name: 'presentCity',   label: 'City',           type: 'text', required: true,  w: 'third' },
                { name: 'presentState',  label: 'State',          type: 'text', required: true,  w: 'sixth', max: 2, upper: true },
                { name: 'presentZip',    label: 'ZIP',            type: 'text', required: true,  w: 'sixth', max: 10 },
            ]},
            { id: 'permanentAddress', title: 'Is your permanent address the same?',
              hint: 'Skip this if your permanent address is the address above.',
              skippable: true, skipLabel: 'Same as above', fields: [
                { name: 'permanentStreet', label: 'Street address', type: 'text', w: 'full' },
                { name: 'permanentApt',    label: 'Apt no.',        type: 'text', w: 'third' },
                { name: 'permanentCity',   label: 'City',           type: 'text', w: 'third' },
                { name: 'permanentState',  label: 'State',          type: 'text', w: 'sixth', max: 2, upper: true },
                { name: 'permanentZip',    label: 'ZIP',            type: 'text', w: 'sixth', max: 10 },
            ]},
            { id: 'previousAddress', title: 'Lived there less than 3 years?',
              hint: 'If so, give your previous address. Otherwise skip.',
              skippable: true, skipLabel: 'Lived here 3+ years', fields: [
                { name: 'previousStreet', label: 'Street address', type: 'text', w: 'full' },
                { name: 'previousApt',    label: 'Apt no.',        type: 'text', w: 'third' },
                { name: 'previousCity',   label: 'City',           type: 'text', w: 'third' },
                { name: 'previousState',  label: 'State',          type: 'text', w: 'sixth', max: 2, upper: true },
                { name: 'previousZip',    label: 'ZIP',            type: 'text', w: 'sixth', max: 10 },
            ]},
            { id: 'eligibility', title: 'A couple of quick checks', fields: [
                { name: 'is18',      label: 'Are you 18 years or older?',              type: 'yesno', required: true },
                { name: 'authorized',label: 'Are you legally authorized to work in the US?', type: 'yesno', required: true },
            ]},
            { id: 'emergency', title: 'Emergency contact', fields: [
                { name: 'emergencyName',  label: 'Name',  type: 'text', required: true, w: 'half' },
                { name: 'emergencyPhone', label: 'Phone', type: 'tel',  required: true, w: 'half' },
            ]},
        ]
    },
    // ---------------------------------------------------- desired employment
    {
        section: 'Desired employment',
        cards: [
            { id: 'position', title: 'What position are you applying for?', fields: [
                { name: 'position',    label: 'Position',      type: 'text', required: true, w: 'full' },
                { name: 'startDate',   label: 'Date you can start', type: 'date', required: true, w: 'half' },
                { name: 'salaryDesired', label: 'Salary desired', type: 'text', required: false, w: 'half' },
            ]},
            { id: 'employedNow', title: 'Are you employed now?', fields: [
                { name: 'employedNow', label: 'Employed now?', type: 'yesno', required: true },
                { name: 'mayInquire',  label: 'If so, may we contact your present employer?',
                  type: 'yesno', showIf: { field: 'employedNow', equals: 'Yes' } },
            ]},
            { id: 'appliedBefore', title: 'Have you applied to SEC before?', fields: [
                { name: 'appliedBefore',      label: 'Applied before?', type: 'yesno', required: true },
                { name: 'appliedBeforeWhere', label: 'Where?', type: 'text', w: 'half',
                  showIf: { field: 'appliedBefore', equals: 'Yes' } },
                { name: 'appliedBeforeWhen',  label: 'When?',  type: 'text', w: 'half',
                  showIf: { field: 'appliedBefore', equals: 'Yes' } },
            ]},
            { id: 'workedBefore', title: 'Have you worked for SEC before?', fields: [
                { name: 'workedBefore',      label: 'Worked here before?', type: 'yesno', required: true },
                { name: 'workedBeforeWhere', label: 'Where?', type: 'text', w: 'half',
                  showIf: { field: 'workedBefore', equals: 'Yes' } },
                { name: 'workedBeforeWhen',  label: 'When?',  type: 'text', w: 'half',
                  showIf: { field: 'workedBefore', equals: 'Yes' } },
                { name: 'workedBeforeReason', label: 'Reason for leaving', type: 'text', w: 'full',
                  showIf: { field: 'workedBefore', equals: 'Yes' } },
                { name: 'lastSupervisorHere', label: 'Name of your last supervisor here', type: 'text', w: 'full',
                  showIf: { field: 'workedBefore', equals: 'Yes' } },
            ]},
            { id: 'howFound', title: 'How did you hear about this position?', fields: [
                { name: 'howFound', label: '', type: 'checks', required: true, options: [
                    'Employment agency', 'State employment office', 'Newspaper advertising',
                    'College placement', 'Friend', 'Walk in', 'Online ad', 'Other'
                ]},
                { name: 'howFoundOther', label: 'Tell us more', type: 'text', w: 'full',
                  showIf: { field: 'howFound', includes: 'Other' } },
            ]},
        ]
    },
    // ---------------------------------------------------- education
    {
        section: 'Education',
        cards: [
            { id: 'highSchool', title: 'High school', skippable: true, fields: [
                { name: 'hsName',      label: 'Name and location of school', type: 'text', w: 'full' },
                { name: 'hsYears',     label: 'Years attended', type: 'text', w: 'third' },
                { name: 'hsGraduated', label: 'Did you graduate?', type: 'yesno', w: 'third' },
                { name: 'hsSubjects',  label: 'Subjects studied', type: 'text', w: 'full' },
            ]},
            { id: 'college', title: 'College', skippable: true, skipLabel: 'Did not attend', fields: [
                { name: 'collegeName',      label: 'Name and location of school', type: 'text', w: 'full' },
                { name: 'collegeYears',     label: 'Years attended', type: 'text', w: 'third' },
                { name: 'collegeGraduated', label: 'Did you graduate?', type: 'yesno', w: 'third' },
                { name: 'collegeSubjects',  label: 'Subjects studied', type: 'text', w: 'full' },
            ]},
            { id: 'trade', title: 'Trade, business or correspondence school',
              hint: 'Apprenticeship programs and trade certifications go here.',
              skippable: true, skipLabel: 'Did not attend', fields: [
                { name: 'tradeName',      label: 'Name and location of school', type: 'text', w: 'full' },
                { name: 'tradeYears',     label: 'Years attended', type: 'text', w: 'third' },
                { name: 'tradeGraduated', label: 'Did you graduate?', type: 'yesno', w: 'third' },
                { name: 'tradeSubjects',  label: 'Subjects studied', type: 'text', w: 'full' },
            ]},
            { id: 'general', title: 'Training, licenses and skills', skippable: true, fields: [
                { name: 'specialStudy',   label: 'Subjects of special study or research work', type: 'textarea', w: 'full' },
                { name: 'specialTraining',label: 'Special training, certifications, licenses', type: 'textarea', w: 'full',
                  hint: 'For example: journeyman licence, OSHA 30, NFPA 70E, CDL' },
                { name: 'specialSkills',  label: 'Special skills, foreign languages, etc.', type: 'textarea', w: 'full' },
            ]},
        ]
    },
    // ---------------------------------------------------- employers (x3)
    {
        section: 'Former employers',
        repeat: { count: 3, prefix: 'emp', labels: ['Most recent employer', 'Previous employer', 'Previous employer'] },
        cards: [
            { id: 'who', title: '{LABEL}', skippableFrom: 2, skipLabel: 'No more employers', fields: [
                { name: 'name',   label: 'Employer name', type: 'text', required: true, w: 'full' },
                { name: 'street', label: 'Address', type: 'text', w: 'full' },
                { name: 'city',   label: 'City',  type: 'text', w: 'third' },
                { name: 'state',  label: 'State', type: 'text', w: 'sixth', max: 2, upper: true },
                { name: 'zip',    label: 'ZIP',   type: 'text', w: 'sixth', max: 10 },
            ]},
            { id: 'role', title: '{LABEL}: your job', fields: [
                { name: 'title',        label: 'Job title', type: 'text', required: true, w: 'full' },
                { name: 'startDate',    label: 'Starting date', type: 'text', w: 'half' },
                { name: 'leavingDate',  label: 'Leaving date',  type: 'text', w: 'half' },
                { name: 'startSalary',  label: 'Weekly starting salary', type: 'text', w: 'half' },
                { name: 'finalSalary',  label: 'Weekly leaving salary', type: 'text', w: 'half' },
            ]},
            { id: 'supervisor', title: '{LABEL}: supervisor', fields: [
                { name: 'mayContact',     label: 'May we contact your supervisor?', type: 'yesno' },
                { name: 'supervisorName', label: 'Supervisor name', type: 'text', w: 'half' },
                { name: 'supervisorTitle',label: 'Title', type: 'text', w: 'half' },
                { name: 'supervisorPhone',label: 'Phone', type: 'tel',  w: 'half' },
            ]},
            { id: 'work', title: '{LABEL}: the work', fields: [
                { name: 'description',   label: 'Description of work', type: 'textarea', w: 'full' },
                { name: 'reasonLeaving', label: 'Reason for leaving',  type: 'text', w: 'full' },
            ]},
        ]
    },
    // ---------------------------------------------------- references
    {
        section: 'References',
        repeat: { count: 4, prefix: 'ref', labels: ['Reference 1', 'Reference 2', 'Reference 3', 'Reference 4'] },
        cards: [
            { id: 'ref', title: '{LABEL}', hint: 'Professional references we may contact.',
              skippableFrom: 3, skipLabel: 'No more references', fields: [
                { name: 'name',     label: 'Name',    type: 'text', required: true, w: 'half' },
                { name: 'business', label: 'Business',type: 'text', w: 'half' },
                { name: 'address',  label: 'Address', type: 'text', w: 'full' },
                { name: 'phone',    label: 'Phone',   type: 'tel',  required: true, w: 'half' },
            ]},
        ]
    },
    // ---------------------------------------------------- service + record
    {
        section: 'Service record',
        cards: [
            /* SEC's form asks only for the branch, so rank and discharge date
               are deliberately not asked. */
            { id: 'military', title: 'Have you served in the U.S. Armed Forces?', fields: [
                { name: 'served', label: 'Served?', type: 'yesno', required: true },
                { name: 'branch', label: 'Branch of service', type: 'text', w: 'half',
                  showIf: { field: 'served', equals: 'Yes' } },
            ]},
            { id: 'convictions',
              title: 'Have you ever been convicted of, plead guilty or no contest to, or had a suspended imposition of sentence for any offense other than a minor traffic violation?',
              hint: 'A conviction record will not necessarily exclude you from consideration. This information is used only for job-related purposes and only to the extent permitted by law.',
              fields: [
                { name: 'convicted',      label: '', type: 'yesno', required: true },
                { name: 'convictedExplain', label: 'Please explain', type: 'textarea', w: 'full',
                  showIf: { field: 'convicted', equals: 'Yes' } },
            ]},
        ]
    },
    // ---------------------------------------------------- authorization
    {
        section: 'Authorization',
        cards: [
            { id: 'authorize', title: 'Read and sign',
              hint: 'This is the authorization statement from our application form.',
              statement: [
                'I certify that the facts contained in this application are true and complete to the best of my knowledge and understand that, if employed, falsified statements on this application shall be grounds for dismissal.',
                'I authorize investigation of all statements contained herein and the references and employers listed above to give you any and all information concerning my previous employment and any pertinent information they may have, personal or otherwise, and release the company from all liability for any damage that may result from utilization of such information.',
                'I also understand and agree that no representative of the company has any authority to enter into any agreement for employment for any specified period of time, or to make any agreement contrary to the foregoing, unless it is in writing and signed by an authorized company representative.',
                'This waiver does not permit the release or use of disability-related or medical information in a manner prohibited by the Americans with Disabilities Act (ADA) and other relevant federal and state laws.'
              ],
              fields: [
                { name: 'agree', label: 'I certify the above and authorize this investigation.', type: 'check', required: true },
                { name: 'signature', label: 'Sign with your finger or mouse', type: 'sig', required: true },
            ]},
        ]
    },
];
