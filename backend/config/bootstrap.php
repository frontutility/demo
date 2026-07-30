<?php

declare(strict_types=1);
use ConnectNKT\Helpers\Env;

spl_autoload_register(static function (string $class): void {
    $prefix = 'ConnectNKT\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/../' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require_once $path;
    }
});

// Load environment variables from backend/.env
Env::load(__DIR__ . '/../.env');

// Keep server-side sessions valid for the same 30-day window as their cookie.
// These must be set before any controller opens a session.
$sessionSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.gc_maxlifetime', '2592000');
ini_set('session.cookie_lifetime', '2592000');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_secure', $sessionSecure ? '1' : '0');
