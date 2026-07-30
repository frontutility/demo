<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\Event;
use ConnectNKT\Models\User;
use ConnectNKT\Helpers\Validator;
use ConnectNKT\Helpers\Str;

class EventController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new Event();
    }

    protected function searchColumns(): array
    {
        return ['event_title', 'organizer_name', 'village_area', 'category', 'organizer_phone'];
    }

    public function index(): array
    {
        // Only show active events that are still visible on frontend
        $now = date('Y-m-d H:i:s');
        $sql = "
            SELECT e.*, u.name AS user_name, u.username AS user_username
            FROM events e
            JOIN users u ON u.id = e.user_id
            WHERE e.deleted_at IS NULL
              AND e.status = 'Active'
              AND e.frontend_visible_until >= :now
            ORDER BY e.event_date ASC, e.created_at DESC
            LIMIT 100
        ";
        $stmt = $this->db()->prepare($sql);
        $stmt->execute(['now' => $now]);
        $events = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return array_map(fn($e) => $this->normalizeEvent($e), $events);
    }

    public function show(string $id): array
    {
        if (ctype_digit($id)) {
            $event = $this->model()->find((int) $id);
        } else {
            // Find by slug
            $stmt = $this->db()->prepare('
                SELECT e.*, u.name AS user_name, u.username AS user_username
                FROM events e
                JOIN users u ON u.id = e.user_id
                WHERE e.deleted_at IS NULL
                  AND e.slug = :slug
                LIMIT 1
            ');
            $stmt->execute(['slug' => $id]);
            $event = $stmt->fetch(\PDO::FETCH_ASSOC);
        }

        if (!$event || $event['status'] === 'Deleted') {
            $this->fail('Event not found', 404);
            return [];
        }

        // Increment views
        $this->model()->update((int) $event['id'], ['views' => ((int) $event['views']) + 1]);

        return $this->normalizeEvent($event);
    }

    public function store(): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
            return [];
        }

        $data = $this->input();

        // Validation
        $rules = [
            'event_title' => 'required|max:255',
            'category' => 'required',
            'organizer_name' => 'required|max:150',
            'organizer_phone' => 'required|max:20',
            'event_description' => 'required',
            'banner_image' => 'required',
            'event_date' => 'required|date',
            'venue_name' => 'required|max:255',
            'full_address' => 'required',
            'village_area' => 'required|max:150',
            'whatsapp_number' => 'required|max:20'
        ];
        $validator = new Validator($data, $rules);
        if (!$validator->passes()) {
            $this->fail('Validation failed', 422, ['errors' => $validator->errors()]);
            return [];
        }

        // Check event date is not in past
        $eventDate = (string) ($data['event_date'] ?? '');
        if (strtotime($eventDate) < strtotime(date('Y-m-d'))) {
            $this->fail('Event date cannot be in the past', 422);
            return [];
        }

        // Generate slug
        $slug = Str::slug((string) ($data['event_title'] ?? ''));
        // Ensure unique slug
        $originalSlug = $slug;
        $counter = 1;
        while ($this->slugExists($slug)) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        // Calculate frontend_visible_until (created_at + 15 days)
        $frontendVisibleUntil = date('Y-m-d H:i:s', strtotime('+15 days'));

        // Prepare data
        $eventData = [
            'user_id' => $authUserId,
            'event_title' => $data['event_title'],
            'slug' => $slug,
            'category' => $data['category'],
            'organizer_name' => $data['organizer_name'],
            'organizer_phone' => $data['organizer_phone'],
            'organizer_email' => $data['organizer_email'] ?? null,
            'event_description' => $data['event_description'],
            'banner_image' => $data['banner_image'],
            'event_date' => $data['event_date'],
            'start_time' => $data['start_time'] ?? null,
            'end_time' => $data['end_time'] ?? null,
            'venue_name' => $data['venue_name'],
            'full_address' => $data['full_address'],
            'village_area' => $data['village_area'],
            'contact_person_1' => $data['contact_person_1'] ?? null,
            'contact_person_1_phone' => $data['contact_person_1_phone'] ?? null,
            'contact_person_2' => $data['contact_person_2'] ?? null,
            'contact_person_2_phone' => $data['contact_person_2_phone'] ?? null,
            'contact_person_3' => $data['contact_person_3'] ?? null,
            'contact_person_3_phone' => $data['contact_person_3_phone'] ?? null,
            'whatsapp_number' => $data['whatsapp_number'],
            'social_links' => !empty($data['social_links']) ? json_encode($data['social_links']) : null,
            'status' => 'Active',
            'frontend_visible_until' => $frontendVisibleUntil
        ];

        $eventId = $this->model()->create($eventData);
        $event = $this->model()->find($eventId);

        return $this->normalizeEvent($event);
    }

    public function destroy(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
            return [];
        }

        $event = $this->model()->find((int) $id);
        if (!$event) {
            $this->fail('Event not found', 404);
            return [];
        }

        // Check if user is owner or admin
        $isAdmin = $this->isAdmin();
        if (!$isAdmin && (int) $event['user_id'] !== $authUserId) {
            $this->fail('Forbidden', 403);
            return [];
        }

        $this->model()->update((int) $id, ['status' => 'Deleted', 'deleted_at' => date('Y-m-d H:i:s')]);

        return ['deleted' => true, 'id' => (int) $id];
    }

    // Admin methods
    public function adminIndex(): array
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($_GET['per_page'] ?? 20)));
        $search = trim((string) ($_GET['search'] ?? ''));
        $categoryFilter = trim((string) ($_GET['category'] ?? ''));
        $statusFilter = trim((string) ($_GET['status'] ?? ''));

        $offset = ($page - 1) * $perPage;

        $sql = "
            SELECT SQL_CALC_FOUND_ROWS e.*, u.name AS user_name, u.username AS user_username
            FROM events e
            JOIN users u ON u.id = e.user_id
            WHERE e.deleted_at IS NULL
        ";
        $params = [];

        if ($search !== '') {
            $sql .= " AND (
                e.event_title LIKE :search
                OR e.organizer_name LIKE :search
                OR e.village_area LIKE :search
                OR e.category LIKE :search
                OR e.organizer_phone LIKE :search
            )";
            $params['search'] = "%{$search}%";
        }

        if ($categoryFilter !== '') {
            $sql .= " AND e.category = :category";
            $params['category'] = $categoryFilter;
        }

        if ($statusFilter !== '') {
            $sql .= " AND e.status = :status";
            $params['status'] = $statusFilter;
        }

        $sql .= " ORDER BY e.created_at DESC LIMIT :offset, :per_page";
        $stmt = $this->db()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->bindValue(':per_page', $perPage, \PDO::PARAM_INT);
        $stmt->execute();
        $events = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Get total count
        $countStmt = $this->db()->query('SELECT FOUND_ROWS() as total');
        $total = (int) ($countStmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);

        return [
            'events' => array_map(fn($e) => $this->normalizeEvent($e), $events),
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) ceil($total / $perPage)
            ]
        ];
    }

    private function slugExists(string $slug): bool
    {
        $stmt = $this->db()->prepare('SELECT id FROM events WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        return (bool) $stmt->fetch();
    }

    private function normalizeEvent(array $event): array
    {
        // Decode social links
        if (!empty($event['social_links'])) {
            $event['social_links'] = json_decode((string) $event['social_links'], true);
        }
        return $event;
    }
}
