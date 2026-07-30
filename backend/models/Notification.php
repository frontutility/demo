<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Notification extends BaseModel
{
    protected string $table = 'notifications';
    protected array $fillable = ['recipient_user_id', 'actor_user_id', 'notification_type', 'title', 'body', 'entity_type', 'entity_id', 'is_read', 'read_at'];
}
