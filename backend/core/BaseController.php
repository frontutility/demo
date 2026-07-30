<?php

declare(strict_types=1);

namespace ConnectNKT\Core;

use ConnectNKT\Helpers\Response;
use ConnectNKT\Helpers\Env;
use ConnectNKT\Services\JwtService;

abstract class BaseController
{
    protected function json(mixed $data = null, string $message = 'OK', int $status = 200): void
    {
        Response::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function fail(string $message, int $status = 400, array $errors = []): void
    {
        if ($status >= 500) {
            error_log(sprintf('[api-error] status=%d message=%s', $status, $message));
            $message = 'An unexpected server error occurred.';
        }
        Response::error($message, $status, $errors);
    }

    protected function input(): array
    {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 5 * 1024 * 1024) {
            $this->fail('Request payload is too large.', 413);
        }
        $body = file_get_contents('php://input') ?: '';
        $data = json_decode($body, true);
        return is_array($data) ? $data : $_POST;
    }

    protected function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }

    protected function routeParam(string $key, mixed $default = null): mixed
    {
        return $GLOBALS['__route_params'][$key] ?? $default;
    }

    protected function currentUserClaims(): array
    {
        $token = $this->bearerToken();
        if ($token) {
            try {
                return JwtService::parse($token);
            } catch (\Throwable) {
                return [];
            }
        }

        // Public feed/detail routes intentionally do not require AuthMiddleware,
        // but they still need to know the viewer so their `my_reaction` field can
        // be hydrated after a refresh. Read the server-side session here without
        // ever trusting browser-controlled identity data.
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) {
            session_start();
        }
        $sessionType = (string) ($_SESSION['type'] ?? 'user');
        $sessionId = $sessionType === 'admin' ? (int) ($_SESSION['admin_id'] ?? 0) : (int) ($_SESSION['user_id'] ?? 0);
        if ($sessionId > 0) {
            $now = time();
            $expiresAt = (int) ($_SESSION['expires_at'] ?? 0);
            $lastActivity = (int) ($_SESSION['last_activity'] ?? 0);
            if ($sessionType === 'admin' && $expiresAt > $now && $lastActivity > 0 && ($now - $lastActivity) <= 2592000) {
                return [
                    'sub' => $sessionId,
                    'role' => (string) ($_SESSION['role'] ?? 'user'),
                    'type' => $sessionType,
                ];
            }
            $user = $sessionType === 'user' ? (new \ConnectNKT\Models\User())->find($sessionId) : null;
            $fingerprint = hash('sha256', (string) ($user['password_hash'] ?? ''));
            if ($expiresAt > $now && $lastActivity > 0 && ($now - $lastActivity) <= 2592000 && $user && empty($user['deleted_at']) && strtolower((string) ($user['account_status'] ?? 'active')) === 'active' && (empty($_SESSION['password_fingerprint']) || hash_equals((string) $_SESSION['password_fingerprint'], $fingerprint))) {
                $_SESSION['password_fingerprint'] = $fingerprint;
                $_SESSION['last_activity'] = $now;
                $_SESSION['expires_at'] = $now + 2592000;
                setcookie(session_name(), session_id(), [
                    'expires' => $now + 2592000,
                    'path' => '/',
                    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https',
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);
                return [
                    'sub' => $sessionId,
                    'role' => (string) ($_SESSION['role'] ?? 'user'),
                    'type' => $sessionType,
                ];
            }
            if ($sessionType === 'user') {
                $_SESSION = [];
                session_destroy();
            }
        }

        return is_array($GLOBALS['__auth_context']['auth'] ?? null)
            ? $GLOBALS['__auth_context']['auth']
            : [];
    }

    protected function currentUserId(): int
    {
        $claims = $this->currentUserClaims();
        return isset($claims['sub']) ? (int) $claims['sub'] : 0;
    }

    /**
     * Return the authenticated user or admin record (from `admins` or `users`).
     */
    protected function currentUser(): array
    {
        $id = $this->currentUserId();
        if ($id <= 0) {
            return [];
        }

        try {
            $db = Database::pdo();
        } catch (\Throwable $e) {
            return [];
        }

        $stmt = $db->prepare('SELECT * FROM admins WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $admin = $stmt->fetch();
        if ($admin) {
            return $admin;
        }

        $stmt = $db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: [];
    }
}
