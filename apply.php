<?php
/**
 * Employment application handler - southernelectric.net
 *
 * apply.html walks the applicant through the questions, then POSTs the whole
 * lot here as JSON. This builds an SEC-branded PDF of the completed
 * application and emails it to the same people the contact form reaches.
 *
 * Mail goes out through the Brevo HTTPS API for the same reason contact.php
 * does: GoDaddy shared hosting blocks every outbound SMTP port (25/465/587,
 * verified 2026-09-09). The API key sits in brevo.key beside this file -
 * gitignored and .htaccess-denied, because this repository is public.
 *
 * NOT COLLECTED: Social Security Number. The paper form asks for it; it is
 * deliberately left out of the online version, since it is not needed until
 * hire (W-4 / I-9) and would otherwise travel through email and sit in logs.
 */

declare(strict_types=1);

// ---------------------------------------------------------------- settings
const MAIL_TO = [
    'mason@southernelectric.net',
    'kevin@southernelectric.net',
    'clint@ice-electric.com',
    'info@southernelectric.net',
    'jenny@southernelectric.net',
];
const MAIL_FROM      = 'info@southernelectric.net';   // verified sender in Brevo
const BREVO_KEY_FILE = __DIR__ . '/brevo.key';
const APPLICATION_LOG = __DIR__ . '/applications.log';   // .htaccess-denied
const APPLICATION_DIR = __DIR__ . '/applications';       // .htaccess-denied
const MAX_PER_HOUR   = 5;                                // per IP
const SPAM_LOG       = __DIR__ . '/spam.log';            // shared with contact.php
const MAX_BODY       = 7500000;                          // ~7.5 MB: application + signature + a 4 MB resume
const MAX_RESUME     = 4194304;                          // 4 MB before base64

// ---------------------------------------------------------------- helpers
function respond(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}
/** Strip CR/LF so a submitted value can never inject mail headers. */
function clean(string $v, int $max = 2000): string {
    $v = str_replace(["\r", "\n"], ' ', $v);
    return trim(mb_substr($v, 0, $max));
}

// ---------------------------------------------------------------- guards
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Method not allowed']);
}
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > MAX_BODY) {
    respond(413, ['ok' => false, 'error' => 'That application is too large to send. Please call us.']);
}
$data = json_decode($raw, true);
if (!is_array($data) || empty($data['fields']) || !is_array($data['fields'])) {
    respond(422, ['ok' => false, 'error' => 'Something went wrong with the form. Please call us.']);
}

