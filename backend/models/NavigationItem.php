<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class NavigationItem extends BaseModel
{
    protected string $table = 'navigation_items';
    protected array $fillable = ['nav_key', 'name', 'route', 'location', 'enabled', 'auth_required', 'sort_order', 'is_system'];
    protected bool $softDeletes = false;
}
