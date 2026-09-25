<?php
/**
 * Contact form handler - southernelectric.net
 *
 * Replaces the Formspree endpoint. Runs on the same GoDaddy cPanel hosting
 * as the site, so there is no third party and no monthly submission cap.
 *
 * DELIVERABILITY NOTE: the domain's SPF record is
 *     v=spf1 a:dispatch-us.ppe-hosted.com include:secureserver.net -all
 * "include:secureserver.net" authorises this GoDaddy server, and "-all" is a
 * hard fail for anything else. So the From address and the envelope sender
 * (-f) MUST stay on @southernelectric.net or the mail will be rejected.
 * The visitor's address goes in Reply-To, never in From.
 */

declare(strict_types=1);

// ---------------------------------------------------------------- settings
// Both addresses receive every inquiry, so one person being out never
// means a lost lead. Add or remove entries freely.
const MAIL_TO = [
    'mason@southernelectric.net',
    'kevin@southernelectric.net',
    'clint@ice-electric.com',
    'info@southernelectric.net',
];
// Sent from a real, monitored mailbox rather than noreply@. No-reply
// addresses are weighted heavily as bulk mail by filters like Proofpoint,
// and noreply@ is not even a real mailbox on this domain.
const MAIL_FROM = 'info@southernelectric.net';        // must be a VERIFIED sender in Brevo
const SUBMISSION_LOG = __DIR__ . '/submissions.log';  // gitignored + htaccess-denied
// The Brevo API key is deliberately NOT in this file. This repository is
// public on GitHub, and a committed key would be scraped and abused within
// hours. It lives in brevo.key beside this script, which is:
//   * listed in .gitignore, so it is never committed
//   * denied in .htaccess, so it cannot be fetched over HTTP
const BREVO_KEY_FILE = __DIR__ . '/brevo.key';
const SITE_NAME = 'Southern Electric & Controls';
const MAX_PER_HOUR = 4;                              // per IP
const SPAM_LOG     = __DIR__ . '/spam.log';          // gitignored + htaccess-denied
const MIN_FILL_SECONDS = 4;                          // nobody types a real enquiry faster

// ---------------------------------------------------------------- helpers
function respond(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}
/** Strip CR/LF so a submitted value can never inject mail headers. */
function clean(string $v, int $max = 500): string {
    $v = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v);
    return trim(mb_substr($v, 0, $max));
}

