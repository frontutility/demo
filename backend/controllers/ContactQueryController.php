<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Helpers\Validator;
use ConnectNKT\Models\ContactQuery;

final class ContactQueryController extends CrudController
{
  private const ALLOWED_CATEGORIES = [
    'general',
    'feedback',
    'bug',
    'feature',

    'account',
    'login',
    'register',
    'password',

    'suspended',
    'reactivate',
    'delete_account',
    'profile_issue',

    'post_delete',
    'post_issue',
    'comment_issue',
    'poll_issue',

    'follow_issue',
    'share_issue',
    'notification_issue',

    'report_user',
    'report_post',
    'abuse',
    'fake_account',
    'spam',

    'privacy',
    'security',
    'data_request',

    'verification',
    'advertisement',
    'business',

    'news',
    'village',

    'other',
];

    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new ContactQuery();
    }

    public function store(): array
    {
        $data = $this->input();
        foreach (['name', 'email', 'category', 'subject', 'message'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = trim((string) $data[$field]);
            }
        }

        $errors = Validator::required($data, ['name', 'email', 'category', 'subject', 'message']);

        if (!Validator::email($data['email'] ?? null)) {
            $errors['email'] = 'A valid email address is required.';
        }

        if (!in_array($data['category'] ?? '', self::ALLOWED_CATEGORIES, true)) {
            $errors['category'] = 'Please select a valid category.';
        }

        if (strlen((string) ($data['name'] ?? '')) > 120) {
            $errors['name'] = 'Name must be 120 characters or fewer.';
        }
        if (strlen((string) ($data['email'] ?? '')) > 190) {
            $errors['email'] = 'Email must be 190 characters or fewer.';
        }
        if (strlen((string) ($data['subject'] ?? '')) > 180) {
            $errors['subject'] = 'Subject must be 180 characters or fewer.';
        }
        if (strlen((string) ($data['message'] ?? '')) > 5000) {
            $errors['message'] = 'Message must be 5000 characters or fewer.';
        }

        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        $submittedBy = $this->currentUserId();
        if ($submittedBy > 0) {
            $data['submitted_by_user_id'] = $submittedBy;
        }

        $id = $this->model()->create($data);
        return $this->model()->find($id) ?? ['id' => $id];
    }
}
