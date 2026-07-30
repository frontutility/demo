<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\CmsPage;
use PDO;

class CmsController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new CmsPage();
    }

    protected function defaultFilters(): array
    {
        return ['is_published' => 1];
    }

    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $rows = $term !== ''
            ? $this->searchPages($term)
            : $this->model()->all($this->defaultFilters(), 'COALESCE(sort_order, 0) ASC, title ASC');

        return array_values(array_map(fn (array $page) => $this->normalizePage($page), $rows));
    }

    private function normalizeSlug(string $slug): string
    {
        if ($slug === 'terms-of-service') {
            return 'terms-conditions';
        }

        return $slug;
    }

    public function bySlug(string $slug): array
    {
        $normalizedSlug = $this->normalizeSlug($slug);
        $filters = $this->defaultFilters();
        $sql = 'SELECT * FROM cms_pages WHERE slug = :slug AND deleted_at IS NULL';
        foreach ($filters as $column => $value) {
            $sql .= " AND {$column} = :{$column}";
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->model()->pdo()->prepare($sql);
        $params = ['slug' => $normalizedSlug];
        foreach ($filters as $column => $value) {
            $params[$column] = $value;
        }
        $stmt->execute($params);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->normalizePage($row) : ['slug' => $slug, 'page' => null];
    }

    protected function normalizePage(array $page): array
    {
        $isPublished = $this->normalizeBoolean($page['isPublished'] ?? $page['is_published'] ?? 1);
        $sortOrder = isset($page['sortOrder'])
            ? (int) $page['sortOrder']
            : (isset($page['sort_order']) ? (int) $page['sort_order'] : 0);

        $updatedAt = $page['updatedAt'] ?? $page['updated_at'] ?? null;
        $createdAt = $page['createdAt'] ?? $page['created_at'] ?? null;

        return [
            'id' => (int) ($page['id'] ?? 0),
            'title' => $page['title'] ?? '',
            'slug' => $page['slug'] ?? '',
            'content' => $page['content'] ?? '',
            'seo_title' => $page['seo_title'] ?? $page['seoTitle'] ?? null,
            'seoTitle' => $page['seo_title'] ?? $page['seoTitle'] ?? null,
            'meta_description' => $page['meta_description'] ?? $page['metaDescription'] ?? null,
            'metaDescription' => $page['meta_description'] ?? $page['metaDescription'] ?? null,
            'is_published' => $isPublished,
            'isPublished' => $isPublished === 1,
            'sort_order' => $sortOrder,
            'sortOrder' => $sortOrder,
            'updated_by_admin_id' => $page['updated_by_admin_id'] ?? $page['updatedByAdminId'] ?? null,
            'updatedByAdminId' => $page['updated_by_admin_id'] ?? $page['updatedByAdminId'] ?? null,
            'created_at' => $createdAt,
            'createdAt' => $createdAt,
            'updated_at' => $updatedAt,
            'updatedAt' => $updatedAt,
            'deleted_at' => $page['deleted_at'] ?? null,
            'deletedAt' => $page['deleted_at'] ?? null,
        ];
    }

    private function searchPages(string $term): array
    {
        $rows = $this->model()->search($term, ['title', 'slug', 'content'], 'COALESCE(sort_order, 0) ASC, title ASC', 100);
        return array_values(array_filter($rows, fn (array $row) => $this->matchesFilters($row, $this->defaultFilters())));
    }

    private function matchesFilters(array $row, array $filters): bool
    {
        foreach ($filters as $column => $value) {
            if (!isset($row[$column]) || (string) $row[$column] !== (string) $value) {
                return false;
            }
        }

        return true;
    }

    private function normalizeBoolean(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['1', 'true', 'yes', 'on', 'published'], true)) {
                return 1;
            }
            if (in_array($normalized, ['0', 'false', 'no', 'off', 'draft', 'hidden'], true)) {
                return 0;
            }
        }

        return 1;
    }
}
