<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

final class AdminUserController extends UserController
{
    /**
     * Get admin users list with enriched data
     */
    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? $_GET['search'] ?? ''));
        $village = isset($_GET['village']) ? (int) $_GET['village'] : (isset($_GET['village_id']) ? (int) $_GET['village_id'] : 0);
        $birthday = isset($_GET['birthday']) ? trim((string) $_GET['birthday']) : null;
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page'] ) : null;
        $perPage = isset($_GET['per_page']) ? max(1, min(200, (int) $_GET['per_page'])) : null;
        $offset = $page && $perPage ? ($page - 1) * $perPage : null;
        $params = [];

        $sql = '
            SELECT
                u.id,
                u.name,
                u.username,
                u.email,
                u.firebase_uid,
                u.google_photo,
                u.google_provider,
                u.email_verified,
                u.mobile,
                u.bio,
                u.father_name,
                u.gender,
                u.date_of_birth,
                u.profile_image_url,
                u.can_create_text_post,
                u.can_create_poll_post,
                u.can_create_image_post,
                u.can_create_image_text_post,
                u.village_id,
                u.blue_tick_status,
                u.account_status,
                COALESCE(us.show_in_search, 1) AS show_in_search,
                u.created_at,
                v.name AS village_name,
                COALESCE(u.followers_count_override, followers_count.total, 0) AS followers_count,
                COALESCE(u.following_count_override, following_count.total, 0) AS following_count,
                COALESCE(u.posts_count_override, posts_count.total, 0) AS posts_count,
                COALESCE(u.comments_count_override, comments_count.total, 0) AS comments_count,
                COALESCE(u.agree_count_override, reactions_count.agree_total, 0) AS agree_count,
                COALESCE(u.disagree_count_override, reactions_count.disagree_total, 0) AS disagree_count,
                COALESCE(u.shares_count_override, 0) AS shares_count
            FROM users u
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN user_settings us ON us.user_id = u.id
            LEFT JOIN (
                SELECT followed_id, COUNT(*) AS total
                FROM followers
                GROUP BY followed_id
            ) followers_count ON followers_count.followed_id = u.id
            LEFT JOIN (
                SELECT follower_id, COUNT(*) AS total
                FROM followers
                GROUP BY follower_id
            ) following_count ON following_count.follower_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM posts
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) posts_count ON posts_count.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM post_comments
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) comments_count ON comments_count.user_id = u.id
            LEFT JOIN (
                SELECT p.user_id,
                       SUM(CASE WHEN r.reaction_type = "agree" THEN 1 ELSE 0 END) AS agree_total,
                       SUM(CASE WHEN r.reaction_type = "disagree" THEN 1 ELSE 0 END) AS disagree_total
                FROM posts p
                LEFT JOIN post_reactions r ON r.post_id = p.id
                WHERE p.deleted_at IS NULL
                GROUP BY p.user_id
            ) reactions_count ON reactions_count.user_id = u.id
            WHERE u.deleted_at IS NULL'
        ;

        if ($term !== '') {
            $like = '%' . $term . '%';
            $sql .= '
              AND (
                u.name LIKE :term_name
                OR u.username LIKE :term_username
                OR v.name LIKE :term_village
              )';
            $params['term_name'] = $like;
            $params['term_username'] = $like;
            $params['term_village'] = $like;
        }

        if ($village > 0) {
            $sql .= '
              AND u.village_id = :village';
            $params['village'] = $village;
        }

        if ($birthday !== null && $birthday !== '') {
            $date = \DateTime::createFromFormat('Y-m-d', $birthday);
            if ($date !== false) {
                $sql .= '
              AND DAY(u.date_of_birth)   = :bday_day
              AND MONTH(u.date_of_birth) = :bday_month';
                $params['bday_day']   = (int) $date->format('j');
                $params['bday_month'] = (int) $date->format('n');
            }
        }

        $sql .= ' ORDER BY u.id DESC';

        // Pagination (apply only when page/per_page explicitly provided)
        if ($page !== null && $perPage !== null) {
            $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        }

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(function (array $user) {
            $villageName = $user['village_name'] ?? 'N/A';
            return [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'firebase_uid' => $user['firebase_uid'] ?? null,
                'google_photo' => $user['google_photo'] ?? null,
                'google_provider' => $user['google_provider'] ?? null,
                'email_verified' => (bool) ($user['email_verified'] ?? 0),
                'mobile' => $user['mobile'],
                'bio' => $user['bio'],
                'father_name' => $user['father_name'],
                'gender' => $user['gender'],
                'date_of_birth' => $user['date_of_birth'],
                'profile_image_url' => $user['profile_image_url'],
                'can_create_text_post' => (bool) ($user['can_create_text_post'] ?? 1),
                'can_create_poll_post' => (bool) ($user['can_create_poll_post'] ?? 1),
                'can_create_image_post' => (bool) ($user['can_create_image_post'] ?? 0),
                'can_create_image_text_post' => (bool) ($user['can_create_image_text_post'] ?? 0),
                'village_id' => isset($user['village_id']) ? (int) $user['village_id'] : null,
                'village' => $villageName,
                'village_name' => $villageName,
                'followers' => (int) ($user['followers_count'] ?? 0),
                'following' => (int) ($user['following_count'] ?? 0),
                'posts' => (int) ($user['posts_count'] ?? 0),
                'comments' => (int) ($user['comments_count'] ?? 0),
                'agree_count' => (int) ($user['agree_count'] ?? 0),
                'disagree_count' => (int) ($user['disagree_count'] ?? 0),
                'shares' => (int) ($user['shares_count'] ?? 0),
                'blue_tick_status' => $user['blue_tick_status'] ?? 'none',
                'account_status' => $user['account_status'] ?? 'active',
                'show_in_search' => (int) ($user['show_in_search'] ?? 1),
                'created_at' => $user['created_at'] ?? null,
            ];
        }, $users);
    }

    public function show(string $id): array
    {
        $stmt = $this->db()->prepare('
            SELECT
                u.*,
                v.name AS village_name,
                COALESCE(u.followers_count_override, followers_count.total, 0) AS followers_count,
                COALESCE(u.following_count_override, following_count.total, 0) AS following_count,
                COALESCE(u.posts_count_override, posts_count.total, 0) AS posts_count,
                COALESCE(u.comments_count_override, comments_count.total, 0) AS comments_count,
                COALESCE(u.agree_count_override, reactions_count.agree_total, 0) AS agree_count,
                COALESCE(u.disagree_count_override, reactions_count.disagree_total, 0) AS disagree_count,
                COALESCE(u.shares_count_override, 0) AS shares_count,
                COALESCE(us.show_in_search, 1) AS show_in_search
            FROM users u
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN user_settings us ON us.user_id = u.id
            LEFT JOIN (
                SELECT followed_id, COUNT(*) AS total
                FROM followers
                GROUP BY followed_id
            ) followers_count ON followers_count.followed_id = u.id
            LEFT JOIN (
                SELECT follower_id, COUNT(*) AS total
                FROM followers
                GROUP BY follower_id
            ) following_count ON following_count.follower_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM posts
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) posts_count ON posts_count.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM post_comments
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) comments_count ON comments_count.user_id = u.id
            LEFT JOIN (
                SELECT p.user_id,
                       SUM(CASE WHEN r.reaction_type = "agree" THEN 1 ELSE 0 END) AS agree_total,
                       SUM(CASE WHEN r.reaction_type = "disagree" THEN 1 ELSE 0 END) AS disagree_total
                FROM posts p
                LEFT JOIN post_reactions r ON r.post_id = p.id
                WHERE p.deleted_at IS NULL
                GROUP BY p.user_id
            ) reactions_count ON reactions_count.user_id = u.id
            WHERE u.id = :id
              AND u.deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute(['id' => (int) $id]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user) {
            $this->fail('User not found', 404);
        }

        $villageName = $user['village_name'] ?? 'N/A';
        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'email' => $user['email'],
            'mobile' => $user['mobile'],
            'bio' => $user['bio'],
            'father_name' => $user['father_name'],
            'gender' => $user['gender'],
            'date_of_birth' => $user['date_of_birth'],
            'profile_image_url' => $user['profile_image_url'],
            'can_create_text_post' => (bool) ($user['can_create_text_post'] ?? 1),
            'can_create_poll_post' => (bool) ($user['can_create_poll_post'] ?? 1),
            'can_create_image_post' => (bool) ($user['can_create_image_post'] ?? 0),
            'can_create_image_text_post' => (bool) ($user['can_create_image_text_post'] ?? 0),
            'village_id' => isset($user['village_id']) ? (int) $user['village_id'] : null,
            'village' => $villageName,
            'village_name' => $villageName,
            'followers' => (int) ($user['followers_count'] ?? 0),
            'following' => (int) ($user['following_count'] ?? 0),
            'posts' => (int) ($user['posts_count'] ?? 0),
            'comments' => (int) ($user['comments_count'] ?? 0),
            'agree_count' => (int) ($user['agree_count'] ?? 0),
            'disagree_count' => (int) ($user['disagree_count'] ?? 0),
            'shares' => (int) ($user['shares_count'] ?? 0),
            'blue_tick_status' => $user['blue_tick_status'] ?? 'none',
            'account_status' => $user['account_status'] ?? 'active',
            'show_in_search' => (int) ($user['show_in_search'] ?? 1),
            'created_at' => $user['created_at'] ?? null,
        ];
    }

    public function update(string $id): array
    {
        $user = (new \ConnectNKT\Models\User())->find((int) $id);
        if (!$user) {
            $this->fail('User not found', 404);
        }

        $data = $this->input();
        $payload = [];

        foreach (['name', 'username', 'email', 'mobile', 'bio', 'father_name', 'gender', 'date_of_birth', 'profile_image_url'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = trim((string) $data[$field]);
            }
        }
        $postPermissionFields = [
            'can_create_text_post',
            'can_create_poll_post',
            'can_create_image_post',
            'can_create_image_text_post',
        ];
        foreach ($postPermissionFields as $field) {
            $snakeField = $field;
            $camelField = lcfirst(str_replace('_', '', ucwords($field, '_')));
            if (array_key_exists($snakeField, $data) || array_key_exists($camelField, $data)) {
                $raw = $data[$snakeField] ?? $data[$camelField] ?? 0;
                $payload[$snakeField] = in_array($raw, [1, '1', true, 'true', 'yes', 'on'], true) ? 1 : 0;
            }
        }
        if (array_key_exists('village_id', $data) || array_key_exists('villageId', $data)) {
            $villageId = array_key_exists('village_id', $data) ? $data['village_id'] : $data['villageId'];
            $payload['village_id'] = $villageId === null || $villageId === '' ? null : (int) $villageId;
        }
        if (array_key_exists('blue_tick_status', $data) || array_key_exists('blueTickStatus', $data)) {
            $status = trim((string) ($data['blue_tick_status'] ?? $data['blueTickStatus'] ?? 'none'));
            if (!in_array($status, ['none', 'pending', 'verified', 'rejected'], true)) {
                $this->fail('Invalid blue tick status', 422);
            }
            $payload['blue_tick_status'] = $status;
        }
        if (array_key_exists('account_status', $data) || array_key_exists('accountStatus', $data)) {
            $status = trim((string) ($data['account_status'] ?? $data['accountStatus'] ?? 'active'));
            if (!in_array($status, ['active', 'hidden', 'suspended'], true)) {
                $this->fail('Invalid account status', 422);
            }
            $payload['account_status'] = $status;
            if ($status === 'hidden') {
                $payload['hidden_at'] = date('Y-m-d H:i:s');
                $payload['suspended_at'] = null;
            } elseif ($status === 'suspended') {
                $payload['suspended_at'] = date('Y-m-d H:i:s');
                $payload['hidden_at'] = null;
            } else {
                $payload['hidden_at'] = null;
                $payload['suspended_at'] = null;
            }
        }
        if (array_key_exists('show_in_search', $data) || array_key_exists('showInSearch', $data)) {
            $payload['show_in_search'] = (int) ($data['show_in_search'] ?? $data['showInSearch'] ?? 1);
        }
        foreach ([
            'followers_count_override' => ['followers_count_override', 'followersCountOverride', 'followers', 'followersCount'],
            'following_count_override' => ['following_count_override', 'followingCountOverride', 'following', 'followingCount'],
            'posts_count_override' => ['posts_count_override', 'postsCountOverride', 'posts'],
            'comments_count_override' => ['comments_count_override', 'commentsCountOverride', 'comments'],
            'agree_count_override' => ['agree_count_override', 'agreeCountOverride', 'agreeCount', 'agrees'],
            'disagree_count_override' => ['disagree_count_override', 'disagreeCountOverride', 'disagreeCount', 'disagrees'],
            'shares_count_override' => ['shares_count_override', 'sharesCountOverride', 'shares'],
        ] as $column => $aliases) {
            foreach ($aliases as $alias) {
                if (!array_key_exists($alias, $data)) {
                    continue;
                }
                $value = $data[$alias];
                if ($value === '' || $value === null) {
                    $payload[$column] = null;
                } else {
                    $payload[$column] = max(0, (int) $value);
                }
                break;
            }
        }

        if (!$payload) {
            $this->fail('No update data provided.', 422);
        }

        $this->db()->beginTransaction();
        try {
            $this->model()->update((int) $id, $payload);

            if (array_key_exists('show_in_search', $payload)) {
                $stmt = $this->db()->prepare('SELECT user_id FROM user_settings WHERE user_id = :user_id LIMIT 1');
                $stmt->execute(['user_id' => (int) $id]);
                $settingsId = (int) ($stmt->fetchColumn() ?: 0);
                if ($settingsId > 0) {
                    $update = $this->db()->prepare('UPDATE user_settings SET show_in_search = :show_in_search, updated_at = CURRENT_TIMESTAMP WHERE user_id = :user_id LIMIT 1');
                    $update->execute([
                        'show_in_search' => (int) $payload['show_in_search'],
                        'user_id' => (int) $id,
                    ]);
                } else {
                    $insert = $this->db()->prepare('
                        INSERT INTO user_settings (user_id, show_in_search, profile_visibility, email_visibility, phone_visibility, followers_visibility, following_visibility)
                        VALUES (:user_id, :show_in_search, "public", "public", "public", "public", "public")
                    ');
                    $insert->execute([
                        'user_id' => (int) $id,
                        'show_in_search' => (int) $payload['show_in_search'],
                    ]);
                }
            }

            $this->db()->commit();
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to update user.', 500);
        }

        return $this->show($id);
    }

    /**
     * Update user blue tick status
     */
    public function updateBlueTick(string $id): void
    {
        $data = json_decode((string) file_get_contents('php://input'), true);
        $newStatus = trim((string) ($data['status'] ?? 'none'));

        // Validate status
        if (!\in_array($newStatus, ['none', 'pending', 'verified', 'rejected'], true)) {
            $this->fail('Invalid blue tick status', 400);
            return;
        }

        $this->db()->beginTransaction();
        try {
            $sql = 'UPDATE users SET blue_tick_status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id';
            $stmt = $this->db()->prepare($sql);
            $stmt->execute([':status' => $newStatus, ':id' => (int)$id]);

            $this->db()->commit();
            $this->json([
                'message' => 'Blue tick status updated successfully',
                'status' => $newStatus
            ], 'Blue tick status updated successfully');
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to update blue tick status.', 500);
        }
    }

    /**
     * Update user visibility status
     */
    public function updateVisibility(string $id): void
    {
        $data = json_decode((string) file_get_contents('php://input'), true);
        $newStatus = trim((string) ($data['status'] ?? 'active'));

        // Validate status
        if (!\in_array($newStatus, ['active', 'hidden', 'suspended'], true)) {
            $this->fail('Invalid account status', 400);
            return;
        }

        try {
            $updateData = [':status' => $newStatus, ':id' => (int)$id];
            $sql = 'UPDATE users SET account_status = :status';

            if ($newStatus === 'hidden') {
                $sql .= ', hidden_at = NOW(), suspended_at = NULL';
            } elseif ($newStatus === 'suspended') {
                $sql .= ', suspended_at = NOW(), hidden_at = NULL';
            } else {
                $sql .= ', hidden_at = NULL, suspended_at = NULL';
            }

            $sql .= ', updated_at = CURRENT_TIMESTAMP WHERE id = :id';

            $stmt = $this->db()->prepare($sql);
            $stmt->execute($updateData);

            $this->json([
                'message' => 'Account visibility updated successfully',
                'status' => $newStatus
            ], 'Account visibility updated successfully');
        } catch (\Throwable $e) {
            $this->fail('Failed to update visibility.', 500);
        }
    }

    /**
     * Delete user (soft delete)
     */
    public function destroy(string $id): array
    {
        $user = $this->model()->find((int) $id);
        if (!$user) {
            $this->fail('User not found', 404);
            return [];
        }

        $data = $this->input();
        $deleteReason = trim((string) ($data['delete_reason'] ?? $data['reason'] ?? 'admin_delete'));
        $customReason = trim((string) ($data['custom_reason'] ?? $data['customReason'] ?? ''));
        $adminId = $this->currentUserId();

        if ($deleteReason === '') {
            $deleteReason = 'admin_delete';
        }

        $this->ensureDeletedUsersTable();

        $this->db()->beginTransaction();
        try {
            $existing = $this->db()->prepare('SELECT id FROM deleted_users WHERE user_id = :user_id LIMIT 1');
            $existing->execute(['user_id' => (int) $id]);
            if (!$existing->fetchColumn()) {
                $this->createDeletedUserBackup($user, $deleteReason, $customReason, 'admin', $adminId > 0 ? $adminId : null);
            }

            $stmt = $this->db()->prepare('UPDATE users SET deleted_at = NOW() WHERE id = :id');
            $stmt->execute([':id' => (int) $id]);

            $this->db()->commit();
            return ['deleted' => true, 'id' => (int) $id];
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to delete user.', 500);
            return [];
        }
    }

    public function deleted(): array
    {
        $term = trim((string) ($_GET['q'] ?? $_GET['search'] ?? ''));
        $deletedBy = trim((string) ($_GET['deleted_by'] ?? $_GET['deletedBy'] ?? ''));
        $accountType = trim((string) ($_GET['account_type'] ?? $_GET['accountType'] ?? ''));
        $startDate = trim((string) ($_GET['start_date'] ?? $_GET['startDate'] ?? ''));
        $endDate = trim((string) ($_GET['end_date'] ?? $_GET['endDate'] ?? ''));

        $params = [];
        $sql = '
            SELECT du.*, v.name AS village_name
            FROM deleted_users du
            LEFT JOIN villages v ON v.id = du.village_id
            WHERE 1=1
        ';

        if ($term !== '') {
            $sql .= ' AND (du.name LIKE :term OR du.username LIKE :term OR du.email LIKE :term OR du.phone LIKE :term)';
            $params['term'] = '%' . $term . '%';
        }

        if ($deletedBy !== '') {
            $sql .= ' AND du.deleted_by = :deleted_by';
            $params['deleted_by'] = $deletedBy;
        }

        if ($accountType !== '') {
            $sql .= ' AND du.account_type = :account_type';
            $params['account_type'] = $accountType;
        }

        if ($startDate !== '') {
            $sql .= ' AND du.deleted_at >= :start_date';
            $params['start_date'] = $startDate . ' 00:00:00';
        }

        if ($endDate !== '') {
            $sql .= ' AND du.deleted_at <= :end_date';
            $params['end_date'] = $endDate . ' 23:59:59';
        }

        $sql .= ' ORDER BY du.deleted_at DESC, du.id DESC';

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : null;
        $perPage = isset($_GET['per_page']) ? max(1, min(200, (int) $_GET['per_page'])) : null;
        $offset = $page && $perPage ? ($page - 1) * $perPage : null;
        if ($page !== null && $perPage !== null) {
            $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        }

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(function (array $row) {
            return [
                'id' => (int) $row['id'],
                'userId' => isset($row['user_id']) ? (int) $row['user_id'] : null,
                'accountType' => $row['account_type'] ?? 'personal',
                'name' => $row['name'] ?? '',
                'username' => $row['username'] ?? '',
                'email' => $row['email'] ?? '',
                'phone' => $row['phone'] ?? null,
                'villageId' => isset($row['village_id']) ? (int) $row['village_id'] : null,
                'villageName' => $row['village_name'] ?? null,
                'fatherName' => $row['father_name'] ?? null,
                'gender' => $row['gender'] ?? null,
                'dateOfBirth' => $row['date_of_birth'] ?? null,
                'bio' => $row['bio'] ?? null,
                'profileImageUrl' => $row['profile_image_url'] ?? null,
                'canCreateTextPost' => (bool) ($row['can_create_text_post'] ?? 1),
                'canCreatePollPost' => (bool) ($row['can_create_poll_post'] ?? 1),
                'canCreateImagePost' => (bool) ($row['can_create_image_post'] ?? 0),
                'canCreateImageTextPost' => (bool) ($row['can_create_image_text_post'] ?? 0),
                'blueTickStatus' => $row['blue_tick_status'] ?? 'none',
                'accountStatus' => $row['account_status'] ?? 'active',
                'showInSearch' => (bool) ($row['show_in_search'] ?? 1),
                'deleteReason' => $row['delete_reason'] ?? '',
                'customReason' => $row['custom_reason'] ?? null,
                'totalPosts' => (int) ($row['total_posts'] ?? 0),
                'totalComments' => (int) ($row['total_comments'] ?? 0),
                'totalFollowers' => (int) ($row['total_followers'] ?? 0),
                'totalFollowing' => (int) ($row['total_following'] ?? 0),
                'deletedBy' => $row['deleted_by'] ?? 'admin',
                'adminId' => isset($row['admin_id']) ? (int) $row['admin_id'] : null,
                'deletedAt' => $row['deleted_at'] ?? null,
                'ipAddress' => $row['ip_address'] ?? null,
                'userAgent' => $row['user_agent'] ?? null,
                'createdAt' => $row['created_at'] ?? null,
            ];
        }, $rows);
    }

    public function showDeleted(string $id): array
    {
        $stmt = $this->db()->prepare('
            SELECT du.*, v.name AS village_name
            FROM deleted_users du
            LEFT JOIN villages v ON v.id = du.village_id
            WHERE du.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => (int) $id]);
        $deletedUser = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$deletedUser) {
            $this->fail('Deleted user not found', 404);
            return [];
        }

        $businessStmt = $this->db()->prepare('
            SELECT b.*, c.name AS category_name, v.name AS village_name
            FROM businesses b
            LEFT JOIN business_categories c ON c.id = b.category_id
            LEFT JOIN villages v ON v.id = b.village_id
            WHERE b.user_id = :user_id
            ORDER BY b.created_at DESC, b.id DESC
        ');
        $businessStmt->execute(['user_id' => (int) ($deletedUser['user_id'] ?? 0)]);
        $businesses = $businessStmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'id' => (int) $deletedUser['id'],
            'userId' => isset($deletedUser['user_id']) ? (int) $deletedUser['user_id'] : null,
            'accountType' => $deletedUser['account_type'] ?? 'personal',
            'name' => $deletedUser['name'] ?? '',
            'username' => $deletedUser['username'] ?? '',
            'email' => $deletedUser['email'] ?? '',
            'phone' => $deletedUser['phone'] ?? null,
            'villageId' => isset($deletedUser['village_id']) ? (int) $deletedUser['village_id'] : null,
            'villageName' => $deletedUser['village_name'] ?? null,
            'fatherName' => $deletedUser['father_name'] ?? null,
            'gender' => $deletedUser['gender'] ?? null,
            'dateOfBirth' => $deletedUser['date_of_birth'] ?? null,
            'bio' => $deletedUser['bio'] ?? null,
            'profileImageUrl' => $deletedUser['profile_image_url'] ?? null,
            'canCreateTextPost' => (bool) ($deletedUser['can_create_text_post'] ?? 1),
            'canCreatePollPost' => (bool) ($deletedUser['can_create_poll_post'] ?? 1),
            'canCreateImagePost' => (bool) ($deletedUser['can_create_image_post'] ?? 0),
            'canCreateImageTextPost' => (bool) ($deletedUser['can_create_image_text_post'] ?? 0),
            'blueTickStatus' => $deletedUser['blue_tick_status'] ?? 'none',
            'accountStatus' => $deletedUser['account_status'] ?? 'active',
            'showInSearch' => (bool) ($deletedUser['show_in_search'] ?? 1),
            'deleteReason' => $deletedUser['delete_reason'] ?? '',
            'customReason' => $deletedUser['custom_reason'] ?? null,
            'totalPosts' => (int) ($deletedUser['total_posts'] ?? 0),
            'totalComments' => (int) ($deletedUser['total_comments'] ?? 0),
            'totalFollowers' => (int) ($deletedUser['total_followers'] ?? 0),
            'totalFollowing' => (int) ($deletedUser['total_following'] ?? 0),
            'deletedBy' => $deletedUser['deleted_by'] ?? 'admin',
            'adminId' => isset($deletedUser['admin_id']) ? (int) $deletedUser['admin_id'] : null,
            'deletedAt' => $deletedUser['deleted_at'] ?? null,
            'ipAddress' => $deletedUser['ip_address'] ?? null,
            'userAgent' => $deletedUser['user_agent'] ?? null,
            'createdAt' => $deletedUser['created_at'] ?? null,
            'businesses' => array_map(function (array $business) {
                return [
                    'id' => (int) ($business['id'] ?? 0),
                    'businessName' => $business['business_name'] ?? '',
                    'ownerName' => $business['owner_name'] ?? '',
                    'phone' => $business['phone'] ?? null,
                    'email' => $business['email'] ?? null,
                    'address' => $business['address'] ?? null,
                    'categoryName' => $business['category_name'] ?? null,
                    'villageName' => $business['village_name'] ?? null,
                    'status' => $business['status'] ?? null,
                    'createdAt' => $business['created_at'] ?? null,
                    'logoUrl' => $business['logo'] ?? null,
                ];
            }, $businesses),
        ];
    }

    public function counts(): array
    {
        $activeCount = (int) $this->db()->query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")->fetchColumn();
        $deletedCount = (int) $this->db()->query("SELECT COUNT(*) FROM deleted_users")->fetchColumn();
        return [
            'active' => $activeCount,
            'deleted' => $deletedCount,
        ];
    }

    public function permanentDelete(string $id): array
    {
        $stmt = $this->db()->prepare('SELECT * FROM deleted_users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $id]);
        $deletedUser = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$deletedUser) {
            $this->fail('Deleted user record not found', 404);
            return [];
        }

        $this->db()->beginTransaction();
        try {
            if (isset($deletedUser['user_id'])) {
                $deleteUserStmt = $this->db()->prepare('DELETE FROM users WHERE id = :user_id LIMIT 1');
                $deleteUserStmt->execute(['user_id' => (int) $deletedUser['user_id']]);
            }

            $deleteDeletedStmt = $this->db()->prepare('DELETE FROM deleted_users WHERE id = :id LIMIT 1');
            $deleteDeletedStmt->execute(['id' => (int) $id]);

            $this->db()->commit();
            return ['permanently_deleted' => true, 'id' => (int) $id];
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to permanently delete user.', 500);
            return [];
        }
    }
}
