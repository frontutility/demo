<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class DonationSetting extends BaseModel
{
    protected string $table = 'donation_settings';
    protected array $fillable = [
        'qr_image',
        'upi_id',
        'account_holder_name',
        'donation_enabled',
        'show_upi'
    ];
    protected bool $softDeletes = false;
}
