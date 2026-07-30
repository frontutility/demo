<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Models\Notification;

final class NotificationController extends BaseController
{
    public function index(): void
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = min(50, max(10, (int) ($_GET['per_page'] ?? 20)));
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db()->prepare('SELECT COUNT(*) FROM notifications WHERE recipient_user_id = :uid AND deleted_at IS NULL');
        $countStmt->execute(['uid' => $userId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db()->prepare('
            SELECT n.*, u.name AS actor_name, u.username AS actor_username, u.profile_image_url AS actor_avatar
            FROM notifications n
            LEFT JOIN users u ON u.id = n.actor_user_id
            WHERE n.recipient_user_id = :uid AND n.deleted_at IS NULL
            ORDER BY n.created_at DESC
            LIMIT :limit OFFSET :offset
        ');
        $stmt->bindValue('uid', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $notifications = array_map(function (array $row) {
            return [
                'id' => (int) $row['id'],
                'recipientUserId' => (int) $row['recipient_user_id'],
                'actorUserId' => (int) ($row['actor_user_id'] ?? 0),
                'actorName' => $row['actor_name'] ?? '',
                'actorUsername' => $row['actor_username'] ?? '',
                'actorAvatar' => $row['actor_avatar'] ?? '',
                'type' => $row['notification_type'],
                'title' => $row['title'],
                'body' => $row['body'],
                'entityType' => $row['entity_type'] ?? '',
                'entityId' => (int) ($row['entity_id'] ?? 0),
                'isRead' => (bool) ($row['is_read'] ?? 0),
                'createdAt' => $row['created_at'],
            ];
        }, $rows);

        $this->json([
            'notifications' => $notifications,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'has_more' => ($offset + $perPage) < $total,
        ]);
    }

    public function unreadCount(): void
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->json(['count' => 0]);
            return;
        }

        $stmt = $this->db()->prepare('SELECT COUNT(*) FROM notifications WHERE recipient_user_id = :uid AND is_read = 0 AND deleted_at IS NULL');
        $stmt->execute(['uid' => $userId]);
        $this->json(['count' => (int) $stmt->fetchColumn()]);
    }

    public function markRead(string $id): void
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $stmt = $this->db()->prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = :id AND recipient_user_id = :uid LIMIT 1');
        $stmt->execute(['id' => (int) $id, 'uid' => $userId]);
        $this->json(['notification_id' => (int) $id, 'read' => true]);
    }

    public function markAllRead(): void
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $stmt = $this->db()->prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE recipient_user_id = :uid AND is_read = 0');
        $stmt->execute(['uid' => $userId]);
        $this->json(['read_all' => true, 'count' => $stmt->rowCount()]);
    }
}