// ---------------------------------------------------------------- guards
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// ---------------------------------------------------------------- spam gate
// Added 2026-09-25 after a run of Russian link spam. A bot that POSTs straight
// to this script never sees the page, so it never fills the honeypot and never
// gets a timestamp: the checks below catch exactly that. Anything rejected is
// written to spam.log first, so a false positive can still be recovered.
function logSpam(string $reason, array $post): void {
    @file_put_contents(SPAM_LOG, json_encode([
        'at'      => date('c'),
        'reason'  => $reason,
        'ip'      => preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? ''),
        'agent'   => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
        'referer' => substr((string)($_SERVER['HTTP_REFERER'] ?? ''), 0, 200),
        'post'    => array_map(static fn($v) => is_string($v) ? substr($v, 0, 800) : $v, $post),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
}
/** Quietly accept, so the bot marks it delivered and moves on. */
function swallow(string $reason): void {
    logSpam($reason, $_POST);
    respond(200, ['ok' => true]);
}

// 1. Honeypots. Real people never see these fields. Note the odd names:
//    a field called "website" or "url" can be filled by a browser's autofill,
//    which would silently swallow a genuine enquiry.
if (trim((string)($_POST['_gotcha'] ?? '')) !== '')  { swallow('honeypot:_gotcha'); }
if (trim((string)($_POST['_hp_url'] ?? '')) !== '')  { swallow('honeypot:_hp_url'); }

// 2. The submission has to come from our own page.
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
if ($origin === '' || !preg_match('~^https?://(www\.)?southernelectric\.net~i', $origin)) {
    swallow('bad-origin:' . substr($origin, 0, 80));
}

// 3. How long the visitor had the page open before submitting. The page
//    measures this ITSELF and sends the number of seconds: comparing a
//    browser clock against the server clock is unreliable, because plenty of
//    computers are minutes out and their submissions would look instant.
$elapsed = (int)($_POST['_elapsed'] ?? -1);
if ($elapsed < MIN_FILL_SECONDS || $elapsed > 86400) {
    swallow('timing:' . $elapsed);
}

// 4. Work out what the message actually contains, once, for the two checks
//    below: how many links it carries and whether it is written in Cyrillic.
$blob = strtolower(implode(' ', [
    (string)($_POST['name'] ?? ''), (string)($_POST['subject'] ?? ''),
    (string)($_POST['message'] ?? ''), (string)($_POST['phone'] ?? ''),
]));
$links = preg_match_all('~https?://|www\.|\[url|\]\(http~i', $blob);
$cyrillic = preg_match('/\p{Cyrillic}/u', $blob);

// 4. Sales pitches. Scored rather than a straight keyword block, because one
//    word means nothing: a real customer might say "we are a marketing firm
//    that needs an electrician". Two or three of these together is a pitch.
//    Tune by watching spam.log, which records the score and the hits.
const SOLICIT_STRONG = [
    'seo', 'search engine optimi', 'backlink', 'link building', 'guest post',
    'web design', 'website design', 'redesign your website', 'website audit',
    'digital marketing', 'social media marketing', 'smm panel', 'ppc campaign',
    'lead generation', 'b2b leads', 'email marketing', 'outsourcing',
    'offshore develop', 'app development', 'software development team',
    'crypto', 'bitcoin', 'forex', 'investment opportunity', 'loan offer',
    'casino', 'viagra', 'escort', 'sell you', 'our pricing starts',
];
const SOLICIT_WEAK = [
    'i came across your website', 'i visited your website', 'i was browsing your',
    'your website could', 'first page of google', 'rank higher', 'more traffic',
    'increase your sales', 'grow your business', 'boost your', 'we specialize in',
    'we offer', 'our services include', 'free trial', 'no obligation',
    'limited time offer', 'click here', 'unsubscribe', 'dear sir', 'dear madam',
    'reply stop', 'let me know if you are interested', 'schedule a call',
    'partnership opportunity', 'special discount',
];
$score = 0; $hits = [];
// strpos, not str_contains: this GoDaddy plan runs PHP 7.4 and str_contains
// is 8.0+. It fataled with a 500 in production before this was caught.
foreach (SOLICIT_STRONG as $term) {
    if (strpos($blob, $term) !== false) { $score += 2; $hits[] = $term; }
}
foreach (SOLICIT_WEAK as $term) {
    if (strpos($blob, $term) !== false) { $score += 1; $hits[] = $term; }
}
// A link plus any sales language at all is a pitch.
if ($links >= 1 && $score >= 1) { $score += 2; }
if ($score >= 3) {
    logSpam('solicitation:score=' . $score . ',hits=' . implode('|', array_slice($hits, 0, 6)), $_POST);
    respond(422, ['ok' => false, 'error' =>
        'This form is for customer and project enquiries only, and it does not accept sales or marketing offers. '
      . 'If you are a customer and this was blocked by mistake, please call (731) 660-5980.']);
}

// 5. Content that reads like link spam rather than an enquiry.
$namedLink = preg_match('~https?://|www\.~i', (string)($_POST['name'] ?? ''));
if ($links >= 2 || $cyrillic || $namedLink) {
    logSpam('content:links=' . $links . ',cyrillic=' . (int)$cyrillic . ',namelink=' . (int)$namedLink, $_POST);
    respond(422, ['ok' => false, 'error' =>
        'Our spam filter blocked that message. If it was genuine, please call (731) 660-5980 and we will take the details.']);
}

// Crude per-IP rate limit. Keeps a burst from turning into an inbox flood.
$ip   = preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
$file = sys_get_temp_dir() . '/sec_contact_' . md5($ip);
$hits = [];
if (is_readable($file)) {
    $hits = array_filter(
        (array)json_decode((string)file_get_contents($file), true),
        static fn($t) => is_int($t) && $t > time() - 3600
    );
}
if (count($hits) >= MAX_PER_HOUR) {
    respond(429, ['ok' => false, 'error' => 'Too many messages. Please call us instead.']);
}

// ---------------------------------------------------------------- validate
$name    = clean((string)($_POST['name'] ?? ''), 120);
$email   = clean((string)($_POST['email'] ?? ''), 190);
$phone   = clean((string)($_POST['phone'] ?? ''), 60);
$subject = clean((string)($_POST['subject'] ?? ''), 160);
$message = trim((string)($_POST['message'] ?? ''));
$message = mb_substr(str_replace("\r\n", "\n", $message), 0, 8000);

if ($name === '' || $subject === '' || $message === '') {
    respond(422, ['ok' => false, 'error' => 'Please fill in every required field.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'That email address does not look right.']);
}

// ---------------------------------------------------------------- send
$body = "New message from the " . SITE_NAME . " website\n"
      . str_repeat('-', 52) . "\n\n"
      . "Name:    {$name}\n"
      . "Email:   {$email}\n"
      . "Phone:   " . ($phone !== '' ? $phone : '(not given)') . "\n"
      . "Subject: {$subject}\n\n"
      . "Message:\n{$message}\n\n"
      . str_repeat('-', 52) . "\n"
      . "Sent: " . date('Y-m-d H:i:s T') . "\n"
      . "IP:   {$ip}\n";

// --- send via the Brevo HTTPS API -----------------------------------
// NOT SMTP. Every outbound SMTP port is blocked on this GoDaddy shared
// plan - verified 2026-09-09 against ports 25, 465 and 587 to our own MX,
// Microsoft, Google and Brevo; all timed out. Their localhost:25 relay
// connects and returns 250, then silently discards the message. Port 443
// is the only way off this host, so we post to Brevo's API instead.
// Record every submission on the server BEFORE trying to send. Mail can be
// filtered downstream (Proofpoint has been swallowing these), so the log is
// the durable record - a filtered email becomes an inconvenience, not a lost
// lead. One JSON object per line.
@file_put_contents(SUBMISSION_LOG, json_encode([
    'at'      => date('c'),
    'name'    => $name,
    'email'   => $email,
    'phone'   => $phone,
    'subject' => $subject,
    'message' => $message,
    'ip'      => $ip,
], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);

$brevoKey = is_readable(BREVO_KEY_FILE) ? trim((string) file_get_contents(BREVO_KEY_FILE)) : '';
if ($brevoKey === '') {
    error_log('contact.php: Brevo key missing or unreadable at ' . BREVO_KEY_FILE);
    respond(503, ['ok' => false, 'error' =>
        'Our web form is temporarily unavailable. Please call (731) 660-5980 or email info@southernelectric.net and we will get right back to you.']);
}

$payload = [
    'sender'      => ['name' => SITE_NAME, 'email' => MAIL_FROM],
    'to'          => array_map(static fn($a) => ['email' => $a], MAIL_TO),
    'replyTo'     => ['email' => $email, 'name' => $name],
    'subject'     => '[Website] ' . $subject,
    'textContent' => $body,
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
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

// Brevo returns 201 Created on success.
$sent = ($status === 201);
if (!$sent) {
    error_log('contact.php brevo failed: http=' . $status . ' curl=' . $curlErr . ' body=' . substr((string)$response, 0, 300));
}

if (!$sent) {
    error_log('contact.php: send failed for ' . $email);
    respond(500, ['ok' => false, 'error' => 'Could not send. Please call us.']);
}

$hits[] = time();
@file_put_contents($file, json_encode(array_values($hits)));

respond(200, ['ok' => true]);
