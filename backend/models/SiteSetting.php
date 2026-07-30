<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class SiteSetting extends BaseModel
{
    protected string $table = 'site_settings';
    protected array $fillable = ['website_name', 'website_tagline', 'website_description', 'logo_url', 'favicon_url', 'default_theme', 'maintenance_mode', 'enable_profile_suggestions', 'suggestion_insertion_frequency', 'suggestion_carousel_size', 'updated_by_admin_id'];
    protected bool $softDeletes = false;
}
