<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Post extends BaseModel
{
    protected string $table = 'posts';
    protected array $fillable = ['user_id', 'category_id', 'slug', 'post_type', 'content', 'is_hidden', 'agrees_count', 'disagrees_count', 'comments_count', 'shares_count', 'is_pinned', 'pinned_at', 'is_globally_pinned', 'globally_pinned_at', 'globally_pinned_by_admin_id'];
}
