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
const MAIL_FROM = 'noreply@southernelectric.net';    // must stay on-domain (SPF)
const SITE_NAME = 'Southern Electric & Controls';
const MAX_PER_HOUR = 8;                              // per IP

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

// Honeypot: bots fill hidden fields. Report success so they don't retry.
if (trim((string)($_POST['_gotcha'] ?? '')) !== '') {
    respond(200, ['ok' => true]);
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

$headers = [
    'From: ' . SITE_NAME . ' <' . MAIL_FROM . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'Content-Type: text/plain; charset=utf-8',
    'X-Mailer: sec-site',
];

$sent = mail(
    implode(', ', MAIL_TO),
    '[Website] ' . $subject,
    $body,
    implode("\r\n", $headers),
    '-f' . MAIL_FROM          // envelope sender, so SPF checks pass
);

if (!$sent) {
    error_log('contact.php: mail() failed for ' . $email);
    respond(500, ['ok' => false, 'error' => 'Could not send. Please call us.']);
}

$hits[] = time();
@file_put_contents($file, json_encode(array_values($hits)));

respond(200, ['ok' => true]);
