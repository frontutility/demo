<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\Notification;

final class NotificationController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new Notification();
    }

    public function markRead(string $id): array
    {
        return ['notification_id' => (int) $id, 'read' => true];
    }

    public function markAllRead(): array
    {
        return ['read_all' => true];
    }
}
