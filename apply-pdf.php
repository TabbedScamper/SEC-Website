<?php
/**
 * Builds the SEC employment application as a PDF.
 *
 * This is a deliberate 1:1 of the form the applicant signs off on screen
 * (js/apply-doc.js): same sections in the same order, same labels, the same
 * boxed grid, the same ticked YES/NO boxes. It is rendered from the answers
 * map rather than from a flat list of fields, which is what made the first
 * version print "Street address / Apt no. / City / State / ZIP" three times
 * over with no way to tell the present address from the permanent one.
 */

declare(strict_types=1);

require_once __DIR__ . '/vendor/fpdf/fpdf.php';

/**
 * FPDF core fonts are Latin-1. Strip the invisible formatting characters that
 * phone keyboards slip into a field first: a bidi mark left in a phone number
 * transliterated to "?" and shipped as "?+1 (945) 432-4608?".
 */
function sec_pdf_text(string $s): string {
    $s = preg_replace('/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', '', $s) ?? $s;
    $s = str_replace(
        ["\u{2018}", "\u{2019}", "\u{201C}", "\u{201D}", "\u{2013}", "\u{2014}", "\u{2026}", "\u{00A0}"],
        ["'", "'", '"', '"', '-', '-', '...', ' '],
        $s
    );
    $out = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $s);
    if ($out === false) {
        $out = preg_replace('/[^\x20-\x7E]/', '', $s) ?? $s;
    }
    return trim(str_replace('?', '', $out)) === '' ? '' : $out;
}

class SecApplicationPDF extends FPDF {
    public string $applicantName = '';
    public float $contentW = 0;

    const MARGIN = 12.0;
    const RED = [216, 30, 38];

    function Header(): void {
        $logo = __DIR__ . '/assets/images/logos/sec-logo-pdf.png';
        if (is_readable($logo)) { $this->Image($logo, self::MARGIN, 10, 30); }
        $this->SetFont('Helvetica', 'B', 14);
        $this->SetXY(self::MARGIN + 34, 11.5);
        $this->Cell(0, 6, 'APPLICATION FOR EMPLOYMENT', 0, 1, 'L');
        $this->SetFont('Helvetica', '', 8);
        $this->SetXY(self::MARGIN + 34, 18);
        $this->SetTextColor(90, 90, 96);
        $this->Cell(0, 4, 'Pre-employment questionnaire  |  An equal opportunity employer', 0, 1, 'L');
        $this->SetXY(self::MARGIN + 34, 22.5);
        $this->Cell(0, 4, '86 Volunteer Blvd, Jackson, TN 38305  |  (731) 660-5980', 0, 1, 'L');
        $this->SetTextColor(0, 0, 0);
        $this->SetDrawColor(...self::RED);
        $this->SetLineWidth(0.8);
        $this->Line(self::MARGIN, 28, self::MARGIN + $this->contentW, 28);
        $this->SetLineWidth(0.2);
        $this->SetDrawColor(30, 30, 30);
        $this->SetY(33);
    }

    function Footer(): void {
        $this->SetY(-13);
        $this->SetFont('Helvetica', '', 7);
        $this->SetTextColor(120, 120, 128);
        $this->Cell(0, 5, sec_pdf_text($this->applicantName) . '  |  An equal opportunity employer', 0, 0, 'L');
        $this->Cell(0, 5, 'Page ' . $this->PageNo() . '/{nb}', 0, 0, 'R');
        $this->SetTextColor(0, 0, 0);
    }

    /** Red section bar, as on screen. */
    function SectionBar(string $title): void {
        $this->Space(11);
        $this->SetFont('Helvetica', 'B', 9);
        $this->SetFillColor(...self::RED);
        $this->SetTextColor(255, 255, 255);
        $this->Cell($this->contentW, 6.5, '  ' . strtoupper(sec_pdf_text($title)), 0, 1, 'L', true);
        $this->SetTextColor(0, 0, 0);
    }

    function Note(string $text): void {
        $this->SetFont('Helvetica', 'I', 7.5);
        $this->SetTextColor(105, 105, 112);
        $this->MultiCell($this->contentW, 4, sec_pdf_text($text), 0, 'L');
        $this->SetTextColor(0, 0, 0);
        $this->Ln(1);
    }

