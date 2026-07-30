<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\PostCategory;

final class PostCategoryController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new PostCategory();
    }
}
