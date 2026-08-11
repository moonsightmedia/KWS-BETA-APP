<?php
/**
 * Deprecated public diagnostic.
 *
 * Do not expose executable paths or PHP process capabilities on production
 * hosting. FFmpeg health is covered by the Hostinger service test suite.
 */
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
    'error' => 'deprecated_endpoint',
    'message' => 'FFmpeg diagnostics moved to the private Hostinger deployment checks.',
]);

