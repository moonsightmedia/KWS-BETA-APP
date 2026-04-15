<?php
/**
 * Shared auth helper for upload-api endpoints.
 * Validates Supabase JWT via /auth/v1/user and enforces role (admin|setter when needed).
 */

function send_json_error(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

function get_bearer_token(): string {
    $uploadAuthHeader = $_SERVER['HTTP_X_UPLOAD_AUTH'] ?? '';
    if (!$uploadAuthHeader && function_exists('getallheaders')) {
        $headers = getallheaders();
        $uploadAuthHeader = $headers['X-Upload-Auth'] ?? $headers['x-upload-auth'] ?? '';
    }

    if ($uploadAuthHeader && stripos($uploadAuthHeader, 'Bearer ') === 0) {
        return trim(substr($uploadAuthHeader, 7));
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($authHeader, 7));
}

function require_supabase_user(?array $requiredRoles = null): array {
    $token = get_bearer_token();
    if ($token === '') {
        send_json_error(401, 'Missing bearer token');
    }

    $supabaseUrl = getenv('SUPABASE_URL') ?: '';
    $supabaseAnonKey = getenv('SUPABASE_ANON_KEY') ?: '';

    if ($supabaseUrl === '' || $supabaseAnonKey === '') {
        send_json_error(500, 'Server auth configuration missing');
    }

    $userCh = curl_init(rtrim($supabaseUrl, '/') . '/auth/v1/user');
    curl_setopt_array($userCh, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $supabaseAnonKey,
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
    ]);
    $userBody = curl_exec($userCh);
    $userStatus = curl_getinfo($userCh, CURLINFO_HTTP_CODE);
    curl_close($userCh);

    if ($userStatus !== 200 || !$userBody) {
        send_json_error(401, 'Invalid or expired token');
    }

    $user = json_decode($userBody, true);
    $userId = $user['id'] ?? null;
    if (!$userId) {
        send_json_error(401, 'Unable to resolve user');
    }

    if (is_array($requiredRoles) && count($requiredRoles) > 0) {
        $roleFilter = 'role=in.(' . implode(',', array_map('rawurlencode', $requiredRoles)) . ')';
        $rolesUrl = rtrim($supabaseUrl, '/') . '/rest/v1/user_roles?user_id=eq.' . rawurlencode($userId) . '&' . $roleFilter . '&select=role';

        $rolesCh = curl_init($rolesUrl);
        curl_setopt_array($rolesCh, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'apikey: ' . $supabaseAnonKey,
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
        ]);
        $rolesBody = curl_exec($rolesCh);
        $rolesStatus = curl_getinfo($rolesCh, CURLINFO_HTTP_CODE);
        curl_close($rolesCh);

        if ($rolesStatus !== 200 || !$rolesBody) {
            send_json_error(403, 'Role check failed');
        }

        $rolesData = json_decode($rolesBody, true);
        if (!is_array($rolesData) || count($rolesData) === 0) {
            send_json_error(403, 'Insufficient permissions');
        }
    }

    return ['id' => $userId, 'token' => $token];
}
