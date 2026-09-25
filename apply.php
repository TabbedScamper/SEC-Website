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
];
const MAIL_FROM      = 'info@southernelectric.net';   // verified sender in Brevo
const BREVO_KEY_FILE = __DIR__ . '/brevo.key';
const APPLICATION_LOG = __DIR__ . '/applications.log';   // .htaccess-denied
const APPLICATION_DIR = __DIR__ . '/applications';       // .htaccess-denied
const MAX_PER_HOUR   = 5;                                // per IP
const SPAM_LOG       = __DIR__ . '/spam.log';            // shared with contact.php
const MAX_BODY       = 900000;                           // ~900 KB incl. signature

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
/** FPDF core fonts are Latin-1 only; keep the text readable if someone
 *  types a curly quote or an accent. */
function pdfText(string $s): string {
    $s = str_replace(
        ["\u{2018}", "\u{2019}", "\u{201C}", "\u{201D}", "\u{2013}", "\u{2014}", "\u{2026}"],
        ["'", "'", '"', '"', '-', '-', '...'],
        $s
    );
    $out = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $s);
    return $out === false ? $s : $out;
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

// apply.js stamps the page load. Nobody fills a 35-question form in seconds.
$stamp   = (int) ($data['startedAt'] ?? 0);
$elapsed = $stamp > 0 ? (int) floor((microtime(true) * 1000 - $stamp) / 1000) : -1;
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
require __DIR__ . '/vendor/fpdf/fpdf.php';

class ApplicationPDF extends FPDF {
    public string $applicantName = '';
    function Header() {
        $logo = __DIR__ . '/assets/images/logos/sec-logo-pdf.png';
        if (is_readable($logo)) { $this->Image($logo, 15, 11, 34); }
        $this->SetFont('Helvetica', 'B', 15);
        $this->SetXY(54, 13);
        $this->Cell(0, 6, 'APPLICATION FOR EMPLOYMENT', 0, 1, 'L');
        $this->SetFont('Helvetica', '', 8.5);
        $this->SetXY(54, 20);
        $this->SetTextColor(90, 90, 96);
        $this->Cell(0, 5, 'Southern Electric & Controls  |  86 Volunteer Blvd, Jackson, TN 38305  |  (731) 660-5980', 0, 1, 'L');
        $this->SetTextColor(0, 0, 0);
        $this->SetDrawColor(216, 30, 38);
        $this->SetLineWidth(0.9);
        $this->Line(15, 30, 195, 30);
        $this->SetLineWidth(0.2);
        $this->SetY(36);
    }
    function Footer() {
        $this->SetY(-14);
        $this->SetFont('Helvetica', '', 7.5);
        $this->SetTextColor(120, 120, 128);
        $this->Cell(0, 5, pdfText($this->applicantName) . '  |  An equal opportunity employer', 0, 0, 'L');
        $this->Cell(0, 5, 'Page ' . $this->PageNo() . '/{nb}', 0, 0, 'R');
        $this->SetTextColor(0, 0, 0);
    }
    function SectionTitle(string $t): void {
        if ($this->GetY() > 250) { $this->AddPage(); }
        $this->Ln(3);
        $this->SetFont('Helvetica', 'B', 10);
        $this->SetFillColor(216, 30, 38);
        $this->SetTextColor(255, 255, 255);
        $this->Cell(0, 7, '  ' . pdfText(strtoupper($t)), 0, 1, 'L', true);
        $this->SetTextColor(0, 0, 0);
        $this->Ln(1.5);
    }
    function Row(string $label, string $value): void {
        $label = pdfText($label);
        $value = pdfText($value !== '' ? $value : '-');
        $this->SetFont('Helvetica', '', 8);
        $this->SetTextColor(105, 105, 112);
        $lines = max(1, (int) ceil($this->GetStringWidth($value) / 118));
        $h = 5 * $lines;
        if ($this->GetY() + $h > 268) { $this->AddPage(); }
        $y = $this->GetY();
        $this->SetXY(15, $y);
        $this->MultiCell(58, 5, $label, 0, 'L');
        $endLabel = $this->GetY();
        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Helvetica', '', 9.5);
        $this->SetXY(73, $y);
        $this->MultiCell(122, 5, $value, 0, 'L');
        $this->SetY(max($endLabel, $this->GetY()) + 0.8);
        $this->SetDrawColor(224, 224, 230);
        $this->Line(15, $this->GetY(), 195, $this->GetY());
        $this->Ln(1.2);
    }
}

