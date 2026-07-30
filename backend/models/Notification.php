<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Notification extends BaseModel
{
    protected string $table = 'notifications';
    protected array $fillable = ['recipient_user_id', 'actor_user_id', 'notification_type', 'title', 'body', 'entity_type', 'entity_id', 'is_read', 'read_at'];

    public static function createNotification(
        \PDO $pdo,
        int $recipientUserId,
        int $actorUserId,
        string $type,
        string $title,
        string $body,
        string $entityType = '',
        int $entityId = 0
    ): void {
        if ($recipientUserId <= 0 || $recipientUserId === $actorUserId) {
            return;
        }

        $stmt = $pdo->prepare('
            INSERT INTO notifications (recipient_user_id, actor_user_id, notification_type, title, body, entity_type, entity_id, is_read, created_at, updated_at)
            VALUES (:recipient_user_id, :actor_user_id, :notification_type, :title, :body, :entity_type, :entity_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ');
        $stmt->execute([
            'recipient_user_id' => $recipientUserId,
            'actor_user_id' => $actorUserId,
            'notification_type' => $type,
            'title' => $title,
            'body' => $body,
            'entity_type' => $entityType,
            'entity_id' => $entityId > 0 ? $entityId : null,
        ]);
    }
}
