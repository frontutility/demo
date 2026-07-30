<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Models\NavigationItem;

final class NavigationController extends BaseController
{
    private const LOCATIONS = ['header', 'left_sidebar', 'right_sidebar', 'mobile', 'footer', 'profile'];

    public function index(): void
    {
        $model = new NavigationItem();
        $this->ensureDefaultItems($model);
        $rows = $model->all(['enabled' => 1], 'location ASC, sort_order ASC, id ASC');
        $this->json(array_map([$this, 'normalize'], $rows));
    }

    public function adminIndex(): void
    {
        $model = new NavigationItem();
        $this->ensureDefaultItems($model);
        $rows = $model->all([], 'location ASC, sort_order ASC, id ASC');
        $this->json(array_map([$this, 'normalize'], $rows));
    }

    public function store(): void
    {
        $data = $this->validatedInput();
        $model = new NavigationItem();
        if ($model->all(['nav_key' => $data['nav_key']], 'id ASC', 1)) {
            $this->fail('Navigation key already exists.', 409);
            return;
        }
        $id = $model->create($data);
        $this->json($this->normalize($model->find($id) ?? []), 'Navigation link created', 201);
    }

    public function update(string $id): void
    {
        $model = new NavigationItem();
        $item = $model->find((int) $id);
        if (!$item) {
            $this->fail('Navigation link not found.', 404);
            return;
        }
        $input = $this->input();
        $data = [];
        if (array_key_exists('name', $input)) $data['name'] = trim((string) $input['name']);
        if (array_key_exists('route', $input)) $data['route'] = $this->validateRoute($input['route']);
        if (array_key_exists('location', $input)) $data['location'] = $this->validateLocation($input['location']);
        if (array_key_exists('enabled', $input)) $data['enabled'] = $this->toBool($input['enabled']);
        if (array_key_exists('auth_required', $input)) $data['auth_required'] = $this->toBool($input['auth_required']);
        if (array_key_exists('sort_order', $input)) $data['sort_order'] = max(0, (int) $input['sort_order']);
        if (isset($data['name']) && $data['name'] === '') $this->fail('Navigation name is required.', 422);
        $model->update((int) $id, $data);
        $this->json($this->normalize($model->find((int) $id) ?? []), 'Navigation link updated');
    }

