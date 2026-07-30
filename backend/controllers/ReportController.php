<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\Report;
use ConnectNKT\Models\Post;
use ConnectNKT\Models\PostComment;

class ReportController extends CrudController
{
    private static array $columnCache = [];

    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new Report();
    }

    public function index(): array
    {
        $stmt = $this->db()->prepare('
            SELECT r.*, u.name AS reporter_name, u.username AS reporter_username
            FROM reports r
            LEFT JOIN users u ON u.id = r.reporter_user_id
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        ');
        $stmt->execute();

        return array_map(fn (array $report) => $this->normalizeReport($report), $stmt->fetchAll(\PDO::FETCH_ASSOC));
    }

    public function store(): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $claims = $this->currentUserClaims();
        if (($claims['type'] ?? 'user') === 'admin') {
            $this->fail('Admins cannot report posts. Please use moderation tools.', 403);
        }

        $data = $this->input();
        $commentId = (int) ($data['reported_comment_id'] ?? $data['comment_id'] ?? 0);
        $postId = (int) ($data['reported_post_id'] ?? $data['post_id'] ?? 0);
        if ($commentId > 0) {
            $comment = (new PostComment())->find($commentId);
            if (!$comment) {
                $this->fail('Comment not found', 404);
            }
            $postId = (int) ($comment['post_id'] ?? 0);
        }
        if ($postId <= 0) {
            $this->fail('A valid post is required.', 422);
        }
        if (!(new Post())->find($postId)) {
            $this->fail('Post not found', 404);
        }

        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            $this->fail('Please select a report reason.', 422);
        }

        $allowedReasons = [
            'Spam',
            'Fake Information',
            'Harassment',
            'Hate Speech',
            'Violence',
            'Adult Content',
            'Child Safety',
            'Terrorism',
            'Scam',
            'Impersonation',
            'Copyright',
            'Other',
        ];
        if (!in_array($reason, $allowedReasons, true)) {
            $this->fail('Invalid report reason.', 422);
        }

        $customReason = trim((string) ($data['custom_reason'] ?? ''));
        if ($reason === 'Other') {
            if ($customReason === '') {
                $this->fail('Please describe the reason.', 422);
            }
            if ($this->wordCount($customReason) > 50) {
                $this->fail('Custom reason must be 50 words or fewer.', 422);
            }
        } else {
            $customReason = '';
        }

        $userStmt = $this->db()->prepare('SELECT name, username FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $authUserId]);
        $reporter = $userStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $payload = [
            'report_type' => $commentId > 0 ? 'comment' : (trim((string) ($data['report_type'] ?? 'post')) ?: 'post'),
            'reported_post_id' => $postId,
            'reported_comment_id' => $commentId > 0 ? $commentId : null,
            'reporter_user_id' => $authUserId,
            'reported_by_display_name' => trim((string) ($reporter['name'] ?? $reporter['username'] ?? '')),
            'reason' => $reason,
            'status' => 'pending',
        ];

        if ($this->hasColumn('reports', 'custom_reason') && $customReason !== '') {
            $payload['custom_reason'] = $customReason;
        } elseif ($customReason !== '') {
            $payload['moderation_notes'] = $customReason;
        }

        $id = $this->model()->create($payload);
        $this->autoHideReportedPost($postId);

        $report = $this->db()->prepare('
            SELECT r.*, u.name AS reporter_name, u.username AS reporter_username
            FROM reports r
            LEFT JOIN users u ON u.id = r.reporter_user_id
            WHERE r.id = :id
            LIMIT 1
        ');
        $report->execute(['id' => $id]);
        $row = $report->fetch(\PDO::FETCH_ASSOC) ?: ['id' => $id, ...$payload];

        return $this->normalizeReport($row);
    }

    private function autoHideReportedPost(int $postId): void
    {
        $stmt = $this->db()->prepare('
            SELECT COUNT(*)
            FROM reports
            WHERE deleted_at IS NULL
              AND reported_post_id = :post_id
        ');
        $stmt->execute([
            'post_id' => $postId,
        ]);

        if ((int) $stmt->fetchColumn() < 20) {
            return;
        }

        $hideStmt = $this->db()->prepare('
            UPDATE posts
            SET is_hidden = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $hideStmt->execute(['id' => $postId]);
    }

    private function normalizeReport(array $report): array
    {
        $report['reportId'] = $report['reportId'] ?? $report['id'] ?? null;
        $report['reportType'] = $report['reportType'] ?? $report['report_type'] ?? null;
        $report['postId'] = $report['postId'] ?? $report['reported_post_id'] ?? null;
        $report['reportedPostId'] = $report['reportedPostId'] ?? $report['reported_post_id'] ?? null;
        $report['reportedUserId'] = $report['reportedUserId'] ?? $report['reported_user_id'] ?? null;
        $report['reportedCommentId'] = $report['reportedCommentId'] ?? $report['reported_comment_id'] ?? null;
        $report['reporterUserId'] = $report['reporterUserId'] ?? $report['reporter_user_id'] ?? null;
        $report['reportedBy'] = $report['reportedBy'] ?? $report['reporter_username'] ?? $report['reported_by_display_name'] ?? null;
        $report['customReason'] = $report['customReason'] ?? $report['custom_reason'] ?? $report['moderation_notes'] ?? null;
        $report['status'] = $report['status'] ?? 'pending';
        $report['createdAt'] = $report['createdAt'] ?? $report['created_at'] ?? null;
        return $report;
    }

    private function hasColumn(string $table, string $column): bool
    {
        $cacheKey = $table . '.' . $column;
        if (array_key_exists($cacheKey, self::$columnCache)) {
            return self::$columnCache[$cacheKey];
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
        return self::$columnCache[$cacheKey] = (bool) $stmt->fetchColumn();
    }

    private function wordCount(string $value): int
    {
        return count(array_filter(preg_split('/\s+/', trim($value)) ?: []));
    }
}
