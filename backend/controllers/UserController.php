<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\User;
use ConnectNKT\Models\UserSetting;
use ConnectNKT\Models\Notification;
use ConnectNKT\Helpers\Username;

class UserController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new User();
    }

    protected function searchColumns(): array
    {
        return ['name', 'username', 'email', 'mobile', 'bio'];
    }

    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $authUserId = $this->currentUserId();
        $params = [];
        $followedColumn = $this->followedColumn();
        $followMeta = ',
                   COALESCE((SELECT COUNT(*) FROM followers f WHERE f.' . $followedColumn . ' = users.id), 0) AS followers_count,
                   COALESCE((SELECT COUNT(*) FROM followers f WHERE f.follower_id = users.id), 0) AS following_count,' .
                   ($authUserId > 0
                       ? ' EXISTS(SELECT 1 FROM followers vf WHERE vf.follower_id = :viewer_id AND vf.' . $followedColumn . ' = users.id) AS is_following'
                       : ' 0 AS is_following');
        if ($authUserId > 0) $params['viewer_id'] = $authUserId;

        $sql = '
            SELECT users.id, users.name, users.username, users.profile_image_url,
                   users.bio, users.village_id, users.blue_tick_status, users.account_status,
                   users.created_at, villages.name AS village_name, villages.name AS village,
                   COALESCE(us.profile_visibility, \'public\') AS profile_visibility' . $followMeta . '
            FROM users
            LEFT JOIN villages ON villages.id = users.village_id
            LEFT JOIN user_settings us ON us.user_id = users.id
            WHERE users.deleted_at IS NULL
              AND users.account_status = \'active\'
              AND (us.show_in_search = 1 OR us.user_id IS NULL)
              AND COALESCE(us.profile_visibility, \'public\') <> \'private\''
        ;

        if ($term !== '') {
            $sql .= '
              AND (
                users.name LIKE :term
                OR users.username LIKE :term
                OR users.bio LIKE :term
              )'
            ;
            $params['term'] = '%' . $term . '%';
        }

        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 50)));
        $sql .= ' ORDER BY users.id DESC LIMIT ' . $limit;

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(
            fn (array $user) => $this->sanitizeUser($this->applyPrivacyFilter($this->enrichUser($user), $authUserId)),
            $users
        );
    }

    public function show(string $id): array
    {
        $user = $this->model()->find((int) $id);
        if (!$user || !empty($user['deleted_at'])) {
            $this->fail('User not found', 404);
            return [];
        }

        $authUserId = $this->currentUserId();
        $settings = $this->getUserPrivacySettings((int) $id);
        $visibility = $settings['profile_visibility'] ?? 'public';

        if ($visibility === 'private' && !$this->isAdmin() && $authUserId !== (int) $id) {
            $this->fail('This profile is private.', 403);
        }

        $baseUser = $this->appendFollowMeta($this->enrichUser($user), $authUserId);
        $filteredUser = $this->applyPrivacyFilter($baseUser, $authUserId);
        $filteredUser['contact_info'] = $this->buildContactInfoPayload($baseUser, $authUserId);
        $filteredUser['contact_info_access'] = $filteredUser['contact_info']['visible'] ? 'visible' : 'restricted';

        return $this->sanitizeUser($filteredUser);
    }

    public function search(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $authUserId = $this->currentUserId();
        $params = [];

        $sql = '
            SELECT users.id, users.name, users.username, users.profile_image_url, villages.name AS village_name,
                   COALESCE(us.profile_visibility, \'public\') AS profile_visibility
            FROM users
            LEFT JOIN villages ON villages.id = users.village_id
            LEFT JOIN user_settings us ON us.user_id = users.id
            WHERE users.deleted_at IS NULL
              AND users.account_status = \'active\'
              AND (us.show_in_search = 1 OR us.user_id IS NULL)
              AND COALESCE(us.profile_visibility, \'public\') <> \'private\''
        ;

        if ($term !== '') {
            $sql .= '
              AND (
                users.name LIKE :term
                OR users.username LIKE :term
                OR users.bio LIKE :term
              )';
            $params['term'] = '%' . $term . '%';
        }

        $sql .= ' ORDER BY users.username ASC LIMIT 10';

        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(
            fn (array $user) => $this->sanitizeUser($this->applyPrivacyFilter($this->appendFollowMeta($this->enrichUser($user), $authUserId), $authUserId)),
            $users
        );
    }

    public function store(): array
    {
        $id = $this->model()->create($this->input());
        $user = $this->model()->find($id) ?? ['id' => $id];
        return $this->sanitizeUser($this->enrichUser($user));
    }

    public function update(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        if ($authUserId !== (int) $id && !$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        if (array_key_exists('username', $data)) {
            $data['username'] = Username::normalize($data['username']);
            if (($usernameError = Username::validate($data['username'])) !== null) {
                $this->fail('Invalid username.', 422, ['username' => $usernameError]);
            }
            $stmt = $this->db()->prepare('SELECT 1 FROM users WHERE deleted_at IS NULL AND username = :username AND id <> :id LIMIT 1');
            $stmt->execute(['username' => $data['username'], 'id' => (int) $id]);
            if ($stmt->fetchColumn()) {
                $this->fail('Username is already taken.', 422, ['username' => 'Username is already taken.']);
            }
        }
        try {
            $this->model()->update((int) $id, $data);
        } catch (\PDOException $e) {
            $message = $e->getMessage();
            if (str_contains(strtolower($message), 'duplicate')) {
                if (str_contains($message, 'uq_users_username')) {
                    $this->fail('Username is already taken.', 422, ['username' => 'Username is already taken.']);
                }
                if (str_contains($message, 'uq_users_email')) {
                    $this->fail('Email is already registered.', 422, ['email' => 'Email is already registered.']);
                }
                if (str_contains($message, 'uq_users_mobile')) {
                    $this->fail('Phone number is already registered.', 422, ['mobile' => 'Phone number is already registered.']);
                }
            }
            throw $e;
        }
        $user = $this->model()->find((int) $id) ?? [];
        return $user ? $this->sanitizeUser($this->enrichUser($user)) : [];
    }

    public function destroy(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        if ($authUserId !== (int) $id && !$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    public function deleteAccount(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
            return [];
        }

        if ($authUserId !== (int) $id) {
            $this->fail('Forbidden', 403);
            return [];
        }

        $data = $this->input();
        $deleteReason = trim((string) ($data['delete_reason'] ?? $data['reason'] ?? ''));
        $customReason = trim((string) ($data['custom_reason'] ?? $data['customReason'] ?? ''));
        $confirmationText = trim((string) ($data['confirmation_text'] ?? $data['confirmation'] ?? ''));

        if ($deleteReason === '') {
            $this->fail('Please select a delete reason.', 422);
            return [];
        }

        if ($deleteReason === 'Other' && $customReason === '') {
            $this->fail('Please provide a custom reason.', 422);
            return [];
        }

        if ($customReason !== '' && mb_strlen($customReason) > 80) {
            $this->fail('Custom reason must be 80 characters or fewer.', 422);
            return [];
        }

        if ($confirmationText !== 'DELETE') {
            $this->fail('Please type DELETE to confirm account deletion.', 422);
            return [];
        }

        $this->assertCsrfToken();

        $user = $this->model()->find((int) $id);
        if (!$user) {
            $this->fail('User not found', 404);
            return [];
        }

        $this->ensureDeletedUsersTable();

        $this->db()->beginTransaction();
        try {
            $this->createDeletedUserBackup($user, $deleteReason, $customReason, 'user');
            $stmt = $this->db()->prepare('DELETE FROM users WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => (int) $id]);
            $this->db()->commit();

            return ['deleted' => true, 'id' => (int) $id];
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to delete account: ' . $e->getMessage(), 500);
            return [];
        }
    }

    private function assertCsrfToken(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $headerToken = trim((string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_SERVER['HTTP_X_CSRF-TOKEN'] ?? $_SERVER['HTTP_X_CSRFTOKEN'] ?? ''));
        $cookieToken = trim((string) ($_COOKIE['csrf_token'] ?? ''));
        $sessionToken = trim((string) ($_SESSION['csrf_token'] ?? ''));
        // CSRF tokens are server-generated during authentication. Never seed
        // the session from a client-controlled cookie or request header.
        $expectedToken = $headerToken !== '' ? $headerToken : $cookieToken;

        if ($expectedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $expectedToken)) {
            $this->fail('Invalid security token.', 419);
        }
    }

    protected function ensureDeletedUsersTable(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS deleted_users (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NULL,
                account_type ENUM('personal','business') NOT NULL,
                name VARCHAR(120) NOT NULL,
                username VARCHAR(60) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                village_id BIGINT UNSIGNED DEFAULT NULL,
                father_name VARCHAR(120) DEFAULT NULL,
                gender VARCHAR(20) DEFAULT NULL,
                date_of_birth DATE DEFAULT NULL,
                bio TEXT DEFAULT NULL,
                profile_image_url VARCHAR(255) DEFAULT NULL,
                can_create_text_post TINYINT(1) DEFAULT 1,
                can_create_poll_post TINYINT(1) DEFAULT 1,
                can_create_image_post TINYINT(1) DEFAULT 0,
                can_create_image_text_post TINYINT(1) DEFAULT 0,
                blue_tick_status VARCHAR(20) DEFAULT 'none',
                account_status VARCHAR(20) DEFAULT 'active',
                show_in_search TINYINT(1) DEFAULT 1,
                delete_reason VARCHAR(100) NOT NULL,
                custom_reason TEXT DEFAULT NULL,
                total_posts INT DEFAULT 0,
                total_comments INT DEFAULT 0,
                total_followers INT DEFAULT 0,
                total_following INT DEFAULT 0,
                deleted_by ENUM('user','admin') NOT NULL,
                admin_id BIGINT UNSIGNED DEFAULT NULL,
                deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45) DEFAULT NULL,
                user_agent TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(user_id),
                INDEX(username),
                INDEX(email),
                INDEX(deleted_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        $this->db()->exec($sql);

        $columns = [
            ['father_name', "VARCHAR(120) DEFAULT NULL"],
            ['gender', "VARCHAR(20) DEFAULT NULL"],
            ['date_of_birth', 'DATE DEFAULT NULL'],
            ['bio', 'TEXT DEFAULT NULL'],
            ['profile_image_url', "VARCHAR(255) DEFAULT NULL"],
            ['can_create_text_post', 'TINYINT(1) DEFAULT 1'],
            ['can_create_poll_post', 'TINYINT(1) DEFAULT 1'],
            ['can_create_image_post', 'TINYINT(1) DEFAULT 0'],
            ['can_create_image_text_post', 'TINYINT(1) DEFAULT 0'],
            ['blue_tick_status', "VARCHAR(20) DEFAULT 'none'"],
            ['account_status', "VARCHAR(20) DEFAULT 'active'"],
            ['show_in_search', 'TINYINT(1) DEFAULT 1'],
        ];

        foreach ($columns as [$column, $definition]) {
            try {
                $this->db()->exec("ALTER TABLE deleted_users ADD COLUMN {$column} {$definition}");
            } catch (\Throwable) {
                // Ignore if the column already exists.
            }
        }
    }

    protected function createDeletedUserBackup(array $user, string $deleteReason, string $customReason, string $deletedBy, ?int $adminId = null): void
    {
        $userId = (int) ($user['id'] ?? 0);
        $stmt = $this->db()->prepare('
            INSERT INTO deleted_users (
                user_id,
                account_type,
                name,
                username,
                email,
                phone,
                village_id,
                father_name,
                gender,
                date_of_birth,
                bio,
                profile_image_url,
                can_create_text_post,
                can_create_poll_post,
                can_create_image_post,
                can_create_image_text_post,
                blue_tick_status,
                account_status,
                show_in_search,
                delete_reason,
                custom_reason,
                total_posts,
                total_comments,
                total_followers,
                total_following,
                deleted_by,
                admin_id,
                deleted_at,
                ip_address,
                user_agent
            ) VALUES (
                :user_id,
                :account_type,
                :name,
                :username,
                :email,
                :phone,
                :village_id,
                :father_name,
                :gender,
                :date_of_birth,
                :bio,
                :profile_image_url,
                :can_create_text_post,
                :can_create_poll_post,
                :can_create_image_post,
                :can_create_image_text_post,
                :blue_tick_status,
                :account_status,
                :show_in_search,
                :delete_reason,
                :custom_reason,
                :total_posts,
                :total_comments,
                :total_followers,
                :total_following,
                :deleted_by,
                :admin_id,
                CURRENT_TIMESTAMP,
                :ip_address,
                :user_agent
            )
        ');

        $stmt->execute([
            'user_id' => $userId,
            'account_type' => 'personal',
            'name' => trim((string) ($user['name'] ?? '')),
            'username' => trim((string) ($user['username'] ?? '')),
            'email' => trim((string) ($user['email'] ?? '')),
            'phone' => trim((string) ($user['mobile'] ?? '')),
            'village_id' => isset($user['village_id']) ? (int) $user['village_id'] : null,
            'father_name' => trim((string) ($user['father_name'] ?? '')),
            'gender' => trim((string) ($user['gender'] ?? '')),
            'date_of_birth' => isset($user['date_of_birth']) && $user['date_of_birth'] !== '' ? date('Y-m-d', strtotime((string) $user['date_of_birth'])) : null,
            'bio' => trim((string) ($user['bio'] ?? '')),
            'profile_image_url' => trim((string) ($user['profile_image_url'] ?? '')),
            'can_create_text_post' => !empty($user['can_create_text_post']) ? 1 : 0,
            'can_create_poll_post' => !empty($user['can_create_poll_post']) ? 1 : 0,
            'can_create_image_post' => !empty($user['can_create_image_post']) ? 1 : 0,
            'can_create_image_text_post' => !empty($user['can_create_image_text_post']) ? 1 : 0,
            'blue_tick_status' => trim((string) ($user['blue_tick_status'] ?? 'none')),
            'account_status' => trim((string) ($user['account_status'] ?? 'active')),
            'show_in_search' => isset($user['show_in_search']) ? (int) $user['show_in_search'] : 1,
            'delete_reason' => $deleteReason,
            'custom_reason' => $customReason !== '' ? $customReason : null,
            'total_posts' => (int) $this->countUserRows($userId, 'posts'),
            'total_comments' => (int) $this->countUserRows($userId, 'post_comments'),
            'total_followers' => (int) $this->countUserRelations($userId, 'followers', 'followed_id'),
            'total_following' => (int) $this->countUserRelations($userId, 'followers', 'follower_id'),
            'deleted_by' => $deletedBy,
            'admin_id' => $adminId,
            'ip_address' => trim((string) ($_SERVER['REMOTE_ADDR'] ?? '')),
            'user_agent' => trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
        ]);
    }

    protected function countUserRows(int $userId, string $table): int
    {
        $stmt = $this->db()->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = :user_id");
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    protected function countUserRelations(int $userId, string $table, string $column): int
    {
        $stmt = $this->db()->prepare("SELECT COUNT(*) FROM {$table} WHERE {$column} = :user_id");
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function showByUsername(string $username): array
    {
        $stmt = $this->db()->prepare('
            SELECT users.*, villages.name AS village_name
            FROM users
            LEFT JOIN villages ON villages.id = users.village_id
            WHERE users.deleted_at IS NULL
              AND (users.username = :username OR users.email = :email OR users.id = :id)
            LIMIT 1
        ');
        $stmt->execute([
            'username' => $username,
            'email' => $username,
            'id' => ctype_digit($username) ? (int) $username : -1,
        ]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) {
            $this->fail('User not found', 404);
        }
        
        $userId = (int) ($user['id'] ?? 0);
        
        if (!$this->canViewProfile($userId, $this->currentUserId())) {
            $this->fail('This profile is private.', 403);
        }
        
        if (!isset($user['village']) || trim((string) $user['village']) === '') {
            $user['village'] = $user['village_name'] ?? null;
        }

        $authUserId = $this->currentUserId();
        $baseUser = $this->appendFollowMeta($this->enrichUser($user), $authUserId);
        $filteredUser = $this->applyPrivacyFilter($baseUser, $authUserId);
        $filteredUser['contact_info'] = $this->buildContactInfoPayload($baseUser, $authUserId);
        $filteredUser['contact_info_access'] = $filteredUser['contact_info']['visible'] ? 'visible' : 'restricted';

        return $this->sanitizeUser($filteredUser);
    }

    public function followers(string $id): array
    {
        if ($this->currentUserId() <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $targetUserId = (int) $id;
        if (!$this->model()->find($targetUserId)) {
            $this->fail('User not found', 404);
        }
        
        // Check if followers list is visible
        if (!$this->canViewFollowersList($targetUserId, $this->currentUserId())) {
            return ['user_id' => $targetUserId, 'followers' => [], 'private' => true];
        }
        
        $stmt = $this->db()->prepare('
            SELECT u.*
            FROM followers f
            JOIN users u ON u.id = f.follower_id
            WHERE f.' . $this->followedColumn() . ' = :id
              AND u.deleted_at IS NULL
            ORDER BY f.created_at DESC
        ');
        $stmt->execute(['id' => $targetUserId]);
        $followers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        return ['user_id' => $targetUserId, 'followers' => array_map(
            fn (array $follower) => $this->sanitizeUser($this->applyPrivacyFilter($follower)),
            $followers
        )];
    }

    public function following(string $id): array
    {
        if ($this->currentUserId() <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $targetUserId = (int) $id;
        if (!$this->model()->find($targetUserId)) {
            $this->fail('User not found', 404);
        }
        
        // Check if following list is visible
        if (!$this->canViewFollowingList($targetUserId, $this->currentUserId())) {
            return ['user_id' => $targetUserId, 'following' => [], 'private' => true];
        }
        
        $stmt = $this->db()->prepare('
            SELECT u.*
            FROM followers f
            JOIN users u ON u.id = f.' . $this->followedColumn() . '
            WHERE f.follower_id = :id
              AND u.deleted_at IS NULL
            ORDER BY f.created_at DESC
        ');
        $stmt->execute(['id' => $targetUserId]);
        $following = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        return ['user_id' => $targetUserId, 'following' => array_map(
            fn (array $followedUser) => $this->sanitizeUser($this->applyPrivacyFilter($followedUser)),
            $following
        )];
    }

    public function follow(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $followedId = (int) $id;
        if ($followedId <= 0 || !$this->model()->find($followedId)) {
            $this->fail('User not found', 404);
        }
        if ($authUserId === $followedId) {
            $this->fail('You cannot follow yourself.', 422);
        }
        if ($this->getAccountStatus($followedId) !== 'active') {
            $this->fail('This account is not available.', 403);
        }

        // Check if follow relationship already exists
        if ($this->isFollowing($authUserId, $followedId)) {
            return [
                'followed_user_id' => $followedId,
                'followed' => true,
                'is_following' => true,
                'followers_count' => $this->countFollowers($followedId),
                'following_count' => $this->countFollowing($followedId),
            ];
        }

        $followedColumn = $this->followedColumn();
        $this->db()->beginTransaction();
        try {
            $stmt = $this->db()->prepare("
                INSERT INTO followers (follower_id, {$followedColumn})
                VALUES (:follower_id, :followed_id)
            ");
            $stmt->execute([
                'follower_id' => $authUserId,
                'followed_id' => $followedId,
            ]);

            $this->db()->commit();
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to follow user: ' . $e->getMessage(), 500);
            return [];
        }

        $actorName = $this->getActorShortName($authUserId);
        Notification::createNotification(
            $this->db(),
            $followedId,
            $authUserId,
            'follow',
            'Follow',
            $actorName . ' started following you.',
            'user',
            $authUserId
        );

        return [
            'followed_user_id' => $followedId,
            'followed' => true,
            'is_following' => true,
            'followers_count' => $this->countFollowers($followedId),
            'following_count' => $this->countFollowing($followedId),
        ];
    }

    public function unfollow(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $followedId = (int) $id;
        if ($followedId <= 0 || !$this->model()->find($followedId)) {
            $this->fail('User not found', 404);
        }
        if ($authUserId === $followedId) {
            $this->fail('You cannot unfollow yourself.', 422);
        }

        // Check if follow relationship exists
        if (!$this->isFollowing($authUserId, $followedId)) {
            return [
                'followed_user_id' => $followedId,
                'unfollowed' => true,
                'is_following' => false,
                'followers_count' => $this->countFollowers($followedId),
                'following_count' => $this->countFollowing($followedId),
            ];
        }

        $followedColumn = $this->followedColumn();
        $this->db()->beginTransaction();
        try {
            $stmt = $this->db()->prepare("
                DELETE FROM followers
                WHERE follower_id = :follower_id
                  AND {$followedColumn} = :followed_id
                LIMIT 1
            ");
            $stmt->execute([
                'follower_id' => $authUserId,
                'followed_id' => $followedId,
            ]);

            // Decrement target user's followers override if set, preventing negative counts
            $stmtUpdateFollowed = $this->db()->prepare("
                UPDATE users 
                SET followers_count_override = CASE WHEN followers_count_override > 0 THEN followers_count_override - 1 ELSE 0 END
                WHERE id = :id AND followers_count_override IS NOT NULL
            ");
            $stmtUpdateFollowed->execute(['id' => $followedId]);

            // Decrement current user's following override if set, preventing negative counts
            $stmtUpdateFollower = $this->db()->prepare("
                UPDATE users 
                SET following_count_override = CASE WHEN following_count_override > 0 THEN following_count_override - 1 ELSE 0 END
                WHERE id = :id AND following_count_override IS NOT NULL
            ");
            $stmtUpdateFollower->execute(['id' => $authUserId]);

            $this->db()->commit();
        } catch (\Throwable $e) {
            $this->db()->rollBack();
            $this->fail('Failed to unfollow user: ' . $e->getMessage(), 500);
            return [];
        }

        return [
            'followed_user_id' => $followedId,
            'unfollowed' => true,
            'is_following' => false,
            'followers_count' => $this->countFollowers($followedId),
            'following_count' => $this->countFollowing($followedId),
        ];
    }

    public function hide(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->db()->prepare('
            UPDATE users
            SET account_status = :account_status,
                hidden_at = CURRENT_TIMESTAMP,
                suspended_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => (int) $id,
            'account_status' => 'hidden',
        ]);

        return ['user_id' => (int) $id, 'hidden' => true];
    }

    public function restore(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->db()->prepare('
            UPDATE users
            SET account_status = :account_status,
                hidden_at = NULL,
                suspended_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => (int) $id,
            'account_status' => 'active',
        ]);

        return ['user_id' => (int) $id, 'restored' => true];
    }

    public function suspend(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        if ($authUserId !== (int) $id && !$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->db()->prepare('
            UPDATE users
            SET account_status = :account_status,
                suspended_at = CURRENT_TIMESTAMP,
                hidden_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => (int) $id,
            'account_status' => 'suspended',
        ]);

        return ['user_id' => (int) $id, 'suspended' => true];
    }

    public function avatar(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        if ($authUserId !== (int) $id) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $profileImageUrl = trim((string) ($data['profile_image_url'] ?? $data['avatar'] ?? ''));
        if ($profileImageUrl === '') {
            $this->fail('Profile image is required.', 422);
        }
        $this->assertValidAvatar($profileImageUrl);

        $stmt = $this->db()->prepare('
            UPDATE users
            SET profile_image_url = :profile_image_url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => $authUserId,
            'profile_image_url' => $profileImageUrl,
        ]);

        return [
            'user_id' => $authUserId,
            'uploaded' => true,
            'profile_image_url' => $profileImageUrl,
        ];
    }

    public function report(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $claims = $this->currentUserClaims();
        if (($claims['type'] ?? 'user') === 'admin') {
            $this->fail('Admins cannot report profiles. Please use moderation tools.', 403);
        }

        $reportedUserId = (int) $id;
        if ($reportedUserId <= 0) {
            $this->fail('User not found', 404);
        }

        if ($authUserId === $reportedUserId) {
            $this->fail('You cannot report your own profile.', 422);
        }

        $data = $this->input();
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            $this->fail('Please provide a reason for reporting this profile.', 422);
        }

        $stmt = $this->db()->prepare('SELECT id FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $reportedUserId]);
        $targetUser = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$targetUser) {
            $this->fail('User not found', 404);
        }

        $reporterStmt = $this->db()->prepare('SELECT name, username FROM users WHERE id = :id LIMIT 1');
        $reporterStmt->execute(['id' => $authUserId]);
        $reporter = $reporterStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $payload = [
            'report_type' => 'user',
            'reported_user_id' => $reportedUserId,
            'reporter_user_id' => $authUserId,
            'reported_by_display_name' => trim((string) ($reporter['name'] ?? $reporter['username'] ?? '')),
            'reason' => $reason,
            'status' => 'pending',
        ];

        $reportModel = new \ConnectNKT\Models\Report();
        $reportId = $reportModel->create($payload);
        $this->autoHideReportedUser($reportedUserId);

        return [
            'report_id' => $reportId,
            'reported_user_id' => $reportedUserId,
            'reason' => $reason,
            'status' => 'pending',
        ];
    }

    private function sanitizeUsers(array $users): array
    {
        return array_map(fn (array $user) => $this->sanitizeUser($user), $users);
    }

    private function buildContactInfoPayload(array $user, ?int $viewerUserId = null): array
    {
        $viewerUserId = $viewerUserId ?? $this->currentUserId();
        $userId = (int) ($user['id'] ?? 0);
        $isOwner = $viewerUserId > 0 && $userId === $viewerUserId;
        $isAdmin = $this->isAdmin();
        $settings = $this->getUserPrivacySettings($userId);
        $profileVisibility = $settings['profile_visibility'] ?? 'public';
        $isFollower = $viewerUserId > 0 ? $this->isFollowing($viewerUserId, $userId) : false;

        $email = trim((string) ($user['email'] ?? ''));
        $mobile = trim((string) ($user['mobile'] ?? ''));
        $dateOfBirth = trim((string) ($user['date_of_birth'] ?? ''));

        if ($viewerUserId <= 0) {
            return [
                'visible' => false,
                'reason' => 'not_logged_in',
                'message' => 'Please log in to view contact information.',
                'email' => null,
                'mobile' => null,
                'date_of_birth' => null,
                'email_visible' => false,
                'mobile_visible' => false,
                'dob_visible' => false,
            ];
        }

        if ($isOwner || $isAdmin) {
            return [
                'visible' => true,
                'reason' => 'owner',
                'message' => 'Contact information is available.',
                'email' => $email !== '' ? $email : null,
                'mobile' => $mobile !== '' ? $mobile : null,
                'date_of_birth' => $dateOfBirth !== '' ? $dateOfBirth : null,
                'email_visible' => true,
                'mobile_visible' => true,
                'dob_visible' => true,
            ];
        }

        if ($profileVisibility === 'private') {
            return [
                'visible' => false,
                'reason' => 'private',
                'message' => 'Contact details are private for this profile.',
                'email' => null,
                'mobile' => null,
                'date_of_birth' => null,
                'email_visible' => false,
                'mobile_visible' => false,
                'dob_visible' => false,
            ];
        }

        if ($profileVisibility === 'followers' && !$isFollower) {
            return [
                'visible' => false,
                'reason' => 'followers_only',
                'message' => 'Follow this account to view contact information.',
                'email' => null,
                'mobile' => null,
                'date_of_birth' => null,
                'email_visible' => false,
                'mobile_visible' => false,
                'dob_visible' => false,
            ];
        }

        $emailVisible = $this->isContactFieldVisible($settings['email_visibility'] ?? 'public', $isFollower);
        $mobileVisible = $this->isContactFieldVisible($settings['phone_visibility'] ?? 'public', $isFollower);
        $dobVisible = $profileVisibility === 'public';

        return [
            'visible' => true,
            'reason' => 'public',
            'message' => 'Contact information is available.',
            'email' => $emailVisible && $email !== '' ? $email : null,
            'mobile' => $mobileVisible && $mobile !== '' ? $mobile : null,
            'date_of_birth' => $dobVisible && $dateOfBirth !== '' ? $dateOfBirth : null,
            'email_visible' => $emailVisible,
            'mobile_visible' => $mobileVisible,
            'dob_visible' => $dobVisible,
        ];
    }

    private function autoHideReportedUser(int $userId): void
    {
        $stmt = $this->db()->prepare('
            SELECT COUNT(*)
            FROM reports
            WHERE deleted_at IS NULL
              AND reported_user_id = :user_id
        ');
        $stmt->execute([
            'user_id' => $userId,
        ]);

        if ((int) $stmt->fetchColumn() < 20) {
            return;
        }

        $hideStmt = $this->db()->prepare('
            UPDATE users
            SET account_status = :account_status,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $hideStmt->execute([
            'id' => $userId,
            'account_status' => 'hidden',
        ]);
    }

    private function isContactFieldVisible(string $visibility, bool $isFollower): bool
    {
        if ($visibility === 'public') {
            return true;
        }

        if ($visibility === 'followers') {
            return $isFollower;
        }

        return false;
    }

    private function getActorShortName(int $userId): string
    {
        $stmt = $this->db()->prepare('SELECT name, username FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? (trim((string) ($row['name'] ?? '')) ?: ($row['username'] ?? 'Someone')) : 'Someone';
    }

    private function sanitizeUser(array $user): array
    {
        unset($user['password_hash']);
        foreach (['can_create_text_post', 'can_create_poll_post', 'can_create_image_post', 'can_create_image_text_post'] as $field) {
            if (array_key_exists($field, $user)) {
                $user[$field] = (bool) $user[$field];
            }
        }
        return $user;
    }

    private function enrichUser(array $user): array
    {
        if (!isset($user['village']) || trim((string) $user['village']) === '') {
            $stmt = (new User())->pdo()->prepare('
                SELECT villages.name AS village_name
                FROM users
                LEFT JOIN villages ON villages.id = users.village_id
                WHERE users.id = :id
                LIMIT 1
            ');
            $stmt->execute(['id' => (int) ($user['id'] ?? 0)]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
            $user['village'] = $row['village_name'] ?? $user['village'] ?? null;
        }

        $existingStatus = trim((string) ($user['blue_tick_status'] ?? ''));
        if ($existingStatus !== '') {
            $user['blue_tick_status'] = $existingStatus;
            return $user;
        }

        // Add blue tick status from request history only when users table status is not explicitly set
        $stmt = (new User())->pdo()->prepare('
            SELECT request_status FROM blue_tick_requests
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 1
        ');
        $stmt->execute(['user_id' => (int) ($user['id'] ?? 0)]);
        $btRequest = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($btRequest && $btRequest['request_status'] === 'approved') {
            $user['blue_tick_status'] = 'verified';
        } else if ($btRequest && $btRequest['request_status'] === 'pending') {
            $user['blue_tick_status'] = 'pending';
        } else if ($btRequest && $btRequest['request_status'] === 'rejected') {
            $user['blue_tick_status'] = 'rejected';
        } else {
            $user['blue_tick_status'] = 'not_requested';
        }

        return $user;
    }

    /**
     * Get user privacy settings
     */
    private function getUserPrivacySettings(int $userId): array
    {
        $stmt = $this->db()->prepare('
            SELECT profile_visibility, email_visibility, phone_visibility,
                   followers_visibility, following_visibility, show_in_search
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId]);
        $settings = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        return $settings ? $settings : [
            'profile_visibility' => 'public',
            'email_visibility' => 'public',
            'phone_visibility' => 'public',
            'followers_visibility' => 'public',
            'following_visibility' => 'public',
            'show_in_search' => 1,
        ];
    }

    /**
     * Check if a viewer can see the profile of a target user.
     */
    private function checkProfileVisibility(int $targetUserId, int $viewerUserId): bool
    {
        return $this->canViewProfile($targetUserId, $viewerUserId);
    }

    /**
     * Check whether an account is visible to the requested viewer.
     * Hidden and suspended accounts are only visible to the owner and admins.
     */
    private function canViewProfile(int $targetUserId, int $viewerUserId): bool
    {
        if ($targetUserId <= 0) {
            return false;
        }

        if ($targetUserId === $viewerUserId) {
            return true;
        }

        if ($this->isAdmin()) {
            return true;
        }

        $accountStatus = $this->getAccountStatus($targetUserId);
        if ($accountStatus !== 'active') {
            return false;
        }

        $settings = $this->getUserPrivacySettings($targetUserId);
        $visibility = $settings['profile_visibility'] ?? 'public';

        if ($visibility === 'public') {
            return true;
        }

        if ($visibility === 'followers' || $visibility === 'private') {
            return $viewerUserId > 0 && $this->isFollowing($viewerUserId, $targetUserId);
        }

        return true;
    }

    /**
     * Check if a viewer can see the followers list
     */
    private function canViewFollowersList(int $targetUserId, int $viewerUserId): bool
    {
        if ($targetUserId === $viewerUserId) {
            return true;
        }
        
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->getAccountStatus($targetUserId) !== 'active') {
            return false;
        }

        $settings = $this->getUserPrivacySettings($targetUserId);
        $profileVisibility = $settings['profile_visibility'] ?? 'public';
        $followersVisibility = $settings['followers_visibility'] ?? 'public';

        if (($profileVisibility === 'private' || $profileVisibility === 'followers') && !$this->isFollowing($viewerUserId, $targetUserId)) {
            return false;
        }

        if ($followersVisibility === 'public') {
            return true;
        }

        if ($followersVisibility === 'followers') {
            return $this->isFollowing($viewerUserId, $targetUserId);
        }

        return false;
    }

    /**
     * Check if a viewer can see the following list
     */
    private function canViewFollowingList(int $targetUserId, int $viewerUserId): bool
    {
        if ($targetUserId === $viewerUserId) {
            return true;
        }
        
        if ($this->isAdmin()) {
            return true;
        }

        if ($this->getAccountStatus($targetUserId) !== 'active') {
            return false;
        }

        $settings = $this->getUserPrivacySettings($targetUserId);
        $profileVisibility = $settings['profile_visibility'] ?? 'public';
        $followingVisibility = $settings['following_visibility'] ?? 'public';

        if (($profileVisibility === 'private' || $profileVisibility === 'followers') && !$this->isFollowing($viewerUserId, $targetUserId)) {
            return false;
        }

        if ($followingVisibility === 'public') {
            return true;
        }

        if ($followingVisibility === 'followers') {
            return $this->isFollowing($viewerUserId, $targetUserId);
        }

        return false;
    }

    /**
     * Apply privacy filters to user data before returning
     */
    private function applyPrivacyFilter(array $user, ?int $viewerUserId = null): array
    {
        $viewerUserId = $viewerUserId ?? $this->currentUserId();
        $userId = (int) ($user['id'] ?? 0);
        
        // Owner can see everything, admin can see everything
        if ($userId === $viewerUserId || $this->isAdmin()) {
            return $user;
        }
        
        $settings = $this->getUserPrivacySettings($userId);
        $profileVisibility = $settings['profile_visibility'] ?? 'public';
        $isFollower = $viewerUserId > 0 ? $this->isFollowing($viewerUserId, $userId) : false;

        if (($profileVisibility === 'private' || $profileVisibility === 'followers') && !$isFollower) {
            return [
                'id' => $userId,
                'username' => $user['username'] ?? '',
                'profile_image_url' => $user['profile_image_url'] ?? $user['avatar_url'] ?? null,
                'profile_visibility' => $profileVisibility,
            ];
        }

        if ($profileVisibility === 'followers' && !$isFollower) {
            return [
                'id' => $userId,
                'username' => $user['username'] ?? '',
                'profile_image_url' => $user['profile_image_url'] ?? $user['avatar_url'] ?? null,
                'profile_visibility' => 'followers',
            ];
        }

        // Email visibility
        $emailVisibility = $settings['email_visibility'] ?? 'public';
        if ($emailVisibility === 'followers' && !$isFollower) {
            unset($user['email']);
        } elseif ($emailVisibility === 'private') {
            unset($user['email']);
        }
        
        // Phone visibility
        $phoneVisibility = $settings['phone_visibility'] ?? 'public';
        if ($phoneVisibility === 'followers' && !$isFollower) {
            unset($user['mobile']);
        } elseif ($phoneVisibility === 'private') {
            unset($user['mobile']);
        }
        
        return $user;
    }

    private function shouldIncludeSearchUser(array $user, int $viewerUserId): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if ((int) ($user['id'] ?? 0) === $viewerUserId) {
            return true;
        }

        $profileVisibility = trim((string) ($user['profile_visibility'] ?? 'public'));
        return $profileVisibility !== 'private';
    }

    /**
     * Check if current user is admin (used for bypassing privacy)
     */
    private function isAdmin(): bool
    {
        $claims = $this->currentUserClaims();
        return isset($claims['type'], $claims['role']) && $claims['type'] === 'admin' && in_array($claims['role'], ['super_admin', 'moderator', 'editor'], true);
    }

    private function assertOwnProfile(int $id): void
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        if ($authUserId !== $id) {
            $this->fail('Forbidden', 403);
        }
    }

    private function assertValidAvatar(string $profileImageUrl): void
    {
        if (!str_starts_with($profileImageUrl, 'data:image/png;base64,')) {
            $this->fail('Only PNG images are allowed.', 422);
        }

        $encoded = substr($profileImageUrl, strlen('data:image/png;base64,'));
        $decoded = base64_decode($encoded, true);
        if ($decoded === false) {
            $this->fail('Only PNG images are allowed.', 422);
        }

        if (strlen($decoded) > 200 * 1024) {
            $this->fail('Image size must be less than 200 KB.', 422);
        }

        $info = @getimagesizefromstring($decoded);
        if (!is_array($info) || strtolower((string) ($info['mime'] ?? '')) !== 'image/png') {
            $this->fail('Only valid PNG images are allowed.', 422);
        }
    }

    private function countFollowers(int $userId): int
    {
        $followedColumn = $this->followedColumn();
        $stmt = $this->db()->prepare('
            SELECT COALESCE(u.followers_count_override, COUNT(f.id), 0) AS total
            FROM users u
            LEFT JOIN followers f ON f.' . $followedColumn . ' = u.id
            WHERE u.id = :id
            GROUP BY u.id, u.followers_count_override
            LIMIT 1
        ');
        $stmt->execute(['id' => $userId]);
        return (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
    }

    private function countFollowing(int $userId): int
    {
        $stmt = $this->db()->prepare('
            SELECT COALESCE(u.following_count_override, COUNT(f.id), 0) AS total
            FROM users u
            LEFT JOIN followers f ON f.follower_id = u.id
            WHERE u.id = :id
            GROUP BY u.id, u.following_count_override
            LIMIT 1
        ');
        $stmt->execute(['id' => $userId]);
        return (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
    }

    private function isFollowing(int $followerId, int $followedId): bool
    {
        $stmt = $this->db()->prepare('SELECT 1 FROM followers WHERE follower_id = :follower_id AND ' . $this->followedColumn() . ' = :followed_id LIMIT 1');
        $stmt->execute([
            'follower_id' => $followerId,
            'followed_id' => $followedId,
        ]);
        return (bool) $stmt->fetchColumn();
    }

    private function appendFollowMeta(array $user, ?int $authUserId = null): array
    {
        $userId = (int) ($user['id'] ?? 0);
        if ($userId <= 0) {
            return $user;
        }

        $authUserId = $authUserId ?? $this->currentUserId();
        $user['followers_count'] = $this->countFollowers($userId);
        $user['following_count'] = $this->countFollowing($userId);
        $user['is_following'] = $authUserId > 0 && $authUserId !== $userId ? $this->isFollowing($authUserId, $userId) : false;
        $user = $this->appendAvatarAliases($user);

        return $user;
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

    public function suggestions(): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            return [];
        }

        // Get admin settings for suggestion limit
        $settingsModel = new \ConnectNKT\Models\SiteSetting();
        $settings = $settingsModel->all([], 'id ASC', 1)[0] ?? [];
        $limit = (int) ($settings['suggestion_carousel_size'] ?? 10);
        $isEnabled = (bool) ($settings['enable_profile_suggestions'] ?? true);

        if (!$isEnabled) {
            return [];
        }

        // Get current user's location info
        $stmt = $this->db()->prepare('
            SELECT u.village_id, v.tehsil_id, t.district_id
            FROM users u
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN tehsils t ON t.id = v.tehsil_id
            WHERE u.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $authUserId]);
        $loc = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
        
        $myVillageId = $loc['village_id'] ?? 0;
        $myTehsilId = $loc['tehsil_id'] ?? 0;
        $myDistrictId = $loc['district_id'] ?? 0;

        $followedColumn = $this->followedColumn();
        
        // Exclude followed users, blocked users (if exists), muted users (if exists), hidden/suspended, and self
        // Note: Blocked/Muted tables not found in basic search, but I'll filter by account_status
        $sql = "
            SELECT 
                u.*,
                v.name AS village_name,
                v.tehsil_id,
                t.district_id,
                (CASE WHEN u.village_id = :my_village THEN 100 ELSE 0 END +
                 CASE WHEN v.tehsil_id = :my_tehsil THEN 50 ELSE 0 END +
                 CASE WHEN t.district_id = :my_district THEN 25 ELSE 0 END +
                 u.trust_score * 2 +
                 COALESCE(post_counts.total, 0) * 5
                ) AS recommendation_score
            FROM users u
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN tehsils t ON t.id = v.tehsil_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM posts
                WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY user_id
            ) post_counts ON post_counts.user_id = u.id
            WHERE u.id != :auth_id
              AND u.deleted_at IS NULL
              AND u.account_status = 'active'
              AND u.id NOT IN (
                  SELECT {$followedColumn} 
                  FROM followers 
                  WHERE follower_id = :auth_id
              )
            ORDER BY recommendation_score DESC, u.created_at DESC, RAND()
            LIMIT :limit
        ";

        $stmt = $this->db()->prepare($sql);
        $stmt->bindValue(':auth_id', $authUserId, \PDO::PARAM_INT);
        $stmt->bindValue(':my_village', $myVillageId, \PDO::PARAM_INT);
        $stmt->bindValue(':my_tehsil', $myTehsilId, \PDO::PARAM_INT);
        $stmt->bindValue(':my_district', $myDistrictId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return $this->sanitizeUsers(array_map(
            fn (array $user) => $this->appendFollowMeta($this->appendAvatarAliases($this->enrichUser($user)), $authUserId),
            $users
        ));
    }

    public function top(): array
    {
        $authUserId = $this->currentUserId();
        $followedColumn = $this->followedColumn();
        $stmt = $this->db()->prepare("
            SELECT 
                u.*,
                COALESCE(u.followers_count_override, COUNT(f.id), 0) AS followers_count,
                villages.name AS village_name
            FROM users u
            LEFT JOIN followers f ON f.{$followedColumn} = u.id
            LEFT JOIN villages ON villages.id = u.village_id
            WHERE u.deleted_at IS NULL
              AND u.account_status = 'active'
            GROUP BY u.id, u.followers_count_override
            ORDER BY followers_count DESC
            LIMIT 20
        ");
        $stmt->execute();
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        $filteredUsers = array_filter($users, fn (array $user) => $this->canViewProfile((int) ($user['id'] ?? 0), $authUserId));
        return $this->sanitizeUsers(array_map(
            fn (array $user) => $this->appendFollowMeta($this->appendAvatarAliases($this->enrichUser($user))),
            array_slice($filteredUsers, 0, 5)
        ));
    }

    private function appendAvatarAliases(array $user): array
    {
        $avatar = trim((string) ($user['profile_image_url'] ?? $user['avatar_url'] ?? $user['profile_image'] ?? ''));
        if ($avatar !== '') {
            $user['profile_image_url'] = $avatar;
            $user['avatar_url'] = $avatar;
            $user['profile_image'] = $avatar;
            $user['avatar'] = $avatar;
            $user['photo'] = $avatar;
            $user['image'] = $avatar;
        }

        return $user;
    }

    private function getAccountStatus(int $userId): string
    {
        static $cache = [];

        if ($userId <= 0) {
            return 'unknown';
        }

        if (array_key_exists($userId, $cache)) {
            return $cache[$userId];
        }

        $stmt = $this->db()->prepare('
            SELECT account_status
            FROM users
            WHERE id = :id
              AND deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute(['id' => $userId]);
        $status = strtolower(trim((string) ($stmt->fetchColumn() ?: '')));

        return $cache[$userId] = $status !== '' ? $status : 'unknown';
    }
}
