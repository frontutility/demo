<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class News extends BaseModel
{
    protected string $table = 'news';
    protected array $fillable = [
        'title',
        'subtitle',
        'slug',
        'featured_image',
        'banner_image',
        'category',
        'content',
        'short_description',
        'author_name',
        'status',
        'views_count',
        'published_at',
        'seo_title',
        'seo_description',
        'meta_keywords',
    ];
}
