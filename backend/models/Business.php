<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Business extends BaseModel
{
    protected string $table = 'businesses';
    protected bool $softDeletes = false;
    protected array $fillable = [
        'user_id',
        'category_id',
        'village_id',
        'logo',
        'business_name',
        'owner_name',
        'tagline',
        'address',
        'website',
        'whatsapp',
        'facebook',
        'instagram',
        'youtube',
        'opening_time',
        'closing_time',
        'days_open',
        'offers',
        'services',
        'established_year',
        'phone',
        'email',
        'description',
        'business_license',
        'gst_number',
        'status',
        'admin_remark',
        'approved_at',
        'approved_by',
        'followers_count',
        'views_count',
        'is_verified',
    ];

    public function ensureIsVerifiedColumn(): void
    {
        if (!$this->columnExists('is_verified')) {
            $this->pdo()->exec('ALTER TABLE `businesses` ADD COLUMN `is_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `views_count`');
        }
    }
}