    /** Start a new page if less than $need mm is left. */
    function Space(float $need): void {
        if ($this->GetY() + $need > $this->h - 16) { $this->AddPage(); }
    }

    /**
     * How many lines a string takes in a box of $textW mm.
     * $textW must be the width MultiCell will actually use for text, which is
     * the width passed to it MINUS FPDF's own cell padding on both sides. Miss
     * that and a label wraps in the output while the planner thinks it did
     * not, and the value below it gets printed on top of the second line.
     */
    private function wrapLines(string $text, float $textW, float $size): array {
        $this->SetFont('Helvetica', '', $size);
        $words = preg_split('/\s+/', $text) ?: [];
        $lines = []; $line = '';
        foreach ($words as $word) {
            $try = $line === '' ? $word : $line . ' ' . $word;
            if ($this->GetStringWidth($try) > $textW && $line !== '') { $lines[] = $line; $line = $word; }
            else { $line = $try; }
        }
        if ($line !== '') { $lines[] = $line; }
        return $lines ?: [''];
    }

    /**
     * One row of labelled boxes.
     * $cells: [['label', 'value', span], ...] with spans out of 6.
     * Types: 'text' (default), 'yesno'.
     */
    function Row(array $cells, float $minH = 11.0): void {
        $unit = $this->contentW / 6;

        // Measure the LABEL as well as the value. A label that wraps to two
        // lines needs the extra room, otherwise the ticks underneath it end up
        // printed over the wrapped text.
        $plan = [];
        $h = $minH;
        foreach ($cells as $c) {
            $span = $c[2] ?? 1;
            $type = $c[3] ?? 'text';
            $w = $unit * $span;
            $textW = $w - 3 - (2 * $this->cMargin);   // what MultiCell really gets
            $this->SetFont('Helvetica', '', 6);
            $labelLines = count($this->wrapLines(strtoupper(sec_pdf_text((string)$c[0])), $textW, 6));
            $valueLines = $type === 'yesno' ? 0 : count($this->wrapLines(sec_pdf_text((string)$c[1]), $textW, 9));
            $need = 1.4 + ($labelLines * 2.9) + ($type === 'yesno' ? 6.4 : ($valueLines * 4.1) + 1.6);
            if ($need > $h) { $h = $need; }
            $plan[] = [$c, $w, $type, $labelLines];
        }

        $this->Space($h + 2);
        $x = self::MARGIN; $y = $this->GetY();

        foreach ($plan as [$c, $w, $type, $labelLines]) {
            $label = (string)$c[0];
            $value = (string)$c[1];

            $this->SetDrawColor(30, 30, 30);
            $this->Rect($x, $y, $w, $h);

            $this->SetFont('Helvetica', '', 6);
            $this->SetTextColor(105, 105, 112);
            $this->SetXY($x + 1.6, $y + 1.2);
            $this->MultiCell($w - 3, 2.9, strtoupper(sec_pdf_text($label)), 0, 'L');

            $below = $y + 1.4 + ($labelLines * 2.9);   // always clear of the label
            if ($type === 'yesno') {
                $this->TickPair($x + 1.6, $below + 1.0, $value);
            } else {
                $this->SetFont('Helvetica', '', 9);
                $this->SetTextColor(0, 0, 0);
                $this->SetXY($x + 1.6, $below + 0.4);
                $this->MultiCell($w - 3, 4.1, sec_pdf_text($value), 0, 'L');
            }
            $x += $w;
        }
        $this->SetXY(self::MARGIN, $y + $h);
    }

    /** YES [x]  NO [ ] pair, the ticked one filled red. */
    function TickPair(float $x, float $y, string $value): void {
        foreach ([['YES', $value === 'Yes'], ['NO', $value === 'No']] as $i => [$word, $on]) {
            $bx = $x + ($i * 16);
            $this->SetDrawColor(30, 30, 30);
            if ($on) {
                $this->SetFillColor(...self::RED);
                $this->Rect($bx, $y, 3.6, 3.6, 'DF');
                $this->SetFont('ZapfDingbats', '', 6);
                $this->SetTextColor(255, 255, 255);
                $this->SetXY($bx - 0.1, $y - 0.4);
                $this->Cell(4, 4.4, chr(52), 0, 0, 'C');   // check mark
            } else {
                $this->Rect($bx, $y, 3.6, 3.6);
            }
            $this->SetFont('Helvetica', '', 7.5);
            $this->SetTextColor(0, 0, 0);
            $this->SetXY($bx + 4.4, $y - 0.6);
            $this->Cell(10, 4.6, $word, 0, 0, 'L');
        }
    }

