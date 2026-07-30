<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\BlueTickRequest;
use ConnectNKT\Models\User;

class BlueTickController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new BlueTickRequest();
    }

    /**
     * Get blue tick status for current user
     */
    public function userStatus(string $userId): array
    {
        $userId = (int) $userId;
        $authUserId = $this->currentUserId();
        
        if ($authUserId !== $userId && !$this->isAdmin()) {
            $this->fail('Unauthorized', 401);
        }

        $user = (new User())->find($userId);
        if (!$user) {
            $this->fail('User not found', 404);
        }

        $followersCount = $this->effectiveFollowersCount($userId);
        $isVerified = strtolower((string) ($user['blue_tick_status'] ?? '')) === 'verified';

        $stmt = $this->db()->prepare('
            SELECT id, request_status FROM blue_tick_requests 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId]);
        $request = $stmt->fetch(\PDO::FETCH_ASSOC);

        return [
            'user_id' => $userId,
            'followers_count' => $followersCount,
            'is_verified' => $isVerified || ($request && $request['request_status'] === 'approved'),
            'request_status' => $isVerified ? 'approved' : ($request ? $request['request_status'] : null),
            'request_id' => $request ? (int) $request['id'] : null,
        ];
    }

    /**
     * Check if user is eligible for blue tick
     */
    public function checkEligibility(string $userId): array
    {
        $userId = (int) $userId;
        $user = (new User())->find($userId);
        if (!$user) {
            $this->fail('User not found', 404);
        }

        $followersCount = $this->effectiveFollowersCount($userId);

        // Get existing request
        $stmt = $this->db()->prepare('
            SELECT id, request_status FROM blue_tick_requests 
            WHERE user_id = :user_id 
            AND request_status = "pending"
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId]);
        $pendingRequest = $stmt->fetch(\PDO::FETCH_ASSOC);

        return [
            'followers_count' => $followersCount,
            'min_required' => 500,
            'is_eligible' => $followersCount >= 500,
            'has_pending_request' => (bool) $pendingRequest,
            'pending_request_id' => $pendingRequest ? (int) $pendingRequest['id'] : null,
            'is_verified' => strtolower((string) ($user['blue_tick_status'] ?? '')) === 'verified',
        ];
    }

    public function store(): array
    {
        $data = $this->input();
        $userId = $this->currentUserId();
        
        if (!$userId) {
            $this->fail('Unauthorized', 401);
        }

        $user = (new User())->find($userId);
        if ($user && strtolower((string) ($user['blue_tick_status'] ?? '')) === 'verified') {
            $this->fail('You are already verified with a Blue Tick badge.', 422);
        }

        $followers = $this->effectiveFollowersCount($userId);
        $data['followers_count_snapshot'] = $followers;
        
        // Check for existing pending request
        $stmt = $this->db()->prepare('
            SELECT id FROM blue_tick_requests 
            WHERE user_id = :user_id AND request_status = "pending"
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId]);
        if ($stmt->fetch()) {
            $this->fail('You already have a pending blue tick request.', 422);
        }

        // Check follower requirement
        if ($followers < 500) {
            $this->fail('You need at least 500 followers to request blue tick verification.', 422);
        }

        // Create request
        $data['user_id'] = $userId;
        $data['request_status'] = 'pending';
        $data['request_reason'] = $data['request_reason'] ?? 'I want to verify my ConnectNKT profile.';
        
        $id = $this->model()->create($data);
        return $this->model()->find($id) ?? ['id' => $id];
    }

    public function approve(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Unauthorized', 401);
        }

        $request = $this->model()->find((int) $id);
        if (!$request) {
            $this->fail('Request not found', 404);
        }

        $this->db()->beginTransaction();
        try {
            $this->model()->update((int) $id, [
                'request_status' => 'approved',
                'reviewed_by_admin_id' => $this->currentUserId(),
                'reviewed_at' => date('Y-m-d H:i:s'),
            ]);

            $updateUser = $this->db()->prepare('UPDATE users SET blue_tick_status = \'verified\', updated_at = CURRENT_TIMESTAMP WHERE id = :user_id');
            $updateUser->execute(['user_id' => (int) $request['user_id']]);

            $this->db()->commit();
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to approve blue tick request.', 500);
        }

        return $this->model()->find((int) $id) ?? [];
    }

    public function reject(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Unauthorized', 401);
        }

        $request = $this->model()->find((int) $id);
        if (!$request) {
            $this->fail('Request not found', 404);
        }

        $this->model()->update((int) $id, [
            'request_status' => 'rejected',
            'reviewed_by_admin_id' => $this->currentUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->model()->find((int) $id) ?? [];
    }

    public function revoke(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Unauthorized', 401);
        }

        $request = $this->model()->find((int) $id);
        if (!$request) {
            $this->fail('Request not found', 404);
        }

        $this->db()->beginTransaction();
        try {
            $this->model()->update((int) $id, [
                'request_status' => 'revoked',
                'reviewed_by_admin_id' => $this->currentUserId(),
                'reviewed_at' => date('Y-m-d H:i:s'),
            ]);

            if (strtolower((string) ($request['request_status'] ?? '')) === 'approved') {
                $updateUser = $this->db()->prepare('UPDATE users SET blue_tick_status = \'none\', updated_at = CURRENT_TIMESTAMP WHERE id = :user_id');
                $updateUser->execute(['user_id' => (int) $request['user_id']]);
            }

            $this->db()->commit();
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to revoke blue tick request.', 500);
        }

        return $this->model()->find((int) $id) ?? [];
    }

    private function isAdmin(): bool
    {
        $claims = $this->currentUserClaims();
        return isset($claims['type'], $claims['role']) && $claims['type'] === 'admin' && in_array($claims['role'], ['super_admin', 'moderator', 'editor'], true);
    }

    private function followedColumn(): string
    {
        static $cached = null;
        if (is_string($cached)) {
            return $cached;
        }

        foreach (['followed_id', 'following_id'] as $column) {
            $stmt = $this->db()->prepare('
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = \'followers\'
                  AND column_name = :column_name
                LIMIT 1
            ');
            $stmt->execute(['column_name' => $column]);
            if ($stmt->fetchColumn()) {
                return $cached = $column;
            }
        }

        return $cached = 'followed_id';
    }

    protected function effectiveFollowersCount(int $userId): int
    {
        $followedColumn = $this->followedColumn();
        $stmt = $this->db()->prepare('
            SELECT COALESCE(u.followers_count_override, COUNT(f.id), 0) AS total
            FROM users u
            LEFT JOIN followers f ON f.' . $followedColumn . ' = u.id
            WHERE u.id = :user_id
            GROUP BY u.id, u.followers_count_override
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId]);
        return (int) ($stmt->fetchColumn() ?: 0);
    }
}
