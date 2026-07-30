<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Helpers\HtmlSanitizer;
use ConnectNKT\Models\HelpCenterArticle;
use ConnectNKT\Models\HelpCenterArticleVote;

class HelpCenterController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new HelpCenterArticle();
    }

    protected function searchColumns(): array
    {
        return ['question', 'answer', 'category', 'tags', 'keywords'];
    }

    protected function defaultFilters(): array
    {
        return ['is_published' => 1];
    }

    protected function listOrder(): string
    {
        return 'helpful_count DESC';
    }

    public function store(): array
    {
        $data = $this->input();
        if (array_key_exists('answer', $data)) $data['answer'] = HtmlSanitizer::clean((string) $data['answer']);
        $id = $this->model()->create($data);
        return $this->model()->find($id) ?? ['id' => $id];
    }

    public function update(string $id): array
    {
        $data = $this->input();
        if (array_key_exists('answer', $data)) $data['answer'] = HtmlSanitizer::clean((string) $data['answer']);
        $this->model()->update((int) $id, $data);
        return $this->model()->find((int) $id) ?? [];
    }

    public function index(): array
    {
        $term = trim($_GET['q'] ?? '');
        $filters = $this->defaultFilters();

        if ($term !== '' && $this->searchColumns()) {
            return $this->searchArticles($term, $filters, $this->listOrder());
        }

        return $this->normalizeArticles($this->model()->all($filters, $this->listOrder()));
    }

    public function bySlug(string $slug): array
    {
        $filters = $this->defaultFilters();
        $sql = 'SELECT * FROM help_center_articles WHERE slug = :slug AND deleted_at IS NULL';
        if ($filters) {
            foreach ($filters as $column => $value) {
                $sql .= " AND {$column} = :{$column}";
            }
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->model()->pdo()->prepare($sql);
        $params = array_merge(['slug' => $slug], $filters);
        $stmt->execute($params);

        $article = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $article ? $this->normalizeArticle($article) : [];
    }

    public function vote(string $id): array
    {
        $articleId = (int) $id;
        $input = $this->input();
        $userId = $this->currentUserId();
        $voteType = trim((string) ($input['vote_type'] ?? $input['voteType'] ?? ''));
        if ($articleId <= 0 || $userId <= 0) {
            $this->fail('Unauthorized', 401);
        }
        if (!in_array($voteType, ['helpful', 'not_helpful'], true)) {
            $this->fail('Invalid vote type.', 422);
        }

        $db = $this->model()->pdo();
        $articleStmt = $db->prepare('SELECT id FROM help_center_articles WHERE id = :id AND is_published = 1 AND deleted_at IS NULL LIMIT 1');
        $articleStmt->execute(['id' => $articleId]);
        if (!$articleStmt->fetchColumn()) {
            $this->fail('Article not found.', 404);
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('
                INSERT INTO help_center_article_votes (article_id, user_id, voter_key, vote_type)
                VALUES (:article_id, :user_id, :voter_key, :vote_type)
                ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type), user_id = VALUES(user_id)
            ');
            $stmt->execute([
                'article_id' => $articleId,
                'user_id' => $userId,
                'voter_key' => 'user:' . $userId,
                'vote_type' => $voteType,
            ]);
            $countStmt = $db->prepare('
                UPDATE help_center_articles a
                SET helpful_count = (SELECT COUNT(*) FROM help_center_article_votes v WHERE v.article_id = a.id AND v.vote_type = "helpful"),
                    not_helpful_count = (SELECT COUNT(*) FROM help_center_article_votes v WHERE v.article_id = a.id AND v.vote_type = "not_helpful")
                WHERE a.id = :id
            ');
            $countStmt->execute(['id' => $articleId]);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        $updated = $this->model()->find($articleId) ?: [];
        return [
            'article_id' => $articleId,
            'vote_type' => $voteType,
            'voted' => true,
            'helpfulCount' => (int) ($updated['helpful_count'] ?? 0),
            'notHelpfulCount' => (int) ($updated['not_helpful_count'] ?? 0),
        ];
    }

    private function searchArticles(string $term, array $filters = [], string $orderBy = 'helpful_count DESC'): array
    {
        $rows = $this->model()->search($term, $this->searchColumns(), $orderBy, 100);
        if ($filters) {
            $rows = array_filter($rows, fn (array $row) => $this->matchesFilters($row, $filters));
        }

        return $this->normalizeArticles($rows);
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

    private function normalizeArticles(array $articles): array
    {
        return array_values(array_map(fn (array $article) => $this->normalizeArticle($article), $articles));
    }

    private function normalizeArticle(array $article): array
    {
        $article['tags'] = $this->decodeJsonArray($article['tags'] ?? null);
        $article['keywords'] = $this->decodeJsonArray($article['keywords'] ?? null);
        $article['helpfulCount'] = isset($article['helpful_count']) ? (int) $article['helpful_count'] : 0;
        $article['notHelpfulCount'] = isset($article['not_helpful_count']) ? (int) $article['not_helpful_count'] : 0;
        $article['lastUpdated'] = $article['last_updated'] ?? $article['updated_at'] ?? null;
        $article['isPublished'] = isset($article['is_published']) ? (bool) $article['is_published'] : false;

        return $article;
    }

    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
