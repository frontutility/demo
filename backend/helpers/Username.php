<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class Username
{
    public static function normalize(mixed $value): string
    {
        return strtolower(preg_replace('/\s+/u', '', (string) $value) ?? '');
    }

    public static function validate(string $username): ?string
    {
        if ($username === '') return 'Username is required.';
        $length = strlen($username);
        if ($length < 3) return 'Username must be at least 3 characters.';
        if ($length > 30) return 'Username cannot exceed 30 characters.';
        if (!preg_match('/^[a-z0-9_.]+$/', $username)) return 'Username may contain only letters, numbers, underscores, and dots.';
        if (str_contains($username, '..') || str_contains($username, '__')) return 'Username cannot contain consecutive dots or underscores.';
        if (preg_match('/^[._]|[._]$/', $username)) return 'Username cannot start or end with a dot or underscore.';
        return null;
    }
}
