<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Models\BlueTickRequest;
use ConnectNKT\Models\User;

final class AdminBlueTickController extends BlueTickController
{
    /**
     * Get all blue tick requests with user details
     */
    public function index(): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Unauthorized', 401);
        }

        $page = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 20);
        $status = $_GET['status'] ?? '';
        $offset = ($page - 1) * $limit;

        $query = 'SELECT * FROM blue_tick_requests WHERE deleted_at IS NULL';
        $params = [];

        if ($status && in_array($status, ['pending', 'approved', 'rejected', 'revoked'])) {
            $query .= ' AND request_status = :status';
            $params['status'] = $status;
        }

        $query .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $params['limit'] = $limit;
        $params['offset'] = $offset;

        $stmt = $this->db()->prepare($query);
        
        foreach ($params as $key => $value) {
            if ($key === 'limit' || $key === 'offset') {
                $stmt->bindValue(':' . $key, $value, \PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':' . $key, $value);
            }
        }
        
        $stmt->execute();
        $requests = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Enrich with sanitized user data
        $enriched = [];
        foreach ($requests as $request) {
            $user = (new User())->find((int) $request['user_id']);
            if ($user) {
                $followersCount = $this->effectiveFollowersCount((int) $request['user_id']);

                $request['user'] = [
                    'id' => (int) $user['id'],
                    'name' => $user['name'] ?? null,
                    'username' => $user['username'] ?? null,
                    'email' => $user['email'] ?? null,
                    'mobile' => $user['mobile'] ?? null,
                    'bio' => $user['bio'] ?? null,
                    'profile_image_url' => $user['profile_image_url'] ?? null,
                    'village_id' => $user['village_id'] ?? null,
                ];
                $request['followers_count'] = $followersCount;
                $enriched[] = $request;
            }
        }

        return array_map(function (array $request) {
            return [
                'id' => (int) ($request['id'] ?? 0),
                'userId' => (int) ($request['user_id'] ?? 0),
                'requestReason' => $request['request_reason'] ?? '',
                'requestStatus' => $request['request_status'] ?? 'pending',
                'followersCount' => (int) ($request['followers_count'] ?? 0),
                'requestedAt' => $request['requested_at'] ?? null,
                'reviewedAt' => $request['reviewed_at'] ?? null,
                'reviewNotes' => $request['review_notes'] ?? '',
                'user' => [
                    'id' => (int) ($request['user']['id'] ?? 0),
                    'name' => $request['user']['name'] ?? '',
                    'username' => $request['user']['username'] ?? '',
                    'email' => $request['user']['email'] ?? '',
                    'mobile' => $request['user']['mobile'] ?? '',
                    'bio' => $request['user']['bio'] ?? '',
                    'profileImageUrl' => $request['user']['profile_image_url'] ?? '',
                    'villageId' => $request['user']['village_id'] ?? null,
                ],
            ];
        }, $enriched);
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
}
