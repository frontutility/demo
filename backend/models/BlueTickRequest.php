<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class BlueTickRequest extends BaseModel
{
    protected string $table = 'blue_tick_requests';
    protected array $fillable = ['user_id', 'request_reason', 'followers_count_snapshot', 'request_status', 'requested_at', 'reviewed_by_admin_id', 'reviewed_at', 'review_notes'];
}
