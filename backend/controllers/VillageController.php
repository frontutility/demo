<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\Village;

class VillageController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new Village();
    }

    protected function searchColumns(): array
    {
        return ['name', 'slug'];
    }
}
