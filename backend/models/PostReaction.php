<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class PostReaction extends BaseModel
{
    protected string $table = 'post_reactions';
    protected array $fillable = ['post_id', 'user_id', 'reaction_type'];
    protected bool $softDeletes = false;
}
