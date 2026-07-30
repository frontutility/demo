<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Helpers\HtmlSanitizer;

final class AdminNewsController extends NewsController
{
    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $status = $this->normalizeStatus($_GET['status'] ?? 'all', 'all');

        $rows = $term !== ''
            ? $this->model()->search($term, ['title', 'content', 'author_name'], 'COALESCE(published_at, created_at) DESC, id DESC', 100)
            : $this->model()->all([], 'COALESCE(published_at, created_at) DESC, id DESC');

        if ($status !== 'all') {
            $rows = array_filter($rows, fn (array $row) => $this->matchesFilters($row, ['status' => $status]));
        }

        return $this->normalizeRows($rows);
    }

    public function show(string $id): array
    {
        $row = $this->findById((int) $id);
        return $row ? $this->normalizeRow($row, true) : [];
    }

    public function store(): array
    {
        $input = $this->input();
        $payload = $this->buildPayload($input);
        $id = $this->model()->create($payload);

        $row = $this->findById($id);
        return $row ? $this->normalizeRow($row, true) : ['id' => $id];
    }

    public function update(string $id): array
    {
        $existing = $this->findById((int) $id);
        if (!$existing) {
            $this->fail('News item not found.', 404);
        }

        $payload = $this->buildPayload($this->input(), $existing);
        if (!$payload) {
            $this->fail('No update data provided.', 422);
        }

        $this->model()->update((int) $id, $payload);
        $row = $this->findById((int) $id);
        return $row ? $this->normalizeRow($row, true) : [];
    }

    public function destroy(string $id): array
    {
        $existing = $this->findById((int) $id);
        if (!$existing) {
            $this->fail('News item not found.', 404);
        }

        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    public function hide(string $id): array
    {
        $this->setStatus((int) $id, 'hidden');
        $row = $this->findById((int) $id);
        return $row ? $this->normalizeRow($row, true) : [];
    }

    public function publish(string $id): array
    {
        $existing = $this->findById((int) $id);
        if (!$existing) {
            $this->fail('News item not found.', 404);
        }

        $publishedAt = $existing['published_at'] ?? null;
        if (!$publishedAt) {
            $publishedAt = date('Y-m-d H:i:s');
        }

        $stmt = $this->db()->prepare('
            UPDATE news
            SET status = "published",
                published_at = :published_at,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => (int) $id,
            'published_at' => $publishedAt,
        ]);

        $row = $this->findById((int) $id);
        return $row ? $this->normalizeRow($row, true) : [];
    }

    private function buildPayload(array $input, ?array $existing = null): array
    {
        $payload = [];

        if (array_key_exists('title', $input) || array_key_exists('heading', $input)) {
            $title = trim((string) ($input['title'] ?? $input['heading'] ?? ''));
            if ($title === '') {
                $this->fail('Heading is required.', 422);
            }
            $payload['title'] = $title;
            $payload['slug'] = $this->generateSlug($title, isset($existing['id']) ? (int) $existing['id'] : null);
        } elseif (!$existing) {
            $this->fail('Heading is required.', 422);
        }

        if (array_key_exists('content', $input)) {
            $content = trim((string) $input['content']);
            if ($content === '') {
                $this->fail('Content is required.', 422);
            }
            $payload['content'] = HtmlSanitizer::clean($content);
        } elseif (!$existing) {
            $this->fail('Content is required.', 422);
        }

        if (array_key_exists('author_name', $input) || array_key_exists('authorName', $input)) {
            $author = trim((string) ($input['author_name'] ?? $input['authorName'] ?? ''));
            if ($author === '') {
                $this->fail('Author name is required.', 422);
            }
            $payload['author_name'] = $author;
        } elseif (!$existing) {
            $this->fail('Author name is required.', 422);
        }

        foreach ([
            'subtitle' => ['subtitle', 'subTitle'],
            'short_description' => ['short_description', 'shortDescription'],
            'category' => ['category', 'newsCategory'],
            'banner_image' => ['banner_image', 'bannerImage'],
            'seo_title' => ['seo_title', 'seoTitle'],
            'seo_description' => ['seo_description', 'seoDescription'],
            'meta_keywords' => ['meta_keywords', 'metaKeywords'],
        ] as $column => $keys) {
            foreach ($keys as $key) {
                if (array_key_exists($key, $input)) {
                    $value = trim((string) $input[$key]);
                    $payload[$column] = $value !== '' ? $value : null;
                    break;
                }
            }
        }

        if (array_key_exists('featured_image', $input) || array_key_exists('featuredImage', $input)) {
            $image = trim((string) ($input['featured_image'] ?? $input['featuredImage'] ?? ''));
            $payload['featured_image'] = $image !== '' ? $image : null;
        }

        if (array_key_exists('status', $input)) {
            $status = $this->normalizeStatus((string) $input['status'], $existing['status'] ?? 'draft');
            $payload['status'] = $status;
            $payload['published_at'] = $status === 'published' ? ($existing['published_at'] ?? date('Y-m-d H:i:s')) : null;
        } elseif (!$existing) {
            $payload['status'] = 'draft';
            $payload['published_at'] = null;
        }

        if ($existing && !array_key_exists('status', $input) && (($existing['status'] ?? 'draft') === 'published')) {
            $payload['published_at'] = $existing['published_at'] ?? date('Y-m-d H:i:s');
        }

        if (!$existing) {
            $payload['views_count'] = 0;
        }

        return $payload;
    }

    private function setStatus(int $id, string $status): void
    {
        $stmt = $this->db()->prepare('
            UPDATE news
            SET status = :status,
                published_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => $id,
            'status' => $status,
        ]);
    }
}
