<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class Upload
{
    private const MAX_BASE64_IMAGE_BYTES = 2097152;
    private const MAX_UPLOADED_IMAGE_BYTES = 2097152;
    private const MIME_TO_EXTENSION = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/x-icon' => 'ico',
        'image/vnd.microsoft.icon' => 'ico',
    ];

    public static function storeBase64Image(string $dataUrl, string $directory, string $prefix = 'file'): ?string
    {
        if (!str_starts_with($dataUrl, 'data:image/')) {
            return null;
        }

        if (!preg_match('#^data:(?<mime>image/(?:png|jpeg|jpg|gif|webp));base64,(?<data>.+)$#', $dataUrl, $matches)) {
            return null;
        }

        $binary = base64_decode($matches['data'], true);
        if ($binary === false) {
            return null;
        }
        if (strlen($binary) > self::MAX_BASE64_IMAGE_BYTES) {
            return null;
        }

        $mime = strtolower($matches['mime'] === 'image/jpg' ? 'image/jpeg' : $matches['mime']);
        if (!self::isValidImageBinary($binary, $mime)) {
            return null;
        }

        if (!is_dir($directory)) {
            if (!mkdir($directory, 0750, true) && !is_dir($directory)) {
                return null;
            }
        }

        $extension = self::MIME_TO_EXTENSION[$mime] ?? null;
        if ($extension === null) {
            return null;
        }
        $filename = $prefix . '_' . time() . '_' . Str::random(8) . '.' . $extension;
        $path = rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
        if (file_put_contents($path, $binary, LOCK_EX) === false) {
            return null;
        }

        return $filename;
    }

    public static function validateUploadedImage(array $file, array $allowedMimes, int $maxBytes = self::MAX_UPLOADED_IMAGE_BYTES): ?array
    {
        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            return null;
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > $maxBytes) {
            return null;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) $finfo->file($tmpName));
        if ($mime === 'image/jpg') {
            $mime = 'image/jpeg';
        }
        if (!in_array($mime, $allowedMimes, true) || !isset(self::MIME_TO_EXTENSION[$mime])) {
            return null;
        }

        if (!self::isValidImageBinary((string) file_get_contents($tmpName), $mime)) {
            return null;
        }

        return ['mime' => $mime, 'extension' => self::MIME_TO_EXTENSION[$mime]];
    }

    private static function isValidImageBinary(string $binary, string $expectedMime): bool
    {
        if ($binary === '') {
            return false;
        }

        $info = @getimagesizefromstring($binary);
        if (!is_array($info) || empty($info['mime'])) {
            return false;
        }

        $actualMime = strtolower((string) $info['mime']);
        return $actualMime === $expectedMime || ($expectedMime === 'image/x-icon' && $actualMime === 'image/vnd.microsoft.icon');
    }
}
