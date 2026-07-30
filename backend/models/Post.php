<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Post extends BaseModel
{
    protected string $table = 'posts';
    protected array $fillable = ['category_id', 'slug', 'post_type', 'content'];
}
