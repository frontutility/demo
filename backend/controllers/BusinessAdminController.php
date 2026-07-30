<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Models\Business;
use ConnectNKT\Models\BusinessCategory;
use PDO;

final class BusinessAdminController extends BaseController
{
    private function businessModel(): Business
    {
        return new Business();
    }

    private function categoryModel(): BusinessCategory
    {
        return new BusinessCategory();
    }

    private function isAdminContext(): bool
    {
        $user = $this->currentUser();
        if (!$user) {
            return false;
        }

        $role = strtolower((string) ($user['role'] ?? $user['type'] ?? ''));
        return str_contains($role, 'admin') || !empty($user['is_admin']);
    }

    public function categoriesIndex(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        return $this->categoryModel()->all([], 'sort_order ASC, name ASC');
    }

    public function categoriesStore(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $payload = $this->input();
        $record = [
            'name' => trim((string) ($payload['name'] ?? '')),
            'slug' => strtolower(trim((string) ($payload['slug'] ?? ''))),
            'icon' => trim((string) ($payload['icon'] ?? '')),
            'icon_web' => trim((string) ($payload['icon_web'] ?? '')),
            'icon_emoji' => trim((string) ($payload['icon_emoji'] ?? '')),
            'type' => in_array($payload['type'] ?? 'business', ['business', 'person', 'both']) ? $payload['type'] : 'business',
            'image' => trim((string) ($payload['image'] ?? '')),
            'description' => trim((string) ($payload['description'] ?? '')),
            'sort_order' => (int) ($payload['sort_order'] ?? 0),
            'is_active' => (int) ($payload['is_active'] ?? 1),
        ];
        $id = $this->categoryModel()->create($record);
        return $this->categoryModel()->find($id) ?: ['id' => $id];
    }

    public function categoriesUpdate(string $id): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $payload = $this->input();
        $record = [];
        if (array_key_exists('name', $payload)) { $record['name'] = trim((string) $payload['name']); }
        if (array_key_exists('slug', $payload)) { $record['slug'] = strtolower(trim((string) $payload['slug'])); }
        if (array_key_exists('icon', $payload)) { $record['icon'] = trim((string) $payload['icon']); }
        if (array_key_exists('icon_web', $payload)) { $record['icon_web'] = trim((string) $payload['icon_web']); }
        if (array_key_exists('icon_emoji', $payload)) { $record['icon_emoji'] = trim((string) $payload['icon_emoji']); }
        if (array_key_exists('type', $payload)) { $record['type'] = in_array($payload['type'], ['business', 'person', 'both']) ? $payload['type'] : 'business'; }
        if (array_key_exists('image', $payload)) { $record['image'] = trim((string) $payload['image']); }
        if (array_key_exists('description', $payload)) { $record['description'] = trim((string) $payload['description']); }
        if (array_key_exists('sort_order', $payload)) { $record['sort_order'] = (int) $payload['sort_order']; }
        if (array_key_exists('is_active', $payload)) { $record['is_active'] = (int) $payload['is_active']; }
        $this->categoryModel()->update((int) $id, $record);
        return $this->categoryModel()->find((int) $id) ?: [];
    }

    public function categoriesDelete(string $id): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $this->categoryModel()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    public function businessesIndex(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->businessModel()->pdo()->prepare('
            SELECT b.*, c.name AS category_name, v.name AS village_name, u.name AS owner_display_name
            FROM businesses b
            LEFT JOIN business_categories c ON c.id = b.category_id
            LEFT JOIN villages v ON v.id = b.village_id
            LEFT JOIN users u ON u.id = b.user_id
            ORDER BY b.created_at DESC, b.id DESC
        ');
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
