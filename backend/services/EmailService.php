<?php

declare(strict_types=1);

namespace ConnectNKT\Services;

use ConnectNKT\Helpers\Env;

final class EmailService
{
    public static function send(string $to, string $subject, string $html): bool
    {
        $host = trim((string) Env::get('MAIL_HOST', ''));
        $username = trim((string) Env::get('MAIL_USERNAME', ''));
        $password = (string) Env::get('MAIL_PASSWORD', '');
        $from = trim((string) Env::get('MAIL_FROM_ADDRESS', 'rajkumar221299@gmail.com'));
        $fromName = trim((string) Env::get('MAIL_FROM_NAME', 'ConnectNKT'));

        if ($host !== '' && $username !== '' && $password !== '') {
            $passwords = [$password];
            $normalizedPassword = preg_replace('/\s+/', '', $password) ?? $password;
            if (str_contains(strtolower($host), 'gmail.com') && $normalizedPassword !== $password) {
                $passwords[] = $normalizedPassword;
            }

            foreach (array_unique($passwords) as $smtpPassword) {
                try {
                    return self::sendSmtp($host, $username, $smtpPassword, $from, $fromName, $to, $subject, $html);
                } catch (\Throwable $e) {
                    error_log('[mail] SMTP send failed: ' . $e->getMessage());
                }
            }

            return false;
        }

        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0775, true);
        }

        $entry = sprintf("[%s] TO:%s SUBJECT:%s BODY_LENGTH:%d\n", date('c'), $to, $subject, strlen($html));
        $logFile = $logDir . '/mail.log';
        if (!is_file($logFile)) {
            @touch($logFile);
            @chmod($logFile, 0600);
        }
        file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
        return true;
    }

    private static function sendSmtp(string $host, string $username, string $password, string $from, string $fromName, string $to, string $subject, string $html): bool
    {
        $port = (int) Env::get('MAIL_PORT', 587);
        $secure = strtolower((string) Env::get('MAIL_ENCRYPTION', 'tls'));
        $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
        $socket = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
        if (!$socket) {
            throw new \RuntimeException("SMTP connection failed: {$errstr}");
        }

        stream_set_timeout($socket, 20);
        self::expect($socket, 220);
        self::command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), 250);
        if ($secure === 'tls') {
            self::command($socket, 'STARTTLS', 220);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new \RuntimeException('SMTP TLS negotiation failed.');
            }
            self::command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), 250);
        }
        self::command($socket, 'AUTH LOGIN', 334);
        self::command($socket, base64_encode($username), 334);
        self::command($socket, base64_encode($password), 235);
        self::command($socket, 'MAIL FROM:<' . $from . '>', 250);
        self::command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        self::command($socket, 'DATA', 354);

        $headers = [
            'From: ' . self::encodeHeader($fromName) . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . self::encodeHeader($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $body = implode("\r\n", $headers) . "\r\n\r\n" . str_replace(["\r\n.", "\n."], ["\r\n..", "\n.."], $html) . "\r\n.";
        self::command($socket, $body, 250);
        self::command($socket, 'QUIT', 221);
        fclose($socket);

        return true;
    }

    private static function command($socket, string $command, int|array $expected): string
    {
        fwrite($socket, $command . "\r\n");
        return self::expect($socket, $expected);
    }

    private static function expect($socket, int|array $expected): string
    {
        $expected = (array) $expected;
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expected, true)) {
            throw new \RuntimeException('Unexpected SMTP response: ' . trim($response));
        }
        return $response;
    }

    private static function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
}
