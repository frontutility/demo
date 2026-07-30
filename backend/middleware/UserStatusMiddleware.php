<?php

declare(strict_types=1);

namespace ConnectNKT\Middleware;

use ConnectNKT\Helpers\Response;
use ConnectNKT\Models\User;

final class UserStatusMiddleware
{
    public function __invoke(array &$context = []): void
    {
        $claims = $context['auth'] ?? [];
        $type = $claims['type'] ?? 'user';

        if ($type === 'admin') {
            return;
        }

        $userId = (int) ($claims['sub'] ?? 0);
        if ($userId <= 0) {
            Response::error('Unauthorized', 401);
        }

        $user = (new User())->find($userId);
        if (!$user || !empty($user['deleted_at'])) {
            Response::error('Unauthorized', 401);
        }

        $status = strtolower(trim((string) ($user['account_status'] ?? 'active')));
        if ($status === 'suspended') {
            Response::error('Your account has been suspended. Please contact support.', 401);
        }
    }
}