// ---------------------------------------------------------------- spam gate
// The contact form was hit by link spam in Sept 2026, so this endpoint gets
// the same treatment before it ever goes public. Anything refused is written
// to spam.log, so a real application is never silently lost.
function logSpam(string $reason, array $payload): void {
    @file_put_contents(SPAM_LOG, json_encode([
        'at'     => date('c'),
        'form'   => 'application',
        'reason' => $reason,
        'ip'     => preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? ''),
        'agent'  => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
        'sample' => substr(json_encode($payload['answers'] ?? []), 0, 900),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

// It has to be submitted from our own page.
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
if ($origin === '' || !preg_match('~^https?://(www\.)?southernelectric\.net~i', $origin)) {
    logSpam('bad-origin:' . substr($origin, 0, 80), $data);
    respond(200, ['ok' => true]);            // quietly accept, so a bot moves on
}

// The page times itself and sends the seconds it was open: nobody fills in a
// 35-question form in seconds. Not a clock comparison, because a browser clock
// that is minutes out would make a genuine application look instant.
$elapsed = (int) ($data['elapsedSeconds'] ?? -1);
if ($elapsed < 20 || $elapsed > 172800) {
    logSpam('timing:' . $elapsed, $data);
    respond(200, ['ok' => true]);
}

// An employment application has no reason to carry links.
$blob  = strtolower(json_encode($data['answers'] ?? []));
$links = preg_match_all('~https?://|www\.|\[url~i', $blob);
if ($links >= 2) {
    logSpam('content:links=' . $links, $data);
    respond(422, ['ok' => false, 'error' =>
        'Our spam filter blocked that. If this is a genuine application, please call (731) 660-5980.']);
}

// Crude per-IP rate limit.
$ip   = preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
$file = sys_get_temp_dir() . '/sec_apply_' . md5($ip);
$hits = [];
if (is_readable($file)) {
    $hits = array_filter(
        (array) json_decode((string) file_get_contents($file), true),
        static fn($t) => is_int($t) && $t > time() - 3600
    );
}
if (count($hits) >= MAX_PER_HOUR) {
    respond(429, ['ok' => false, 'error' => 'Too many applications from this connection. Please call (731) 660-5980.']);
}

// ---------------------------------------------------------------- read it
$answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];
$get = static function (string $key) use ($answers): string {
    $v = $answers[$key] ?? '';
    return is_array($v) ? implode(', ', $v) : clean((string) $v, 300);
};

$firstName = $get('firstName');
$lastName  = $get('lastName');
$email     = $get('email');
$phone     = $get('phone');
$position  = $get('position');

if ($firstName === '' || $lastName === '') {
    respond(422, ['ok' => false, 'error' => 'Please give your name.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'That email address does not look right.']);
}
if (empty($answers['agree'])) {
    respond(422, ['ok' => false, 'error' => 'Please tick the authorization box before sending.']);
}

$applicant = trim($firstName . ' ' . $lastName);
$stamp     = date('Y-m-d_His');
$slug      = preg_replace('/[^A-Za-z0-9]+/', '-', $applicant) ?: 'applicant';
$pdfName   = "SEC-Application_{$slug}_{$stamp}.pdf";

// ---------------------------------------------------------------- resume
// Optional. Checked by extension AND by what the bytes actually start with,
// so a script cannot post something executable with a .pdf name on the end.
$resumeAttachment = null;
$resumeNote       = 'No resume attached.';
$resume = is_array($data['resume'] ?? null) ? $data['resume'] : null;
if ($resume && !empty($resume['data'])) {
    $allowed = ['pdf', 'doc', 'docx', 'rtf', 'txt', 'jpg', 'jpeg', 'png', 'heic'];
    $origName = preg_replace('/[^\w.\- ]+/u', '_', (string)($resume['name'] ?? 'resume'));
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $raw = (string)($resume['data'] ?? '');
    $comma = strpos($raw, ',');
    $bin = $comma !== false ? base64_decode(substr($raw, $comma + 1), true) : false;

    if (!in_array($ext, $allowed, true)) {
        respond(422, ['ok' => false, 'error' => 'That resume file type is not accepted. Use a PDF, a Word document or a photo.']);
    }
    if ($bin === false || $bin === '') {
        respond(422, ['ok' => false, 'error' => 'That resume could not be read. Please attach it again.']);
    }
    if (strlen($bin) > MAX_RESUME) {
        respond(413, ['ok' => false, 'error' => 'That resume is larger than 4 MB. Please send a smaller copy or email it to info@southernelectric.net.']);
    }
    // magic bytes: what the file really is
    $head = substr($bin, 0, 8);
    $looksOk =
        ($ext === 'pdf'  && strncmp($head, '%PDF', 4) === 0) ||
        (in_array($ext, ['docx'], true) && strncmp($head, "PK\x03\x04", 4) === 0) ||
        (in_array($ext, ['doc'], true)  && strncmp($head, "\xD0\xCF\x11\xE0", 4) === 0) ||
        (in_array($ext, ['jpg', 'jpeg'], true) && strncmp($head, "\xFF\xD8\xFF", 3) === 0) ||
        ($ext === 'png'  && strncmp($head, "\x89PNG", 4) === 0) ||
        (in_array($ext, ['rtf', 'txt', 'heic'], true));   // plain or camera formats: no reliable magic here
    if (!$looksOk) {
        logSpam('resume-mismatch:' . $ext, $data);
        respond(422, ['ok' => false, 'error' => 'That file did not look like the type its name says. Please attach the original.']);
    }

    $resumeName = 'Resume_' . $slug . '_' . $stamp . '.' . $ext;
    $resumeAttachment = ['content' => base64_encode($bin), 'name' => $resumeName];
    $resumeNote = 'Resume attached: ' . $resumeName . ' (' . round(strlen($bin) / 1024) . ' KB)';
    if (!is_dir(APPLICATION_DIR)) { @mkdir(APPLICATION_DIR, 0700); }
    @file_put_contents(APPLICATION_DIR . '/' . $resumeName, $bin);
}

// ---------------------------------------------------------------- record it
// Written BEFORE sending, so a filtered email is an inconvenience rather than
// a lost applicant. The signature image is left out to keep the log readable.
@file_put_contents(APPLICATION_LOG, json_encode([
    'at'        => date('c'),
    'applicant' => $applicant,
    'email'     => $email,
    'phone'     => $phone,
    'position'  => $position,
    'ip'        => $ip,
    'pdf'       => $pdfName,
    'resume'    => $resumeAttachment['name'] ?? null,
    'answers'   => array_diff_key($answers, ['signature' => 1]),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);

// ---------------------------------------------------------------- signature
// data:image/png;base64,... -> a temp PNG, because FPDF draws images from disk.
$sigPath = null;
$sig = (string) ($data['signature'] ?? '');
if (preg_match('#^data:image/png;base64,#', $sig)) {
    $bin = base64_decode(substr($sig, strpos($sig, ',') + 1), true);
    if ($bin !== false && strlen($bin) < 700000) {
        $sigPath = tempnam(sys_get_temp_dir(), 'secsig') . '.png';
        @file_put_contents($sigPath, $bin);
    }
}

// ---------------------------------------------------------------- the PDF
// Rendered by apply-pdf.php from the answers map, so the attachment is the
// same form the applicant reviewed and signed off on screen. The first version
// walked a flat list of fields instead, which printed the three addresses as
// six identical rows of "Street address / Apt no. / City / State / ZIP".
require __DIR__ . '/apply-pdf.php';

$pdfBytes = sec_build_application_pdf($answers, [
    'received'      => date('M j, Y 	 g:i a'),
    'signedOn'      => date('F j, Y'),
    'ip'            => $ip,
    'resume'        => $resumeAttachment['name'] ?? '',
    'signaturePath' => $sigPath,
]);

if ($sigPath) { @unlink($sigPath); }

// keep a server-side copy alongside the log
if (!is_dir(APPLICATION_DIR)) { @mkdir(APPLICATION_DIR, 0700); }
@file_put_contents(APPLICATION_DIR . '/' . $pdfName, $pdfBytes);

// ---------------------------------------------------------------- send it
$brevoKey = is_readable(BREVO_KEY_FILE) ? trim((string) file_get_contents(BREVO_KEY_FILE)) : '';
if ($brevoKey === '') {
    error_log('apply.php: Brevo key missing at ' . BREVO_KEY_FILE);
    respond(503, ['ok' => false, 'error' =>
        'We saved your application but could not email it just yet. Please call (731) 660-5980 so we can confirm it reached us.']);
}

$summary = "New employment application from the website\n"
         . str_repeat('-', 52) . "\n\n"
         . "Applicant: {$applicant}\n"
         . "Position:  " . ($position !== '' ? $position : '(not given)') . "\n"
         . "Email:     {$email}\n"
         . "Phone:     " . ($phone !== '' ? $phone : '(not given)') . "\n\n"
         . "The completed application is attached as a PDF.\n"
         . $resumeNote . "\n"
         . "Reply to this email to answer the applicant directly.\n\n"
         . str_repeat('-', 52) . "\n"
         . 'Received: ' . date('Y-m-d H:i:s T') . "\nIP: {$ip}\n";

$payload = [
    'sender'      => ['name' => 'Southern Electric & Controls', 'email' => MAIL_FROM],
    'to'          => array_map(static fn($a) => ['email' => $a], MAIL_TO),
    'replyTo'     => ['email' => $email, 'name' => $applicant],
    'subject'     => '[Application] ' . $applicant . ($position !== '' ? ' - ' . $position : ''),
    'textContent' => $summary,
    'attachment'  => array_values(array_filter([
        ['content' => base64_encode($pdfBytes), 'name' => $pdfName],
        $resumeAttachment,
    ])),
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_HTTPHEADER     => [
        'accept: application/json',
        'content-type: application/json',
        'api-key: ' . $brevoKey,
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
]);
$response = curl_exec($ch);
$status   = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($status !== 201) {
    error_log('apply.php brevo failed: http=' . $status . ' curl=' . $curlErr
              . ' body=' . substr((string) $response, 0, 300));
    respond(500, ['ok' => false, 'error' =>
        'We saved your application but the email did not go through. Please call (731) 660-5980 so we can confirm it reached us.']);
}

$hits[] = time();
@file_put_contents($file, json_encode(array_values($hits)));

respond(200, ['ok' => true]);
