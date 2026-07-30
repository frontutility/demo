<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Models\DonationSetting;

final class DonationController extends BaseController
{
    public function show(): void
    {
        $model = new DonationSetting();
        $rows = $model->all([], 'id ASC', 1);

        if (!$rows) {
            $settings = [
                'id' => 1,
                'qr_image' => null,
                'upi_id' => null,
                'account_holder_name' => null,
                'donation_enabled' => 1,
                'show_upi' => 1,
            ];
        } else {
            $settings = $rows[0];
        }

        $this->json([
            'id' => (int) ($settings['id'] ?? 1),
            'qrImage' => $settings['qr_image'] ?? null,
            'upiId' => $settings['upi_id'] ?? null,
            'accountHolderName' => $settings['account_holder_name'] ?? null,
            'donationEnabled' => (int) ($settings['donation_enabled'] ?? 1) === 1,
            'showUpi' => (int) ($settings['show_upi'] ?? 1) === 1,
        ]);
    }
}
