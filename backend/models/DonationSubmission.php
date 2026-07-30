<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class DonationSubmission extends BaseModel
{
    protected string $table = 'donation_submissions';
    protected array $fillable = [
        'donor_name', 'upi_name', 'amount', 'payment_date', 'payment_time', 'transaction_id', 'message',
        'status', 'approved_at', 'approved_by_admin_id'
    ];
    protected bool $softDeletes = false;
}
