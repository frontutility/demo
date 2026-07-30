<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

final class AdminHelpCenterController extends HelpCenterController
{
    protected function defaultFilters(): array
    {
        return [];
    }

    /**
     * Override index to normalize field names to camelCase
     */
    public function index(): array
    {
        $articles = parent::index();
        
        // Normalize field names to camelCase
        return array_map(fn (array $article) => [
            'id' => $article['id'] ?? null,
            'question' => $article['question'] ?? '',
            'answer' => $article['answer'] ?? '',
            'category' => $article['category'] ?? '',
            'tags' => $article['tags'] ?? [],
            'keywords' => $article['keywords'] ?? [],
            'helpfulCount' => (int) ($article['helpfulCount'] ?? $article['helpful_count'] ?? 0),
            'notHelpfulCount' => (int) ($article['notHelpfulCount'] ?? $article['not_helpful_count'] ?? 0),
            'lastUpdated' => $article['lastUpdated'] ?? $article['last_updated'] ?? $article['updated_at'] ?? null,
            'isPublished' => (bool) ($article['isPublished'] ?? $article['is_published'] ?? false),
        ], $articles);
    }
}
