<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Helpers\Upload;
use ConnectNKT\Models\DonationSetting;

final class AdminDonationController extends BaseController
{
    private function getOrCreateSetting(): array
    {
        $model = new DonationSetting();
        $rows = $model->all([], 'id ASC', 1);
        if (!$rows) {
            $model->pdo()->exec("INSERT INTO donation_settings (id, qr_image, upi_id, account_holder_name, donation_enabled, show_upi) VALUES (1, NULL, NULL, NULL, 1, 1)");
            $rows = $model->all([], 'id ASC', 1);
        }
        return $rows[0] ?? [
            'id' => 1,
            'qr_image' => null,
            'upi_id' => null,
            'account_holder_name' => null,
            'donation_enabled' => 1,
            'show_upi' => 1,
        ];
    }

    public function show(): void
    {
        $settings = $this->getOrCreateSetting();
        $this->json([
            'id' => (int) ($settings['id'] ?? 1),
            'qrImage' => $settings['qr_image'] ?? null,
            'upiId' => $settings['upi_id'] ?? null,
            'accountHolderName' => $settings['account_holder_name'] ?? null,
            'donationEnabled' => (int) ($settings['donation_enabled'] ?? 1) === 1,
            'showUpi' => (int) ($settings['show_upi'] ?? 1) === 1,
        ]);
    }

    public function update(): void
    {
        $settings = $this->getOrCreateSetting();
        $id = (int) ($settings['id'] ?? 1);
        
        $input = $this->input();
        
        $donationEnabled = isset($input['donationEnabled']) ? ($input['donationEnabled'] ? 1 : 0) : ((int)($settings['donation_enabled'] ?? 1));
        $showUpi = isset($input['showUpi']) ? ($input['showUpi'] ? 1 : 0) : ((int)($settings['show_upi'] ?? 1));

        $data = [
            'upi_id' => array_key_exists('upiId', $input) ? ($input['upiId'] !== null ? trim((string)$input['upiId']) : null) : ($settings['upi_id'] ?? null),
            'account_holder_name' => array_key_exists('accountHolderName', $input) ? ($input['accountHolderName'] !== null ? trim((string)$input['accountHolderName']) : null) : ($settings['account_holder_name'] ?? null),
            'donation_enabled' => $donationEnabled,
            'show_upi' => $showUpi,
        ];

        $model = new DonationSetting();
        $model->update($id, $data);

        $updated = $model->find($id) ?? $settings;

        $this->json([
            'id' => (int) ($updated['id'] ?? 1),
            'qrImage' => $updated['qr_image'] ?? null,
            'upiId' => $updated['upi_id'] ?? null,
            'accountHolderName' => $updated['account_holder_name'] ?? null,
            'donationEnabled' => (int) ($updated['donation_enabled'] ?? 1) === 1,
            'showUpi' => (int) ($updated['show_upi'] ?? 1) === 1,
        ], 'Donation settings saved successfully');
    }

    public function uploadQR(): void
    {
        if (empty($_FILES['qr_image']['name']) || empty($_FILES['qr_image']['tmp_name']) || !is_uploaded_file($_FILES['qr_image']['tmp_name'])) {
            $this->fail('No image file uploaded', 400);
            return;
        }

        $image = Upload::validateUploadedImage($_FILES['qr_image'], [
            'image/png',
            'image/jpeg',
            'image/webp',
        ]);
        if ($image === null) {
            $this->fail('Invalid image. Allowed formats: JPG, JPEG, PNG, WEBP up to 2 MB.', 400);
            return;
        }

        $uploadsDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'qr';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0775, true);
        }

        $filename = 'qr_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $image['extension'];
        $targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($_FILES['qr_image']['tmp_name'], $targetPath)) {
            $this->fail('Failed to save QR Code image', 500);
            return;
        }

        $settings = $this->getOrCreateSetting();
        $id = (int) ($settings['id'] ?? 1);

        // Delete old QR image file if it exists
        if (!empty($settings['qr_image'])) {
            $oldPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $settings['qr_image']);
            if (file_exists($oldPath) && is_file($oldPath)) {
                @unlink($oldPath);
            }
        }

        $relativeUrl = 'uploads/qr/' . $filename;
        $model = new DonationSetting();
        $model->update($id, ['qr_image' => $relativeUrl]);

        $this->json([
            'qrImage' => $relativeUrl
        ], 'QR Code image uploaded successfully');
    }
}
