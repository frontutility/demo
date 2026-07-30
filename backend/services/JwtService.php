<?php

declare(strict_types=1);

namespace ConnectNKT\Services;

use ConnectNKT\Helpers\Env;
use ConnectNKT\Helpers\Jwt;

final class JwtService
{
    public static function issue(array $claims, int $ttlSeconds = 3600): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'jti' => bin2hex(random_bytes(16)),
            'iat' => $now,
            'nbf' => $now - 30,
            'exp' => $now + $ttlSeconds,
            'iss' => self::issuer(),
            'aud' => 'connectnkt',
        ]);
        return Jwt::encode($payload, self::secret());
    }

    public static function parse(string $token): array
    {
        $claims = Jwt::decode($token, self::secret(), [
            'iss' => self::issuer(),
            'aud' => 'connectnkt',
        ]);
        if (self::isRevoked($claims)) {
            throw new \RuntimeException('Token revoked.');
        }
        return $claims;
    }

    public static function revoke(string $token): void
    {
        try {
            $claims = Jwt::decode($token, self::secret(), ['iss' => self::issuer(), 'aud' => 'connectnkt']);
            if (empty($claims['jti'])) return;
            $db = \ConnectNKT\Core\Database::pdo();
            if (!self::tableExists($db)) return;
            $stmt = $db->prepare('INSERT IGNORE INTO token_revocations (jti, expires_at) VALUES (:jti, FROM_UNIXTIME(:expires_at))');
            $stmt->execute(['jti' => $claims['jti'], 'expires_at' => (int) $claims['exp']]);
        } catch (\Throwable) {
            // Logout remains idempotent for expired or malformed tokens.
        }
    }

    private static function isRevoked(array $claims): bool
    {
        if (empty($claims['jti'])) return false;
        $db = \ConnectNKT\Core\Database::pdo();
        if (!self::tableExists($db)) return false;
        $stmt = $db->prepare('SELECT 1 FROM token_revocations WHERE jti = :jti AND expires_at > CURRENT_TIMESTAMP LIMIT 1');
        $stmt->execute(['jti' => $claims['jti']]);
        return (bool) $stmt->fetchColumn();
    }

    private static function tableExists(\PDO $db): bool
    {
        static $exists;
        if ($exists !== null) return $exists;
        $stmt = $db->query("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'token_revocations' LIMIT 1");
        return $exists = (bool) $stmt->fetchColumn();
    }

    private static function secret(): string
    {
        $secret = (string) Env::get('JWT_SECRET', '');
        if (strlen($secret) < 32 || hash_equals($secret, 'change-me')) {
            throw new \RuntimeException('JWT secret is not configured securely.');
        }
        return $secret;
    }

    private static function issuer(): string
    {
        return rtrim((string) Env::get('APP_URL', 'connectnkt.local'), '/');
    }
}
