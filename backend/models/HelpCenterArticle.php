<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class HelpCenterArticle extends BaseModel
{
    protected string $table = 'help_center_articles';
    protected array $fillable = ['slug', 'question', 'answer', 'category', 'tags', 'keywords', 'helpful_count', 'not_helpful_count', 'last_updated', 'is_published', 'updated_by_admin_id'];
}
