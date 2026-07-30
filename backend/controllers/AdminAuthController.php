<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Models\Admin;
use ConnectNKT\Services\JwtService;
use ConnectNKT\Services\PasswordService;

final class AdminAuthController extends BaseController
{
    public function login(): void
    {
        $data = $this->input();
        $login = trim((string) ($data['email'] ?? $data['username'] ?? $data['login'] ?? ''));
        if ($login === '' || empty($data['password'])) {
            $this->fail('Email/username and password are required.', 422);
        }

        $admin = new Admin();
        $stmt = $admin->pdo()->prepare('SELECT * FROM admins WHERE deleted_at IS NULL AND (email = :email OR username = :username) LIMIT 1');
        $stmt->execute([
            'email' => $login,
            'username' => $login,
        ]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$row || !PasswordService::verify((string) $data['password'], (string) $row['password_hash'])) {
            $this->fail('Invalid admin credentials', 401);
        }

        $token = JwtService::issue([
            'sub' => (int) $row['id'],
            'role' => $row['role'],
            'username' => $row['username'],
            'type' => 'admin',
        ]);

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_set_cookie_params(['httponly' => true, 'secure' => $this->secureCookie(), 'samesite' => 'Lax', 'path' => '/']);
            session_start();
        }
        session_regenerate_id(true);
        unset($_SESSION['user_id']);
        $_SESSION['admin_id'] = (int) $row['id'];
        $_SESSION['role'] = (string) $row['role'];
        $_SESSION['type'] = 'admin';
        $_SESSION['created_at'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['expires_at'] = time() + 43200;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        setcookie('csrf_token', $_SESSION['csrf_token'], [
            'expires' => time() + 3600,
            'path' => '/',
            'secure' => $this->secureCookie(),
            'httponly' => false,
            'samesite' => 'Lax',
        ]);

        $this->json([
            'token' => $token,
            'admin' => $this->sanitizeAdmin($row),
        ], 'Admin login successful');
    }

    public function me(): void
    {
        $token = $this->bearerToken();
        if (!$token) {
            $this->json(null, 'Current admin session');
            return;
        }
        $claims = JwtService::parse($token);
        $admin = null;
        if (!empty($claims['sub'])) {
            $admin = (new Admin())->find((int) $claims['sub']);
            if ($admin) {
                $admin = $this->sanitizeAdmin($admin);
            }
        }
        $this->json($admin ?: null, 'Current admin session');
    }

    public function logout(): void
    {
        $token = $this->bearerToken();
        if ($token) {
            JwtService::revoke($token);
        }
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) {
            session_start();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $this->secureCookie(), 'httponly' => true, 'samesite' => 'Lax']);
        $this->json(['logged_out' => true], 'Admin logout successful');
    }

    private function secureCookie(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }

    private function sanitizeAdmin(array $admin): array
    {
        unset($admin['password_hash']);
        return $admin;
    }
}
