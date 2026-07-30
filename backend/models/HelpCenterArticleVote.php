<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class HelpCenterArticleVote extends BaseModel
{
    protected string $table = 'help_center_article_votes';
    protected array $fillable = ['article_id', 'user_id', 'voter_key', 'vote_type'];
    protected bool $softDeletes = false;
}
