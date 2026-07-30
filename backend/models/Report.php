<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Report extends BaseModel
{
    protected string $table = 'reports';
    protected array $fillable = ['report_type', 'reported_post_id', 'reported_user_id', 'reported_comment_id', 'reporter_user_id', 'reported_by_display_name', 'reason', 'custom_reason', 'status', 'moderation_notes', 'resolved_by_admin_id', 'resolved_at'];
}
