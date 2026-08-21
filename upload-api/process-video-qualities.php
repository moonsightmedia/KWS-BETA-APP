<?php
/**
 * Deprecated endpoint.
 *
 * KWS videos are uploaded and transcoded by the versioned Hostinger service at
 * video.kletterwelt-sauerland.de. Keeping the former synchronous FFmpeg/URL
 * processor disabled avoids an unauthenticated second processing path.
 */
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
    'error' => 'deprecated_endpoint',
    'message' => 'Video processing moved to the KWS Hostinger video service.',
]);

