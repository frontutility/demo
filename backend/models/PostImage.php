<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class PostImage extends BaseModel
{
    protected string $table = 'post_images';
    protected array $fillable = ['post_id', 'image_url', 'alt_text', 'sort_order'];
    protected bool $softDeletes = false;
}
