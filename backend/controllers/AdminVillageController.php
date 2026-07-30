<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

final class AdminVillageController extends VillageController
{
    /**
     * Get admin villages list with aggregated user and post counts
     */
    public function index(): array
    {
        $stmt = $this->db()->prepare('
            SELECT 
                v.id,
                v.name,
                v.slug,
                COUNT(DISTINCT u.id) AS total_users,
                COUNT(DISTINCT p.id) AS total_posts
            FROM villages v
            LEFT JOIN users u ON u.village_id = v.id AND u.deleted_at IS NULL
            LEFT JOIN posts p ON p.user_id = u.id AND p.deleted_at IS NULL
            WHERE v.deleted_at IS NULL
            GROUP BY v.id, v.name, v.slug
            ORDER BY v.name ASC
        ');
        $stmt->execute();
        $villages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(function (array $village) {
            return [
                'id' => (int) $village['id'],
                'name' => $village['name'],
                'slug' => $village['slug'],
                'totalUsers' => (int) $village['total_users'],
                'totalPosts' => (int) $village['total_posts'],
            ];
        }, $villages);
    }
}
