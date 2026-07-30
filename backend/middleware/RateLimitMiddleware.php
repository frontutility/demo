<?php

declare(strict_types=1);

namespace ConnectNKT\Middleware;

use ConnectNKT\Helpers\Response;

final class RateLimitMiddleware
{
    public function __construct(private int $max = 60, private int $windowSeconds = 60)
    {
    }

    public function __invoke(array &$context = []): void
    {
        $subject = (string) ($context['auth']['sub'] ?? 'anonymous');
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
        $key = sha1(($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $subject . '|' . ($_SERVER['REQUEST_METHOD'] ?? 'GET') . '|' . $path);
        $dir = __DIR__ . '/../logs/rate';
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0750, true) && !is_dir($dir)) {
                header('Retry-After: 60');
                Response::error('Rate limiter unavailable', 503);
            }
        }

        if (random_int(1, 100) === 1) {
            foreach (glob($dir . '/*.json') ?: [] as $candidate) {
                $candidateState = json_decode((string) @file_get_contents($candidate), true);
                if (is_array($candidateState) && time() >= (int) ($candidateState['reset'] ?? 0)) {
                    @unlink($candidate);
                }
            }
        }

        $file = $dir . '/' . $key . '.json';
        $handle = fopen($file, 'c+');
        if ($handle === false) {
            header('Retry-After: ' . $this->windowSeconds);
            Response::error('Rate limiter unavailable', 503);
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                header('Retry-After: ' . $this->windowSeconds);
                Response::error('Rate limiter unavailable', 503);
            }
            $state = json_decode(stream_get_contents($handle) ?: '', true) ?: ['count' => 0, 'reset' => time() + $this->windowSeconds];
            if (time() >= (int) ($state['reset'] ?? 0)) {
                $state = ['count' => 0, 'reset' => time() + $this->windowSeconds];
            }
            $state['count']++;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($state, JSON_THROW_ON_ERROR));
            fflush($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }

        if ($state['count'] > $this->max) {
            header('Retry-After: ' . max(1, (int) $state['reset'] - time()));
            Response::error('Too many requests', 429);
        }
    }
}