    /** A tick in a list, e.g. how they heard about the position. */
    function CheckItem(float $x, float $y, string $label, bool $on, float $w): void {
        $this->SetDrawColor(30, 30, 30);
        if ($on) {
            $this->SetFillColor(...self::RED);
            $this->Rect($x, $y, 3.2, 3.2, 'DF');
            $this->SetFont('ZapfDingbats', '', 5.5);
            $this->SetTextColor(255, 255, 255);
            $this->SetXY($x - 0.2, $y - 0.5);
            $this->Cell(3.8, 4, chr(52), 0, 0, 'C');
        } else {
            $this->Rect($x, $y, 3.2, 3.2);
        }
        $this->SetFont('Helvetica', '', 7.5);
        $this->SetTextColor(0, 0, 0);
        $this->SetXY($x + 4.2, $y - 0.8);
        $this->Cell($w - 5, 4.4, sec_pdf_text($label), 0, 0, 'L');
    }

    function TableHead(array $cols): void {
        $this->Space(16);
        $this->SetFont('Helvetica', 'B', 7);
        $this->SetFillColor(20, 20, 24);
        $this->SetTextColor(255, 255, 255);
        $x = self::MARGIN; $y = $this->GetY();
        foreach ($cols as $col) {
            [$title, $w] = [$col[0], $col[1]];
            $this->SetXY($x, $y);
            $this->Cell($w, 6, ' ' . strtoupper(sec_pdf_text($title)), 0, 0, 'L', true);
            $x += $w;
        }
        $this->SetTextColor(0, 0, 0);
        $this->SetXY(self::MARGIN, $y + 6);
    }

    function TableRow(array $cells, float $minH = 8.0): void {
        $h = $minH;
        foreach ($cells as $cell) {
            [$text, $w] = [$cell[0], $cell[1]];
            $lines = count($this->wrapLines(sec_pdf_text((string)$text), $w - 2.8 - (2 * $this->cMargin), 8.5));
            $need = ($lines * 4.0) + 3.0;
            if ($need > $h) { $h = $need; }
        }
        $this->Space($h + 2);
        $x = self::MARGIN; $y = $this->GetY();
        foreach ($cells as $cell) {
            [$text, $w] = [$cell[0], $cell[1]];
            $align = $cell[2] ?? 'L';
            $this->SetDrawColor(30, 30, 30);
            $this->Rect($x, $y, $w, $h);
            $this->SetFont('Helvetica', '', 8.5);
            $this->SetXY($x + 1.4, $y + 1.6);
            $this->MultiCell($w - 2.8, 4, sec_pdf_text((string)$text), 0, $align);
            $x += $w;
        }
        $this->SetXY(self::MARGIN, $y + $h);
    }
}

/**
 * @param array  $a       the answers map, exactly as the review screen uses it
 * @param array  $meta    ['received' => string, 'resume' => string, 'ip' => string]
 * @return string raw PDF bytes
 */
