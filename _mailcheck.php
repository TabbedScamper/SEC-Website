<?php
// TEMPORARY diagnostic - delete after use.
header('Content-Type: application/json');
$out = [
  'php_version'     => PHP_VERSION,
  'sendmail_path'   => ini_get('sendmail_path'),
  'SMTP'            => ini_get('SMTP'),
  'smtp_port'       => ini_get('smtp_port'),
  'mail_disabled'   => in_array('mail', array_map('trim', explode(',', (string)ini_get('disable_functions'))), true),
  'mail_exists'     => function_exists('mail'),
  'open_basedir'    => ini_get('open_basedir'),
];
if (function_exists('mail')) {
    $to = 'mwaltondrafter@yahoo.com';
    $out['test_plain']    = mail($to, 'diag plain',    "plain\n", "From: noreply@southernelectric.net\r\n");
    $out['test_envelope'] = mail($to, 'diag envelope', "envelope\n", "From: noreply@southernelectric.net\r\n", '-fnoreply@southernelectric.net');
}
$out['last_error'] = error_get_last();
echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
