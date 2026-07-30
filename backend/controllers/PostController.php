<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Helpers\Validator;
use ConnectNKT\Helpers\Upload;
use ConnectNKT\Helpers\Str;
use ConnectNKT\Models\Notification;
use ConnectNKT\Helpers\PollPercentage;
use ConnectNKT\Models\Post;
use ConnectNKT\Models\PostImage;
use ConnectNKT\Models\User;

class PostController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new Post();
    }

    protected function searchColumns(): array
    {
        return ['content'];
    }

    private function buildPostPrivacyWhereClause(int $viewerUserId, string $postAlias = 'p'): array
    {
        $followedColumn = $this->followedColumn();
        $isAdmin = $this->isAdmin() ? 1 : 0;

        $sql = "(
            {$postAlias}.user_id = :v_privacy_owner
            OR :is_admin_privacy = 1
            OR COALESCE(us_privacy.profile_visibility, 'public') = 'public'
            OR (
                COALESCE(us_privacy.profile_visibility, 'public') IN ('followers', 'private')
                AND :v_privacy_check > 0
                AND EXISTS (
                    SELECT 1 FROM followers f_privacy
                    WHERE f_privacy.follower_id = :v_privacy_follower
                      AND f_privacy.{$followedColumn} = {$postAlias}.user_id
                )
            )
        )";

        $params = [
            'v_privacy_owner' => $viewerUserId,
            'is_admin_privacy' => $isAdmin,
            'v_privacy_check' => $viewerUserId,
            'v_privacy_follower' => $viewerUserId,
        ];

        return [$sql, $params];
    }

    public function index(): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT 100
        ');
        $stmt->execute($privacyParams);
        return $this->normalizePosts($this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []));
    }

    public function show(string $id): array
    {
        if (ctype_digit($id)) {
            $post = $this->model()->find((int) $id);
            if (!$post || !$this->canViewPost($post)) {
                $this->fail('This post is private or unavailable.', 403);
                return [];
            }
            return $this->normalizePost($post, $this->loadUserReactionsForPost((int) $post['id']));
        }

        return $this->showBySlug($id);
    }

    public function showBySlug(string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return [];
        }

        if ($this->hasColumn('posts', 'slug')) {
            $stmt = $this->db()->prepare('
                SELECT p.*, u.username AS user_username, u.name AS user_name, u.profile_image_url AS user_profile_image_url
                FROM posts p
                JOIN users u ON u.id = p.user_id
                WHERE p.deleted_at IS NULL
                  AND p.slug = :slug
                LIMIT 1
            ');
            $stmt->execute(['slug' => $slug]);
            $post = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$post || !$this->canViewPost($post)) {
                $this->fail('This post is private or unavailable.', 403);
                return [];
            }
            return $this->normalizePost($post, $this->loadUserReactionsForPost((int) ($post['id'] ?? 0)));
        }

        $stmt = $this->db()->prepare('
            SELECT p.*, u.username AS user_username, u.name AS user_name, u.profile_image_url AS user_profile_image_url
            FROM posts p
            JOIN users u ON u.id = p.user_id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute();
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $post) {
            if ($this->resolvePostSlug($post) === $slug) {
                if (!$this->canViewPost($post)) {
                    $this->fail('This post is private or unavailable.', 403);
                    return [];
                }
                return $this->normalizePost($post, $this->loadUserReactionsForPost((int) ($post['id'] ?? 0)));
            }
        }

        return [];
    }

    public function feedLatest(): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.is_globally_pinned DESC, p.globally_pinned_at DESC, p.created_at DESC, p.id DESC
            LIMIT 100
        ');
        $stmt->execute($privacyParams);
        $allPosts = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        // Separate global pinned posts and normal posts
        $globalPinned = [];
        $normalPosts = [];
        foreach ($allPosts as $post) {
            if ((int) ($post['is_globally_pinned'] ?? 0) === 1) {
                $globalPinned[] = $post;
            } else {
                $normalPosts[] = $post;
            }
        }
        // Sort global pinned by pinned_at desc
        usort($globalPinned, function ($a, $b) {
            return strtotime((string) ($b['globally_pinned_at'] ?? '')) - strtotime((string) ($a['globally_pinned_at'] ?? ''));
        });
        // Sort normal posts by created_at desc
        usort($normalPosts, function ($a, $b) {
            return strtotime((string) ($b['created_at'] ?? '')) - strtotime((string) ($a['created_at'] ?? ''));
        });

        return $this->normalizePosts($this->filterHiddenPosts(array_merge($globalPinned, $normalPosts)));
    }

    /**
     * Personalized, ranking-based home feed.
     *
     * The score intentionally uses only signals ConnectNKT already owns: locality,
     * follows, verified status, engagement, reports and each viewer's own history.
     * `seed` only affects the small exploration component, so a refresh varies the
     * order without displacing consistently high-quality posts.
     */
    public function feedRanked(): array
    {
        $viewerId = $this->currentUserId();
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 40)));
        $seed = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['seed'] ?? '')), 0, 64);
        $rotationBucket = (string) floor(time() / (6 * 60 * 60));
        $viewerVillageId = $this->viewerVillageId($viewerId);
        $categoryInterest = $this->categoryInterestScores($viewerId);

        $candidates = [];
        foreach ($this->rankedFeedCandidates($viewerId) as $post) {
            if (!$this->canViewPost($post) || !$this->passesFeedQualityFilter($post)) {
                continue;
            }

            $post['feed_score'] = $this->feedScore(
                $post,
                $viewerId,
                $viewerVillageId,
                $categoryInterest[(int) ($post['category_id'] ?? 0)] ?? 0,
                $seed,
                $rotationBucket
            );
            $post['feed_bucket'] = $this->feedBucket($post, $viewerId, $viewerVillageId);
            $candidates[] = $post;
        }

        usort($candidates, static function (array $left, array $right): int {
            $scoreOrder = ($right['feed_score'] ?? 0) <=> ($left['feed_score'] ?? 0);
            if ($scoreOrder !== 0) {
                return $scoreOrder;
            }
            return (int) ($right['id'] ?? 0) <=> (int) ($left['id'] ?? 0);
        });

        return $this->normalizePosts($this->buildRankedFeed($candidates, $limit));
    }

    /** Record an actual viewport impression; repeated visits intentionally lower priority. */
    public function markSeen(string $id): array
    {
        $viewerId = $this->currentUserId();
        $postId = (int) $id;
        if ($viewerId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $post = $this->model()->find($postId);
        if (!$post || !$this->canViewPost($post)) {
            $this->fail('Post not found', 404);
        }

        if (!$this->hasTable('post_feed_impressions')) {
            return ['tracked' => false, 'post_id' => $postId];
        }

        try {
            $stmt = $this->db()->prepare('
                INSERT INTO post_feed_impressions (user_id, post_id, seen_count, first_seen_at, last_seen_at)
                VALUES (:user_id, :post_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    seen_count = seen_count + 1,
                    last_seen_at = CURRENT_TIMESTAMP
            ');
            $stmt->execute(['user_id' => $viewerId, 'post_id' => $postId]);
        } catch (\PDOException $e) {
            // Feed-impression analytics must never make browsing the feed fail.
            error_log('[post-seen] unable to persist impression: ' . $e->getMessage());
            return ['tracked' => false, 'post_id' => $postId];
        }

        return ['tracked' => true, 'post_id' => $postId];
    }

    public function feedRandom(): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY RAND()
            LIMIT 20
        ');
        $stmt->execute($privacyParams);
        return $this->normalizePosts($this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []));
    }

    public function feedTrending(): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.agrees_count DESC, p.id DESC
            LIMIT 20
        ');
        $stmt->execute($privacyParams);
        return $this->normalizePosts($this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []));
    }

    public function top(): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $stmt = $this->db()->prepare('
            SELECT p.*, u.username AS user_username, u.name AS user_name, u.profile_image_url AS user_profile_image_url, v.name AS village_name
            FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND u.hidden_at IS NULL
              AND u.suspended_at IS NULL
              AND ' . $privacySql . '
            ORDER BY p.agrees_count DESC, p.id DESC
            LIMIT 5
        ');
        $stmt->execute($privacyParams);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            if (!$this->canViewPost($row)) {
                continue;
            }

            $normalized = $this->normalizePost($row);
            $normalized['content'] = $row['content'] ?? '';
            $normalized['content_full'] = $row['content'] ?? '';
            $result[] = $normalized;
        }

        return array_values($result);
    }

    public function store(): array
    {
        $data = $this->input();
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        $user = (new User())->find($userId);
        if (!$user) {
            $this->fail('Authenticated user not found.', 401);
        }

        $content = trim((string) ($data['content'] ?? ''));
        $postType = strtolower(trim((string) ($data['post_type'] ?? $data['postType'] ?? '')));
        $imageData = trim((string) ($data['image'] ?? $data['image_data'] ?? $data['imageData'] ?? ''));
        $pollQuestion = trim((string) ($data['poll_question'] ?? $data['pollQuestion'] ?? ''));
        $rawPollOptions = $data['poll_options'] ?? $data['pollOptions'] ?? $data['options'] ?? [];
        $pollOptions = is_array($rawPollOptions) ? array_values(array_filter(array_map(static fn ($option) => trim((string) $option), $rawPollOptions), static fn ($option) => $option !== '')) : [];

        if ($postType === '') {
            if ($pollOptions) {
                $postType = 'poll';
            } elseif ($imageData !== '') {
                $postType = $content !== '' ? 'image_text' : 'image';
            } else {
                $postType = 'text';
            }
        }

        if (!in_array($postType, ['text', 'image', 'image_text', 'poll'], true)) {
            $this->fail('Invalid post type.', 422);
        }

        $canCreateText = (bool) ($user['can_create_text_post'] ?? 1);
        $canCreatePoll = (bool) ($user['can_create_poll_post'] ?? 1);
        $canCreateImage = (bool) ($user['can_create_image_post'] ?? 0);
        $canCreateImageText = (bool) ($user['can_create_image_text_post'] ?? 0);

        $postTypePermissionMap = [
            'text' => $canCreateText,
            'poll' => $canCreatePoll,
            'image' => $canCreateImage,
            'image_text' => $canCreateImageText,
        ];

        $hasPermission = $postTypePermissionMap[$postType] ?? false;
        if (!$hasPermission) {
            $this->fail('You do not have permission to create this type of post.', 403);
        }

        // Enforce daily post limit for normal users (5 posts per calendar day)
        if (!$this->isAdmin()) {
            $stmt = $this->db()->prepare('
                SELECT COUNT(*) 
                FROM posts 
                WHERE user_id = :user_id 
                  AND created_at >= CURDATE()
            ');
            $stmt->execute(['user_id' => $userId]);
            $todayCount = (int) $stmt->fetchColumn();

            if ($todayCount >= 5) {
                $this->fail("You have reached today's posting limit (5 posts). You can create a new post after 12:00 AM.", 429);
            }
        }

        $rawCategory = $data['category_id'] ?? $data['category'] ?? null;
        $categoryId = (int) $rawCategory;
        if ($categoryId <= 0 && is_string($rawCategory) && trim($rawCategory) !== '') {
            $stmt = $this->db()->prepare('
                SELECT id
                FROM post_categories
                WHERE deleted_at IS NULL
                  AND (slug = :value OR name = :value)
                LIMIT 1
            ');
            $stmt->execute(['value' => trim($rawCategory)]);
            $categoryId = (int) ($stmt->fetchColumn() ?: 0);
        }
        if ($categoryId <= 0) {
            $stmt = $this->db()->prepare('
                SELECT id
                FROM post_categories
                WHERE deleted_at IS NULL
                  AND (slug = :value OR name = :value)
                LIMIT 1
            ');
            $stmt->execute(['value' => 'Other']);
            $categoryId = (int) ($stmt->fetchColumn() ?: 0);
        }
        if ($categoryId <= 0) {
            $this->fail('Valid post category is required.', 422);
        }

        if (in_array($postType, ['text', 'image_text', 'poll'], true) && $content === '') {
            if ($postType === 'poll' && $pollQuestion !== '') {
                $content = $pollQuestion;
            } else {
                $this->fail('Post content is required.', 422);
            }
        }

        if ($postType === 'poll') {
            if ($pollQuestion === '') {
                $pollQuestion = $content;
            }
            if ($pollQuestion === '') {
                $this->fail('Poll question is required.', 422);
            }
            if (count($pollOptions) < 2) {
                $this->fail('At least two poll options are required.', 422);
            }
            if (count($pollOptions) > 5) {
                $this->fail('A poll can contain a maximum of 5 options.', 422);
            }
        }

        if (in_array($postType, ['text', 'image_text', 'poll'], true) && !Validator::minWords($content, 250)) {
            $this->fail('Posts must be 250 words or fewer.', 422);
        }

        $storedImagePath = null;
        if (in_array($postType, ['image', 'image_text'], true)) {
            if ($imageData === '') {
                $this->fail('Post image is required.', 422);
            }
            if (str_starts_with($imageData, 'data:image/')) {
                $uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'posts';
                $filename = Upload::storeBase64Image($imageData, $uploadDir, 'post');
                if (!$filename) {
                    $this->fail('Unable to save uploaded image.', 422);
                }
                $storedImagePath = 'uploads/posts/' . $filename;
            } else {
                $storedImagePath = $imageData;
            }
        }

        $db = $this->db();
        $db->beginTransaction();

        try {
            $payload = [
                'user_id' => $userId,
                'category_id' => $categoryId,
                'post_type' => $postType,
                'content' => $content !== '' ? $content : null,
            ];
            if ($this->hasColumn('posts', 'slug')) {
                $slugSource = $content !== '' ? $content : ($pollQuestion !== '' ? $pollQuestion : $postType);
                $slug = $this->makePostSlug($userId, $slugSource);
                if ($slug !== '') {
                    $payload['slug'] = $slug;
                }
            }

            $id = $this->model()->create($payload);

            if ($storedImagePath !== null) {
                (new PostImage($db))->create([
                    'post_id' => $id,
                    'image_url' => $storedImagePath,
                    'alt_text' => $content !== '' ? $content : null,
                    'sort_order' => 0,
                ]);
            }

            if ($postType === 'poll') {
                $pollStmt = $db->prepare('
                    INSERT INTO polls (post_id, question, total_votes)
                    VALUES (:post_id, :question, 0)
                ');
                $pollStmt->execute([
                    'post_id' => $id,
                    'question' => $pollQuestion,
                ]);
                $pollId = (int) $db->lastInsertId();

                $optionStmt = $db->prepare('
                    INSERT INTO poll_options (poll_id, option_text, votes_count, sort_order)
                    VALUES (:poll_id, :option_text, 0, :sort_order)
                ');
                foreach ($pollOptions as $index => $optionText) {
                    $optionStmt->execute([
                        'poll_id' => $pollId,
                        'option_text' => $optionText,
                        'sort_order' => $index,
                    ]);
                }
            }

            $this->syncPostMentions($id, $userId, $this->resolveMentionedUserIds($content));
            $db->commit();
            return $this->normalizePost($this->model()->find($id) ?? ['id' => $id]);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log('Post create failed: ' . $e->getMessage());
            $this->fail('Could not create post. Please try again.', 500);
        }
    }

    public function category(string $id): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $privacyParams['category_id'] = (int) $id;
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.category_id = :category_id
              AND p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute($privacyParams);
        return $this->normalizePosts($this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []));
    }

    public function village(string $id): array
    {
        $viewerId = $this->currentUserId();
        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');
        $privacyParams['village_id'] = (int) $id;
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.village_id = :village_id
              AND p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute($privacyParams);
        return $this->normalizePosts($this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []));
    }

    public function user(string $id): array
    {
        $targetUserId = (int) $id;
        $authUserId = $this->currentUserId();
        if ($targetUserId <= 0 || !$this->canViewAuthorAccount($targetUserId, $authUserId)) {
            $this->fail('This profile is private.', 403);
            return [];
        }

        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($authUserId, 'p');
        $privacyParams['user_id'] = $targetUserId;
        $stmt = $this->db()->prepare('
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.user_id = :user_id
              AND p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND ' . $privacySql . '
            ORDER BY p.created_at DESC, p.id DESC
        ');
        $stmt->execute($privacyParams);
        $allPosts = $this->filterHiddenPosts($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);

        // Separate user's pinned post and normal posts
        $pinnedPosts = [];
        $normalPosts = [];
        foreach ($allPosts as $post) {
            if ((int) ($post['is_pinned'] ?? 0) === 1) {
                $pinnedPosts[] = $post;
            } else {
                $normalPosts[] = $post;
            }
        }
        // Sort pinned by pinned_at desc
        usort($pinnedPosts, function ($a, $b) {
            return strtotime((string) ($b['pinned_at'] ?? '')) - strtotime((string) ($a['pinned_at'] ?? ''));
        });
        // Sort normal posts by created_at desc
        usort($normalPosts, function ($a, $b) {
            return strtotime((string) ($b['created_at'] ?? '')) - strtotime((string) ($a['created_at'] ?? ''));
        });
        return $this->normalizePosts(array_merge($pinnedPosts, $normalPosts));
    }

    public function react(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        $claims = $this->currentUserClaims();
        if (($claims['type'] ?? 'user') === 'admin') {
            $this->fail('Only registered users can react to posts.', 403);
        }
        $userCheck = $this->db()->prepare('SELECT id FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $userCheck->execute(['id' => $authUserId]);
        if (!$userCheck->fetchColumn()) {
            error_log('[reaction] invalid actor user_id=' . $authUserId . ' post_id=' . (int) $id);
            $this->fail('Your session is no longer valid. Please sign in again.', 401);
        }

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $data = $this->input();
        $reactionType = strtolower(trim((string) ($data['reaction_type'] ?? 'agree')));
        if (!in_array($reactionType, ['agree', 'disagree'], true)) {
            $reactionType = 'agree';
        }

        $db = $this->db();
        $db->beginTransaction();
        try {
            // Lock the post row so concurrent reactions cannot both observe an
            // empty pair and race into duplicate inserts/count increments.
            $lock = $db->prepare('SELECT id FROM posts WHERE id = :id FOR UPDATE');
            $lock->execute(['id' => $postId]);

            $stmt = $db->prepare('SELECT reaction_type FROM post_reactions WHERE post_id = :post_id AND user_id = :user_id LIMIT 1');
            $stmt->execute(['post_id' => $postId, 'user_id' => $authUserId]);
            $existing = $stmt->fetchColumn();

            if ($existing !== $reactionType) {
                if ($existing) {
                    $update = $db->prepare('UPDATE post_reactions SET reaction_type = :reaction_type, updated_at = CURRENT_TIMESTAMP WHERE post_id = :post_id AND user_id = :user_id LIMIT 1');
                    $update->execute(['reaction_type' => $reactionType, 'post_id' => $postId, 'user_id' => $authUserId]);
                    $this->adjustPostReactionCounts($postId, $existing, $reactionType);
                } else {
                    $insert = $db->prepare('INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (:post_id, :user_id, :reaction_type)');
                    $insert->execute(['post_id' => $postId, 'user_id' => $authUserId, 'reaction_type' => $reactionType]);
                    $this->incrementPostReactionCount($postId, $reactionType);
                }
            }
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('[reaction] save failed: ' . $e->getMessage());
            $this->fail('Could not save reaction.', 500);
        }

        if ($existing !== $reactionType && (int) ($post['user_id'] ?? 0) !== $authUserId) {
            $actorName = $this->getUserShortName($authUserId);
            $label = $reactionType === 'agree' ? 'agreed with' : 'disagreed with';
            Notification::createNotification(
                $this->db(),
                (int) ($post['user_id'] ?? 0),
                $authUserId,
                $reactionType,
                ucfirst($reactionType),
                $actorName . ' ' . $label . ' your post.',
                'post',
                $postId
            );
        }

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function unreact(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        $claims = $this->currentUserClaims();
        if (($claims['type'] ?? 'user') === 'admin') {
            $this->fail('Only registered users can react to posts.', 403);
        }
        $userCheck = $this->db()->prepare('SELECT id FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $userCheck->execute(['id' => $authUserId]);
        if (!$userCheck->fetchColumn()) {
            error_log('[reaction] invalid actor user_id=' . $authUserId . ' post_id=' . (int) $id);
            $this->fail('Your session is no longer valid. Please sign in again.', 401);
        }

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $db = $this->db();
        $db->beginTransaction();
        try {
            $lock = $db->prepare('SELECT id FROM posts WHERE id = :id FOR UPDATE');
            $lock->execute(['id' => $postId]);
            $stmt = $db->prepare('SELECT reaction_type FROM post_reactions WHERE post_id = :post_id AND user_id = :user_id LIMIT 1');
            $stmt->execute(['post_id' => $postId, 'user_id' => $authUserId]);
            $existing = $stmt->fetchColumn();
            if ($existing) {
                $delete = $db->prepare('DELETE FROM post_reactions WHERE post_id = :post_id AND user_id = :user_id LIMIT 1');
                $delete->execute(['post_id' => $postId, 'user_id' => $authUserId]);
                $this->decrementPostReactionCount($postId, $existing);
            }
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('[reaction] remove failed: ' . $e->getMessage());
            $this->fail('Could not remove reaction.', 500);
        }

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function share(string $id): array
    {
        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $stmt = $this->db()->prepare('UPDATE posts SET shares_count = shares_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $postId]);

        $authUserId = $this->currentUserId();
        if ($authUserId > 0 && (int) ($post['user_id'] ?? 0) !== $authUserId) {
            $actorName = $this->getUserShortName($authUserId);
            Notification::createNotification(
                $this->db(),
                (int) ($post['user_id'] ?? 0),
                $authUserId,
                'share',
                'Share',
                $actorName . ' shared your post.',
                'post',
                $postId
            );
        }

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function vote(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $data = $this->input();
        $optionId = (int) ($data['option_id'] ?? $data['optionId'] ?? 0);
        if ($optionId <= 0) {
            $this->fail('A poll option is required.', 422);
        }

        $poll = $this->resolvePollByRouteId((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        $pollId = (int) $poll['id'];
        $postId = (int) $poll['post_id'];
        $pollStatus = strtolower((string) ($poll['status'] ?? 'active'));
        $expiresAt = trim((string) ($poll['expires_at'] ?? ''));
        if ($pollStatus !== 'active') {
            $this->fail('This poll is closed.', 409);
        }
        if (!empty($expiresAt) && strtotime($expiresAt) !== false && strtotime($expiresAt) <= time()) {
            $this->fail('This poll has expired.', 409);
        }
        if ((int) ($poll['is_locked'] ?? 0) === 1) {
            $this->fail('Voting is locked for this poll.', 409);
        }
        $post = $this->model()->find($postId);
        if (!$post || !$this->canViewPost($post)) {
            $this->fail('Poll not found', 404);
        }

        $optionStmt = $this->db()->prepare('
            SELECT id, poll_id, is_active
            FROM poll_options
            WHERE id = :option_id
              AND poll_id = :poll_id
            LIMIT 1
        ');
        $optionStmt->execute([
            'option_id' => $optionId,
            'poll_id' => $pollId,
        ]);
        $option = $optionStmt->fetch(\PDO::FETCH_ASSOC);
        if (!$option || (array_key_exists('is_active', $option) && (int) $option['is_active'] !== 1)) {
            $this->fail('Invalid poll option.', 422);
        }

        $this->db()->beginTransaction();
        try {
            $existingVoteStmt = $this->db()->prepare('
                SELECT option_id
                FROM poll_votes
                WHERE poll_id = :poll_id
                  AND user_id = :user_id
                LIMIT 1
                FOR UPDATE
            ');
            $existingVoteStmt->execute([
                'poll_id' => $pollId,
                'user_id' => $authUserId,
            ]);
            $existingVote = $existingVoteStmt->fetch(\PDO::FETCH_ASSOC);

            if ($existingVote) {
                $existingOptionId = (int) $existingVote['option_id'];

                if ($existingOptionId === $optionId) {
                    $this->db()->rollBack();
                    $this->fail('You have already voted in this poll.', 409);
                }

                $allowVoteChange = (bool) ($data['allow_change'] ?? $data['allowChange'] ?? false);
                if (!$allowVoteChange) {
                    $this->db()->rollBack();
                    $this->fail('You have already voted in this poll.', 409);
                }

                $decrementOld = $this->db()->prepare('
                    UPDATE poll_options
                    SET votes_count = GREATEST(0, votes_count - 1)
                    WHERE id = :option_id
                      AND poll_id = :poll_id
                    LIMIT 1
                ');
                $decrementOld->execute([
                    'option_id' => $existingOptionId,
                    'poll_id' => $pollId,
                ]);

                $incrementNew = $this->db()->prepare('
                    UPDATE poll_options
                    SET votes_count = votes_count + 1
                    WHERE id = :option_id
                      AND poll_id = :poll_id
                    LIMIT 1
                ');
                $incrementNew->execute([
                    'option_id' => $optionId,
                    'poll_id' => $pollId,
                ]);

                $updateVote = $this->db()->prepare('
                    UPDATE poll_votes
                    SET option_id = :option_id
                    WHERE poll_id = :poll_id
                      AND user_id = :user_id
                ');
                $updateVote->execute([
                    'option_id' => $optionId,
                    'poll_id' => $pollId,
                    'user_id' => $authUserId,
                ]);

                if ($this->hasColumn('polls', 'updated_at')) {
                    $pollTouch = $this->db()->prepare('
                        UPDATE polls
                        SET updated_at = CURRENT_TIMESTAMP
                        WHERE id = :poll_id
                        LIMIT 1
                    ');
                    $pollTouch->execute(['poll_id' => $pollId]);
                }
            } else {
                $insert = $this->db()->prepare('
                    INSERT INTO poll_votes (poll_id, option_id, user_id)
                    VALUES (:poll_id, :option_id, :user_id)
                ');
                $insert->execute([
                    'poll_id' => $pollId,
                    'option_id' => $optionId,
                    'user_id' => $authUserId,
                ]);

                $optionUpdate = $this->db()->prepare('
                    UPDATE poll_options
                    SET votes_count = votes_count + 1
                    WHERE id = :option_id
                      AND poll_id = :poll_id
                    LIMIT 1
                ');
                $optionUpdate->execute([
                    'option_id' => $optionId,
                    'poll_id' => $pollId,
                ]);

                $pollUpdateSql = 'UPDATE polls SET total_votes = total_votes + 1';
                if ($this->hasColumn('polls', 'updated_at')) {
                    $pollUpdateSql .= ', updated_at = CURRENT_TIMESTAMP';
                }
                $pollUpdateSql .= ' WHERE id = :poll_id LIMIT 1';
                $pollUpdate = $this->db()->prepare($pollUpdateSql);
                $pollUpdate->execute(['poll_id' => $pollId]);
            }

            $this->db()->commit();
        } catch (\Throwable $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            if (str_contains(strtolower($e->getMessage()), 'duplicate')) {
                $this->fail('You have already voted in this poll.', 409);
            }
            $this->fail('Could not save your vote: ' . $e->getMessage(), 500);
        }

        return [
            'post_id' => $postId,
            'poll_id' => $pollId,
            'poll' => $this->loadPostPoll($postId),
            'voted' => true,
            'option_id' => $optionId,
        ];
    }

    private function incrementPostReactionCount(int $postId, string $reactionType): void
    {
        $column = $reactionType === 'disagree' ? 'disagrees_count' : 'agrees_count';
        $stmt = $this->db()->prepare("UPDATE posts SET {$column} = {$column} + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $postId]);
    }

    private function decrementPostReactionCount(int $postId, string $reactionType): void
    {
        $column = $reactionType === 'disagree' ? 'disagrees_count' : 'agrees_count';
        $stmt = $this->db()->prepare("UPDATE posts SET {$column} = GREATEST({$column} - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $postId]);
    }

    private function adjustPostReactionCounts(int $postId, string $from, string $to): void
    {
        if ($from === $to) {
            return;
        }
        $this->decrementPostReactionCount($postId, $from);
        $this->incrementPostReactionCount($postId, $to);
    }

    public function hide(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }
        $stmt = $this->db()->prepare('UPDATE posts SET is_hidden = 1, hidden_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $id]);

        return ['post_id' => (int) $id, 'hidden' => true];
    }

    public function restore(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }
        $stmt = $this->db()->prepare('UPDATE posts SET is_hidden = 0, hidden_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $id]);

        return ['post_id' => (int) $id, 'restored' => true];
    }

    public function pin(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }
        if ((int) ($post['user_id'] ?? 0) !== $authUserId) {
            $this->fail('Forbidden', 403);
        }

        $this->db()->beginTransaction();
        try {
            // Unpin any existing pinned post for this user
            $unpinStmt = $this->db()->prepare('UPDATE posts SET is_pinned = 0, pinned_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = :user_id AND is_pinned = 1');
            $unpinStmt->execute(['user_id' => $authUserId]);

            // Pin this post
            $pinStmt = $this->db()->prepare('UPDATE posts SET is_pinned = 1, pinned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
            $pinStmt->execute(['id' => $postId]);

            $this->db()->commit();
            return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
        } catch (\Throwable $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->fail('Could not pin post: ' . $e->getMessage(), 500);
        }
    }

    public function unpin(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }
        if ((int) ($post['user_id'] ?? 0) !== $authUserId) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->db()->prepare('UPDATE posts SET is_pinned = 0, pinned_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $postId]);

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function globalPin(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }
        $authUserId = $this->currentUserId();

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $this->db()->beginTransaction();
        try {
            $unpinStmt = $this->db()->prepare('UPDATE posts SET is_globally_pinned = 0, globally_pinned_at = NULL, globally_pinned_by_admin_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE is_globally_pinned = 1');
            $unpinStmt->execute();

            $pinStmt = $this->db()->prepare('UPDATE posts SET is_globally_pinned = 1, globally_pinned_at = CURRENT_TIMESTAMP, globally_pinned_by_admin_id = :admin_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
            $pinStmt->execute(['id' => $postId, 'admin_id' => $authUserId]);

            $this->db()->commit();
        } catch (\Throwable $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->fail('Could not pin post globally: ' . $e->getMessage(), 500);
        }

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function globalUnpin(string $id): array
    {
        if (!$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $postId = (int) $id;
        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $stmt = $this->db()->prepare('UPDATE posts SET is_globally_pinned = 0, globally_pinned_at = NULL, globally_pinned_by_admin_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $postId]);

        return $this->normalizePost($this->model()->find($postId) ?? ['id' => $postId]);
    }

    public function update(string $id): array
    {
        $this->assertOwnPost((int) $id);
        $data = $this->input();
        if (!isset($data['content']) || trim((string) $data['content']) === '') {
            $this->fail('Post content is required.', 422);
        }
        if (!Validator::minWords((string) $data['content'], 250)) {
            $this->fail('Posts must be 250 words or fewer.', 422);
        }

        if (array_key_exists('category_id', $data) || array_key_exists('category', $data)) {
            $rawCategory = $data['category_id'] ?? $data['category'] ?? null;
            $categoryId = (int) $rawCategory;
            if ($categoryId <= 0 && is_string($rawCategory) && trim($rawCategory) !== '') {
                $stmt = $this->db()->prepare('SELECT id FROM post_categories WHERE deleted_at IS NULL AND (slug = :value OR name = :value) LIMIT 1');
                $stmt->execute(['value' => trim($rawCategory)]);
                $categoryId = (int) ($stmt->fetchColumn() ?: 0);
            }
            if ($categoryId <= 0) {
                $stmt = $this->db()->prepare('SELECT id FROM post_categories WHERE deleted_at IS NULL AND (slug = :value OR name = :value) LIMIT 1');
                $stmt->execute(['value' => 'Other']);
                $categoryId = (int) ($stmt->fetchColumn() ?: 0);
            }
            if ($categoryId <= 0) {
                $this->fail('Valid post category is required.', 422);
            }
            $data['category_id'] = $categoryId;
        }

        if ($this->hasColumn('posts', 'slug') && isset($data['content'])) {
            $post = $this->model()->find((int) $id) ?: [];
            $content = trim((string) $data['content']);
            $data['slug'] = $this->makePostSlug((int) ($post['user_id'] ?? 0), $content);
        }

        $this->model()->update((int) $id, $data);
        if (array_key_exists('content', $data)) {
            $this->syncPostMentions((int) $id, $this->currentUserId(), $this->resolveMentionedUserIds(trim((string) ($data['content'] ?? ''))));
        }
        return $this->normalizePost($this->model()->find((int) $id) ?? []);
    }

    private function assertAdminOrOwnPost(int $postId): void
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        if ((int) ($post['user_id'] ?? 0) === $authUserId) {
            return;
        }

        if ($this->isAdmin()) {
            return;
        }

        $this->fail('Forbidden', 403);
    }

    private function isAdmin(): bool
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            return false;
        }

        $stmt = $this->db()->prepare('SELECT role FROM admins WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        return (bool) $stmt->fetchColumn();
    }

    private function getUserShortName(int $userId): string
    {
        $stmt = $this->db()->prepare('SELECT name, username FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? (trim((string) ($row['name'] ?? '')) ?: ($row['username'] ?? 'Someone')) : 'Someone';
    }

    public function destroy(string $id): array
    {
        $this->assertOwnPost((int) $id);
        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    private function rankedFeedCandidates(int $viewerId): array
    {
        $followColumn = $this->followedColumn();
        $hasImpressions = $this->hasTable('post_feed_impressions');
        $hasReports = $this->hasTable('reports');
        $hasReactions = $this->hasTable('post_reactions');
        $hasComments = $this->hasTable('post_comments');

        $seenSelect = $hasImpressions
            ? 'COALESCE((SELECT i.seen_count FROM post_feed_impressions i WHERE i.user_id = :viewer_seen AND i.post_id = p.id LIMIT 1), 0) AS seen_count'
            : '0 AS seen_count';
        $reportSelect = $hasReports
            ? 'COALESCE((SELECT COUNT(*) FROM reports r WHERE r.reported_post_id = p.id AND r.deleted_at IS NULL), 0) AS report_count,
               COALESCE((SELECT COUNT(*) FROM reports r WHERE r.reported_post_id = p.id AND r.deleted_at IS NULL AND r.reason = \'Spam\'), 0) AS spam_report_count'
            : '0 AS report_count, 0 AS spam_report_count';
        $reactionSelect = $hasReactions
            ? 'COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id AND pr.updated_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE)), 0) AS recent_reactions'
            : '0 AS recent_reactions';
        $commentSelect = $hasComments
            ? 'COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id AND pc.deleted_at IS NULL AND pc.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE)), 0) AS recent_comments'
            : '0 AS recent_comments';
        $followingSelect = $viewerId > 0
            ? 'EXISTS(SELECT 1 FROM followers f WHERE f.follower_id = :viewer_following AND f.' . $followColumn . ' = p.user_id) AS is_following'
            : '0 AS is_following';

        [$privacySql, $privacyParams] = $this->buildPostPrivacyWhereClause($viewerId, 'p');

        $stmt = $this->db()->prepare('
            SELECT p.*, u.username AS user_username, u.name AS user_name,
                   u.profile_image_url AS user_profile_image_url,
                   u.village_id AS author_village_id, u.blue_tick_status,
                   ' . $followingSelect . ',
                   ' . $seenSelect . ',
                   ' . $reportSelect . ',
                   ' . $reactionSelect . ',
                   ' . $commentSelect . '
            FROM posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN user_settings us_privacy ON us_privacy.user_id = p.user_id
            WHERE p.deleted_at IS NULL
              AND (p.is_hidden IS NULL OR p.is_hidden = 0)
              AND u.deleted_at IS NULL
              AND u.account_status = \'active\'
              AND u.hidden_at IS NULL
              AND u.suspended_at IS NULL
              AND ' . $privacySql . '
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT 300
        ');

        $params = $privacyParams;
        if ($hasImpressions) {
            $params['viewer_seen'] = $viewerId;
        }
        if ($viewerId > 0) {
            $params['viewer_following'] = $viewerId;
        }
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    private function viewerVillageId(int $viewerId): int
    {
        if ($viewerId <= 0) {
            return 0;
        }
        $stmt = $this->db()->prepare('SELECT village_id FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $viewerId]);
        return (int) ($stmt->fetchColumn() ?: 0);
    }

    /** Categories with which the viewer has actively interacted receive a small boost. */
    private function categoryInterestScores(int $viewerId): array
    {
        if ($viewerId <= 0 || !$this->hasTable('post_reactions')) {
            return [];
        }

        $stmt = $this->db()->prepare('
            SELECT p.category_id, COUNT(*) AS interactions
            FROM post_reactions pr
            JOIN posts p ON p.id = pr.post_id
            WHERE pr.user_id = :user_id
              AND p.deleted_at IS NULL
              AND p.category_id IS NOT NULL
            GROUP BY p.category_id
        ');
        $stmt->execute(['user_id' => $viewerId]);
        $scores = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $row) {
            $scores[(int) $row['category_id']] = min(15, (int) $row['interactions'] * 3);
        }
        return $scores;
    }

    private function passesFeedQualityFilter(array $post): bool
    {
        $type = strtolower(trim((string) ($post['post_type'] ?? 'text')));
        if ($type === 'text' && trim((string) ($post['content'] ?? '')) === '') {
            return false;
        }

        // Posts are automatically hidden at twenty reports. Keeping ten-plus reports
        // out of ranking gives moderation time to act without exposing weak content.
        return (int) ($post['report_count'] ?? 0) < 10;
    }

    private function feedScore(array $post, int $viewerId, int $viewerVillageId, int $interestScore, string $seed, string $rotationBucket): float
    {
        $ageSeconds = max(0, time() - (strtotime((string) ($post['created_at'] ?? '')) ?: time()));
        $ageHours = $ageSeconds / 3600;
        $score = (int) ($post['is_globally_pinned'] ?? 0) === 1 ? 500.0 : 0.0;

        if ($ageHours <= 3) {
            $score += 30;
        } elseif ($ageHours <= 24) {
            $score += 20;
        } elseif ($ageHours <= 24 * 7) {
            $score += 8;
        }

        $agrees = max(0, (int) ($post['agrees_count'] ?? 0));
        $comments = max(0, (int) ($post['comments_count'] ?? 0));
        $shares = max(0, (int) ($post['shares_count'] ?? 0));
        $score += min(20, $agrees + ($comments * 2) + ($shares * 3));
        $score += min(40, ((int) ($post['recent_reactions'] ?? 0) * 3) + ((int) ($post['recent_comments'] ?? 0) * 5));

        if ($viewerId > 0 && (int) ($post['is_following'] ?? 0) === 1) {
            $score += 25;
        }
        if ($viewerVillageId > 0 && $viewerVillageId === (int) ($post['author_village_id'] ?? 0)) {
            $score += 40;
        }
        if (strtolower((string) ($post['blue_tick_status'] ?? '')) === 'verified') {
            $score += 10;
        }
        $score += $interestScore;

        $seenCount = max(0, (int) ($post['seen_count'] ?? 0));
        if ($seenCount >= 10) {
            $score -= 60;
        } elseif ($seenCount >= 3) {
            $score -= 20;
        } elseif ($seenCount >= 1) {
            $score -= 5;
        }

        $score -= min(60, ((int) ($post['report_count'] ?? 0) * 8) + ((int) ($post['spam_report_count'] ?? 0) * 8));

        // A deterministic 0-8 exploration score changes with refresh seed and a
        // six-hour rotation window, while keeping score variation intentionally low.
        $hash = crc32($viewerId . ':' . ($post['id'] ?? 0) . ':' . $seed . ':' . $rotationBucket);
        return $score + (($hash % 801) / 100);
    }

    private function feedBucket(array $post, int $viewerId, int $viewerVillageId): string
    {
        $ageHours = max(0, time() - (strtotime((string) ($post['created_at'] ?? '')) ?: time())) / 3600;
        $engagement = (int) ($post['agrees_count'] ?? 0) + ((int) ($post['comments_count'] ?? 0) * 2) + ((int) ($post['shares_count'] ?? 0) * 3);
        if ($ageHours > 48 && $engagement >= 15) {
            return 'old_viral';
        }
        if ((int) ($post['recent_reactions'] ?? 0) + (int) ($post['recent_comments'] ?? 0) >= 5 || $engagement >= 20) {
            return 'trending';
        }
        if ($viewerVillageId > 0 && $viewerVillageId === (int) ($post['author_village_id'] ?? 0)) {
            return 'nearby';
        }
        if ($viewerId > 0 && (int) ($post['is_following'] ?? 0) === 1) {
            return 'following';
        }
        if ($viewerId > 0 && (int) ($post['is_following'] ?? 0) === 0) {
            return 'discover';
        }
        return 'recent';
    }

    private function buildRankedFeed(array $candidates, int $limit): array
    {
        $slots = ['recent', 'trending', 'nearby', 'following', 'recent', 'discover', 'recent', 'trending', 'nearby', 'recent', 'following', 'trending', 'discover', 'recent', 'nearby', 'recent', 'old_viral', 'trending', 'recent', 'recent'];
        $selected = [];
        $selectedIds = [];
        $lastAuthorId = 0;

        foreach (array_slice($slots, 0, $limit) as $bucket) {
            $post = $this->nextFeedCandidate($candidates, $selectedIds, $lastAuthorId, $bucket)
                ?? $this->nextFeedCandidate($candidates, $selectedIds, $lastAuthorId);
            if (!$post) {
                break;
            }
            $selected[] = $post;
            $selectedIds[(int) $post['id']] = true;
            $lastAuthorId = (int) ($post['user_id'] ?? 0);
        }

        while (count($selected) < $limit) {
            $post = $this->nextFeedCandidate($candidates, $selectedIds, $lastAuthorId);
            if (!$post) {
                break;
            }
            $selected[] = $post;
            $selectedIds[(int) $post['id']] = true;
            $lastAuthorId = (int) ($post['user_id'] ?? 0);
        }

        return $selected;
    }

    private function nextFeedCandidate(array $candidates, array $selectedIds, int $lastAuthorId, ?string $bucket = null): ?array
    {
        foreach ($candidates as $post) {
            $postId = (int) ($post['id'] ?? 0);
            if ($postId <= 0 || isset($selectedIds[$postId])) {
                continue;
            }
            if ($bucket !== null && ($post['feed_bucket'] ?? '') !== $bucket) {
                continue;
            }
            if ($lastAuthorId > 0 && (int) ($post['user_id'] ?? 0) === $lastAuthorId) {
                continue;
            }
            return $post;
        }

        // If no alternate creator is available, do not leave the slot empty.
        if ($lastAuthorId > 0) {
            return $this->nextFeedCandidate($candidates, $selectedIds, 0, $bucket);
        }
        return null;
    }

    private function normalizePosts(array $posts): array
    {
        $authUserId = $this->currentUserId();
        $reactionMap = [];
        if ($authUserId > 0) {
            $postIds = array_values(array_unique(array_filter(array_map(fn (array $post) => (int) ($post['id'] ?? $post['post_id'] ?? 0), $posts))));
            $reactionMap = $this->loadUserReactionsForPosts($authUserId, $postIds);
        }

        $visiblePosts = [];
        foreach ($posts as $post) {
            if (!$this->canViewPost($post)) {
                continue;
            }
            $visiblePosts[] = $this->normalizePost($post, $reactionMap[(int) ($post['id'] ?? $post['post_id'] ?? 0)] ?? null);
        }

        return array_values($visiblePosts);
    }

    private function normalizePost(array $post, ?string $myReaction = null): array
    {
        // ✅ PRESERVE FULL CONTENT - NO TRUNCATION
        $fullContent = $post['content'] ?? '';
        
        $post['userId'] = $post['userId'] ?? $post['user_id'] ?? null;
        $post['postType'] = strtolower(trim((string) ($post['postType'] ?? $post['post_type'] ?? 'text'))) ?: 'text';
        $post['post_type'] = $post['postType'];
        
        // ✅ FULL content - NO truncation
        $post['content'] = $fullContent;
        $post['content_full'] = $fullContent;
        
        // ✅ Summary for preview (optional - frontend can use this)
        $post['content_summary'] = mb_strlen($fullContent) > 200 
            ? mb_substr($fullContent, 0, 200) . '...' 
            : $fullContent;
        
        // ✅ Content length
        $post['content_length'] = mb_strlen($fullContent);
        
        $authorAvatar = trim((string) ($post['userProfileImageUrl'] ?? $post['user_profile_image_url'] ?? $post['avatar_url'] ?? ''));
        if ($authorAvatar !== '') {
            $post['userProfileImageUrl'] = $authorAvatar;
            $post['user_profile_image_url'] = $authorAvatar;
            $post['avatar_url'] = $authorAvatar;
            $post['profile_image_url'] = $authorAvatar;
        }
        $post['categoryId'] = $post['categoryId'] ?? $post['category_id'] ?? null;
        $post['createdAt'] = $post['createdAt'] ?? $post['created_at'] ?? null;
        $post['updatedAt'] = $post['updatedAt'] ?? $post['updated_at'] ?? null;
        $post['deletedAt'] = $post['deletedAt'] ?? $post['deleted_at'] ?? null;
        $post['isHidden'] = $post['isHidden'] ?? $post['is_hidden'] ?? 0;
        $post['agrees'] = $post['agrees'] ?? $post['agrees_count'] ?? 0;
        $post['disagrees'] = $post['disagrees'] ?? $post['disagrees_count'] ?? 0;
        $post['comments'] = $post['comments'] ?? $post['comments_count'] ?? 0;
        $post['shares'] = $post['shares'] ?? $post['shares_count'] ?? 0;
        $post['slug'] = $post['slug'] ?? $this->resolvePostSlug($post);
        $post['my_reaction'] = $myReaction ?? $post['my_reaction'] ?? $post['reaction_type'] ?? null;
        $shouldLoadImages = in_array($post['postType'], ['image', 'image_text'], true) || !empty($post['imageUrl']) || !empty($post['image_url']) || !empty($post['images']);
        $shouldLoadPoll = $post['postType'] === 'poll' || !empty($post['poll']);
        $post['images'] = $post['images'] ?? ($shouldLoadImages ? $this->loadPostImages((int) ($post['id'] ?? $post['post_id'] ?? 0)) : []);
        $post['imageUrl'] = $post['imageUrl'] ?? ($post['images'][0]['imageUrl'] ?? null);
        $post['poll'] = $post['poll'] ?? ($shouldLoadPoll ? $this->loadPostPoll((int) ($post['id'] ?? $post['post_id'] ?? 0)) : null);

        if ((!isset($post['category']) || trim((string) $post['category']) === '') && !empty($post['categoryId'])) {
            $stmt = $this->model()->pdo()->prepare('SELECT name FROM post_categories WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => (int) $post['categoryId']]);
            $post['category'] = (string) ($stmt->fetchColumn() ?: '');
        }

        return $post;
    }

    private function loadPostImages(int $postId): array
    {
        if ($postId <= 0 || !$this->hasTable('post_images')) {
            return [];
        }

        $stmt = $this->db()->prepare('
            SELECT id, post_id, image_url, alt_text, sort_order, created_at
            FROM post_images
            WHERE post_id = :post_id
            ORDER BY sort_order ASC, id ASC
        ');
        $stmt->execute(['post_id' => $postId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            $imageUrl = trim((string) ($row['image_url'] ?? ''));
            return [
                'id' => (int) ($row['id'] ?? 0),
                'postId' => (int) ($row['post_id'] ?? 0),
                'imageUrl' => $imageUrl,
                'image_url' => $imageUrl,
                'altText' => $row['alt_text'] ?? '',
                'alt_text' => $row['alt_text'] ?? '',
                'sortOrder' => (int) ($row['sort_order'] ?? 0),
                'sort_order' => (int) ($row['sort_order'] ?? 0),
                'createdAt' => $row['created_at'] ?? null,
            ];
        }, $rows);
    }

    private function resolveMentionedUserIds(string $content): array
    {
        if (!$this->hasTable('post_mentions')) {
            return [];
        }

        preg_match_all('/@([a-zA-Z0-9_-]+)/', $content, $matches);
        $usernames = array_values(array_unique(array_filter(array_map(static fn ($username) => strtolower(trim((string) $username)), $matches[1] ?? []), static fn ($value) => $value !== '')));
        if (!$usernames) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($usernames), '?'));
        $sql = 'SELECT id, username FROM users WHERE deleted_at IS NULL AND account_status = \'active\' AND LOWER(username) IN (' . $placeholders . ')';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($usernames);

        $userIds = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $userIds[] = (int) ($row['id'] ?? 0);
        }

        return array_values(array_unique(array_filter($userIds, static fn ($id) => $id > 0)));
    }

    private function syncPostMentions(int $postId, int $mentionedBy, array $mentionedUserIds): void
    {
        if ($postId <= 0 || !$this->hasTable('post_mentions')) {
            return;
        }

        $stmt = $this->db()->prepare('DELETE FROM post_mentions WHERE post_id = :post_id');
        $stmt->execute(['post_id' => $postId]);

        if (!$mentionedUserIds) {
            return;
        }

        $insert = $this->db()->prepare('INSERT IGNORE INTO post_mentions (post_id, mentioned_user_id, mentioned_by) VALUES (:post_id, :mentioned_user_id, :mentioned_by)');
        foreach ($mentionedUserIds as $mentionedUserId) {
            $insert->execute([
                'post_id' => $postId,
                'mentioned_user_id' => $mentionedUserId,
                'mentioned_by' => $mentionedBy,
            ]);
        }
    }

    protected function syncPollVoteCounts(int $pollId, bool $rebuildOnMismatch = true): array
    {
        $optionsStmt = $this->db()->prepare('
            SELECT id, votes_count
            FROM poll_options
            WHERE poll_id = :poll_id
            ORDER BY sort_order ASC, id ASC
        ');
        $optionsStmt->execute(['poll_id' => $pollId]);
        $optionRows = $optionsStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $voteCounts = [];
        foreach ($optionRows as $row) {
            $optionId = (int) ($row['id'] ?? 0);
            if ($optionId > 0) {
                $voteCounts[$optionId] = PollPercentage::sanitizeVoteCount($row['votes_count'] ?? 0);
            }
        }

        $pollTotalStmt = $this->db()->prepare('SELECT total_votes FROM polls WHERE id = :poll_id LIMIT 1');
        $pollTotalStmt->execute(['poll_id' => $pollId]);
        $storedTotal = PollPercentage::sanitizeVoteCount($pollTotalStmt->fetchColumn());
        $computedTotal = PollPercentage::verifyTotal($voteCounts, $storedTotal, $pollId);

        // votes_count is the canonical public result. It includes real user
        // votes plus intentional admin adjustments. Rebuilding it from
        // poll_votes would silently erase manually managed counts.
        if ($rebuildOnMismatch && $storedTotal !== $computedTotal) {
            $pollUpdateSql = 'UPDATE polls SET total_votes = :total_votes';
            if ($this->hasColumn('polls', 'updated_at')) {
                $pollUpdateSql .= ', updated_at = CURRENT_TIMESTAMP';
            }
            $pollUpdateSql .= ' WHERE id = :poll_id LIMIT 1';
            $this->db()->prepare($pollUpdateSql)->execute([
                'total_votes' => $computedTotal,
                'poll_id' => $pollId,
            ]);
        }

        return [
            'counts' => $voteCounts,
            'total' => $computedTotal,
        ];
    }

    private function loadPostPoll(int $postId): ?array
    {
        if ($postId <= 0 || !$this->hasTable('polls') || !$this->hasTable('poll_options')) {
            return null;
        }

        $pollColumns = ['id', 'post_id', 'question', 'total_votes', 'created_at'];
        if ($this->hasColumn('polls', 'updated_at')) {
            $pollColumns[] = 'updated_at';
        }
        foreach (['status', 'is_locked', 'expires_at'] as $column) {
            if ($this->hasColumn('polls', $column)) {
                $pollColumns[] = $column;
            }
        }

        $pollStmt = $this->db()->prepare('
            SELECT ' . implode(', ', $pollColumns) . '
            FROM polls
            WHERE post_id = :post_id
            LIMIT 1
        ');
        $pollStmt->execute(['post_id' => $postId]);
        $poll = $pollStmt->fetch(\PDO::FETCH_ASSOC);
        if (!$poll) {
            return null;
        }

        $pollId = (int) ($poll['id'] ?? 0);
        $syncedVotes = $this->syncPollVoteCounts($pollId);
        $voteCounts = $syncedVotes['counts'];
        $totalVotes = $syncedVotes['total'];
        $percentageData = PollPercentage::calculate($voteCounts, $pollId);

        $optionColumns = ['id', 'poll_id', 'option_text', 'votes_count', 'sort_order', 'created_at'];
        if ($this->hasColumn('poll_options', 'updated_at')) {
            $optionColumns[] = 'updated_at';
        }
        if ($this->hasColumn('poll_options', 'is_active')) {
            $optionColumns[] = 'is_active';
        }

        $optionsStmt = $this->db()->prepare('
            SELECT ' . implode(', ', $optionColumns) . '
            FROM poll_options
            WHERE poll_id = :poll_id
              ' . ($this->hasColumn('poll_options', 'is_active') ? 'AND is_active = 1' : '') . '
            ORDER BY sort_order ASC, id ASC
        ');
        $optionsStmt->execute(['poll_id' => $pollId]);
        $options = $optionsStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $currentUserId = $this->currentUserId();
        $userVoteOptionId = null;
        if ($currentUserId > 0 && $this->hasTable('poll_votes')) {
            $voteStmt = $this->db()->prepare('
                SELECT option_id
                FROM poll_votes
                WHERE poll_id = :poll_id
                  AND user_id = :user_id
                LIMIT 1
            ');
            $voteStmt->execute([
                'poll_id' => $pollId,
                'user_id' => $currentUserId,
            ]);
            $voteResult = $voteStmt->fetchColumn();
            if ($voteResult !== false && $voteResult !== null) {
                $userVoteOptionId = (int) $voteResult;
            }
        }

        $hasVoted = $userVoteOptionId !== null;

        return [
            'id' => $pollId,
            'postId' => (int) ($poll['post_id'] ?? 0),
            'question' => $poll['question'] ?? '',
            'totalVotes' => $totalVotes,
            'total_votes' => $totalVotes,
            'status' => (string) ($poll['status'] ?? 'active'),
            'isLocked' => (int) ($poll['is_locked'] ?? 0),
            'is_locked' => (int) ($poll['is_locked'] ?? 0),
            'expiresAt' => $poll['expires_at'] ?? null,
            'expires_at' => $poll['expires_at'] ?? null,
            'hasVoted' => $hasVoted,
            'has_voted' => $hasVoted,
            'userVoteOptionId' => $userVoteOptionId,
            'user_vote_option_id' => $userVoteOptionId,
            'options' => array_map(static function (array $option) use ($voteCounts, $percentageData): array {
                $optionId = (int) ($option['id'] ?? 0);
                $votesCount = $percentageData['optionVotes'][$optionId]
                    ?? PollPercentage::sanitizeVoteCount($voteCounts[$optionId] ?? ($option['votes_count'] ?? 0));
                $percentage = $percentageData['percentages'][$optionId] ?? 0.0;
                return [
                    'id' => $optionId,
                    'pollId' => (int) ($option['poll_id'] ?? 0),
                    'optionText' => $option['option_text'] ?? '',
                    'option_text' => $option['option_text'] ?? '',
                    'votesCount' => $votesCount,
                    'votes_count' => $votesCount,
                    'percentage' => $percentage,
                    'percent' => $percentage,
                    'sortOrder' => (int) ($option['sort_order'] ?? 0),
                    'sort_order' => (int) ($option['sort_order'] ?? 0),
                    'isActive' => (int) ($option['is_active'] ?? 1),
                    'is_active' => (int) ($option['is_active'] ?? 1),
                ];
            }, $options),
            'createdAt' => $poll['created_at'] ?? null,
            'updatedAt' => $poll['updated_at'] ?? null,
        ];
    }

    protected function hasTable(string $table): bool
    {
        static $cache = [];
        if (array_key_exists($table, $cache)) {
            return $cache[$table];
        }

        $stmt = $this->db()->prepare('
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
            LIMIT 1
        ');
        $stmt->execute(['table_name' => $table]);
        return $cache[$table] = (bool) $stmt->fetchColumn();
    }

    private function loadUserReactionsForPosts(int $userId, array $postIds): array
    {
        if (empty($postIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($postIds), '?'));
        $stmt = $this->db()->prepare("SELECT post_id, reaction_type FROM post_reactions WHERE user_id = ? AND post_id IN ($placeholders)");
        $stmt->execute(array_merge([$userId], $postIds));

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $reactions = [];
        foreach ($rows as $row) {
            $reactions[(int) $row['post_id']] = $row['reaction_type'];
        }
        return $reactions;
    }

    private function assertOwnPost(int $postId): void
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $post = $this->model()->find($postId);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        if ((int) ($post['user_id'] ?? 0) !== $authUserId) {
            $this->fail('Forbidden', 403);
        }
    }

    private function canViewPost(array $post): bool
    {
        $authUserId = $this->currentUserId();
        $authorId = (int) ($post['user_id'] ?? $post['userId'] ?? 0);

        if ($authorId > 0 && !$this->canViewAuthorAccount($authorId, $authUserId)) {
            return false;
        }

        if (!(int) ($post['is_hidden'] ?? $post['isHidden'] ?? 0)) {
            return true;
        }

        if ($authUserId <= 0) {
            return false;
        }

        if ($authorId === $authUserId) {
            return true;
        }

        return $this->isAdmin();
    }

    private function filterHiddenPosts(array $posts): array
    {
        if (empty($posts)) {
            return [];
        }

        return array_filter($posts, function (array $post) {
            return $this->canViewPost($post);
        });
    }

    private function resolvePostSlug(array $post): string
    {
        $username = trim((string) ($post['user_username'] ?? $post['username'] ?? ''));
        if ($username === '') {
            $username = $this->authorUsernameForPost((int) ($post['user_id'] ?? $post['userId'] ?? 0));
        }

        $content = trim((string) ($post['content'] ?? ''));
        if ($username !== '' && $content !== '') {
            return Str::slug($username) . '-' . Str::slug($content);
        }

        return (string) ($post['slug'] ?? $post['id'] ?? '');
    }

    private function canViewAuthorAccount(int $authorId, int $viewerUserId): bool
    {
        if ($authorId <= 0) {
            return false;
        }

        if ($authorId === $viewerUserId) {
            return true;
        }

        if ($this->isAdmin()) {
            return true;
        }

        if ($this->authorAccountStatus($authorId) !== 'active') {
            return false;
        }

        $stmt = $this->db()->prepare('SELECT profile_visibility FROM user_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $authorId]);
        $visibility = trim((string) ($stmt->fetchColumn() ?? 'public'));

        if ($visibility === 'public') {
            return true;
        }

        if ($visibility === 'followers' || $visibility === 'private') {
            return $viewerUserId > 0 && $this->isFollowing($viewerUserId, $authorId);
        }

        return true;
    }

    private function authorAccountStatus(int $userId): string
    {
        static $cache = [];
        if ($userId <= 0) {
            return 'unknown';
        }
        if (array_key_exists($userId, $cache)) {
            return $cache[$userId];
        }

        $stmt = (new User())->pdo()->prepare('
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

    private function followedColumn(): string
    {
        static $cached = null;
        if (is_string($cached)) {
            return $cached;
        }

        foreach (['followed_id', 'following_id'] as $column) {
            $stmt = (new User())->pdo()->prepare('
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

    private function isFollowing(int $followerId, int $followedId): bool
    {
        if ($followerId <= 0 || $followedId <= 0) {
            return false;
        }

        $stmt = (new User())->pdo()->prepare('SELECT 1 FROM followers WHERE follower_id = :follower_id AND ' . $this->followedColumn() . ' = :followed_id LIMIT 1');
        $stmt->execute([
            'follower_id' => $followerId,
            'followed_id' => $followedId,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    private function loadUserReactionsForPost(int $postId): ?string
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0 || $postId <= 0) {
            return null;
        }

        $stmt = $this->db()->prepare('SELECT reaction_type FROM post_reactions WHERE post_id = :post_id AND user_id = :user_id LIMIT 1');
        $stmt->execute([
            'post_id' => $postId,
            'user_id' => $authUserId,
        ]);

        return $stmt->fetchColumn() ?: null;
    }

    private function resolvePollByRouteId(int $id): ?array
    {
        if ($id <= 0 || !$this->hasTable('polls')) {
            return null;
        }

        $stmt = $this->db()->prepare('
            SELECT id, post_id, question, total_votes, created_at,
                   status, is_locked, expires_at
            FROM polls
            WHERE id = :poll_id
               OR post_id = :post_id
            LIMIT 1
        ');
        $stmt->execute([
            'poll_id' => $id,
            'post_id' => $id,
        ]);
        $poll = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $poll ?: null;
    }

    private function makePostSlug(int $userId, string $content): string
    {
        $username = $this->authorUsernameForPost($userId);
        $contentSlug = Str::slug($content);
        return $username !== '' && $contentSlug !== '' ? Str::slug($username) . '-' . $contentSlug : $contentSlug;
    }

    private function authorUsernameForPost(int $userId): string
    {
        static $cache = [];
        if ($userId <= 0) {
            return '';
        }
        if (array_key_exists($userId, $cache)) {
            return $cache[$userId];
        }

        $user = (new User())->find($userId);
        return $cache[$userId] = trim((string) ($user['username'] ?? ''));
    }

    protected function hasColumn(string $table, string $column): bool
    {
        static $cache = [];
        $key = $table . '.' . $column;
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        $stmt = $this->db()->prepare('
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
              AND column_name = :column_name
            LIMIT 1
        ');
        $stmt->execute([
            'table_name' => $table,
            'column_name' => $column,
        ]);
        return $cache[$key] = (bool) $stmt->fetchColumn();
    }
}
