<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class PostCategory extends BaseModel
{
    protected string $table = 'post_categories';
    protected array $fillable = ['name', 'slug', 'is_active', 'sort_order'];
}