$pdf = new ApplicationPDF('P', 'mm', 'Letter');
$pdf->applicantName = $applicant;
$pdf->AliasNbPages();
$pdf->SetAutoPageBreak(true, 18);
$pdf->SetTitle('SEC Application - ' . $applicant);
$pdf->AddPage();

// summary strip
$pdf->SetFont('Helvetica', 'B', 12);
$pdf->Cell(0, 6, pdfText($applicant), 0, 1);
$pdf->SetFont('Helvetica', '', 9.5);
$pdf->SetTextColor(90, 90, 96);
$pdf->Cell(0, 5, pdfText(($position !== '' ? 'Applying for: ' . $position . '   |   ' : '')
    . 'Received ' . date('M j, Y \a\t g:i a')), 0, 1);
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(1);

// every answer, in the order the applicant saw them
$currentSection = '';
$currentGroup   = '';
foreach ($data['fields'] as $f) {
    if (!is_array($f)) continue;
    $section = clean((string) ($f['section'] ?? ''), 80);
    $group   = clean((string) ($f['group'] ?? ''), 80);
    $label   = clean((string) ($f['label'] ?? ''), 120);
    $value   = clean((string) ($f['value'] ?? ''), 2000);
    if ($label === '') $label = 'Answer';
    $heading = $group !== '' ? ($section . ' - ' . $group) : $section;
    if ($heading !== $currentSection . $currentGroup) {
        $pdf->SectionTitle($heading);
        $currentSection = $section;
        $currentGroup   = $group;
    }
    $pdf->Row($label, $value);
}

// authorization + signature
$pdf->SectionTitle('Authorization');
$pdf->SetFont('Helvetica', '', 8);
$pdf->MultiCell(180, 4.2, pdfText(
    'I certify that the facts contained in this application are true and complete to the best of my knowledge '
  . 'and understand that, if employed, falsified statements on this application shall be grounds for dismissal. '
  . 'I authorize investigation of all statements contained herein and the references and employers listed above '
  . 'to give any and all information concerning my previous employment and any pertinent information they may '
  . 'have, and release the company from all liability for any damage that may result. I understand that no '
  . 'representative of the company has authority to enter into any agreement for employment for any specified '
  . 'period of time unless in writing and signed by an authorized company representative. This waiver does not '
  . 'permit the release or use of disability-related or medical information in a manner prohibited by the '
  . 'Americans with Disabilities Act (ADA) and other relevant federal and state laws.'), 0, 'L');
$pdf->Ln(3);
$pdf->SetFont('Helvetica', 'B', 9);
$pdf->Cell(0, 5, 'Agreed and signed electronically: ' . pdfText($applicant), 0, 1);
$pdf->SetFont('Helvetica', '', 8.5);
$pdf->SetTextColor(105, 105, 112);
$pdf->Cell(0, 5, 'Signed ' . date('M j, Y \a\t g:i a') . '  |  IP ' . $ip, 0, 1);
$pdf->SetTextColor(0, 0, 0);
if ($sigPath && is_readable($sigPath)) {
    $pdf->Ln(1);
    $pdf->Image($sigPath, 15, $pdf->GetY(), 70);
    $pdf->Ln(26);
    $pdf->SetDrawColor(120, 120, 128);
    $pdf->Line(15, $pdf->GetY(), 95, $pdf->GetY());
    $pdf->SetFont('Helvetica', '', 7.5);
    $pdf->Cell(0, 5, 'Applicant signature', 0, 1);
}

$pdfBytes = $pdf->Output('S');
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
         . "Reply to this email to answer the applicant directly.\n\n"
         . str_repeat('-', 52) . "\n"
         . 'Received: ' . date('Y-m-d H:i:s T') . "\nIP: {$ip}\n";

$payload = [
    'sender'      => ['name' => 'Southern Electric & Controls', 'email' => MAIL_FROM],
    'to'          => array_map(static fn($a) => ['email' => $a], MAIL_TO),
    'replyTo'     => ['email' => $email, 'name' => $applicant],
    'subject'     => '[Application] ' . $applicant . ($position !== '' ? ' - ' . $position : ''),
    'textContent' => $summary,
    'attachment'  => [[
        'content' => base64_encode($pdfBytes),
        'name'    => $pdfName,
    ]],
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
