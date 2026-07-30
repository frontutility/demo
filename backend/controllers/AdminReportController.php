<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Models\Report;

final class AdminReportController extends ReportController
{
    public function index(): array
    {
        return $this->reportsByType(null);
    }

    public function postReports(): array
    {
        return $this->reportsByTarget('post');
    }

    public function userReports(): array
    {
        return $this->reportsByTarget('user');
    }

    private function reportsByType(?string $type): array
    {
        return $type === null ? $this->reportsByTypes([]) : $this->reportsByTypes([$type]);
    }

    private function reportsByTypes(array $types): array
    {
        return $this->reportsByTarget(null, $types);
    }

    private function reportsByTarget(?string $target, array $types = []): array
    {
        $sql = '
            SELECT
                r.*,
                p.content AS post_content,
                p.user_id AS post_user_id,
                pc.body AS comment_body,
                pc.parent_comment_id AS comment_parent_id,
                comment_author.name AS comment_author_name,
                comment_author.username AS comment_author_username,
                post_author.name AS post_author_name,
                post_author.username AS post_author_username,
                reporter.name AS reporter_name,
                reporter.username AS reporter_username,
                reported_user.name AS reported_user_name,
                reported_user.username AS reported_user_username
            FROM reports r
            LEFT JOIN posts p ON p.id = r.reported_post_id
            LEFT JOIN post_comments pc ON pc.id = r.reported_comment_id
            LEFT JOIN users comment_author ON comment_author.id = pc.user_id
            LEFT JOIN users post_author ON post_author.id = p.user_id
            LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
            LEFT JOIN users reported_user ON reported_user.id = r.reported_user_id
            WHERE r.deleted_at IS NULL
        ';

        $params = [];
        if ($target === 'post') {
            $sql .= ' AND r.reported_post_id IS NOT NULL';
        } elseif ($target === 'user') {
            $sql .= ' AND r.reported_user_id IS NOT NULL';
        }

        if ($types) {
            $placeholders = [];
            foreach (array_values($types) as $index => $type) {
                $key = 'type' . $index;
                $placeholders[] = ':' . $key;
                $params[$key] = $type;
            }
            $sql .= ' AND r.report_type IN (' . implode(', ', $placeholders) . ')';
        }

        $sql .= ' ORDER BY r.created_at DESC';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);

        return array_map(fn (array $report) => $this->normalizeAdminReport($report), $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    public function update(string $id): array
    {
        $report = (new Report())->find((int) $id);
        if (!$report) {
            $this->fail('Report not found', 404);
        }

        $data = $this->input();
        $status = trim((string) ($data['status'] ?? ''));
        if (!in_array($status, ['pending', 'resolved', 'dismissed'], true)) {
            $this->fail('Invalid report status', 422);
        }

        $payload = ['status' => $status];
        if ($status === 'resolved' || $status === 'dismissed') {
            $payload['resolved_by_admin_id'] = $this->currentUserId();
            $payload['resolved_at'] = date('Y-m-d H:i:s');
        }
        if (array_key_exists('moderation_notes', $data) || array_key_exists('customReason', $data)) {
            $payload['moderation_notes'] = trim((string) ($data['moderation_notes'] ?? $data['customReason'] ?? ''));
        }

        $this->model()->update((int) $id, $payload);
        return $this->show($id);
    }

    public function show(string $id): array
    {
        $stmt = $this->db()->prepare('
            SELECT
                r.*,
                p.content AS post_content,
                p.user_id AS post_user_id,
                pc.body AS comment_body,
                pc.parent_comment_id AS comment_parent_id,
                comment_author.name AS comment_author_name,
                comment_author.username AS comment_author_username,
                post_author.name AS post_author_name,
                post_author.username AS post_author_username,
                reporter.name AS reporter_name,
                reporter.username AS reporter_username,
                reported_user.name AS reported_user_name,
                reported_user.username AS reported_user_username
            FROM reports r
            LEFT JOIN posts p ON p.id = r.reported_post_id
            LEFT JOIN post_comments pc ON pc.id = r.reported_comment_id
            LEFT JOIN users comment_author ON comment_author.id = pc.user_id
            LEFT JOIN users post_author ON post_author.id = p.user_id
            LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
            LEFT JOIN users reported_user ON reported_user.id = r.reported_user_id
            WHERE r.id = :id
              AND r.deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute(['id' => (int) $id]);
        $report = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$report) {
            $this->fail('Report not found', 404);
        }

        return $this->normalizeAdminReport($report);
    }

    private function normalizeAdminReport(array $report): array
    {
        $reportType = trim((string) ($report['report_type'] ?? ''));
        if ($reportType === '') {
            $reportType = !empty($report['reported_user_id']) ? 'user' : 'post';
        }
        $targetUsername = in_array($reportType, ['user', 'profile'], true)
            ? ($report['reported_user_username'] ?? $report['reported_user_name'] ?? '')
            : ($report['comment_author_username'] ?? $report['comment_author_name'] ?? $report['post_author_username'] ?? $report['post_author_name'] ?? '');

        return [
            'id' => (int) $report['id'],
            'reportId' => (int) $report['id'],
            'reportType' => $reportType,
            'postId' => (int) ($report['reported_post_id'] ?? 0),
            'reportedPostId' => (int) ($report['reported_post_id'] ?? 0),
            'postAuthorId' => isset($report['post_user_id']) ? (int) $report['post_user_id'] : null,
            'postAuthorName' => $report['post_author_name'] ?? '',
            'postAuthorUsername' => $report['post_author_username'] ?? '',
            'reportedUserId' => isset($report['reported_user_id']) ? (int) $report['reported_user_id'] : null,
            'reportedCommentId' => isset($report['reported_comment_id']) ? (int) $report['reported_comment_id'] : null,
            'reportedCommentBody' => $report['comment_body'] ?? '',
            'reportedCommentParentId' => isset($report['comment_parent_id']) ? (int) $report['comment_parent_id'] : null,
            'commentAuthorName' => $report['comment_author_name'] ?? '',
            'commentAuthorUsername' => $report['comment_author_username'] ?? '',
            'reason' => $report['reason'] ?? '',
            'customReason' => $report['custom_reason'] ?? $report['moderation_notes'] ?? '',
            'status' => $report['status'] ?? 'pending',
            'reportedBy' => $report['reporter_username'] ?? $report['reporter_name'] ?? '',
            'reportedByDisplayName' => $report['reported_by_display_name'] ?? '',
            'reporterName' => $report['reporter_name'] ?? '',
            'reportedUserName' => $report['reported_user_name'] ?? '',
            'reportedUserUsername' => $report['reported_user_username'] ?? '',
            'targetUsername' => $targetUsername,
            'postContent' => $report['post_content'] ?? '',
            'createdAt' => $report['created_at'] ?? null,
            'updatedAt' => $report['updated_at'] ?? null,
        ];
    }
}
