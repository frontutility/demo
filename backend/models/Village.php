<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Village extends BaseModel
{
    protected string $table = 'villages';
    protected array $fillable = ['name', 'slug', 'is_active', 'sort_order'];
}
