<?php

declare(strict_types=1);

namespace ConnectNKT\Middleware;

use ConnectNKT\Helpers\Response;
use ConnectNKT\Models\User;
use ConnectNKT\Services\JwtService;

final class AuthMiddleware
{
    private const SESSION_IDLE_SECONDS = 2592000;
    private const SESSION_ABSOLUTE_SECONDS = 2592000;
    private const SESSION_REGENERATE_SECONDS = 86400;

    public function __invoke(array &$context = []): void
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) session_start();
        $sessionType = (string) ($_SESSION['type'] ?? 'user');
        $sessionId = $sessionType === 'admin' ? (int) ($_SESSION['admin_id'] ?? 0) : (int) ($_SESSION['user_id'] ?? 0);
        if (!preg_match('/Bearer\s+(.+)/i', $header, $matches) && $sessionId > 0) {
            $now = time();
            $createdAt = (int) ($_SESSION['created_at'] ?? $now);
            $lastActivity = (int) ($_SESSION['last_activity'] ?? $now);
            $expiresAt = (int) ($_SESSION['expires_at'] ?? ($createdAt + self::SESSION_ABSOLUTE_SECONDS));
            if (($now - $lastActivity) > self::SESSION_IDLE_SECONDS || $now >= $expiresAt) {
                $this->destroySession();
                Response::error('Session expired', 401);
            }

            $unsafe = !in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD', 'OPTIONS'], true);
            $csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if ($unsafe && (!isset($_SESSION['csrf_token']) || !hash_equals((string) $_SESSION['csrf_token'], (string) $csrf))) {
                Response::error('CSRF validation failed', 419);
            }
            $context['auth'] = ['sub' => $sessionId, 'role' => (string) ($_SESSION['role'] ?? 'user'), 'type' => $sessionType];
            if ($context['auth']['type'] !== 'admin') {
                $user = $this->assertActiveUser($context['auth']);
                $fingerprint = hash('sha256', (string) ($user['password_hash'] ?? ''));
                if (!empty($_SESSION['password_fingerprint']) && !hash_equals((string) $_SESSION['password_fingerprint'], $fingerprint)) {
                    $this->destroySession();
                    Response::error('Your password was changed. Please sign in again.', 401);
                }
                $_SESSION['password_fingerprint'] = $fingerprint;
            }
            $_SESSION['last_activity'] = $now;
            $_SESSION['expires_at'] = $now + self::SESSION_ABSOLUTE_SECONDS;
            if (($now - (int) ($_SESSION['regenerated_at'] ?? 0)) >= self::SESSION_REGENERATE_SECONDS) {
                session_regenerate_id(true);
                $_SESSION['regenerated_at'] = $now;
            }
            $this->refreshSessionCookie($now);
            return;
        }
        if (!preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            Response::error('Unauthorized', 401);
        }

        try {
            $context['auth'] = JwtService::parse(trim($matches[1]));
            if (($context['auth']['type'] ?? 'user') !== 'admin') {
                $this->assertActiveUser($context['auth']);
            }
        } catch (\Throwable) {
            Response::error('Unauthorized', 401);
        }
    }

    private function assertActiveUser(array $claims): array
    {
        $userId = (int) ($claims['sub'] ?? 0);
        $user = $userId > 0 ? (new User())->find($userId) : null;
        if (!$user || !empty($user['deleted_at']) || strtolower((string) ($user['account_status'] ?? 'active')) !== 'active') {
            Response::error('Unauthorized', 401);
        }
        return $user;
    }

    private function refreshSessionCookie(int $now): void
    {
        setcookie(session_name(), session_id(), [
            'expires' => $now + self::SESSION_ABSOLUTE_SECONDS,
            'path' => '/',
            'secure' => $this->secureCookie(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private function destroySession(): void
    {
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $this->secureCookie(), 'httponly' => true, 'samesite' => 'Lax']);
    }

    private function secureCookie(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }
}
