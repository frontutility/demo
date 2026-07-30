<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\CrudController;
use ConnectNKT\Models\UserSetting;

final class UserSettingsController extends CrudController
{
    protected function model(): \ConnectNKT\Core\BaseModel
    {
        return new UserSetting();
    }

    public function show(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        if ($authUserId !== (int) $id) {
            $this->fail('Forbidden', 403);
        }

        $stmt = $this->db()->prepare('
            SELECT * FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute(['user_id' => $authUserId]);
        $settings = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$settings) {
            // Return defaults if no settings exist
            return [
                'user_id' => $authUserId,
                'email_notifications' => 1,
                'hide_from_search' => 0,
                'two_factor_reminders' => 1,
                'theme_preference' => 'system',
                'profile_visibility' => 'public',
                'email_visibility' => 'public',
                'phone_visibility' => 'public',
                'followers_visibility' => 'public',
                'following_visibility' => 'public',
                'show_in_search' => 1,
            ];
        }
        
        return $settings;
    }

    public function update(string $id): array
    {
        $authUserId = $this->currentUserId();
        if ($authUserId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        if ($authUserId !== (int) $id) {
            $this->fail('Forbidden', 403);
        }

        $userId = (int) $id;
        $data = $this->input();

        // Validate privacy settings
        $validVisibilities = ['public', 'followers', 'private'];
        if (isset($data['profile_visibility']) && !in_array($data['profile_visibility'], $validVisibilities)) {
            $this->fail('Invalid profile_visibility value.', 422);
        }
        if (isset($data['email_visibility']) && !in_array($data['email_visibility'], $validVisibilities)) {
            $this->fail('Invalid email_visibility value.', 422);
        }
        if (isset($data['phone_visibility']) && !in_array($data['phone_visibility'], $validVisibilities)) {
            $this->fail('Invalid phone_visibility value.', 422);
        }
        if (isset($data['followers_visibility']) && !in_array($data['followers_visibility'], $validVisibilities)) {
            $this->fail('Invalid followers_visibility value.', 422);
        }
        if (isset($data['following_visibility']) && !in_array($data['following_visibility'], $validVisibilities)) {
            $this->fail('Invalid following_visibility value.', 422);
        }

        // Check if settings exist
        $stmt = $this->db()->prepare('SELECT user_id FROM user_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $exists = (bool) $stmt->fetchColumn();

        if ($exists) {
            // Update existing settings
            $this->model()->update($userId, $data);
        } else {
            // Create new settings with defaults
            $defaults = [
                'user_id' => $userId,
                'email_notifications' => 1,
                'hide_from_search' => 0,
                'two_factor_reminders' => 1,
                'theme_preference' => 'system',
                'profile_visibility' => 'public',
                'email_visibility' => 'public',
                'phone_visibility' => 'public',
                'followers_visibility' => 'public',
                'following_visibility' => 'public',
                'show_in_search' => 1,
            ];
            $payload = array_merge($defaults, $data);
            $stmt = $this->db()->prepare('
                INSERT INTO user_settings 
                (user_id, email_notifications, hide_from_search, two_factor_reminders, theme_preference, 
                 profile_visibility, email_visibility, phone_visibility, followers_visibility, following_visibility, show_in_search)
                VALUES (:user_id, :email_notifications, :hide_from_search, :two_factor_reminders, :theme_preference,
                        :profile_visibility, :email_visibility, :phone_visibility, :followers_visibility, :following_visibility, :show_in_search)
            ');
            $stmt->execute($payload);
        }

        return $this->show($id);
    }
}
