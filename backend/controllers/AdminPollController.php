<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Helpers\PollPercentage;

final class AdminPollController extends PostController
{
    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? $_GET['search'] ?? ''));
        $creator = isset($_GET['creator']) ? (int) $_GET['creator'] : 0;
        $village = isset($_GET['village']) ? (int) $_GET['village'] : (isset($_GET['village_id']) ? (int) $_GET['village_id'] : 0);
        $status = trim((string) ($_GET['status'] ?? $_GET['state'] ?? 'all'));
        $dateFrom = trim((string) ($_GET['date_from'] ?? ''));
        $dateTo = trim((string) ($_GET['date_to'] ?? ''));
        $sort = trim((string) ($_GET['sort'] ?? 'latest'));
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, min(100, (int) $_GET['per_page'])) : 20;
        $offset = ($page - 1) * $perPage;

        $params = [];
        $selectFields = [
            'p.id AS post_id',
            'p.user_id',
            'p.content',
            'p.is_hidden',
            'p.is_pinned',
            'p.pinned_at',
            'p.deleted_at',
            'p.created_at',
            'p.updated_at',
            'pl.id AS poll_id',
            'pl.question',
            $this->hasColumn('polls', 'description') ? 'pl.description' : "'' AS description",
            $this->hasColumn('polls', 'status') ? 'pl.status AS poll_status' : "'active' AS poll_status",
            $this->hasColumn('polls', 'is_featured') ? 'pl.is_featured' : '0 AS is_featured',
            $this->hasColumn('polls', 'is_locked') ? 'pl.is_locked' : '0 AS is_locked',
            $this->hasColumn('polls', 'expires_at') ? 'pl.expires_at' : 'NULL AS expires_at',
            $this->hasColumn('polls', 'closed_at') ? 'pl.closed_at' : 'NULL AS closed_at',
            $this->hasColumn('polls', 'total_votes') ? 'pl.total_votes' : '0 AS total_votes',
            'pl.created_at AS poll_created_at',
            'u.name AS author_name',
            'u.username AS author_username',
            'v.name AS village_name',
            'COALESCE(option_counts.total_options, 0) AS options_count',
            'COALESCE(report_counts.total_reports, 0) AS reports_count',
        ];
        $sql = 'SELECT ' . implode(",\n", $selectFields) . '
            FROM posts p
            JOIN polls pl ON pl.post_id = p.id
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT poll_id, COUNT(*) AS total_options
                FROM poll_options
                GROUP BY poll_id
            ) option_counts ON option_counts.poll_id = pl.id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total_reports
                FROM reports
                WHERE deleted_at IS NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE 1 = 1
        ';

        if ($term !== '') {
            $sql .= ' AND (
                pl.question LIKE :term
                OR pl.description LIKE :term
                OR p.content LIKE :term
                OR u.username LIKE :term
                OR u.name LIKE :term
                OR v.name LIKE :term
            )';
            $params['term'] = '%' . $term . '%';
        }

        if ($creator > 0) {
            $sql .= ' AND p.user_id = :creator';
            $params['creator'] = $creator;
        }

        if ($village > 0) {
            $sql .= ' AND u.village_id = :village';
            $params['village'] = $village;
        }

        if ($dateFrom !== '') {
            $sql .= ' AND p.created_at >= :date_from';
            $params['date_from'] = $dateFrom . ' 00:00:00';
        }

        if ($dateTo !== '') {
            $sql .= ' AND p.created_at <= :date_to';
            $params['date_to'] = $dateTo . ' 23:59:59';
        }

        switch ($status) {
            case 'active':
                $sql .= ' AND p.deleted_at IS NULL AND p.is_hidden = 0 AND pl.status = "active"';
                break;
            case 'closed':
                $sql .= ' AND pl.status = "closed"';
                break;
            case 'hidden':
                $sql .= ' AND p.is_hidden = 1';
                break;
            case 'deleted':
                $sql .= ' AND p.deleted_at IS NOT NULL';
                break;
            case 'reported':
                $sql .= ' AND COALESCE(report_counts.total_reports, 0) > 0';
                break;
            case 'featured':
                $sql .= ' AND pl.is_featured = 1';
                break;
            case 'locked':
                $sql .= ' AND pl.is_locked = 1';
                break;
            default:
                break;
        }

        switch ($sort) {
            case 'oldest':
                $sql .= ' ORDER BY p.created_at ASC, p.id ASC';
                break;
            case 'votes':
                $sql .= ' ORDER BY pl.total_votes DESC, p.created_at DESC';
                break;
            case 'reports':
                $sql .= ' ORDER BY reports_count DESC, p.created_at DESC';
                break;
            case 'latest':
            default:
                $sql .= ' ORDER BY p.created_at DESC, p.id DESC';
                break;
        }

        $sql .= ' LIMIT :limit OFFSET :offset';
        $params['limit'] = $perPage;
        $params['offset'] = $offset;

        $stmt = $this->db()->prepare($sql);
        foreach ($params as $key => $value) {
            $type = is_int($value) ? \PDO::PARAM_INT : \PDO::PARAM_STR;
            $stmt->bindValue(':' . $key, $value, $type);
        }
        $stmt->execute();

        return array_map(fn (array $row) => $this->normalizeRow($row), $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    public function show(string $id): array
    {
        $pollId = (int) $id;
        $selectFields = [
            'p.id AS post_id',
            'p.user_id',
            'p.content',
            'p.is_hidden',
            'p.is_pinned',
            'p.pinned_at',
            'p.deleted_at',
            'p.created_at',
            'p.updated_at',
            'pl.id AS poll_id',
            'pl.question',
            $this->hasColumn('polls', 'description') ? 'pl.description' : "'' AS description",
            $this->hasColumn('polls', 'status') ? 'pl.status AS poll_status' : "'active' AS poll_status",
            $this->hasColumn('polls', 'is_featured') ? 'pl.is_featured' : '0 AS is_featured',
            $this->hasColumn('polls', 'is_locked') ? 'pl.is_locked' : '0 AS is_locked',
            $this->hasColumn('polls', 'expires_at') ? 'pl.expires_at' : 'NULL AS expires_at',
            $this->hasColumn('polls', 'closed_at') ? 'pl.closed_at' : 'NULL AS closed_at',
            $this->hasColumn('polls', 'total_votes') ? 'pl.total_votes' : '0 AS total_votes',
            'pl.created_at AS poll_created_at',
            'u.name AS author_name',
            'u.username AS author_username',
            'u.email AS author_email',
            'u.mobile AS author_mobile',
            'u.profile_image_url AS author_avatar',
            'v.id AS village_id',
            'v.name AS village_name',
            'COALESCE(option_counts.total_options, 0) AS options_count',
            'COALESCE(report_counts.total_reports, 0) AS reports_count',
        ];
        $stmt = $this->db()->prepare('SELECT ' . implode(",\n", $selectFields) . '
            FROM polls pl
            JOIN posts p ON p.id = pl.post_id
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT poll_id, COUNT(*) AS total_options
                FROM poll_options
                GROUP BY poll_id
            ) option_counts ON option_counts.poll_id = pl.id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total_reports
                FROM reports
                WHERE deleted_at IS NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE pl.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $pollId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            $this->fail('Poll not found', 404);
        }

        $options = $this->loadOptions((int) ($row['poll_id'] ?? 0));
        $reports = $this->loadReports((int) ($row['post_id'] ?? 0));
        $voters = $this->loadVoters((int) ($row['poll_id'] ?? 0));

        return array_merge($this->normalizeRow($row), [
            'options' => $options,
            'reports' => $reports,
            'voters' => $voters,
            'creator' => [
                'id' => (int) ($row['user_id'] ?? 0),
                'name' => $row['author_name'] ?? '',
                'username' => $row['author_username'] ?? '',
                'email' => $row['author_email'] ?? '',
                'mobile' => $row['author_mobile'] ?? '',
                'profileImageUrl' => $row['author_avatar'] ?? '',
            ],
            'village' => $row['village_name'] ?? '',
        ]);
    }

    public function update(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        $input = $this->input();
        $db = $this->db();
        $db->beginTransaction();

        try {
            $payload = [];
            if (array_key_exists('question', $input)) {
                $payload['question'] = trim((string) $input['question']);
                if ($payload['question'] === '') {
                    $this->fail('Poll question is required.', 422);
                }
            }
            if (array_key_exists('description', $input)) {
                $payload['description'] = trim((string) $input['description']);
            }
            if (array_key_exists('status', $input)) {
                $status = strtolower(trim((string) $input['status']));
                if (!in_array($status, ['active', 'closed'], true)) {
                    $this->fail('Invalid poll status.', 422);
                }
                $payload['status'] = $status;
                if ($status === 'closed' && empty($input['closed_at'])) {
                    $payload['closed_at'] = date('Y-m-d H:i:s');
                }
                if ($status === 'active' && empty($input['closed_at'])) {
                    $payload['closed_at'] = null;
                }
            }
            if (array_key_exists('expires_at', $input)) {
                $expiresAt = trim((string) $input['expires_at']);
                $payload['expires_at'] = $expiresAt === '' ? null : $expiresAt;
            }
            if (array_key_exists('is_featured', $input)) {
                $payload['is_featured'] = (int) $input['is_featured'];
            }
            if (array_key_exists('is_locked', $input)) {
                $payload['is_locked'] = (int) $input['is_locked'];
            }

            if ($payload) {
                $this->updatePollRecord((int) $poll['id'], $payload);
            }

            if (array_key_exists('options', $input)) {
                $this->updatePollOptions((int) $poll['id'], $input['options'] ?? []);
            }

            $this->syncPollTotals((int) $poll['id']);
            $db->commit();
            return $this->show((string) $poll['id']);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->fail('Could not update poll: ' . $e->getMessage(), 500);
        }
    }

    public function updateResults(string $id): array
    {
        $this->assertPollResultPermission();
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        $input = $this->input();
        $displayMode = strtolower(trim((string) ($input['display_mode'] ?? $input['displayMode'] ?? 'automatic')));
        if (!in_array($displayMode, ['automatic', 'custom'], true)) {
            $this->fail('Invalid poll display mode.', 422);
        }

        // CREATE TABLE causes an implicit MySQL commit, so ensure the
        // optional audit/settings tables before opening the data transaction.
        $this->ensurePollResultTables();
        $db = $this->db();
        $db->beginTransaction();
        try {
            $previousValues = [
                'displayMode' => $this->getPollDisplayMode((int) $poll['id']),
                'options' => $this->loadAdminOptionRows((int) $poll['id']),
            ];

            $this->savePollDisplayMode((int) $poll['id'], $displayMode);

            $incomingOptions = is_array($input['options'] ?? null) ? $input['options'] : [];
            $existingOptions = $this->loadAdminOptionRows((int) $poll['id']);
            $existingById = [];
            foreach ($existingOptions as $existingOption) {
                $existingById[(int) ($existingOption['id'] ?? 0)] = $existingOption;
            }

            if (count($incomingOptions) > 5) {
                $this->fail('A poll can contain a maximum of 5 options.', 422);
            }
            $activeOptionCount = 0;
            $optionLabels = [];
            foreach ($incomingOptions as $optionInput) {
                if (!is_array($optionInput)) {
                    $this->fail('Invalid poll option.', 422);
                }
                $removed = !empty($optionInput['removed']) || !empty($optionInput['delete']) || !empty($optionInput['deleted']);
                $label = trim((string) ($optionInput['text'] ?? $optionInput['optionText'] ?? $optionInput['option_text'] ?? ''));
                if (!$removed && $label === '') {
                    $this->fail('Poll option text is required.', 422);
                }
                if (!$removed && (int) ($optionInput['isActive'] ?? $optionInput['is_active'] ?? 1) === 1) {
                    $activeOptionCount++;
                    $normalizedLabel = strtolower($label);
                    if (isset($optionLabels[$normalizedLabel])) {
                        $this->fail('Poll options must be unique.', 422);
                    }
                    $optionLabels[$normalizedLabel] = true;
                }
            }
            if ($activeOptionCount < 2) {
                $this->fail('A poll must have at least two active options.', 422);
            }

            $seenIds = [];
            $sortOrder = 0;
            foreach ($incomingOptions as $index => $optionInput) {
                if (!is_array($optionInput)) {
                    continue;
                }

                $optionId = isset($optionInput['id']) ? (int) $optionInput['id'] : 0;
                $optionText = trim((string) ($optionInput['text'] ?? $optionInput['optionText'] ?? $optionInput['option_text'] ?? ''));
                $isActive = isset($optionInput['isActive']) ? (int) $optionInput['isActive'] : (isset($optionInput['is_active']) ? (int) $optionInput['is_active'] : 1);
                $votesCount = max(0, (int) ($optionInput['votesCount'] ?? $optionInput['votes_count'] ?? 0));
                $sortOrderValue = isset($optionInput['sortOrder']) || isset($optionInput['sort_order']) ? (int) ($optionInput['sortOrder'] ?? $optionInput['sort_order'] ?? $sortOrder) : $sortOrder;
                $removed = !empty($optionInput['removed']) || !empty($optionInput['delete']) || !empty($optionInput['deleted']);

                if ($removed && $optionId > 0 && isset($existingById[$optionId])) {
                    // Removing an option also removes its user-vote records;
                    // the aggregate is recalculated transactionally below.
                    $db->prepare('DELETE FROM poll_votes WHERE poll_id = :poll_id AND option_id = :option_id')->execute([
                        'poll_id' => (int) $poll['id'],
                        'option_id' => $optionId,
                    ]);
                    $db->prepare('DELETE FROM poll_options WHERE id = :id AND poll_id = :poll_id LIMIT 1')->execute([
                        'id' => $optionId,
                        'poll_id' => (int) $poll['id'],
                    ]);
                    continue;
                }

                if ($optionText === '' && $optionId <= 0) {
                    continue;
                }

                if ($optionId > 0 && isset($existingById[$optionId])) {
                    $seenIds[] = $optionId;
                    $updateParams = [
                        'option_text' => $optionText !== '' ? $optionText : ($existingById[$optionId]['option_text'] ?? ''),
                        'votes_count' => $votesCount,
                        'sort_order' => $sortOrder,
                        'id' => $optionId,
                        'poll_id' => (int) $poll['id'],
                    ];
                    $updateSql = 'UPDATE poll_options SET option_text = :option_text, votes_count = :votes_count, sort_order = :sort_order';
                    if ($this->hasColumn('poll_options', 'is_active')) {
                        $updateSql .= ', is_active = :is_active';
                        $updateParams['is_active'] = $isActive;
                    }
                    $updateSql .= ' WHERE id = :id AND poll_id = :poll_id LIMIT 1';
                    $db->prepare($updateSql)->execute($updateParams);
                } elseif ($optionText !== '') {
                    $insertParams = [
                        'poll_id' => (int) $poll['id'],
                        'option_text' => $optionText,
                        'votes_count' => $votesCount,
                        'sort_order' => $sortOrder,
                    ];
                    $insertSql = 'INSERT INTO poll_options (poll_id, option_text, votes_count, sort_order';
                    if ($this->hasColumn('poll_options', 'is_active')) {
                        $insertSql .= ', is_active';
                        $insertParams['is_active'] = $isActive;
                    }
                    $insertSql .= ') VALUES (:poll_id, :option_text, :votes_count, :sort_order';
                    if ($this->hasColumn('poll_options', 'is_active')) {
                        $insertSql .= ', :is_active';
                    }
                    $insertSql .= ')';
                    $db->prepare($insertSql)->execute($insertParams);
                }

                $sortOrder++;
            }

            $this->recalculatePollTotals((int) $poll['id']);
            $newValues = [
                'displayMode' => $displayMode,
                'options' => $this->loadAdminOptionRows((int) $poll['id']),
            ];
            $this->logPollAdminActivity((int) $poll['id'], 'updated_results', $previousValues, $newValues);
            $db->commit();
            return $this->show($id);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->fail('Could not update poll results: ' . $e->getMessage(), 500);
        }
    }

    public function open(string $id): array
    {
        $this->setPollStatus((int) $id, 'active');
        return $this->show($id);
    }

    public function close(string $id): array
    {
        $this->setPollStatus((int) $id, 'closed');
        return $this->show($id);
    }

    public function extendExpiry(string $id): array
    {
        $input = $this->input();
        $value = trim((string) ($input['expires_at'] ?? $input['expiresAt'] ?? ''));
        if ($value === '') {
            $this->fail('Expiry date is required.', 422);
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            $this->fail('Invalid expiry date.', 422);
        }
        $this->updatePollRecord((int) $id, ['expires_at' => $value]);
        return $this->show($id);
    }

    public function clearExpiry(string $id): array
    {
        $this->updatePollRecord((int) $id, ['expires_at' => null]);
        return $this->show($id);
    }

    public function feature(string $id): array
    {
        $this->updatePollRecord((int) $id, ['is_featured' => 1]);
        return $this->show($id);
    }

    public function unfeature(string $id): array
    {
        $this->updatePollRecord((int) $id, ['is_featured' => 0]);
        return $this->show($id);
    }

    public function pin(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        $post = $poll ? $this->model()->find((int) $poll['post_id']) : null;
        if (!$post) {
            $this->fail('Poll not found', 404);
        }
        $this->db()->prepare('UPDATE posts SET is_pinned = 1, pinned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $poll['post_id']]);
        return $this->show($id);
    }

    public function unpin(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }
        $this->db()->prepare('UPDATE posts SET is_pinned = 0, pinned_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $poll['post_id']]);
        return $this->show($id);
    }

    public function lock(string $id): array
    {
        $this->updatePollRecord((int) $id, ['is_locked' => 1]);
        return $this->show($id);
    }

    public function unlock(string $id): array
    {
        $this->updatePollRecord((int) $id, ['is_locked' => 0]);
        return $this->show($id);
    }

    public function hide(string $id): array
    {
        $this->db()->prepare('UPDATE posts SET is_hidden = 1, hidden_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    public function restore(string $id): array
    {
        $this->db()->prepare('UPDATE posts SET is_hidden = 0, hidden_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    public function softDelete(string $id): array
    {
        $this->db()->prepare('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    public function restoreDelete(string $id): array
    {
        $this->db()->prepare('UPDATE posts SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1')->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    public function destroy(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        $db = $this->db();
        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM poll_votes WHERE poll_id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->prepare('DELETE FROM poll_options WHERE poll_id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->prepare('DELETE FROM polls WHERE id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->prepare('DELETE FROM posts WHERE id = :post_id')->execute(['post_id' => (int) $poll['post_id']]);
            $db->commit();
            return ['deleted' => true, 'id' => (int) $id];
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->fail('Could not permanently delete poll: ' . $e->getMessage(), 500);
        }
    }

    public function voters(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        return $this->loadVoters((int) $poll['id']);
    }

    public function resetVotes(string $id): array
    {
        $poll = $this->findPoll((int) $id);
        if (!$poll) {
            $this->fail('Poll not found', 404);
        }

        $db = $this->db();
        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM poll_votes WHERE poll_id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->prepare('UPDATE poll_options SET votes_count = 0 WHERE poll_id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->prepare('UPDATE polls SET total_votes = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :poll_id')->execute(['poll_id' => (int) $poll['id']]);
            $db->commit();
            return $this->show($id);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->fail('Could not reset poll votes: ' . $e->getMessage(), 500);
        }
    }

    public function stats(): array
    {
        $statusExpr = $this->hasColumn('polls', 'status') ? 'pl.status' : "'active'";
        $totalVotesExpr = $this->hasColumn('polls', 'total_votes') ? 'pl.total_votes' : '0';
        $stmt = $this->db()->prepare('
            SELECT
                COUNT(*) AS total_polls,
                SUM(CASE WHEN p.deleted_at IS NULL AND p.is_hidden = 0 AND ' . $statusExpr . ' = "active" THEN 1 ELSE 0 END) AS active_polls,
                SUM(CASE WHEN ' . $statusExpr . ' = "closed" THEN 1 ELSE 0 END) AS closed_polls,
                SUM(CASE WHEN p.is_hidden = 1 THEN 1 ELSE 0 END) AS hidden_polls,
                SUM(CASE WHEN p.deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS deleted_polls,
                SUM(CASE WHEN report_counts.total_reports > 0 THEN 1 ELSE 0 END) AS reported_polls,
                SUM(' . $totalVotesExpr . ') AS total_votes
            FROM polls pl
            JOIN posts p ON p.id = pl.post_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total_reports
                FROM reports
                WHERE deleted_at IS NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
        ');
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
        return [
            'totalPolls' => (int) ($row['total_polls'] ?? 0),
            'activePolls' => (int) ($row['active_polls'] ?? 0),
            'closedPolls' => (int) ($row['closed_polls'] ?? 0),
            'hiddenPolls' => (int) ($row['hidden_polls'] ?? 0),
            'deletedPolls' => (int) ($row['deleted_polls'] ?? 0),
            'reportedPolls' => (int) ($row['reported_polls'] ?? 0),
            'totalVotes' => (int) ($row['total_votes'] ?? 0),
        ];
    }

    private function assertPollResultPermission(): void
    {
        $admin = $this->currentUser();
        if (!$admin) {
            $this->fail('Unauthorized', 401);
        }

        $role = strtolower((string) ($admin['role'] ?? ''));
        if (!in_array($role, ['super_admin', 'moderator', 'editor'], true)) {
            $this->fail('Only admins with poll moderation permission can edit poll results.', 403);
        }
    }

    private function ensurePollResultTables(): void
    {
        if (!$this->hasTable('poll_result_settings')) {
            $this->db()->exec('CREATE TABLE IF NOT EXISTS poll_result_settings (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                poll_id BIGINT UNSIGNED NOT NULL,
                display_mode VARCHAR(20) NOT NULL DEFAULT "automatic",
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_poll_result_settings_poll_id (poll_id),
                CONSTRAINT fk_poll_result_settings_poll FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }

        if (!$this->hasTable('admin_poll_activity_log')) {
            $this->db()->exec('CREATE TABLE IF NOT EXISTS admin_poll_activity_log (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                admin_id BIGINT UNSIGNED NULL,
                poll_id BIGINT UNSIGNED NOT NULL,
                action VARCHAR(80) NOT NULL DEFAULT "updated",
                previous_values JSON NULL,
                new_values JSON NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_admin_poll_activity_log_poll_id (poll_id),
                KEY idx_admin_poll_activity_log_admin_id (admin_id),
                CONSTRAINT fk_admin_poll_activity_log_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
                CONSTRAINT fk_admin_poll_activity_log_poll FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }
    }

    private function savePollDisplayMode(int $pollId, string $displayMode): void
    {
        $this->ensurePollResultTables();
        $stmt = $this->db()->prepare('INSERT INTO poll_result_settings (poll_id, display_mode) VALUES (:poll_id, :display_mode) ON DUPLICATE KEY UPDATE display_mode = VALUES(display_mode), updated_at = CURRENT_TIMESTAMP');
        $stmt->execute(['poll_id' => $pollId, 'display_mode' => $displayMode]);
    }

    private function getPollDisplayMode(int $pollId): string
    {
        $this->ensurePollResultTables();
        $stmt = $this->db()->prepare('SELECT display_mode FROM poll_result_settings WHERE poll_id = :poll_id LIMIT 1');
        $stmt->execute(['poll_id' => $pollId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return strtolower((string) ($row['display_mode'] ?? 'automatic'));
    }

    private function loadAdminOptionRows(int $pollId): array
    {
        $selectColumns = ['id', 'option_text', 'votes_count', 'sort_order'];
        if ($this->hasColumn('poll_options', 'is_active')) {
            $selectColumns[] = 'is_active';
        }
        $stmt = $this->db()->prepare('SELECT ' . implode(', ', $selectColumns) . ' FROM poll_options WHERE poll_id = :poll_id ORDER BY sort_order ASC, id ASC');
        $stmt->execute(['poll_id' => $pollId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return array_map(function (array $row): array {
            $isActive = $this->hasColumn('poll_options', 'is_active') ? (int) ($row['is_active'] ?? 1) : 1;
            return [
                'id' => (int) ($row['id'] ?? 0),
                'optionText' => $row['option_text'] ?? '',
                'option_text' => $row['option_text'] ?? '',
                'votesCount' => (int) ($row['votes_count'] ?? 0),
                'votes_count' => (int) ($row['votes_count'] ?? 0),
                'sortOrder' => (int) ($row['sort_order'] ?? 0),
                'sort_order' => (int) ($row['sort_order'] ?? 0),
                'isActive' => $isActive,
                'is_active' => $isActive,
            ];
        }, $rows);
    }

    private function logPollAdminActivity(int $pollId, string $action, array $previousValues, array $newValues): void
    {
        $this->ensurePollResultTables();
        if (!$this->hasTable('admin_poll_activity_log')) {
            return;
        }

        $admin = $this->currentUser();
        $stmt = $this->db()->prepare('INSERT INTO admin_poll_activity_log (admin_id, poll_id, action, previous_values, new_values) VALUES (:admin_id, :poll_id, :action, :previous_values, :new_values)');
        $stmt->execute([
            'admin_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'poll_id' => $pollId,
            'action' => $action,
            'previous_values' => json_encode($previousValues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'new_values' => json_encode($newValues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    private function recalculatePollTotals(int $pollId): void
    {
        $this->syncPollVoteCounts($pollId);
    }

    private function loadOptions(int $pollId): array
    {
        $selectColumns = ['id', 'option_text', 'votes_count', 'sort_order'];
        if ($this->hasColumn('poll_options', 'is_active')) {
            $selectColumns[] = 'is_active';
        }
        $stmt = $this->db()->prepare('SELECT ' . implode(', ', $selectColumns) . ' FROM poll_options WHERE poll_id = :poll_id ORDER BY sort_order ASC, id ASC');
        $stmt->execute(['poll_id' => $pollId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $synced = $this->syncPollVoteCounts($pollId, true);
        $voteCounts = [];
        foreach ($rows as $row) {
            $optionId = (int) ($row['id'] ?? 0);
            if ($optionId <= 0) {
                continue;
            }
            $voteCounts[$optionId] = $synced['counts'][$optionId]
                ?? PollPercentage::sanitizeVoteCount($row['votes_count'] ?? 0);
        }

        $percentageData = PollPercentage::calculate($voteCounts, $pollId);

        return array_map(function (array $row) use ($voteCounts, $percentageData): array {
            $optionId = (int) ($row['id'] ?? 0);
            $votes = $percentageData['optionVotes'][$optionId]
                ?? PollPercentage::sanitizeVoteCount($voteCounts[$optionId] ?? ($row['votes_count'] ?? 0));
            $percent = $percentageData['percentages'][$optionId] ?? 0.0;
            return [
                'id' => $optionId,
                'text' => $row['option_text'] ?? '',
                'optionText' => $row['option_text'] ?? '',
                'votesCount' => $votes,
                'votes' => $votes,
                'sortOrder' => (int) ($row['sort_order'] ?? 0),
                'isActive' => $this->hasColumn('poll_options', 'is_active') ? (int) ($row['is_active'] ?? 1) : 1,
                'percentage' => $percent,
                'votePercentage' => $percent,
            ];
        }, $rows);
    }

    private function findPoll(int $id): ?array
    {
        $columns = ['id', 'post_id', 'question', 'total_votes'];
        foreach (['description', 'status', 'is_featured', 'is_locked', 'expires_at', 'closed_at'] as $column) {
            $columns[] = $this->hasColumn('polls', $column)
                ? 'pl.' . $column
                : ($column === 'status' ? "'active' AS status" : ($column === 'is_featured' || $column === 'is_locked' ? '0 AS ' . $column : 'NULL AS ' . $column));
        }
        $stmt = $this->db()->prepare('SELECT pl.' . implode(', pl.', array_slice($columns, 0, 4)) . ', ' . implode(', ', array_slice($columns, 4)) . ' FROM polls pl WHERE pl.id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private function updatePollRecord(int $pollId, array $payload): void
    {
        if (!$payload) {
            return;
        }

        $assignments = [];
        $params = ['poll_id' => $pollId];
        foreach ($payload as $field => $value) {
            if (!$this->hasColumn('polls', $field)) {
                continue;
            }
            $assignments[] = '`' . $field . '` = :' . $field;
            $params[$field] = $value;
        }
        if (!$assignments) {
            return;
        }
        $sql = 'UPDATE polls SET ' . implode(', ', $assignments) . ', updated_at = CURRENT_TIMESTAMP WHERE id = :poll_id LIMIT 1';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
    }

    private function updatePollOptions(int $pollId, array $options): void
    {
        $selectColumns = ['id', 'option_text', 'votes_count', 'sort_order'];
        if ($this->hasColumn('poll_options', 'is_active')) {
            $selectColumns[] = 'is_active';
        }
        $existingStmt = $this->db()->prepare('SELECT ' . implode(', ', $selectColumns) . ' FROM poll_options WHERE poll_id = :poll_id ORDER BY sort_order ASC, id ASC');
        $existingStmt->execute(['poll_id' => $pollId]);
        $existingOptions = $existingStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $existingById = [];
        foreach ($existingOptions as $option) {
            $existingById[(int) ($option['id'] ?? 0)] = $option;
        }

        $seenIds = [];
        $sortOrder = 0;
        foreach ($options as $index => $option) {
            $optionId = 0;
            $optionText = '';
            $isActive = 1;
            $sortOrderValue = $sortOrder;

            if (is_array($option)) {
                $optionId = isset($option['id']) ? (int) $option['id'] : 0;
                $optionText = trim((string) ($option['text'] ?? $option['optionText'] ?? $option['option_text'] ?? ''));
                if ($this->hasColumn('poll_options', 'is_active')) {
                    $isActive = isset($option['isActive']) ? (int) $option['isActive'] : (isset($option['is_active']) ? (int) $option['is_active'] : 1);
                }
                if (isset($option['sortOrder']) || isset($option['sort_order'])) {
                    $sortOrderValue = (int) ($option['sortOrder'] ?? $option['sort_order'] ?? $sortOrder);
                }
            } else {
                $optionText = trim((string) $option);
            }

            if ($optionText === '') {
                continue;
            }

            if ($optionId > 0 && isset($existingById[$optionId])) {
                $seenIds[] = $optionId;
                $updateParams = [
                    'option_text' => $optionText,
                    'sort_order' => $sortOrderValue,
                    'id' => $optionId,
                    'poll_id' => $pollId,
                ];
                $updateSql = 'UPDATE poll_options SET option_text = :option_text, sort_order = :sort_order';
                if ($this->hasColumn('poll_options', 'is_active')) {
                    $updateSql .= ', is_active = :is_active';
                    $updateParams['is_active'] = $isActive;
                }
                $updateSql .= ' WHERE id = :id AND poll_id = :poll_id LIMIT 1';
                $this->db()->prepare($updateSql)->execute($updateParams);
            } else {
                $insertParams = [
                    'poll_id' => $pollId,
                    'option_text' => $optionText,
                    'sort_order' => $sortOrderValue,
                ];
                $insertSql = 'INSERT INTO poll_options (poll_id, option_text, votes_count, sort_order';
                if ($this->hasColumn('poll_options', 'is_active')) {
                    $insertSql .= ', is_active';
                    $insertParams['is_active'] = $isActive;
                }
                $insertSql .= ') VALUES (:poll_id, :option_text, 0, :sort_order';
                if ($this->hasColumn('poll_options', 'is_active')) {
                    $insertSql .= ', :is_active';
                }
                $insertSql .= ')';
                $this->db()->prepare($insertSql)->execute($insertParams);
            }
            $sortOrder++;
        }

        foreach ($existingOptions as $option) {
            $optionId = (int) ($option['id'] ?? 0);
            if ($optionId > 0 && !in_array($optionId, $seenIds, true)) {
                if ((int) ($option['votes_count'] ?? 0) > 0) {
                    $this->fail('Cannot remove an option that already has votes.', 422);
                }
                $this->db()->prepare('DELETE FROM poll_options WHERE id = :id AND poll_id = :poll_id LIMIT 1')->execute([
                    'id' => $optionId,
                    'poll_id' => $pollId,
                ]);
            }
        }
    }

    private function loadReports(int $postId): array
    {
        $customReason = $this->hasColumn('reports', 'custom_reason') ? 'r.custom_reason' : "'' AS custom_reason";
        $stmt = $this->db()->prepare('
            SELECT r.id, r.reason, ' . $customReason . ', r.status, r.created_at, u.name AS reporter_name, u.username AS reporter_username
            FROM reports r
            LEFT JOIN users u ON u.id = r.reporter_user_id
            WHERE r.deleted_at IS NULL
              AND r.reported_post_id = :post_id
            ORDER BY r.created_at DESC
        ');
        $stmt->execute(['post_id' => $postId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    private function loadVoters(int $pollId): array
    {
        $stmt = $this->db()->prepare('
            SELECT pv.id, pv.option_id, pv.user_id, pv.created_at, u.name AS user_name, u.username AS user_username
            FROM poll_votes pv
            LEFT JOIN users u ON u.id = pv.user_id
            WHERE pv.poll_id = :poll_id
            ORDER BY pv.created_at DESC
        ');
        $stmt->execute(['poll_id' => $pollId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    private function setPollStatus(int $pollId, string $status): void
    {
        $this->updatePollRecord($pollId, [
            'status' => $status,
            'closed_at' => $status === 'closed' ? date('Y-m-d H:i:s') : null,
        ]);
    }

    private function syncPollTotals(int $pollId): void
    {
        $this->syncPollVoteCounts($pollId);
    }

    private function normalizeRow(array $row): array
    {
        $isHidden = (int) ($row['is_hidden'] ?? 0);
        $isDeleted = !empty($row['deleted_at']);
        $status = trim((string) ($row['poll_status'] ?? 'active'));
        return [
            'id' => (int) ($row['poll_id'] ?? 0),
            'postId' => (int) ($row['post_id'] ?? 0),
            'question' => $row['question'] ?? '',
            'description' => $row['description'] ?? '',
            'totalVotes' => (int) ($row['total_votes'] ?? 0),
            'total_votes' => (int) ($row['total_votes'] ?? 0),
            'optionsCount' => (int) ($row['options_count'] ?? 0),
            'creator' => [
                'id' => (int) ($row['user_id'] ?? 0),
                'name' => $row['author_name'] ?? '',
                'username' => $row['author_username'] ?? '',
            ],
            'village' => $row['village_name'] ?? '',
            'createdAt' => $row['created_at'] ?? $row['poll_created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
            'expiryDate' => $row['expires_at'] ?? null,
            'status' => $status,
            'visibility' => $isHidden ? 'hidden' : 'visible',
            'isHidden' => $isHidden,
            'isPinned' => (int) ($row['is_pinned'] ?? 0),
            'isFeatured' => (int) ($row['is_featured'] ?? 0),
            'isLocked' => (int) ($row['is_locked'] ?? 0),
            'isDeleted' => $isDeleted,
            'reports' => (int) ($row['reports_count'] ?? 0),
        ];
    }
}
