<?php

declare(strict_types=1);

namespace ConnectNKT\Core;

use ConnectNKT\Helpers\Env;
use PDO;

final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = trim((string) Env::get('DB_HOST', '127.0.0.1'));
        $port = trim((string) Env::get('DB_PORT', '3306'));
        $db   = trim((string) Env::get('DB_DATABASE', ''));
        $user = trim((string) Env::get('DB_USERNAME', ''));
        $pass = (string) Env::get('DB_PASSWORD', '');
        if ($db === '' || $user === '') {
            throw new \RuntimeException('Database configuration is incomplete.');
        }
        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$pdo;
    }
}
