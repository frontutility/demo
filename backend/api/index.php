<?php

declare(strict_types=1);

use ConnectNKT\Core\Router;
use ConnectNKT\Helpers\Env;
use ConnectNKT\Helpers\Response;
use ConnectNKT\Models\SiteSetting;

require_once __DIR__ . '/../config/bootstrap.php';

Env::load(__DIR__ . '/../.env');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

$allowedOrigins = array_filter(array_unique([
    Env::get('FRONTEND_URL', 'http://localhost:5173')
]));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$frontendUrl = $origin && in_array($origin, $allowedOrigins, true)
    ? $origin
    : (string) Env::get('FRONTEND_URL', 'http://localhost:5173');
$frontendUrl = rtrim($frontendUrl, '/');

header("Access-Control-Allow-Origin: {$frontendUrl}");
header('Vary: Origin');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, X-CSRF-Token, X-Csrf-Token');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();

require_once __DIR__ . '/../routes/api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$basePath = parse_url(Env::get('APP_URL', 'http://localhost/connectnkt/backend'), PHP_URL_PATH) ?: '/connectnkt/backend';
$basePath = rtrim($basePath, '/');

if (str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
}

if ($uri === '') {
    $uri = '/';
}

try {

    // Maintenance mode check — block non-admin requests when site is under maintenance
    $isAdminRoute = str_starts_with($uri, '/api/admin');
    $isSettingsRoute = $uri === '/api/settings' || $uri === '/';
    if (!$isAdminRoute && !$isSettingsRoute) {
        try {
            $settingsRows = (new SiteSetting())->all([], 'id ASC', 1);
            $maintenanceMode = !empty($settingsRows[0]['maintenance_mode']);
        } catch (\Throwable) {
            $maintenanceMode = false;
        }
        if ($maintenanceMode) {
            Response::json([
                'success' => false,
                'maintenance' => true,
                'message' => 'Website is under maintenance.',
            ], 503);
        }
    }

    $router->dispatch($method, $uri);

} catch (Throwable $e) {
    error_log('[api-exception] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    Response::json([
        'success' => false,
        'message' => 'Server Error',
    ], 500);
}