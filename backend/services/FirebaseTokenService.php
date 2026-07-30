<?php

declare(strict_types=1);

namespace ConnectNKT\Services;

use ConnectNKT\Helpers\Env;

/** Verifies Firebase ID tokens without trusting browser-supplied profile data. */
final class FirebaseTokenService
{
    public static function verify(string $token): array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 3) throw new \RuntimeException('Invalid Firebase token.');
        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = self::decode($encodedHeader);
        $claims = self::decode($encodedPayload);
        $signature = self::base64UrlDecode($encodedSignature);
        $projectId = trim((string) Env::get('FIREBASE_PROJECT_ID', ''));
        if (($header['alg'] ?? '') !== 'RS256' || ($header['kid'] ?? '') === '' || $projectId === '') {
            throw new \RuntimeException('Firebase verification is not configured.');
        }
        $now = time();
        if (($claims['aud'] ?? '') !== $projectId || ($claims['iss'] ?? '') !== 'https://securetoken.google.com/' . $projectId ||
            !isset($claims['sub'], $claims['iat'], $claims['exp']) || !is_string($claims['sub']) || $claims['sub'] === '' ||
            ((int) $claims['exp'] < $now) || ((int) $claims['iat'] > $now + 300)) {
            throw new \RuntimeException('Firebase token claims are invalid.');
        }
        $certs = self::certificates();
        $pem = $certs[$header['kid']] ?? null;
        if (!$pem || openssl_verify($encodedHeader . '.' . $encodedPayload, $signature, $pem, OPENSSL_ALGO_SHA256) !== 1) {
            throw new \RuntimeException('Firebase token signature is invalid.');
        }
        if (($claims['email'] ?? '') === '' || ($claims['email_verified'] ?? false) !== true) {
            throw new \RuntimeException('A verified Google email is required.');
        }
        if (($claims['firebase']['sign_in_provider'] ?? '') !== 'google.com') {
            throw new \RuntimeException('Google sign-in provider is required.');
        }
        return $claims;
    }

    private static function certificates(): array
    {
        $cache = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'connectnkt-firebase-certs.json';
        $data = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
        if (!is_array($data) || filemtime($cache) < time() - 3600) {
            $context = stream_context_create(['http' => ['timeout' => 5]]);
            $raw = @file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', false, $context);
            $data = is_string($raw) ? json_decode($raw, true) : null;
            if (!is_array($data)) throw new \RuntimeException('Unable to load Firebase certificates.');
            @file_put_contents($cache, json_encode($data), LOCK_EX);
        }
        return $data;
    }

    private static function decode(string $value): array
    {
        $decoded = json_decode(self::base64UrlDecode($value), true);
        if (!is_array($decoded)) throw new \RuntimeException('Malformed Firebase token.');
        return $decoded;
    }

    private static function base64UrlDecode(string $value): string
    {
        $result = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
        if ($result === false) throw new \RuntimeException('Malformed Firebase token.');
        return $result;
    }
}
