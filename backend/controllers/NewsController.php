<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Helpers\Str;
use ConnectNKT\Models\News;
use PDO;

class NewsController extends \ConnectNKT\Core\BaseController
{
    protected function model(): News
    {
        return new News();
    }

    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $rows = $term !== ''
            ? $this->searchNews($term, [], $limit, ($page - 1) * $limit)
            : $this->fetchVisibleNews($limit, ($page - 1) * $limit);

        return ['items' => $this->normalizeRows($rows), 'page' => $page, 'limit' => $limit];
    }

    public function bySlug(string $slug): array
    {
        $row = $this->findVisibleNewsBySlug($slug);
        if (!$row) {
            return [];
        }

        $this->incrementViews((int) $row['id']);

        $fresh = $this->findVisibleNewsBySlug($slug) ?? $row;
        return $this->normalizeRow($fresh, true);
    }

    protected function searchNews(string $term, array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $rows = $this->model()->search($term, ['title', 'content', 'author_name'], 'COALESCE(published_at, created_at) DESC, id DESC', $limit + $offset);
        $rows = array_slice($rows, $offset, $limit);
        $rows = array_values(array_filter($rows, fn (array $row) => $this->isVisibleForPublic($row)));
        if ($filters) {
            $rows = array_filter($rows, fn (array $row) => $this->matchesFilters($row, $filters));
        }

        return array_values($rows);
    }

    protected function findById(int $id): ?array
    {
        $stmt = $this->model()->pdo()->prepare('SELECT * FROM news WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    protected function findBySlug(string $slug, ?string $status = null): ?array
    {
        $sql = 'SELECT * FROM news WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];
        if ($status !== null) {
            $sql .= ' AND status = :status';
            $params['status'] = $status;
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->model()->pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    protected function findVisibleNewsBySlug(string $slug): ?array
    {
        $stmt = $this->model()->pdo()->prepare('SELECT * FROM news WHERE slug = :slug AND deleted_at IS NULL AND status = :published LIMIT 1');
        $stmt->execute([
            'slug' => $slug,
            'published' => 'published',
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    protected function fetchVisibleNews(int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->model()->pdo()->prepare('SELECT * FROM news WHERE deleted_at IS NULL AND status = :published ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':published', 'published', PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    protected function isVisibleForPublic(array $row): bool
    {
        return strtolower((string) ($row['status'] ?? 'draft')) === 'published';
    }

    protected function incrementViews(int $id): void
    {
        $stmt = $this->model()->pdo()->prepare('UPDATE news SET views_count = COALESCE(views_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
    }

    protected function normalizeRows(array $rows): array
    {
        return array_values(array_map(fn (array $row) => $this->normalizeRow($row), $rows));
    }

    protected function normalizeRow(array $row, bool $detailed = false): array
    {
        $title = (string) ($row['title'] ?? '');
        $content = (string) ($row['content'] ?? '');
        $status = strtolower((string) ($row['status'] ?? 'draft'));
        $featuredImage = $row['featured_image'] ?? $row['featuredImage'] ?? null;
        $bannerImage = $row['banner_image'] ?? $row['bannerImage'] ?? null;
        $publishedAt = $row['published_at'] ?? $row['publishedAt'] ?? null;
        $shortDescription = $row['short_description'] ?? $row['shortDescription'] ?? null;

        $normalized = [
            'id' => isset($row['id']) ? (int) $row['id'] : null,
            'title' => $title,
            'heading' => $title,
            'subtitle' => (string) ($row['subtitle'] ?? ''),
            'slug' => (string) ($row['slug'] ?? ''),
            'featuredImage' => $featuredImage,
            'featured_image' => $featuredImage,
            'bannerImage' => $bannerImage,
            'banner_image' => $bannerImage,
            'category' => (string) ($row['category'] ?? ''),
            'content' => $content,
            'shortDescription' => $shortDescription,
            'short_description' => $shortDescription,
            'authorName' => (string) ($row['author_name'] ?? ''),
            'author_name' => (string) ($row['author_name'] ?? ''),
            'viewsCount' => isset($row['views_count']) ? (int) $row['views_count'] : 0,
            'views_count' => isset($row['views_count']) ? (int) $row['views_count'] : 0,
            'status' => $status,
            'isPublished' => $status === 'published',
            'publishedAt' => $publishedAt,
            'published_at' => $publishedAt,
            'createdAt' => $row['created_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'seoTitle' => (string) ($row['seo_title'] ?? ''),
            'seo_title' => (string) ($row['seo_title'] ?? ''),
            'seoDescription' => (string) ($row['seo_description'] ?? ''),
            'seo_description' => (string) ($row['seo_description'] ?? ''),
            'metaKeywords' => (string) ($row['meta_keywords'] ?? ''),
            'meta_keywords' => (string) ($row['meta_keywords'] ?? ''),
            'excerpt' => $shortDescription ?: $this->buildExcerpt($content),
        ];

        if ($detailed) {
            $normalized['contentHtml'] = $content;
        }

        return $normalized;
    }

    protected function buildExcerpt(string $content, int $maxWords = 28): string
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($content)) ?? '');
        if ($text === '') {
            return '';
        }

        $words = preg_split('/\s+/', $text) ?: [];
        if (count($words) <= $maxWords) {
            return $text;
        }

        return implode(' ', array_slice($words, 0, $maxWords)) . '...';
    }

    protected function matchesFilters(array $row, array $filters): bool
    {
        foreach ($filters as $column => $value) {
            if (!isset($row[$column]) || (string) $row[$column] !== (string) $value) {
                return false;
            }
        }

        return true;
    }

    protected function normalizeStatus(?string $status, string $default = 'draft'): string
    {
        $value = strtolower(trim((string) $status));
        return in_array($value, ['draft', 'published', 'hidden'], true) ? $value : $default;
    }

    protected function generateSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'news';
        $slug = $base;
        $suffix = 2;

        while ($this->slugExists($slug, $ignoreId)) {
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }

    protected function slugExists(string $slug, ?int $ignoreId = null): bool
    {
        $sql = 'SELECT 1 FROM news WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];
        if ($ignoreId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreId;
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->model()->pdo()->prepare($sql);
        $stmt->execute($params);
        return (bool) $stmt->fetchColumn();
    }
}
