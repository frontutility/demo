<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use PDO;
use ConnectNKT\Helpers\HtmlSanitizer;

final class AdminCmsController extends CmsController
{
    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? ''));
        $rows = $term !== ''
            ? $this->searchPages($term)
            : $this->model()->all([], 'COALESCE(sort_order, 0) ASC, title ASC');

        return array_values(array_map(fn (array $page) => $this->normalizePage($page), $rows));
    }

    public function show(string $id): array
    {
        $page = $this->findPage((int) $id);
        return $page ? $this->normalizePage($page) : [];
    }

    public function store(): array
    {
        $payload = $this->buildPayload($this->input());
        $id = $this->model()->create($payload);
        return $this->show((string) $id);
    }

    public function update(string $id): array
    {
        $existing = $this->findPage((int) $id);
        if (!$existing) {
            $this->fail('CMS page not found.', 404);
        }

        $payload = $this->buildPayload($this->input(), $existing);
        if (!$payload) {
            $this->fail('No update data provided.', 422);
        }

        $this->model()->update((int) $id, $payload);
        return $this->show($id);
    }

    public function destroy(string $id): array
    {
        $existing = $this->findPage((int) $id);
        if (!$existing) {
            $this->fail('CMS page not found.', 404);
        }

        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    public function publish(string $id): array
    {
        $this->setPublished((int) $id, 1);
        return $this->show($id);
    }

    public function hide(string $id): array
    {
        $this->setPublished((int) $id, 0);
        return $this->show($id);
    }

    private function findPage(int $id): ?array
    {
        $stmt = $this->model()->pdo()->prepare('SELECT * FROM cms_pages WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function setPublished(int $id, int $value): void
    {
        $stmt = $this->model()->pdo()->prepare('
            UPDATE cms_pages
            SET is_published = :is_published,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute([
            'id' => $id,
            'is_published' => $value,
        ]);
    }

    private function buildPayload(array $input, ?array $existing = null): array
    {
        $payload = [];

        if (array_key_exists('title', $input)) {
            $title = trim((string) $input['title']);
            if ($title === '') {
                $this->fail('Title is required.', 422);
            }
            $payload['title'] = $title;
        } elseif (!$existing) {
            $this->fail('Title is required.', 422);
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

        $slug = trim((string) ($input['slug'] ?? ''));
        if ($slug === '' && isset($payload['title'])) {
            $slug = $this->slugify($payload['title']);
        }
        if ($slug !== '') {
            $payload['slug'] = $slug;
        } elseif (!$existing) {
            $this->fail('Slug is required.', 422);
        }

        foreach ([
            'seo_title' => ['seo_title', 'seoTitle'],
            'meta_description' => ['meta_description', 'metaDescription'],
        ] as $column => $keys) {
            foreach ($keys as $key) {
                if (array_key_exists($key, $input)) {
                    $value = trim((string) $input[$key]);
                    $payload[$column] = $value !== '' ? $value : null;
                    break;
                }
            }
        }

        if (array_key_exists('is_published', $input) || array_key_exists('isPublished', $input)) {
            $payload['is_published'] = $this->normalizeBoolean($input['is_published'] ?? $input['isPublished'] ?? 1);
        }

        if (array_key_exists('sort_order', $input) || array_key_exists('sortOrder', $input)) {
            $payload['sort_order'] = (int) ($input['sort_order'] ?? $input['sortOrder'] ?? 0);
        }

        if ($this->currentUserId() > 0) {
            $payload['updated_by_admin_id'] = $this->currentUserId();
        }

        return $payload;
    }

    private function slugify(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');
        return $slug !== '' ? $slug : 'page';
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
