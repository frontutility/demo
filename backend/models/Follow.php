<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Follow extends BaseModel
{
    protected string $table = 'followers';
    protected array $fillable = ['follower_id', 'followed_id'];
    protected bool $softDeletes = false;
}
