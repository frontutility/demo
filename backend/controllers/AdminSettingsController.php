<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Helpers\Upload;
use ConnectNKT\Models\SiteSetting;

final class AdminSettingsController extends BaseController
{
    public function show(): void
    {
        $model = new SiteSetting();
        $rows = $model->all([], 'id ASC', 1);
        if (!$rows) {
            $model->pdo()->exec("INSERT INTO site_settings (id, website_name, website_tagline, website_description, default_theme) VALUES (1, 'ConnectNKT', 'Connect Your Town', 'A community network for villages, updates, and trusted local conversations.', 'light')");
            $rows = $model->all([], 'id ASC', 1);
        }
        
        // Normalize to camelCase
        $settings = $rows[0] ?? [];
        $this->json([
            'id' => $settings['id'] ?? null,
            'websiteName' => $settings['website_name'] ?? 'ConnectNKT',
            'websiteTagline' => $settings['website_tagline'] ?? '',
            'websiteDescription' => $settings['website_description'] ?? '',
            'defaultTheme' => $settings['default_theme'] ?? 'light',
            'logoUrl' => $settings['logo_url'] ?? $settings['logo'] ?? null,
            'faviconUrl' => $settings['favicon_url'] ?? $settings['favicon'] ?? null,
            'maintenanceMode' => (bool) ($settings['maintenance_mode'] ?? 0),
        ]);
    }

    public function uploadLogo(): void
    {
        if (empty($_FILES['logo']['name']) || empty($_FILES['logo']['tmp_name']) || !is_uploaded_file($_FILES['logo']['tmp_name'])) {
            $this->fail('No logo uploaded', 400);
            return;
        }

        $image = Upload::validateUploadedImage($_FILES['logo'], [
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp',
            'image/x-icon',
            'image/vnd.microsoft.icon',
        ]);
        if ($image === null) {
            $this->fail('Unsupported logo format or file is too large', 400);
            return;
        }

        $uploadsDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'branding';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0775, true);
        }

        $filename = 'logo_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $image['extension'];
        $targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($_FILES['logo']['tmp_name'], $targetPath)) {
            $this->fail('Unable to save logo', 500);
            return;
        }

        $model = new SiteSetting();
        $rows = $model->all([], 'id ASC', 1);
        if (!$rows) {
            $model->pdo()->exec("INSERT INTO site_settings (id, website_name, website_tagline, website_description, default_theme) VALUES (1, 'ConnectNKT', 'Connect Your Town', 'A community network for villages, updates, and trusted local conversations.', 'light')");
            $rows = $model->all([], 'id ASC', 1);
        }

        $id = (int) ($rows[0]['id'] ?? 1);
        $data = ['logo_url' => 'uploads/branding/' . $filename];
        $adminId = $this->currentUserId();
        if ($adminId > 0) {
            $data['updated_by_admin_id'] = $adminId;
        }

        $model->update($id, $data);

        $this->json([
            'logoUrl' => 'uploads/branding/' . $filename,
        ], 'Logo uploaded');
    }

    public function update(): void
    {
        $model = new SiteSetting();
        $rows = $model->all([], 'id ASC', 1);
        if (!$rows) {
            $model->pdo()->exec("INSERT INTO site_settings (id, website_name, website_tagline, website_description, default_theme) VALUES (1, 'ConnectNKT', 'Connect Your Town', 'A community network for villages, updates, and trusted local conversations.', 'light')");
            $rows = $model->all([], 'id ASC', 1);
        }
        $id = (int) ($rows[0]['id'] ?? 1);
        
        // Map camelCase from frontend to snake_case for backend
        $input = $this->input();
        $data = [
            'website_name' => $input['websiteName'] ?? $input['website_name'] ?? null,
            'website_tagline' => $input['websiteTagline'] ?? $input['website_tagline'] ?? null,
            'website_description' => $input['websiteDescription'] ?? $input['website_description'] ?? null,
            'default_theme' => $input['defaultTheme'] ?? $input['default_theme'] ?? null,
            'logo_url' => $input['logoUrl'] ?? $input['logo_url'] ?? $input['logo'] ?? null,
            'favicon_url' => $input['faviconUrl'] ?? $input['favicon_url'] ?? $input['favicon'] ?? null,
            'maintenance_mode' => isset($input['maintenanceMode']) ? ($input['maintenanceMode'] ? 1 : 0) : null,
        ];

        $adminId = $this->currentUserId();
        if ($adminId > 0) {
            $data['updated_by_admin_id'] = $adminId;
        }
        
        $model->update($id, $data);
        
        $updated = $model->find($id) ?? ['id' => $id];
        
        // Normalize response
        $this->json([
            'id' => $updated['id'],
            'websiteName' => $updated['website_name'],
            'websiteTagline' => $updated['website_tagline'],
            'websiteDescription' => $updated['website_description'],
            'defaultTheme' => $updated['default_theme'],
            'logoUrl' => $updated['logo_url'] ?? $updated['logo'] ?? null,
            'faviconUrl' => $updated['favicon_url'] ?? $updated['favicon'] ?? null,
            'maintenanceMode' => (bool) ($updated['maintenance_mode'] ?? 0),
        ], 'Settings saved');
    }
}
