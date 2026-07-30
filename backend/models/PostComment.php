<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class PostComment extends BaseModel
{
    protected string $table = 'post_comments';
    protected array $fillable = ['post_id', 'user_id', 'parent_comment_id', 'body', 'is_hidden'];
}
