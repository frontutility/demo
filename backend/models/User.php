<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class User extends BaseModel
{
    protected string $table = 'users';
    protected array $fillable = [
        'village_id', 'name', 'username', 'email', 'firebase_uid', 'google_photo', 'google_provider', 'email_verified', 'mobile', 'password_hash',
        'father_name', 'gender', 'date_of_birth', 'bio', 'profile_image_url',
        'can_create_text_post', 'can_create_poll_post', 'can_create_image_post', 'can_create_image_text_post',
        'blue_tick_status', 'followers_count_override', 'following_count_override',
        'posts_count_override', 'comments_count_override', 'agree_count_override',
        'disagree_count_override', 'shares_count_override',
        'account_status', 'hidden_at', 'suspended_at', 'last_login_at', 'remember_token'
    ];
}
