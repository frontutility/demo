<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class Response
{
    private static array $corsOrigins = [];

    public static function setAllowedOrigins(array $origins): void
    {
        self::$corsOrigins = $origins;
    }

    private static function setCorsHeaders(): void
    {
        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        $allowed = false;
        if ($origin !== '') {
            foreach (self::$corsOrigins as $allowedOrigin) {
                if ($origin === $allowedOrigin) {
                    $allowed = true;
                    break;
                }
            }
            if (!$allowed) {
                $parsed = parse_url($origin, PHP_URL_HOST) ?: '';
                foreach (self::$corsOrigins as $allowedOrigin) {
                    $allowedHost = parse_url($allowedOrigin, PHP_URL_HOST) ?: $allowedOrigin;
                    if ($parsed === $allowedHost || str_ends_with($parsed, '.' . $allowedHost)) {
                        $allowed = true;
                        break;
                    }
                }
            }
            if ($allowed) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
                header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
                header('Access-Control-Max-Age: 86400');
            }
        }
    }

    public static function json(array $payload, int $status = 200): void
    {
        self::setCorsHeaders();
        http_response_code($status);
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'OK', int $status = 200): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public static function error(string $message, int $status = 400, array $errors = []): void
    {
        self::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}
