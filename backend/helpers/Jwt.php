<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class Jwt
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }

    public static function encode(array $payload, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::base64UrlEncode($signature);
        return implode('.', $segments);
    }

    public static function decode(string $token, string $secret, array $expectedClaims = []): array
    {
        [$head, $body, $sig] = array_pad(explode('.', $token), 3, '');
        $header = json_decode(self::base64UrlDecode($head), true) ?: [];
        if (($header['alg'] ?? '') !== 'HS256' || ($header['typ'] ?? '') !== 'JWT') {
            throw new \RuntimeException('Invalid token header.');
        }

        $expected = self::base64UrlEncode(hash_hmac('sha256', $head . '.' . $body, $secret, true));
        if (!hash_equals($expected, $sig)) {
            throw new \RuntimeException('Invalid token signature.');
        }

        $payload = json_decode(self::base64UrlDecode($body), true) ?: [];
        if (!isset($payload['iat'], $payload['exp'], $payload['sub'])) {
            throw new \RuntimeException('Required token claims are missing.');
        }
        if (($payload['nbf'] ?? 0) > 0 && time() < (int) $payload['nbf']) {
            throw new \RuntimeException('Token is not active yet.');
        }
        if (($payload['exp'] ?? 0) > 0 && time() >= (int) $payload['exp']) {
            throw new \RuntimeException('Token expired.');
        }
        foreach (['iss', 'aud'] as $claim) {
            if (isset($expectedClaims[$claim]) && ($payload[$claim] ?? null) !== $expectedClaims[$claim]) {
                throw new \RuntimeException('Token claim mismatch.');
            }
        }

        return $payload;
    }
}
