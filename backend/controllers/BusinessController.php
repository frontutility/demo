<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Helpers\Upload;
use ConnectNKT\Helpers\Validator;
use ConnectNKT\Models\Business;
use ConnectNKT\Models\BusinessCategory;
use ConnectNKT\Models\Notification;
use PDO;

final class BusinessController extends BaseController
{
    private function businessModel(): Business
    {
        return new Business();
    }

    private function categoryModel(): BusinessCategory
    {
        return new BusinessCategory();
    }

    private function requireUserId(): int
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
            return 0;
        }

        return $userId;
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

    private function canManageBusiness(array $business, int $userId): bool
    {
        if ($this->isAdminContext()) {
            return true;
        }

        return (int) ($business['user_id'] ?? 0) === $userId;
    }

    private function resolveAssetPath(?string $path): string
    {
        if (!$path) {
            return '';
        }

        if (preg_match('~^https?://~i', $path) === 1 || str_starts_with($path, 'data:')) {
            return $path;
        }

        return '/' . ltrim($path, '/');
    }

    private function normalizeBusiness(array $row): array
    {
        $daysOpen = $row['days_open'] ?? null;
        if (is_string($daysOpen)) {
            $decoded = json_decode($daysOpen, true);
            $daysOpen = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($daysOpen)) {
            $daysOpen = [];
        }

        $row['logo_url'] = $this->resolveAssetPath((string) ($row['logo'] ?? ''));
        $row['days_open'] = array_values(array_unique(array_map('strval', $daysOpen)));
        $row['is_verified'] = !empty($row['is_verified']) ? true : false;
        $row['followers_count'] = (int) ($row['followers_count'] ?? 0);
        $row['views_count'] = (int) ($row['views_count'] ?? 0);
        $viewerId = $this->currentUserId();
        $row['is_following'] = array_key_exists('viewer_is_following', $row)
            ? !empty($row['viewer_is_following'])
            : ($viewerId > 0 && $this->isBusinessFollowed($viewerId, (int) ($row['id'] ?? 0)));
        return $row;
    }

    private function loadBusinessById(int $id): ?array
    {
        $stmt = $this->businessModel()->pdo()->prepare('
            SELECT b.*, c.name AS category_name, c.slug AS category_slug, v.name AS village_name
            FROM businesses b
            LEFT JOIN business_categories c ON c.id = b.category_id
            LEFT JOIN villages v ON v.id = b.village_id
            WHERE b.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->normalizeBusiness($row) : null;
    }

    private function validateBusinessPayload(array $data): array
    {
        $errors = [];
        $requiredFields = ['business_name', 'owner_name', 'address', 'established_year', 'phone', 'email', 'category_id', 'village_id'];
        $errors = array_merge($errors, Validator::required($data, $requiredFields));

        $logo = trim((string) ($data['logo'] ?? ''));
        if ($logo === '' && empty($data['logo_url'])) {
            $errors['logo'] = 'Logo or image is required.';
        }

        $email = trim((string) ($data['email'] ?? ''));
        if ($email !== '' && !Validator::email($email)) {
            $errors['email'] = 'Email is invalid.';
        }

        $tagline = trim((string) ($data['tagline'] ?? ''));
        if ($tagline !== '' && !Validator::minWords($tagline, 10)) {
            $errors['tagline'] = 'Tagline must be 10 words or fewer.';
        }

        $description = trim((string) ($data['description'] ?? ''));
        if ($description !== '' && str_word_count($description) > 200) {
            $errors['description'] = 'Description must be 200 words or fewer.';
        }

        if (!empty($data['category_id'])) {
            $categoryId = (int) $data['category_id'];
            $stmt = $this->businessModel()->pdo()->prepare('SELECT id FROM business_categories WHERE id = :id AND is_active = 1 LIMIT 1');
            $stmt->execute(['id' => $categoryId]);
            if (!$stmt->fetchColumn()) {
                $errors['category_id'] = 'Selected category is invalid.';
            }
        }

        if (!empty($data['village_id'])) {
            $villageId = (int) $data['village_id'];
            $stmt = $this->businessModel()->pdo()->prepare('SELECT id FROM villages WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $villageId]);
            if (!$stmt->fetchColumn()) {
                $errors['village_id'] = 'Selected village is invalid.';
            }
        }

        return $errors;
    }

    private function buildBusinessPayload(array $data, int $userId): array
    {
        $daysOpen = $data['days_open'] ?? $data['daysOpen'] ?? [];
        if (!is_array($daysOpen)) {
            $daysOpen = [];
        }
        $daysOpen = array_values(array_filter(array_map(static fn ($value) => trim((string) $value), $daysOpen), static fn ($value) => $value !== ''));

        $payload = [
            'user_id' => $userId,
            'category_id' => (int) ($data['category_id'] ?? 0),
            'village_id' => (int) ($data['village_id'] ?? 0),
            'business_name' => trim((string) ($data['business_name'] ?? '')),
            'owner_name' => trim((string) ($data['owner_name'] ?? '')),
            'tagline' => trim((string) ($data['tagline'] ?? '')),
            'address' => trim((string) ($data['address'] ?? '')),
            'website' => trim((string) ($data['website'] ?? '')),
            'whatsapp' => trim((string) ($data['whatsapp'] ?? '')),
            'facebook' => trim((string) ($data['facebook'] ?? '')),
            'instagram' => trim((string) ($data['instagram'] ?? '')),
            'youtube' => trim((string) ($data['youtube'] ?? '')),
            'opening_time' => trim((string) ($data['opening_time'] ?? '')),
            'closing_time' => trim((string) ($data['closing_time'] ?? '')),
            'days_open' => json_encode($daysOpen, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'offers' => trim((string) ($data['offers'] ?? '')),
            'services' => trim((string) ($data['services'] ?? '')),
            'established_year' => (int) ($data['established_year'] ?? 0),
            'phone' => trim((string) ($data['phone'] ?? '')),
            'email' => trim((string) ($data['email'] ?? '')),
            'description' => trim((string) ($data['description'] ?? '')),
            'business_license' => trim((string) ($data['business_license'] ?? '')),
            'gst_number' => trim((string) ($data['gst_number'] ?? '')),
            'status' => 'pending',
            'admin_remark' => null,
            'approved_at' => null,
            'approved_by' => null,
        ];

        $logo = trim((string) ($data['logo'] ?? ''));
        if ($logo !== '') {
            $storedLogo = Upload::storeBase64Image($logo, __DIR__ . '/../uploads/businesses', 'business');
            if ($storedLogo === null) {
                $this->fail('Invalid logo file.', 422, ['logo' => 'Invalid logo file.']);
            }
            $payload['logo'] = 'uploads/businesses/' . $storedLogo;
        } else {
            $payload['logo'] = trim((string) ($data['logo_url'] ?? ''));
        }

        return $payload;
    }

    public function categories(): array
    {
        $rows = $this->categoryModel()->all(['is_active' => 1], 'sort_order ASC, name ASC');
        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'slug' => $row['slug'] ?? '',
            'icon' => $row['icon'] ?? null,
            'icon_web' => $row['icon_web'] ?? null,
            'icon_emoji' => $row['icon_emoji'] ?? null,
            'type' => $row['type'] ?? 'business',
            'image' => $row['image'] ?? null,
            'description' => $row['description'] ?? null,
            'sort_order' => (int) ($row['sort_order'] ?? 0),
            'is_active' => (int) ($row['is_active'] ?? 1),
        ], $rows);
    }

    public function register(): array
    {
        $userId = $this->requireUserId();
        if ($userId <= 0) {
            return [];
        }

        // Enforce 3-listing limit per account (admins are exempt)
        if (!$this->isAdminContext()) {
            $countStmt = $this->businessModel()->pdo()->prepare(
                'SELECT COUNT(*) FROM businesses WHERE user_id = :user_id'
            );
            $countStmt->execute(['user_id' => $userId]);
            $existingCount = (int) $countStmt->fetchColumn();

            if ($existingCount >= 3) {
                $this->fail(
                    'You have reached the maximum limit of 3 business listings per account.',
                    403
                );
                return [];
            }
        }

        $data = $this->input();
        $errors = $this->validateBusinessPayload($data);
        if ($errors) {
            $this->fail('Validation failed.', 422, $errors);
        }

        $payload = $this->buildBusinessPayload($data, $userId);
        $id = $this->businessModel()->create($payload);
        $business = $this->loadBusinessById($id);
        return $business ?: ['id' => $id];
    }

    public function my(): array
    {
        $userId = $this->requireUserId();
        if ($userId <= 0) {
            return [];
        }

        $stmt = $this->businessModel()->pdo()->prepare('
            SELECT b.*, c.name AS category_name, v.name AS village_name
            FROM businesses b
            LEFT JOIN business_categories c ON c.id = b.category_id
            LEFT JOIN villages v ON v.id = b.village_id
            WHERE b.user_id = :user_id
            ORDER BY b.created_at DESC, b.id DESC
        ');
        $stmt->execute(['user_id' => $userId]);
        return array_map([$this, 'normalizeBusiness'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function list(): array
    {
        $search = trim((string) ($_GET['search'] ?? ''));
        $categoryId = (int) ($_GET['category'] ?? 0);
        $villageId = (int) ($_GET['village'] ?? 0);
        $sort = trim((string) ($_GET['sort'] ?? 'newest'));

        $viewerId = $this->currentUserId();
        $viewerFollowingSelect = $viewerId > 0
            ? ', EXISTS(SELECT 1 FROM business_followers bfv WHERE bfv.business_id = b.id AND bfv.user_id = :viewer_id) AS viewer_is_following'
            : '';
        $sql = '
            SELECT b.*, c.name AS category_name, c.slug AS category_slug, v.name AS village_name' . $viewerFollowingSelect . '
            FROM businesses b
            LEFT JOIN business_categories c ON c.id = b.category_id
            LEFT JOIN villages v ON v.id = b.village_id
            WHERE b.status = :status
        ';
        $params = ['status' => 'approved'];
        if ($viewerId > 0) $params['viewer_id'] = $viewerId;

        if ($search !== '') {
            $sql .= ' AND (b.business_name LIKE :search OR b.owner_name LIKE :search OR b.address LIKE :search OR b.description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($categoryId > 0) {
            $sql .= ' AND b.category_id = :category_id';
            $params['category_id'] = $categoryId;
        }
        if ($villageId > 0) {
            $sql .= ' AND b.village_id = :village_id';
            $params['village_id'] = $villageId;
        }

        $sql .= ' ORDER BY ' . match ($sort) {
            'most_followed', 'followers' => 'b.followers_count DESC, b.id DESC',
            'verified' => 'b.is_verified DESC, b.followers_count DESC, b.id DESC',
            'oldest' => 'b.created_at ASC, b.id ASC',
            default => 'b.created_at DESC, b.id DESC',
        } . ' LIMIT 100';
        $stmt = $this->businessModel()->pdo()->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'normalizeBusiness'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function details(string $id): array
    {
        $business = $this->loadBusinessById((int) $id);
        if (!$business) {
            return [];
        }

        $userId = $this->currentUserId();
        if ($business['status'] !== 'approved' && (int) ($business['user_id'] ?? 0) !== $userId && !$this->isAdminContext()) {
            return [];
        }

        return $business;
    }

    public function follow(string $id): array
    {
        $userId = $this->requireUserId();
        $businessId = (int) $id;
        $business = $this->loadBusinessById($businessId);
        if (!$business || ($business['status'] ?? '') !== 'approved') {
            $this->fail('Approved business not found.', 404);
        }
        if ((int) ($business['user_id'] ?? 0) === $userId) {
            $this->fail('You cannot follow your own business.', 422);
        }

        $db = $this->businessModel()->pdo();
        $db->beginTransaction();
        try {
            $insert = $db->prepare('INSERT INTO business_followers (business_id, user_id) VALUES (:business_id, :user_id)');
            $insert->execute(['business_id' => $businessId, 'user_id' => $userId]);
            $state = $this->syncBusinessFollowers($businessId, $userId, true);
            $db->commit();
        } catch (\PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                $state = $this->businessFollowState($businessId, $userId);
            } else {
                $this->fail('Unable to follow business.', 500);
            }
        }
        return $state;
    }

    public function unfollow(string $id): array
    {
        $userId = $this->requireUserId();
        $businessId = (int) $id;
        if (!$this->loadBusinessById($businessId)) $this->fail('Business not found.', 404);
        $db = $this->businessModel()->pdo();
        $db->beginTransaction();
        try {
            $delete = $db->prepare('DELETE FROM business_followers WHERE business_id = :business_id AND user_id = :user_id');
            $delete->execute(['business_id' => $businessId, 'user_id' => $userId]);
            $state = $this->syncBusinessFollowers($businessId, $userId, false);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            $this->fail('Unable to unfollow business.', 500);
        }
        return $state;
    }

    public function followers(string $id): array
    {
        $businessId = (int) $id;
        if (!$this->loadBusinessById($businessId)) $this->fail('Business not found.', 404);
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = trim((string) ($_GET['search'] ?? ''));
        $where = 'bf.business_id = :business_id';
        $params = ['business_id' => $businessId];
        if ($search !== '') {
            $where .= ' AND (u.username LIKE :search OR u.name LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        $db = $this->businessModel()->pdo();
        $count = $db->prepare('SELECT COUNT(*) FROM business_followers bf JOIN users u ON u.id = bf.user_id WHERE ' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $db->prepare('SELECT u.id, u.name, u.username, u.profile_image_url, u.village_id, v.name AS village_name, bf.created_at
            FROM business_followers bf JOIN users u ON u.id = bf.user_id LEFT JOIN villages v ON v.id = u.village_id
            WHERE ' . $where . ' ORDER BY bf.created_at DESC, bf.id DESC LIMIT :limit OFFSET :offset');
        foreach ($params as $key => $value) $stmt->bindValue(':' . $key, $value);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return [
            'followers' => array_map(static fn (array $row): array => [
                'id' => (int) $row['id'], 'name' => $row['name'] ?? '', 'username' => $row['username'] ?? '',
                'profile_image_url' => $row['profile_image_url'] ?? null, 'village_id' => $row['village_id'] !== null ? (int) $row['village_id'] : null,
                'village_name' => $row['village_name'] ?? null, 'followed_at' => $row['created_at'] ?? null,
            ], $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'page' => $page, 'limit' => $limit, 'total' => $total, 'has_more' => ($offset + $limit) < $total,
        ];
    }

    public function adminFollowers(string $id): array
    {
        if (!$this->isAdminContext()) $this->fail('Forbidden', 403);
        return $this->followers($id);
    }

    public function adminUpdateFollowers(string $id): array
    {
        if (!$this->isAdminContext()) $this->fail('Forbidden', 403);
        $businessId = (int) $id;
        if (!$this->loadBusinessById($businessId)) $this->fail('Business not found.', 404);
        $data = $this->input();
        $action = strtolower(trim((string) ($data['action'] ?? '')));
        $userId = (int) ($data['user_id'] ?? 0);
        $db = $this->businessModel()->pdo();
        if (in_array($action, ['add', 'restore'], true)) {
            if ($userId <= 0) $this->fail('user_id is required.', 422);
            $db->prepare('INSERT IGNORE INTO business_followers (business_id, user_id) VALUES (:business_id, :user_id)')
                ->execute(['business_id' => $businessId, 'user_id' => $userId]);
        } elseif ($action === 'remove') {
            if ($userId <= 0) $this->fail('user_id is required.', 422);
            $db->prepare('DELETE FROM business_followers WHERE business_id = :business_id AND user_id = :user_id')
                ->execute(['business_id' => $businessId, 'user_id' => $userId]);
        } elseif (in_array($action, ['reset', 'clear'], true)) {
            $db->prepare('DELETE FROM business_followers WHERE business_id = :business_id')->execute(['business_id' => $businessId]);
        } elseif (in_array($action, ['set', 'increase', 'decrease'], true)) {
            $target = max(0, (int) ($data['count'] ?? $data['target_count'] ?? 0));
            $current = $this->actualBusinessFollowerCount($businessId);
            if ($action === 'increase') $target = $current + $target;
            if ($action === 'decrease') $target = max(0, $current - $target);
            if ($target > $current) {
                $needed = $target - $current;
                $candidates = $db->prepare('SELECT u.id FROM users u WHERE u.account_status = "active" AND u.deleted_at IS NULL
                    AND u.id <> (SELECT user_id FROM businesses WHERE id = :business_id)
                    AND NOT EXISTS (SELECT 1 FROM business_followers bf WHERE bf.business_id = :business_id_2 AND bf.user_id = u.id)
                    ORDER BY u.id LIMIT :needed');
                $candidates->bindValue(':business_id', $businessId, PDO::PARAM_INT);
                $candidates->bindValue(':business_id_2', $businessId, PDO::PARAM_INT);
                $candidates->bindValue(':needed', $needed, PDO::PARAM_INT);
                $candidates->execute();
                $insert = $db->prepare('INSERT IGNORE INTO business_followers (business_id, user_id) VALUES (:business_id, :user_id)');
                foreach ($candidates->fetchAll(PDO::FETCH_COLUMN) as $candidateId) $insert->execute(['business_id' => $businessId, 'user_id' => (int) $candidateId]);
            } elseif ($target < $current) {
                $delete = $db->prepare('DELETE FROM business_followers WHERE business_id = :business_id ORDER BY created_at DESC, id DESC LIMIT :remove_count');
                $delete->bindValue(':business_id', $businessId, PDO::PARAM_INT);
                $delete->bindValue(':remove_count', $current - $target, PDO::PARAM_INT);
                $delete->execute();
            }
        } else {
            $this->fail('Unsupported follower action.', 422);
        }
        return $this->syncBusinessFollowers($businessId, $this->currentUserId(), false);
    }

    public function update(string $id): array
    {
        $userId = $this->requireUserId();
        if ($userId <= 0) {
            return [];
        }

        $business = $this->loadBusinessById((int) $id);
        if (!$business) {
            return [];
        }

        if (!$this->canManageBusiness($business, $userId)) {
            $this->fail('Forbidden', 403);
        }

        // Owners can edit their business regardless of approval status; admin context already allowed via canManageBusiness

        $data = $this->input();
        $payload = $this->buildBusinessPayload($data, $userId);
        $payload['status'] = $business['status'];
        $payload['admin_remark'] = $business['admin_remark'] ?? null;
        $payload['approved_at'] = $business['approved_at'] ?? null;
        $payload['approved_by'] = $business['approved_by'] ?? null;

        $this->businessModel()->update((int) $id, $payload);
        return $this->loadBusinessById((int) $id) ?: [];
    }

    public function delete(string $id): array
    {
        $userId = $this->requireUserId();
        if ($userId <= 0) {
            return [];
        }

        $business = $this->loadBusinessById((int) $id);
        if (!$business) {
            return [];
        }

        if (!$this->canManageBusiness($business, $userId)) {
            $this->fail('Forbidden', 403);
        }

        // Allow owners to delete their business even if approved; admin check done earlier

        $this->businessModel()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    public function adminIndex(): array
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
        return array_map([$this, 'normalizeBusiness'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function adminApprove(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $payload = [
            'status' => 'approved',
            'approved_at' => date('Y-m-d H:i:s'),
            'approved_by' => $this->currentUserId(),
            'admin_remark' => null,
        ];
        $this->businessModel()->update($id, $payload);
        return $this->loadBusinessById($id) ?: [];
    }

    public function adminReject(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        $remark = trim((string) ($data['admin_remark'] ?? ''));
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $this->businessModel()->update($id, [
            'status' => 'rejected',
            'admin_remark' => $remark,
            'approved_at' => null,
            'approved_by' => null,
        ]);
        return $this->loadBusinessById($id) ?: [];
    }

    public function adminSuspend(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $this->businessModel()->update($id, ['status' => 'suspended']);
        return $this->loadBusinessById($id) ?: [];
    }

    public function adminRestore(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $this->businessModel()->update($id, ['status' => 'pending']);
        return $this->loadBusinessById($id) ?: [];
    }

    public function adminVerify(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $this->syncBusinessFollowers($id, 0, false);
        return $this->loadBusinessById($id) ?: [];
    }

    public function adminRevoke(): array
    {
        if (!$this->isAdminContext()) {
            $this->fail('Forbidden', 403);
        }

        $data = $this->input();
        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            $this->fail('Business id is required.', 422, ['id' => 'Business id is required.']);
        }

        $this->syncBusinessFollowers($id, 0, false);
        return $this->loadBusinessById($id) ?: [];
    }

    private function actualBusinessFollowerCount(int $businessId): int
    {
        $stmt = $this->businessModel()->pdo()->prepare('SELECT COUNT(*) FROM business_followers WHERE business_id = :business_id');
        $stmt->execute(['business_id' => $businessId]);
        return (int) $stmt->fetchColumn();
    }

    private function isBusinessFollowed(int $userId, int $businessId): bool
    {
        if ($userId <= 0 || $businessId <= 0) return false;
        $stmt = $this->businessModel()->pdo()->prepare('SELECT 1 FROM business_followers WHERE business_id = :business_id AND user_id = :user_id LIMIT 1');
        $stmt->execute(['business_id' => $businessId, 'user_id' => $userId]);
        return (bool) $stmt->fetchColumn();
    }

    private function businessFollowState(int $businessId, int $viewerId): array
    {
        $business = $this->loadBusinessById($businessId) ?: [];
        return [
            'business_id' => $businessId,
            'followers_count' => (int) ($business['followers_count'] ?? $this->actualBusinessFollowerCount($businessId)),
            'is_verified' => !empty($business['is_verified']),
            'is_following' => $viewerId > 0 && $this->isBusinessFollowed($viewerId, $businessId),
        ];
    }

    private function syncBusinessFollowers(int $businessId, int $actorUserId, bool $followed): array
    {
        $db = $this->businessModel()->pdo();
        $count = $this->actualBusinessFollowerCount($businessId);
        $business = $this->loadBusinessById($businessId) ?: [];
        $wasVerified = !empty($business['is_verified']);
        $isVerified = $count >= 500;
        $update = $db->prepare('UPDATE businesses SET followers_count = :followers_count, is_verified = :is_verified WHERE id = :id');
        $update->execute(['followers_count' => $count, 'is_verified' => $isVerified ? 1 : 0, 'id' => $businessId]);

        $ownerId = (int) ($business['user_id'] ?? 0);
        if ($followed && $actorUserId > 0 && $ownerId > 0 && $actorUserId !== $ownerId) {
            $this->createBusinessNotification($ownerId, $actorUserId, 'follow', $businessId, 'New business follower', 'Someone followed your business.');
        }
        if (!$wasVerified && $isVerified) {
            $this->createBusinessNotification($ownerId, null, 'blue_tick', $businessId, 'Business verified', 'Your business reached 500 followers and received a blue tick.');
        } elseif ($wasVerified && !$isVerified) {
            $this->createBusinessNotification($ownerId, null, 'blue_tick', $businessId, 'Business verification removed', 'Your business is below 500 followers, so its blue tick was removed.');
        }
        return [
            'business_id' => $businessId,
            'followers_count' => $count,
            'is_verified' => $isVerified,
            'is_following' => $actorUserId > 0 && $this->isBusinessFollowed($actorUserId, $businessId),
        ];
    }

    private function createBusinessNotification(int $recipientId, ?int $actorId, string $type, int $businessId, string $title, string $body): void
    {
        if ($recipientId <= 0 || !$this->businessModel()->pdo()) return;
        $db = $this->businessModel()->pdo();
        $check = $db->prepare('SELECT 1 FROM notifications WHERE recipient_user_id = :recipient_id AND actor_user_id <=> :actor_id
            AND notification_type = :type AND entity_type = "business" AND entity_id = :entity_id
            AND created_at >= (NOW() - INTERVAL 10 MINUTE) LIMIT 1');
        $check->execute(['recipient_id' => $recipientId, 'actor_id' => $actorId, 'type' => $type, 'entity_id' => $businessId]);
        if ($check->fetchColumn()) return;
        (new Notification($db))->create([
            'recipient_user_id' => $recipientId,
            'actor_user_id' => $actorId,
            'notification_type' => $type,
            'title' => $title,
            'body' => $body,
            'entity_type' => 'business',
            'entity_id' => $businessId,
            'is_read' => 0,
        ]);
    }
}

