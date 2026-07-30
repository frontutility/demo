<?php

declare(strict_types=1);

namespace ConnectNKT\Core;

use PDO;

abstract class CrudController extends BaseController
{
    abstract protected function model(): BaseModel;

    protected function db(): PDO
    {
        return $this->model()->pdo();
    }

    protected function searchColumns(): array
    {
        return [];
    }

    public function index(): array
    {
        $term = trim($_GET['q'] ?? '');
        if ($term !== '' && $this->searchColumns()) {
            return $this->model()->search($term, $this->searchColumns());
        }
        return $this->model()->all();
    }

    public function show(string $id): array
    {
        return $this->model()->find((int) $id) ?? [];
    }

    public function store(): array
    {
        $id = $this->model()->create($this->input());
        return $this->model()->find($id) ?? ['id' => $id];
    }

    public function update(string $id): array
    {
        $this->model()->update((int) $id, $this->input());
        return $this->model()->find((int) $id) ?? [];
    }

    public function destroy(string $id): array
    {
        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }
}
