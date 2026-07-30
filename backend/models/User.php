<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class User extends BaseModel
{
    protected string $table = 'users';
    protected array $fillable = [
        'village_id', 'name', 'username', 'email', 'mobile',
        'father_name', 'gender', 'date_of_birth', 'bio', 'profile_image_url',
        'firebase_uid', 'google_photo', 'google_provider',
    ];
}
