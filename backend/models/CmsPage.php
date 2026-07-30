<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class CmsPage extends BaseModel
{
    protected string $table = 'cms_pages';
    protected array $fillable = ['title', 'slug', 'content', 'seo_title', 'meta_description', 'is_published', 'sort_order', 'updated_by_admin_id'];
}
