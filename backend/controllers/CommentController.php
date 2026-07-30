<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\Notification;
use ConnectNKT\Models\PostComment;
use ConnectNKT\Models\Post;
use ConnectNKT\Models\User;
use ConnectNKT\Helpers\HtmlSanitizer;

final class CommentController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new PostComment();
    }

    public function index(): array
    {
        $postId = (int) ($this->routeParam('id') ?? 0);
        if ($postId <= 0) {
            return ['post_id' => 0, 'comments' => []];
        }

        $post = (new Post())->find($postId);
        if (!$post || !$this->canViewPostComments($post)) {
            return ['post_id' => $postId, 'comments' => []];
        }

        $stmt = $this->db()->prepare($this->commentSelectSql('pc.post_id = :post_id
              AND pc.parent_comment_id IS NULL
              AND (
                pc.deleted_at IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM post_comments child
                    WHERE child.parent_comment_id = pc.id
                    LIMIT 1
                )
              )
            ORDER BY pc.created_at ASC LIMIT 100'));
        $stmt->execute(['post_id' => $postId, 'viewer_id' => $this->currentUserId()]);
        $comments = array_map(fn (array $comment) => $this->normalizeComment($comment), $stmt->fetchAll(\PDO::FETCH_ASSOC));
        return ['post_id' => $postId, 'comments' => $comments, 'comments_count' => $this->activePostCommentCount($postId)];
    }

    public function replies(string $id): array
    {
        $parentId = (int) $id;
        $parent = $this->model()->find($parentId);
        if (!$parent) {
            $this->fail('Comment not found', 404);
        }

        $post = (new Post())->find((int) $parent['post_id']);
        if (!$post || !$this->canViewPostComments($post)) {
            $this->fail('This post is not available.', 403);
        }

        $rootId = (int) ($parent['parent_comment_id'] ?? 0) > 0 ? (int) $parent['parent_comment_id'] : $parentId;
        $stmt = $this->db()->prepare($this->commentSelectSql('pc.parent_comment_id = :parent_comment_id ORDER BY pc.created_at ASC LIMIT 100'));
        $stmt->execute([
            'parent_comment_id' => $rootId,
            'viewer_id' => $this->currentUserId(),
        ]);

        return [
            'parent_comment_id' => $rootId,
            'replies' => array_map(fn (array $comment) => $this->normalizeComment($comment), $stmt->fetchAll(\PDO::FETCH_ASSOC)),
        ];
    }

    public function store(): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $data = $this->input();
        $postId = (int) ($this->routeParam('id') ?? $data['post_id'] ?? 0);
        if ($postId > 0) {
            $data['post_id'] = $postId;
        }

        if ($postId <= 0) {
            $this->fail('Invalid post ID', 422);
        }

        $post = (new Post())->find($postId);
        if (!$post || !$this->canViewPostComments($post)) {
            $this->fail('This post is not available.', 403);
        }

        $body = trim((string) ($data['body'] ?? ''));
        if ($body === '') {
            $this->fail('Comment body is required.', 422);
        }
        if (mb_strlen($body, 'UTF-8') > 5000) {
            $this->fail('Comment body must be 5000 characters or less.', 422);
        }
        $body = HtmlSanitizer::clean($body);
        $data['body'] = $body;

        $parentCommentId = (int) ($data['parent_comment_id'] ?? $data['parentCommentId'] ?? 0);
        if ($parentCommentId > 0) {
            $parent = $this->model()->find($parentCommentId);
            if (!$parent || (int) $parent['post_id'] !== $postId) {
                $this->fail('Parent comment not found.', 404);
            }
            $data['parent_comment_id'] = (int) ($parent['parent_comment_id'] ?? 0) > 0 ? (int) $parent['parent_comment_id'] : $parentCommentId;
        } else {
            $data['parent_comment_id'] = null;
        }

        $data['user_id'] = $authUserId;
        $id = $this->model()->create($data);

        $stmt = $this->db()->prepare('UPDATE posts SET comments_count = comments_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $postId]);

        $comment = $this->db()->prepare($this->commentSelectSql('pc.id = :id LIMIT 1'));
        $comment->execute(['id' => $id, 'viewer_id' => $authUserId]);
        $row = $comment->fetch(\PDO::FETCH_ASSOC) ?: ['id' => $id, 'post_id' => $postId, 'user_id' => $authUserId, 'body' => trim((string) $data['body'])];
        if ($parentCommentId > 0) {
            $this->notifyReplyOwner($id, $authUserId);
        } elseif ((int) ($post['user_id'] ?? 0) !== $authUserId) {
            $actorName = $this->getActorName($authUserId);
            Notification::createNotification(
                $this->db(),
                (int) ($post['user_id'] ?? 0),
                $authUserId,
                'comment',
                'Comment',
                $actorName . ' commented on your post.',
                'post',
                $postId
            );
        }

        return [
            'id' => $id,
            'post_id' => $postId,
            'parent_comment_id' => $data['parent_comment_id'],
            'created' => true,
            'comment' => $this->normalizeComment($row),
            'comments_count' => $this->activePostCommentCount($postId),
        ];
    }

    public function update(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $comment = $this->model()->find((int) $id);
        if (!$comment) {
            $this->fail('Comment not found', 404);
        }
        if ((int) $comment['user_id'] !== $authUserId) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        if (trim((string) ($data['body'] ?? '')) === '') {
            $this->fail('Comment body is required.', 422);
        }

        $body = HtmlSanitizer::clean(trim((string) $data['body']));
        $this->model()->update((int) $id, ['body' => $body]);
        $stmt = $this->db()->prepare($this->commentSelectSql('pc.id = :id LIMIT 1'));
        $stmt->execute(['id' => (int) $id, 'viewer_id' => $authUserId]);
        $updated = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $updated ? $this->normalizeComment($updated) : ['id' => (int) $id];
    }

    public function destroy(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $comment = $this->model()->find((int) $id);
        if (!$comment) {
            $this->fail('Comment not found', 404);
        }
        if ((int) $comment['user_id'] !== $authUserId && !$this->isAdmin()) {
            $this->fail('Forbidden', 403);
        }

        $postId = (int) $comment['post_id'];
        $this->model()->delete((int) $id);

        $stmt = $this->db()->prepare('UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $postId]);

        return ['deleted' => true, 'id' => (int) $id, 'post_id' => $postId, 'comments_count' => $this->activePostCommentCount($postId)];
    }

    public function react(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        if (!$this->hasTable('comment_reactions')) {
            $this->fail('Comment reactions are not configured.', 503);
        }

        $commentId = (int) $id;
        $comment = $this->model()->find($commentId);
        if (!$comment || $comment['deleted_at'] !== null) {
            $this->fail('Comment not found', 404);
        }

        $post = (new Post())->find((int) $comment['post_id']);
        if (!$post || !$this->canViewPostComments($post)) {
            $this->fail('This post is not available.', 403);
        }

        $data = $this->input();
        $reactionType = strtolower(trim((string) ($data['reaction_type'] ?? 'agree')));
        if (!in_array($reactionType, ['agree', 'disagree'], true)) {
            $reactionType = 'agree';
        }

        $stmt = $this->db()->prepare('
            INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
            VALUES (:comment_id, :user_id, :reaction_type)
            ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type), updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([
            'comment_id' => $commentId,
            'user_id' => $authUserId,
            'reaction_type' => $reactionType,
        ]);

        return $this->findNormalizedComment($commentId, $authUserId);
    }

    public function unreact(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        if (!$this->hasTable('comment_reactions')) {
            $this->fail('Comment reactions are not configured.', 503);
        }

        $commentId = (int) $id;
        $stmt = $this->db()->prepare('DELETE FROM comment_reactions WHERE comment_id = :comment_id AND user_id = :user_id LIMIT 1');
        $stmt->execute(['comment_id' => $commentId, 'user_id' => $authUserId]);

        return $this->findNormalizedComment($commentId, $authUserId);
    }

    private function normalizeComment(array $comment): array
    {
        $comment['userId'] = $comment['userId'] ?? $comment['user_id'] ?? null;
        $comment['createdAt'] = $comment['createdAt'] ?? $comment['created_at'] ?? null;
        $comment['userName'] = $comment['userName'] ?? $comment['user_name'] ?? null;
        $comment['userUsername'] = $comment['userUsername'] ?? $comment['user_username'] ?? null;
        $comment['userProfileImageUrl'] = $comment['userProfileImageUrl'] ?? $comment['user_profile_image_url'] ?? null;
        $comment['blueTickStatus'] = $comment['blueTickStatus'] ?? $comment['user_blue_tick_status'] ?? $comment['blue_tick_status'] ?? null;
        $comment['parentCommentId'] = $comment['parentCommentId'] ?? $comment['parent_comment_id'] ?? null;
        $comment['agreeCount'] = (int) ($comment['agreeCount'] ?? $comment['agree_count'] ?? 0);
        $comment['disagreeCount'] = (int) ($comment['disagreeCount'] ?? $comment['disagree_count'] ?? 0);
        $comment['replyCount'] = (int) ($comment['replyCount'] ?? $comment['reply_count'] ?? 0);
        $comment['myReaction'] = $comment['myReaction'] ?? $comment['my_reaction'] ?? null;
        $comment['isDeleted'] = !empty($comment['deleted_at']);
        $comment['is_deleted'] = $comment['isDeleted'];
        $comment['isEdited'] = !empty($comment['updated_at']) && !empty($comment['created_at']) && strtotime((string) $comment['updated_at']) > strtotime((string) $comment['created_at']) + 1;
        $comment['is_edited'] = $comment['isEdited'];
        $comment['replies'] = $comment['replies'] ?? [];
        if ($comment['isDeleted']) {
            $comment['body'] = 'This comment has been deleted.';
            $comment['content'] = $comment['body'];
        } else {
            $comment['content'] = $comment['content'] ?? $comment['body'] ?? '';
        }
        $avatar = trim((string) ($comment['userProfileImageUrl'] ?? $comment['avatar_url'] ?? $comment['profile_image_url'] ?? ''));
        if ($avatar !== '') {
            $comment['userProfileImageUrl'] = $avatar;
            $comment['avatar_url'] = $avatar;
            $comment['profile_image_url'] = $avatar;
            $comment['profile_image'] = $avatar;
            $comment['image'] = $avatar;
        }
        return $comment;
    }

    private function commentSelectSql(string $whereAndOrder): string
    {
        $reactionJoin = $this->hasTable('comment_reactions')
            ? 'LEFT JOIN (
                   SELECT comment_id,
                          SUM(CASE WHEN reaction_type = \'agree\' THEN 1 ELSE 0 END) AS agrees,
                          SUM(CASE WHEN reaction_type = \'disagree\' THEN 1 ELSE 0 END) AS disagrees
                   FROM comment_reactions
                   GROUP BY comment_id
               ) reaction_counts ON reaction_counts.comment_id = pc.id
               LEFT JOIN comment_reactions my_reaction
                      ON my_reaction.comment_id = pc.id
                     AND my_reaction.user_id = :viewer_id'
            : 'LEFT JOIN (SELECT NULL AS comment_id, 0 AS agrees, 0 AS disagrees) reaction_counts ON reaction_counts.comment_id = pc.id
               LEFT JOIN (SELECT NULL AS comment_id, NULL AS reaction_type, :viewer_id AS viewer_id) my_reaction ON my_reaction.comment_id = pc.id';

        return '
            SELECT pc.*,
                   u.name AS user_name,
                   u.username AS user_username,
                   u.profile_image_url AS user_profile_image_url,
                   u.blue_tick_status AS user_blue_tick_status,
                   v.name AS village_name,
                   COALESCE(reply_counts.total, 0) AS reply_count,
                   COALESCE(reaction_counts.agrees, 0) AS agree_count,
                   COALESCE(reaction_counts.disagrees, 0) AS disagree_count,
                   my_reaction.reaction_type AS my_reaction
            FROM post_comments pc
            JOIN users u ON u.id = pc.user_id AND u.deleted_at IS NULL
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT parent_comment_id, COUNT(*) AS total
                FROM post_comments
                WHERE parent_comment_id IS NOT NULL
                GROUP BY parent_comment_id
            ) reply_counts ON reply_counts.parent_comment_id = pc.id
            ' . $reactionJoin . '
            WHERE ' . $whereAndOrder;
    }

    private function findNormalizedComment(int $commentId, int $viewerId): array
    {
        $stmt = $this->db()->prepare($this->commentSelectSql('pc.id = :id LIMIT 1'));
        $stmt->execute(['id' => $commentId, 'viewer_id' => $viewerId]);
        $comment = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$comment) {
            $this->fail('Comment not found', 404);
        }
        return $this->normalizeComment($comment);
    }

    private function activePostCommentCount(int $postId): int
    {
        $stmt = $this->db()->prepare('SELECT COUNT(*) FROM post_comments WHERE post_id = :post_id AND deleted_at IS NULL');
        $stmt->execute(['post_id' => $postId]);
        return (int) $stmt->fetchColumn();
    }

    private function hasTable(string $table): bool
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

    private function notifyReplyOwner(int $commentId, int $actorUserId): void
    {
        if (!$this->hasTable('notifications')) {
            return;
        }

        $stmt = $this->db()->prepare('
            SELECT child.id,
                   child.body,
                   child.parent_comment_id,
                   child.user_id AS actor_id,
                   parent.user_id AS parent_owner_id,
                   actor.username AS actor_username,
                   actor.name AS actor_name
            FROM post_comments child
            JOIN post_comments parent ON parent.id = child.parent_comment_id
            JOIN users actor ON actor.id = child.user_id
            WHERE child.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $commentId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return;
        }

        $recipientId = (int) ($row['parent_owner_id'] ?? 0);
        if ($recipientId <= 0 || $recipientId === $actorUserId) {
            return;
        }

        $actorName = trim((string) ($row['actor_name'] ?? $row['actor_username'] ?? 'Someone'));
        Notification::createNotification(
            $this->db(),
            $recipientId,
            $actorUserId,
            'comment_reply',
            'New reply',
            $actorName . ' replied to your comment.',
            'comment',
            $commentId
        );
    }

    private function getActorName(int $userId): string
    {
        $stmt = $this->db()->prepare('SELECT name, username FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? (trim((string) ($row['name'] ?? '')) ?: ($row['username'] ?? 'Someone')) : 'Someone';
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

    private function canViewPostComments(array $post): bool
    {
        $postOwnerId = (int) ($post['user_id'] ?? 0);
        if ($postOwnerId <= 0) {
            return false;
        }

        $viewerUserId = $this->currentUserId();
        if ($viewerUserId > 0 && $viewerUserId === $postOwnerId) {
            return true;
        }

        if ($this->isAdmin()) {
            return true;
        }

        if ((int) ($post['is_hidden'] ?? $post['isHidden'] ?? 0) === 1) {
            return false;
        }

        $stmt = $this->db()->prepare('SELECT profile_visibility FROM user_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $postOwnerId]);
        $visibility = trim((string) ($stmt->fetchColumn() ?? 'public'));

        if ($visibility === 'followers' || $visibility === 'private') {
            return $viewerUserId > 0 && $this->isFollowing($viewerUserId, $postOwnerId);
        }

        return $this->authorAccountStatus($postOwnerId) === 'active';
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

    private function isAdmin(): bool
    {
        $claims = $this->currentUserClaims();
        return isset($claims['type'], $claims['role']) && $claims['type'] === 'admin' && in_array($claims['role'], ['super_admin', 'moderator', 'editor'], true);
    }
}
