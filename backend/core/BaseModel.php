<?php

declare(strict_types=1);

namespace ConnectNKT\Core;

use PDO;
use PDOException;

abstract class BaseModel
{
    protected PDO $db;
    protected string $table = '';
    protected string $primaryKey = 'id';
    protected bool $softDeletes = true;
    protected array $fillable = [];

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? Database::pdo();
    }

    public function pdo(): PDO
    {
        return $this->db;
    }

    public function find(int|string $id): ?array
    {
        $this->assertIdentifier($this->table);
        $this->assertIdentifier($this->primaryKey);
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function all(array $filters = [], string $orderBy = 'id DESC', ?int $limit = null, ?int $offset = null): array
    {
        $where = [];
        $params = [];

        if ($this->softDeletes) {
            $where[] = 'deleted_at IS NULL';
        }

        foreach ($filters as $column => $value) {
            $this->assertIdentifier((string) $column);
            $where[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }

        $sql = "SELECT * FROM {$this->table}";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY ' . $this->safeOrderBy($orderBy);
        if ($limit !== null) {
            $sql .= " LIMIT {$limit}";
            if ($offset !== null) {
                $sql .= " OFFSET {$offset}";
            }
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function search(string $term, array $columns, string $orderBy = 'id DESC', int $limit = 50): array
    {
        $like = '%' . $term . '%';
        $where = [];
        foreach ($columns as $column) {
            $this->assertIdentifier((string) $column);
            $where[] = "{$column} LIKE ?";
        }

        $sql = "SELECT * FROM {$this->table}";
        if ($this->softDeletes) {
            $sql .= ' WHERE deleted_at IS NULL AND (' . implode(' OR ', $where) . ')';
        } else {
            $sql .= ' WHERE ' . implode(' OR ', $where);
        }
        $sql .= ' ORDER BY ' . $this->safeOrderBy($orderBy) . " LIMIT {$limit}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_fill(0, count($columns), $like));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data): int
    {
        $data = array_intersect_key($data, array_flip($this->fillable));
        $data = $this->normalize($data);
        $columns = array_keys($data);
        $placeholders = array_map(static fn ($column) => ':' . $column, $columns);

        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $this->table,
            implode(', ', array_map(static fn ($column) => "`{$column}`", $columns)),
            implode(', ', $placeholders)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int|string $id, array $data): bool
    {
        $data = array_intersect_key($data, array_flip($this->fillable));
        $data = $this->normalize($data);
        if (!$data) {
            return false;
        }

        $set = [];
        foreach (array_keys($data) as $column) {
            $set[] = "`{$column}` = :{$column}";
        }

        $data['id'] = $id;
        if ($this->hasColumn('updated_at')) {
            $set[] = 'updated_at = CURRENT_TIMESTAMP';
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $set) . " WHERE {$this->primaryKey} = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($data);
    }

    public function delete(int|string $id): bool
    {
        if ($this->softDeletes) {
            $stmt = $this->db->prepare("UPDATE {$this->table} SET deleted_at = CURRENT_TIMESTAMP WHERE {$this->primaryKey} = :id");
            return $stmt->execute(['id' => $id]);
        }

        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function count(array $filters = []): int
    {
        $where = [];
        $params = [];
        if ($this->softDeletes) {
            $where[] = 'deleted_at IS NULL';
        }
        foreach ($filters as $column => $value) {
            $this->assertIdentifier((string) $column);
            $where[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }

        $sql = "SELECT COUNT(*) AS total FROM {$this->table}";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int) ($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
    }

    protected function normalize(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_bool($value)) {
                $data[$key] = $value ? 1 : 0;
                continue;
            }
            if (is_array($value)) {
                $data[$key] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        return $data;
    }

    private function assertIdentifier(string $identifier): void
    {
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/', $identifier)) {
            throw new \InvalidArgumentException('Unsafe SQL identifier.');
        }
    }

    private function safeOrderBy(string $orderBy): string
    {
        if ($orderBy === 'RAND()') return $orderBy;
        $identifier = '[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?';
        $term = "(?:{$identifier}(?:\\s+(?:ASC|DESC))?|COALESCE\\(\\s*{$identifier}\\s*,\\s*(?:0|[A-Za-z_][A-Za-z0-9_]*)\\s*\\)\\s+(?:ASC|DESC))";
        if (!preg_match('/^\\s*' . $term . '(?:\\s*,\\s*' . $term . ')*\\s*$/i', $orderBy)) {
            throw new \InvalidArgumentException('Unsafe SQL order clause.');
        }
        return $orderBy;
    }

    public function columnExists(string $column): bool
    {
        return $this->hasColumn($column);
    }

    protected function hasColumn(string $column): bool
    {
        static $cache = [];
        $cacheKey = $this->table . ':' . $column;
        if (array_key_exists($cacheKey, $cache)) {
            return $cache[$cacheKey];
        }

        $stmt = $this->db->prepare('
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
              AND column_name = :column_name
            LIMIT 1
        ');
        $stmt->execute([
            'table_name' => $this->table,
            'column_name' => $column,
        ]);

        return $cache[$cacheKey] = (bool) $stmt->fetchColumn();
    }
}
