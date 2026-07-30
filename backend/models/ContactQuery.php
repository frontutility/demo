<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class ContactQuery extends BaseModel
{
    protected string $table = 'contact_queries';
    protected array $fillable = ['submitted_by_user_id', 'name', 'email', 'category', 'subject', 'message', 'status', 'response_message', 'responded_by_admin_id', 'responded_at'];
}
