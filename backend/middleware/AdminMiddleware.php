<?php

declare(strict_types=1);

namespace ConnectNKT\Middleware;

use ConnectNKT\Helpers\Response;
use ConnectNKT\Models\Admin;

final class AdminMiddleware
{
    public function __invoke(array &$context = []): void
    {
        $claims = $context['auth'] ?? [];
        $role = $claims['role'] ?? null;
        $type = $claims['type'] ?? null;

        $adminId = (int) ($claims['sub'] ?? 0);
        $admin = $adminId > 0 ? (new Admin())->find($adminId) : null;
        if ($type !== 'admin' || !in_array($role, ['super_admin', 'moderator', 'editor'], true) || !$admin || !empty($admin['deleted_at']) || ($admin['status'] ?? '') !== 'active' || ($admin['role'] ?? '') !== $role) {
            Response::error('Forbidden', 403);
        }

        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
        $path = '/' . ltrim(preg_replace('#^.*?/backend#', '', $path) ?: $path, '/');
        if ($role === 'super_admin') {
            return;
        }

        // Keep the policy server-side: hiding an admin menu is not authorization.
        $allowed = match ($role) {
            'editor' => preg_match('#^/api/admin/(?:cms|news|help-center)(?:/|$)#', $path) === 1,
            'moderator' => preg_match('#^/api/admin/(?:dashboard|users|posts|reports|blue-ticks)(?:/|$)#', $path) === 1,
            default => false,
        };
        if (!$allowed) {
            Response::error('Insufficient permissions', 403);
        }
    }
}
