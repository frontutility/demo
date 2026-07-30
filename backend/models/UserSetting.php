<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class UserSetting extends BaseModel
{
    protected string $table = 'user_settings';
    protected string $primaryKey = 'user_id';
    protected array $fillable = [
        'email_notifications', 'hide_from_search', 'two_factor_reminders', 'theme_preference',
        'profile_visibility', 'email_visibility', 'phone_visibility',
        'followers_visibility', 'following_visibility', 'show_in_search'
    ];
    protected bool $softDeletes = false;
}
