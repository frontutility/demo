<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class DonationPageSetting extends BaseModel
{
    protected string $table = 'donation_page_settings';
    protected array $fillable = [
        'enabled', 'hero_title_hi', 'hero_description_hi', 'why_support_hi', 'how_used_hi', 'transparency_hi', 'thank_you_hi',
        'hero_title_en', 'hero_description_en', 'why_support_en', 'how_used_en', 'transparency_en', 'thank_you_en',
        'qr_image_url', 'upi_id', 'account_holder_name', 'show_qr', 'show_upi',
        'seo_title', 'seo_description', 'updated_by_admin_id'
    ];
    protected bool $softDeletes = false;
}
