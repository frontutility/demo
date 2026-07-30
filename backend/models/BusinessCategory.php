<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class BusinessCategory extends BaseModel
{
    protected string $table = 'business_categories';
    protected bool $softDeletes = false;
    protected array $fillable = [
        'name',
        'slug',
        'icon',
        'icon_web',
        'icon_emoji',
        'type',
        'image',
        'description',
        'sort_order',
        'is_active',
    ];
}