    private function validatedInput(): array
    {
        $input = $this->input();
        $name = trim((string) ($input['name'] ?? ''));
        $key = trim((string) ($input['nav_key'] ?? ''));
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,119}$/', $key)) $this->fail('Invalid navigation key.', 422);
        if ($name === '' || mb_strlen($name) > 150) $this->fail('Navigation name is required and must be 150 characters or fewer.', 422);
        return [
            'nav_key' => $key,
            'name' => $name,
            'route' => $this->validateRoute($input['route'] ?? ''),
            'location' => $this->validateLocation($input['location'] ?? ''),
            'enabled' => $this->toBool($input['enabled'] ?? true),
            'auth_required' => $this->toBool($input['auth_required'] ?? false),
            'sort_order' => max(0, (int) ($input['sort_order'] ?? 0)),
            'is_system' => 0,
        ];
    }

    /**
     * Keeps the live navigation registry visible even when the SQL seed portion
     * was not run. Existing rows are never overwritten, so admin toggles persist.
     */
    private function ensureDefaultItems(NavigationItem $model): void
    {
        $defaults = [
            ['header_home', 'Home', '/', 'header', 0, 10],
            ['header_search', 'Search', '/search', 'header', 0, 20],
            ['header_login', 'Login', '/login', 'header', 0, 30],
            ['header_register', 'Register', '/register', 'header', 0, 40],
            ['header_profile', 'Profile', '/profile', 'header', 1, 50],
            ['sidebar_home', 'Home', '/', 'left_sidebar', 0, 10],
            ['sidebar_latest_posts', 'Latest Posts', '/search', 'left_sidebar', 0, 20],
            ['sidebar_news', 'News', '/news', 'left_sidebar', 0, 30],
            ['sidebar_business_directory', 'Business Directory', '/business-directory', 'left_sidebar', 0, 40],
            ['sidebar_trending', 'Trending', '/search?tab=trending', 'left_sidebar', 0, 50],
            ['sidebar_donation', 'Donation', '/donation', 'left_sidebar', 0, 60],
            ['sidebar_help_center', 'Help Center', '/help-center', 'left_sidebar', 0, 70],
            ['sidebar_profile', 'My Profile', '/profile', 'left_sidebar', 1, 80],
            ['sidebar_settings', 'Settings', '/settings', 'left_sidebar', 1, 90],
            ['sidebar_cms_pages', 'Pages', '/pages', 'left_sidebar', 0, 100],
            ['sidebar_create_post', 'Create Post', '/post/new', 'left_sidebar', 1, 110],
            ['sidebar_login', 'Login', '/login', 'left_sidebar', 0, 120],
            ['sidebar_register', 'Register', '/register', 'left_sidebar', 0, 130],
            ['mobile_home', 'Home', '/', 'mobile', 0, 10],
            ['mobile_search', 'Search', '/search', 'mobile', 0, 20],
            ['mobile_create_post', 'New', '/post/new', 'mobile', 1, 30],
            ['mobile_join', 'Join', '/register', 'mobile', 0, 30],
            ['mobile_profile', 'Profile', '/profile', 'mobile', 1, 40],
            ['mobile_login', 'Login', '/login', 'mobile', 0, 40],
            ['mobile_menu', 'Menu', '#menu', 'mobile', 0, 50],
            ['footer_home', 'Home', '/', 'footer', 0, 10],
            ['footer_search', 'Explore Posts', '/search', 'footer', 0, 20],
            ['footer_news', 'News', '/news', 'footer', 0, 30],
            ['footer_login', 'Login', '/login', 'footer', 0, 40],
            ['footer_register', 'Register', '/register', 'footer', 0, 50],
            ['footer_about', 'About Us', '/pages/about-us', 'footer', 0, 60],
            ['footer_contact', 'Contact Us', '/pages/contact-us', 'footer', 0, 70],
            ['footer_help_center', 'Help Center', '/help-center', 'footer', 0, 80],
            ['footer_privacy', 'Privacy Policy', '/pages/privacy-policy', 'footer', 0, 90],
            ['footer_terms', 'Terms & Conditions', '/pages/terms-conditions', 'footer', 0, 100],
            ['footer_guidelines', 'Community Guidelines', '/pages/community-guidelines', 'footer', 0, 110],
            ['footer_create_post', 'Create Post', '/post/new', 'footer', 1, 120],
        ];

        $existing = [];
        foreach ($model->all([], 'id ASC') as $row) {
            $existing[(string) ($row['nav_key'] ?? '')] = true;
        }
        foreach ($defaults as [$key, $name, $route, $location, $authRequired, $sortOrder]) {
            if (isset($existing[$key])) continue;
            $model->create([
                'nav_key' => $key,
                'name' => $name,
                'route' => $route,
                'location' => $location,
                'enabled' => 1,
                'auth_required' => $authRequired,
                'sort_order' => $sortOrder,
                'is_system' => 1,
            ]);
        }
    }

    private function validateRoute(mixed $route): string
    {
        $route = trim((string) $route);
        if ($route === '' || $route[0] !== '/' || str_starts_with($route, '//') || preg_match('/[\x00-\x1F]/', $route)) {
            $this->fail('Route must be an internal URL beginning with /.', 422);
        }
        return $route;
    }

    private function validateLocation(mixed $location): string
    {
        $location = trim((string) $location);
        if (!in_array($location, self::LOCATIONS, true)) $this->fail('Invalid navigation location.', 422);
        return $location;
    }

    private function toBool(mixed $value): int
    {
        return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
    }

    private function normalize(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'navKey' => $row['nav_key'] ?? '',
            'name' => $row['name'] ?? '',
            'route' => $row['route'] ?? '',
            'location' => $row['location'] ?? '',
            'enabled' => (bool) ($row['enabled'] ?? false),
            'authRequired' => (bool) ($row['auth_required'] ?? false),
            'sortOrder' => (int) ($row['sort_order'] ?? 0),
            'isSystem' => (bool) ($row['is_system'] ?? false),
        ];
    }
}