function sec_build_application_pdf(array $a, array $meta): string {
    $get = static function (string $k) use ($a): string {
        $v = $a[$k] ?? '';
        if (is_array($v)) { return implode(', ', $v); }
        if (is_bool($v)) { return $v ? 'Yes' : 'No'; }
        return trim((string)$v);
    };
    $any = static function (array $keys) use ($get): bool {
        foreach ($keys as $k) { if ($get($k) !== '') { return true; } }
        return false;
    };

    $pdf = new SecApplicationPDF('P', 'mm', 'Letter');
    $pdf->contentW = $pdf->GetPageWidth() - (SecApplicationPDF::MARGIN * 2);
    $pdf->applicantName = trim($get('firstName') . ' ' . $get('lastName'));
    $pdf->SetMargins(SecApplicationPDF::MARGIN, 33, SecApplicationPDF::MARGIN);
    $pdf->SetAutoPageBreak(true, 16);
    $pdf->AliasNbPages();
    $pdf->SetTitle('SEC Application - ' . $pdf->applicantName);
    $pdf->AddPage();

    // ---- who and when ----
    $pdf->SetFont('Helvetica', 'B', 12);
    $pdf->Cell(0, 6, sec_pdf_text($pdf->applicantName), 0, 1);
    $pdf->SetFont('Helvetica', '', 9);
    $pdf->SetTextColor(90, 90, 96);
    $line = ($get('position') !== '' ? 'Applying for: ' . $get('position') . '   |   ' : '')
          . 'Received ' . ($meta['received'] ?? '');
    $pdf->Cell(0, 4.6, sec_pdf_text($line), 0, 1);
    if (!empty($meta['resume'])) {
        $pdf->Cell(0, 4.6, sec_pdf_text('Resume attached: ' . $meta['resume']), 0, 1);
    }
    $pdf->SetTextColor(0, 0, 0);

    // ---- personal information ----
    $pdf->SectionBar('Personal information');
    $name = implode(', ', array_filter([$get('lastName'), $get('firstName'), $get('middleName')]));
    $pdf->Row([['Name (last name first)', $name, 4], ['Email', $get('email'), 2]]);
    $pdf->Row([['Present address', $get('presentStreet'), 3], ['Apt no.', $get('presentApt'), 1],
               ['City', $get('presentCity'), 1],
               ['State / ZIP', trim($get('presentState') . ' ' . $get('presentZip')), 1]]);
    if ($any(['permanentStreet', 'permanentCity', 'permanentZip'])) {
        $pdf->Row([['Permanent address', $get('permanentStreet'), 3], ['Apt no.', $get('permanentApt'), 1],
                   ['City', $get('permanentCity'), 1],
                   ['State / ZIP', trim($get('permanentState') . ' ' . $get('permanentZip')), 1]]);
    }
    if ($any(['previousStreet', 'previousCity', 'previousZip'])) {
        $pdf->Row([['Previous address if less than 3 years', $get('previousStreet'), 3],
                   ['Apt no.', $get('previousApt'), 1], ['City', $get('previousCity'), 1],
                   ['State / ZIP', trim($get('previousState') . ' ' . $get('previousZip')), 1]]);
    }
    $pdf->Row([['Phone', $get('phone'), 2], ['Cell phone', $get('cellPhone'), 2],
               ['18 years or older?', $get('is18'), 1, 'yesno'],
               ['Authorized to work in the US?', $get('authorized'), 1, 'yesno']]);
    $pdf->Row([['Emergency contact', $get('emergencyName'), 3], ['Emergency phone', $get('emergencyPhone'), 3]]);

    // ---- desired employment ----
    $pdf->SectionBar('Desired employment');
    $pdf->Row([['Position', $get('position'), 3], ['Date you can start', $get('startDate'), 2],
               ['Salary desired', $get('salaryDesired'), 1]]);
    $pdf->Row([['Are you employed now?', $get('employedNow'), 3, 'yesno'],
               ['If so, may we inquire of your present employer?', $get('mayInquire'), 3, 'yesno']]);
    $pdf->Row([['Ever applied to this company before?', $get('appliedBefore'), 2, 'yesno'],
               ['Where?', $get('appliedBeforeWhere'), 2], ['When?', $get('appliedBeforeWhen'), 2]]);
    $pdf->Row([['Ever worked for this company before?', $get('workedBefore'), 2, 'yesno'],
               ['Where?', $get('workedBeforeWhere'), 2], ['When?', $get('workedBeforeWhen'), 2]]);
    if ($any(['workedBeforeReason', 'lastSupervisorHere'])) {
        $pdf->Row([['Reason for leaving', $get('workedBeforeReason'), 3],
                   ['Name of last supervisor at this company', $get('lastSupervisorHere'), 3]]);
    }

    // how they heard: ticks in two rows of four, inside one box
    $chosen = is_array($a['howFound'] ?? null) ? $a['howFound'] : [];
    $options = ['Employment agency', 'State employment office', 'Newspaper advertising', 'College placement',
                'Friend', 'Walk in', 'Online ad', 'Other'];
    $pdf->Space(20);
    $y = $pdf->GetY();
    $pdf->Rect(SecApplicationPDF::MARGIN, $y, $pdf->contentW, 18);
    $pdf->SetFont('Helvetica', '', 6);
    $pdf->SetTextColor(105, 105, 112);
    $pdf->SetXY(SecApplicationPDF::MARGIN + 1.6, $y + 1.2);
    $pdf->Cell(80, 3, 'HOW DID YOU FIND OUT ABOUT THIS POSITION?', 0, 0, 'L');
    $pdf->SetTextColor(0, 0, 0);
    $colW = $pdf->contentW / 4;
    foreach ($options as $i => $opt) {
        $col = $i % 4; $rowN = intdiv($i, 4);
        $pdf->CheckItem(SecApplicationPDF::MARGIN + 2 + ($col * $colW), $y + 7 + ($rowN * 5.2),
                        $opt, in_array($opt, $chosen, true), $colW);
    }
    $pdf->SetXY(SecApplicationPDF::MARGIN, $y + 18);
    if ($get('howFoundOther') !== '') {
        $pdf->Row([['Other', $get('howFoundOther'), 6]]);
    }

    // ---- education ----
    $pdf->SectionBar('Education');
    $u = $pdf->contentW / 6;
    $pdf->TableHead([['School level', $u * 1.3], ['Name and location of school', $u * 2.2],
                     ['Years', $u * 0.6], ['Graduated?', $u * 0.7], ['Subjects studied', $u * 1.2]]);
    foreach ([['High school', 'hs'], ['College', 'college'], ['Trade, business or correspondence school', 'trade']] as [$lvl, $p]) {
        $pdf->TableRow([[$lvl, $u * 1.3], [$get($p . 'Name'), $u * 2.2], [$get($p . 'Years'), $u * 0.6, 'C'],
                        [$get($p . 'Graduated'), $u * 0.7, 'C'], [$get($p . 'Subjects'), $u * 1.2]]);
    }

    // ---- general ----
    if ($any(['specialStudy', 'specialTraining', 'specialSkills'])) {
        $pdf->SectionBar('General');
        $pdf->Row([['Subjects of special study or research work', $get('specialStudy'), 6]]);
        $pdf->Row([['Special training, certifications, licenses', $get('specialTraining'), 6]]);
        $pdf->Row([['Special skills, foreign languages, etc.', $get('specialSkills'), 6]]);
    }

    // ---- former employers ----
    $labels = ['Present or last employer', 'Previous employer', 'Previous employer'];
    $printedHeader = false;
    for ($i = 1; $i <= 3; $i++) {
        if ($get("emp{$i}_name") === '') { continue; }
        if (!$printedHeader) {
            $pdf->SectionBar('Former employers');
            $pdf->Note('Last three employers, starting with the most recent.');
            $printedHeader = true;
        }
        $pdf->Space(52);
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetTextColor(...SecApplicationPDF::RED);
        $pdf->Cell(0, 5, strtoupper(sec_pdf_text($labels[$i - 1])), 0, 1);
        $pdf->SetTextColor(0, 0, 0);
        $g = static fn(string $k) => $get("emp{$i}_{$k}");
        $pdf->Row([['Name of employer', $g('name'), 4], ['Job title', $g('title'), 2]]);
        $pdf->Row([['Address', $g('street'), 3], ['City', $g('city'), 1],
                   ['State', $g('state'), 1], ['ZIP', $g('zip'), 1]]);
        $pdf->Row([['Starting date', $g('startDate'), 2], ['Leaving date', $g('leavingDate'), 2],
                   ['Weekly starting salary', $g('startSalary'), 1], ['Weekly leaving salary', $g('finalSalary'), 1]]);
        $pdf->Row([['May we contact your supervisor?', $g('mayContact'), 2, 'yesno'],
                   ['Name of supervisor', $g('supervisorName'), 2], ['Title', $g('supervisorTitle'), 1],
                   ['Phone', $g('supervisorPhone'), 1]]);
        if ($g('description') !== '') { $pdf->Row([['Description of work', $g('description'), 6]], 15); }
        if ($g('reasonLeaving') !== '') { $pdf->Row([['Reason for leaving', $g('reasonLeaving'), 6]]); }
    }

    // ---- references ----
    $refs = [];
    for ($i = 1; $i <= 4; $i++) {
        if ($get("ref{$i}_name") !== '') { $refs[] = $i; }
    }
    if ($refs) {
        $pdf->SectionBar('References');
        $pdf->Note('Professional references whom we may contact.');
        $pdf->TableHead([['#', $u * 0.3], ['Name', $u * 1.5], ['Address', $u * 2.0],
                         ['Business', $u * 1.2], ['Phone number', $u * 1.0]]);
        foreach ($refs as $n => $i) {
            $pdf->TableRow([[(string)($n + 1), $u * 0.3, 'C'], [$get("ref{$i}_name"), $u * 1.5],
                            [$get("ref{$i}_address"), $u * 2.0], [$get("ref{$i}_business"), $u * 1.2],
                            [$get("ref{$i}_phone"), $u * 1.0]]);
        }
    }

    // ---- service record and convictions ----
    $pdf->SectionBar('Service record');
    $pdf->Row([['Have you ever served in the U.S. Armed Forces?', $get('served'), 4, 'yesno'],
               ['Branch of service', $get('branch'), 2]]);
    $pdf->Row([['Have you ever been convicted of, plead guilty or no contest to, or had a suspended '
              . 'imposition of sentence for any offense (other than a minor traffic violation)?',
                $get('convicted'), 6, 'yesno']], 14);
    if ($get('convictedExplain') !== '') {
        $pdf->Row([['If yes, explain', $get('convictedExplain'), 6]], 15);
    }
    $pdf->Note('A conviction record will not necessarily exclude you from consideration. This information '
             . 'will be used only for job-related purposes and only to the extent permitted by law.');

    // ---- authorization ----
    $pdf->SectionBar('Authorization');
    $pdf->SetFont('Helvetica', '', 7.5);
    $pdf->MultiCell($pdf->contentW, 3.8, sec_pdf_text(
        "I certify that the facts contained in this application are true and complete to the best of my "
      . "knowledge and understand that, if employed, falsified statements on this application shall be "
      . "grounds for dismissal.\n\n"
      . "I authorize investigation of all statements contained herein and the references and employers "
      . "listed above to give you any and all information concerning my previous employment and any "
      . "pertinent information they may have, personal or otherwise, and release the company from all "
      . "liability for any damage that may result from utilization of such information.\n\n"
      . "I also understand and agree that no representative of the company has any authority to enter "
      . "into any agreement for employment for any specified period of time, or to make any agreement "
      . "contrary to the foregoing, unless it is in writing and signed by an authorized company "
      . "representative.\n\n"
      . "This waiver does not permit the release or use of any disability-related or medical information "
      . "in a manner prohibited by the Americans with Disabilities Act (ADA) and other relevant federal "
      . "and state laws."), 1, 'L');
    $pdf->Ln(3);

    $pdf->Space(34);
    $sigY = $pdf->GetY();
    if (!empty($meta['signaturePath']) && is_readable($meta['signaturePath'])) {
        $pdf->Image($meta['signaturePath'], SecApplicationPDF::MARGIN + 2, $sigY, 62);
    }
    $lineY = $sigY + 22;
    $pdf->SetDrawColor(30, 30, 30);
    $pdf->Line(SecApplicationPDF::MARGIN, $lineY, SecApplicationPDF::MARGIN + 80, $lineY);
    $pdf->Line(SecApplicationPDF::MARGIN + 100, $lineY, SecApplicationPDF::MARGIN + $pdf->contentW, $lineY);
    $pdf->SetFont('Helvetica', '', 9);
    $pdf->SetXY(SecApplicationPDF::MARGIN + 100, $lineY - 6);
    $pdf->Cell(60, 5, sec_pdf_text($meta['signedOn'] ?? ''), 0, 0, 'L');
    $pdf->SetFont('Helvetica', '', 6.5);
    $pdf->SetTextColor(105, 105, 112);
    $pdf->SetXY(SecApplicationPDF::MARGIN, $lineY + 0.8);
    $pdf->Cell(80, 4, 'SIGNATURE', 0, 0, 'L');
    $pdf->SetXY(SecApplicationPDF::MARGIN + 100, $lineY + 0.8);
    $pdf->Cell(60, 4, 'DATE', 0, 1, 'L');
    $pdf->SetXY(SecApplicationPDF::MARGIN, $lineY + 6);
    $pdf->Cell(0, 4, sec_pdf_text('Signed electronically by ' . $pdf->applicantName
        . '  |  ' . ($meta['received'] ?? '') . '  |  IP ' . ($meta['ip'] ?? '')), 0, 1, 'L');
    $pdf->SetTextColor(0, 0, 0);

    return $pdf->Output('S');
}
