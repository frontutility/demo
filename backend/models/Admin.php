<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Admin extends BaseModel
{
    protected string $table = 'admins';
    protected array $fillable = ['name', 'username', 'email', 'password_hash', 'role', 'status', 'last_login_at'];
}
