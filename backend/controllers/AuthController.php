<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Helpers\Validator;
use ConnectNKT\Helpers\Username;
use ConnectNKT\Helpers\Env;
use ConnectNKT\Models\User;
use ConnectNKT\Services\EmailService;
use ConnectNKT\Services\FirebaseTokenService;
use ConnectNKT\Services\JwtService;
use ConnectNKT\Services\PasswordService;

final class AuthController extends BaseController
{
    private const SESSION_IDLE_SECONDS = 2592000;
    private const SESSION_ABSOLUTE_SECONDS = 2592000;
    private const OTP_TTL_MINUTES = 10;
    private const RESET_TOKEN_TTL_MINUTES = 15;

    public function register(): void
    {
        $data = $this->input();
        $claims = $this->firebaseClaims($data);
        $email = strtolower(trim((string) ($claims['email'] ?? '')));
        $data['username'] = Username::normalize($data['username'] ?? '');
        $errors = Validator::required($data, ['name', 'username', 'phone', 'father_name', 'village_id', 'dob', 'gender']);
        if (!empty($errors)) {
            $this->fail('Validation failed', 422, $errors);
        }
        $data['email'] = $email;
        if (($usernameError = Username::validate($data['username'])) !== null) {
            $errors['username'] = $usernameError;
        }
        if (($data['agree_terms'] ?? null) !== true && ($data['agree_terms'] ?? null) !== 'true' && ($data['agree_terms'] ?? null) !== 1) {
            $errors['agree_terms'] = 'You must agree to the terms.';
        }

        $phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
        if ($phone === '' || strlen($phone) !== 10) {
            $errors['phone'] = 'Phone number must be exactly 10 digits.';
        }

        $villageId = isset($data['village_id']) ? (int) $data['village_id'] : 0;
        if ($villageId <= 0) {
            $errors['village_id'] = 'Village is required.';
        }

        $gender = strtolower(trim((string) ($data['gender'] ?? '')));
        $allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!in_array($gender, $allowedGenders, true)) {
            $errors['gender'] = 'Gender must be male, female, other, or prefer_not_to_say.';
        }

        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        $user = new User();
        $db = $user->pdo();
        $stmt = $db->prepare('SELECT id FROM villages WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $villageId]);
        if (!$stmt->fetch()) {
            $errors['village_id'] = 'Selected village is invalid.';
        }

        $stmt = $db->prepare('SELECT username, email, mobile FROM users WHERE deleted_at IS NULL AND (username = :username OR email = :email OR mobile = :mobile) LIMIT 1');
        $stmt->execute([
            'username' => $data['username'],
            'email' => $data['email'],
            'mobile' => $phone,
        ]);
        $existing = $stmt->fetch();
        if ($existing) {
            if (isset($existing['username']) && strcasecmp((string) $existing['username'], $data['username']) === 0) {
                $errors['username'] = 'Username is already taken.';
            }
            if (isset($existing['email']) && $existing['email'] === $data['email']) {
                $errors['email'] = 'Email is already registered.';
            }
            if (isset($existing['mobile']) && $existing['mobile'] === $phone) {
                $errors['phone'] = 'Phone number is already registered.';
            }
        }

        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        try {
            $id = $user->create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'],
                'mobile' => $phone,
                'firebase_uid' => (string) $claims['sub'],
                'google_photo' => (string) ($claims['picture'] ?? ''),
                'google_provider' => 'google.com',
                'father_name' => $data['father_name'],
                'village_id' => $villageId,
                'date_of_birth' => $data['dob'],
                'gender' => $gender,
            ]);
            if ($id > 0) {
                $stmt = $user->pdo()->prepare('UPDATE users SET email_verified = 1 WHERE id = :id LIMIT 1');
                $stmt->execute(['id' => $id]);
            }
        } catch (\PDOException $e) {
            $message = $e->getMessage();
            if (str_contains(strtolower($message), 'duplicate')) {
                if (str_contains($message, 'uq_users_username')) {
                    $errors['username'] = 'Username is already taken.';
                }
                if (str_contains($message, 'uq_users_email')) {
                    $errors['email'] = 'Email is already registered.';
                }
                if (str_contains($message, 'uq_users_mobile')) {
                    $errors['phone'] = 'Phone number is already registered.';
                }
                if ($errors) {
                    $this->fail('Validation failed', 422, $errors);
                }
            }

            error_log('Registration failed: ' . $message);
            $this->fail('Registration failed due to a server error.', 500);
        }

        $row = (new User())->find($id);
        $this->startSession($id);
        $this->json($this->authPayload($row ?: [], 'Account created'), 'Account created', 201);
    }

    public function checkUsername(): void
    {
        $data = $this->input();
        $username = Username::normalize($data['username'] ?? '');
        $error = Username::validate($username);
        if ($error !== null) {
            $this->fail($error, 422, ['username' => $error]);
        }

        $stmt = (new User())->pdo()->prepare('SELECT 1 FROM users WHERE deleted_at IS NULL AND username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $available = !$stmt->fetchColumn();
        $this->json(['username' => $username, 'available' => $available], $available ? 'Username is available.' : 'Username is already taken.', $available ? 200 : 409);
    }

    public function usernameLogin(): void
    {
        $data = $this->input();
        $username = Username::normalize($data['username'] ?? '');
        $password = (string) ($data['password'] ?? '');
        if ($username === '' || $password === '') {
            $this->fail('Validation failed', 422, [
                'username' => 'Username is required.',
                'password' => 'Password is required.',
            ]);
        }

        $stmt = (new User())->pdo()->prepare('SELECT * FROM users WHERE deleted_at IS NULL AND username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) {
            $this->fail('Username and Password do not match.', 401);
        }

        $hash = (string) ($user['password_hash'] ?? '');
        if ($hash === '' || !PasswordService::verify($password, $hash)) {
            $this->fail('Username and Password do not match.', 401);
        }

        $accountStatus = strtolower(trim((string) ($user['account_status'] ?? 'active')));
        if ($accountStatus === 'suspended') {
            $this->fail('Your account has been suspended. Please contact support.', 403);
        }

        $this->startSession((int) $user['id']);
        $this->json($this->authPayload($user, 'Login successful'), 'Login successful');
    }

    public function emailLogin(): void
    {
        $this->usernameLogin();
    }

    public function requestRegistrationOtp(): void
    {
        $data = $this->input();
        $errors = $this->validateEmailRegistrationPayload($data);
        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $otp = $this->createOtp($email, 'registration');
        $sent = EmailService::send(
            $email,
            'ConnectNKT email verification OTP',
            $this->otpEmailHtml($otp, 'Use this OTP to verify your ConnectNKT account email.')
        );

        if (!$sent && !$this->allowDevOtpFallback()) {
            $this->expireLatestOtp($email, 'registration');
            $this->fail('Could not send OTP email. Please contact support or try again later.', 424);
        }

        $payload = ['email' => $email, 'expires_in_minutes' => self::OTP_TTL_MINUTES];
        if (!$sent) {
            $payload['delivery'] = 'development_fallback';
        }

        $this->json($payload, 'Verification OTP sent.');
    }

    public function verifyRegistrationOtp(): void
    {
        $data = $this->input();
        $errors = $this->validateEmailRegistrationPayload($data);
        $otp = trim((string) ($data['otp'] ?? ''));
        if (!preg_match('/^\d{6}$/', $otp)) {
            $errors['otp'] = 'A valid 6-digit OTP is required.';
        }
        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $this->verifyOtp($email, 'registration', $otp);

        $user = new User();
        $phone = preg_replace('/\D/', '', (string) $data['phone']);
        $villageId = (int) $data['village_id'];
        $gender = strtolower(trim((string) $data['gender']));

        try {
            $id = $user->create([
                'name' => trim((string) $data['name']),
                'username' => Username::normalize($data['username'] ?? ''),
                'email' => $email,
                'mobile' => $phone,
                'father_name' => trim((string) $data['father_name']),
                'village_id' => $villageId,
                'date_of_birth' => $data['dob'],
                'gender' => $gender,
            ]);
            if ($id > 0) {
                $stmt = $user->pdo()->prepare('UPDATE users SET password_hash = :hash, email_verified = 1 WHERE id = :id LIMIT 1');
                $stmt->execute(['hash' => PasswordService::hash((string) $data['password']), 'id' => $id]);
            }
        } catch (\PDOException $e) {
            error_log('Email registration failed: ' . $e->getMessage());
            $this->fail('Registration failed due to a server error.', 500);
        }

        $row = (new User())->find($id);
        $this->startSession($id);
        $this->json($this->authPayload($row ?: [], 'Account created'), 'Account created', 201);
    }

    public function requestPasswordResetOtp(): void
    {
        $data = $this->input();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        if (!Validator::email($email)) {
            $this->fail('Validation failed', 422, ['email' => 'A valid email is required.']);
        }

        $stmt = (new User())->pdo()->prepare('SELECT id FROM users WHERE deleted_at IS NULL AND email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        if (!$stmt->fetch()) {
            usleep(random_int(200000, 500000));
            $this->json(['email' => $email, 'expires_in_minutes' => self::OTP_TTL_MINUTES], 'If an account exists with this email, an OTP has been sent.');
            return;
        }

        $otp = $this->createOtp($email, 'password_reset');
        $sent = EmailService::send(
            $email,
            'ConnectNKT password reset OTP',
            $this->otpEmailHtml($otp, 'Use this OTP to reset your ConnectNKT password.')
        );

        if (!$sent && !$this->allowDevOtpFallback()) {
            $this->expireLatestOtp($email, 'password_reset');
            $this->fail('Could not send OTP email. Please contact support or try again later.', 424);
        }

        $payload = ['email' => $email, 'expires_in_minutes' => self::OTP_TTL_MINUTES];
        if (!$sent) {
            $payload['delivery'] = 'development_fallback';
        }

        $this->json($payload, 'If an account exists with this email, an OTP has been sent.');
    }

    public function verifyPasswordResetOtp(): void
    {
        $data = $this->input();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $otp = trim((string) ($data['otp'] ?? ''));
        if (!Validator::email($email) || !preg_match('/^\d{6}$/', $otp)) {
            $this->fail('Validation failed', 422, ['otp' => 'A valid OTP is required.']);
        }

        $otpId = $this->verifyOtp($email, 'password_reset', $otp, false);
        $resetToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (self::RESET_TOKEN_TTL_MINUTES * 60));
        $stmt = (new User())->pdo()->prepare('
            UPDATE auth_email_otps
            SET consumed_at = CURRENT_TIMESTAMP, reset_token_hash = :reset_token_hash, reset_token_expires_at = :reset_token_expires_at
            WHERE id = :id
        ');
        $stmt->execute([
            'id' => $otpId,
            'reset_token_hash' => hash('sha256', $resetToken),
            'reset_token_expires_at' => $expiresAt,
        ]);

        $this->json(['reset_token' => $resetToken, 'expires_in_minutes' => self::RESET_TOKEN_TTL_MINUTES], 'OTP verified.');
    }

    public function resetPassword(): void
    {
        $this->ensureOtpTable();
        $data = $this->input();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $resetToken = trim((string) ($data['reset_token'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $confirmPassword = (string) ($data['confirm_password'] ?? '');

        $errors = [];
        if (!Validator::email($email)) $errors['email'] = 'A valid email is required.';
        if (strlen($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        } elseif (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
            $errors['password'] = 'Password must contain at least one letter and one number.';
        }
        if ($password !== $confirmPassword) $errors['confirm_password'] = 'Passwords do not match.';
        if ($resetToken === '') $errors['reset_token'] = 'Reset token is required.';
        if ($errors) {
            $this->fail('Validation failed', 422, $errors);
        }

        $db = (new User())->pdo();
        $stmt = $db->prepare("
            SELECT id FROM auth_email_otps
            WHERE email = :email
              AND purpose = 'password_reset'
              AND reset_token_hash = :reset_token_hash
              AND reset_token_expires_at > :now
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute([
            'email' => $email,
            'reset_token_hash' => hash('sha256', $resetToken),
            'now' => date('Y-m-d H:i:s'),
        ]);
        if (!$stmt->fetch()) {
            $this->fail('Password reset session has expired. Please request a new OTP.', 401);
        }

        $update = $db->prepare('UPDATE users SET password_hash = :password_hash, updated_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND email = :email');
        $update->execute([
            'email' => $email,
            'password_hash' => PasswordService::hash($password),
        ]);

        $clear = $db->prepare("UPDATE auth_email_otps SET reset_token_expires_at = :now WHERE email = :email AND purpose = 'password_reset'");
        $clear->execute(['email' => $email, 'now' => date('Y-m-d H:i:s')]);

        if (!EmailService::send(
            $email,
            'ConnectNKT password reset confirmation',
            '<p>Your ConnectNKT password was reset successfully. If this was not you, please contact support immediately.</p>'
        )) {
            error_log('[mail] Password reset confirmation email could not be sent to ' . $email);
        }

        $this->json(['reset' => true], 'Password reset successful.');
    }

    public function changePassword(): void
    {
        $userId = $this->currentUserId();
        if ($userId <= 0) {
            $this->fail('Unauthorized', 401);
        }

        $data = $this->input();
        $currentPassword = (string) ($data['current_password'] ?? '');
        $newPassword = (string) ($data['new_password'] ?? '');

        if ($currentPassword === '' || $newPassword === '') {
            $this->fail('Validation failed', 422, [
                'current_password' => 'Current password is required.',
                'new_password' => 'New password is required.',
            ]);
        }

        if (strlen($newPassword) < 8) {
            $this->fail('Validation failed', 422, ['new_password' => 'Password must be at least 8 characters.']);
        } elseif (!preg_match('/[A-Za-z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
            $this->fail('Validation failed', 422, ['new_password' => 'Password must contain at least one letter and one number.']);
        }

        $db = (new User())->pdo();
        $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user) {
            $this->fail('User not found.', 404);
        }

        if (empty($user['password_hash']) || !PasswordService::verify($currentPassword, $user['password_hash'])) {
            $this->fail('Current password is incorrect.', 401, ['current_password' => 'Incorrect password.']);
        }

        $update = $db->prepare('UPDATE users SET password_hash = :password_hash, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
        $update->execute([
            'id' => $userId,
            'password_hash' => PasswordService::hash($newPassword),
        ]);

        $this->destroyCurrentSession();
        $this->json(['changed' => true, 'reauthentication_required' => true], 'Password changed successfully. Please sign in again.');
    }

    public function login(): void
    {
        $data = $this->input();
        $claims = $this->firebaseClaims($data);
        $stmt = (new User())->pdo()->prepare('SELECT * FROM users WHERE deleted_at IS NULL AND (firebase_uid = :uid OR email = :email) LIMIT 1');
        $stmt->execute(['uid' => $claims['sub'], 'email' => strtolower((string) $claims['email'])]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user) $this->fail('Registration is required for this Google account.', 409, ['registration_required' => true]);

        $accountStatus = strtolower(trim((string) ($user['account_status'] ?? 'active')));
        if ($accountStatus === 'suspended') {
            $this->fail('Your account has been suspended. Please contact support.', 403);
        }

        $this->startSession((int) $user['id']);
        $this->json($this->authPayload($user, 'Login successful'), 'Login successful');
    }

    private function validateEmailRegistrationPayload(array $data): array
    {
        $data['username'] = Username::normalize($data['username'] ?? '');
        $errors = Validator::required($data, ['name', 'username', 'email', 'password', 'confirm_password', 'phone', 'father_name', 'village_id', 'dob', 'gender']);
        if (!Validator::email($data['email'] ?? null)) {
            $errors['email'] = 'A valid email is required.';
        }
        if (($usernameError = Username::validate($data['username'])) !== null) {
            $errors['username'] = $usernameError;
        }
        if ((string) ($data['password'] ?? '') !== (string) ($data['confirm_password'] ?? '')) {
            $errors['confirm_password'] = 'Passwords do not match.';
        }
        $pwd = (string) ($data['password'] ?? '');
        if (strlen($pwd) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        } elseif (!preg_match('/[A-Za-z]/', $pwd) || !preg_match('/[0-9]/', $pwd)) {
            $errors['password'] = 'Password must contain at least one letter and one number.';
        }
        if (($data['agree_terms'] ?? null) !== true && ($data['agree_terms'] ?? null) !== 'true' && ($data['agree_terms'] ?? null) !== 1) {
            $errors['agree_terms'] = 'You must agree to the terms.';
        }

        $phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
        if ($phone === '' || strlen($phone) !== 10) {
            $errors['phone'] = 'Phone number must be exactly 10 digits.';
        }

        $villageId = isset($data['village_id']) ? (int) $data['village_id'] : 0;
        if ($villageId <= 0) {
            $errors['village_id'] = 'Village is required.';
        }

        $gender = strtolower(trim((string) ($data['gender'] ?? '')));
        $allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!in_array($gender, $allowedGenders, true)) {
            $errors['gender'] = 'Gender must be male, female, other, or prefer_not_to_say.';
        }

        if ($errors) {
            return $errors;
        }

        $db = (new User())->pdo();
        $stmt = $db->prepare('SELECT id FROM villages WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $villageId]);
        if (!$stmt->fetch()) {
            $errors['village_id'] = 'Selected village is invalid.';
        }

        $stmt = $db->prepare('SELECT username, email, mobile FROM users WHERE deleted_at IS NULL AND (username = :username OR email = :email OR mobile = :mobile) LIMIT 1');
        $stmt->execute([
            'username' => $data['username'],
            'email' => strtolower(trim((string) $data['email'])),
            'mobile' => $phone,
        ]);
        $existing = $stmt->fetch();
        if ($existing) {
            if (isset($existing['username']) && strcasecmp((string) $existing['username'], $data['username']) === 0) {
                $errors['username'] = 'Username is already taken.';
            }
            if (isset($existing['email']) && strtolower((string) $existing['email']) === strtolower(trim((string) $data['email']))) {
                $errors['email'] = 'Email is already registered.';
            }
            if (isset($existing['mobile']) && $existing['mobile'] === $phone) {
                $errors['phone'] = 'Phone number is already registered.';
            }
        }

        return $errors;
    }

    private function createOtp(string $email, string $purpose): string
    {
        $this->ensureOtpTable();
        $otp = (string) random_int(100000, 999999);
        $db = (new User())->pdo();
        $db->prepare('UPDATE auth_email_otps SET consumed_at = CURRENT_TIMESTAMP WHERE email = :email AND purpose = :purpose AND consumed_at IS NULL')
            ->execute(['email' => $email, 'purpose' => $purpose]);
        $stmt = $db->prepare('
            INSERT INTO auth_email_otps (email, purpose, otp_hash, expires_at)
            VALUES (:email, :purpose, :otp_hash, :expires_at)
        ');
        $stmt->execute([
            'email' => $email,
            'purpose' => $purpose,
            'otp_hash' => PasswordService::hash($otp),
            'expires_at' => date('Y-m-d H:i:s', time() + (self::OTP_TTL_MINUTES * 60)),
        ]);
        return $otp;
    }

    private function verifyOtp(string $email, string $purpose, string $otp, bool $consume = true): int
    {
        $this->ensureOtpTable();
        $db = (new User())->pdo();
        $stmt = $db->prepare('
            SELECT * FROM auth_email_otps
            WHERE email = :email AND purpose = :purpose AND consumed_at IS NULL
            ORDER BY id DESC
            LIMIT 1
        ');
        $stmt->execute(['email' => $email, 'purpose' => $purpose]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row || strtotime((string) $row['expires_at']) < time()) {
            $this->fail('OTP has expired. Please request a new OTP.', 401);
        }
        if ((int) ($row['attempts'] ?? 0) >= 5) {
            $this->fail('Too many incorrect OTP attempts. Please request a new OTP.', 429);
        }
        if (!PasswordService::verify($otp, (string) $row['otp_hash'])) {
            $db->prepare('UPDATE auth_email_otps SET attempts = attempts + 1 WHERE id = :id')->execute(['id' => (int) $row['id']]);
            $this->fail('Invalid OTP.', 401);
        }
        if ($consume) {
            $db->prepare('UPDATE auth_email_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = :id')->execute(['id' => (int) $row['id']]);
        }
        return (int) $row['id'];
    }

    private function ensureOtpTable(): void
    {
        static $ensured = false;
        if ($ensured) return;
        $sql = '
            CREATE TABLE IF NOT EXISTS auth_email_otps (
              id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              email VARCHAR(191) NOT NULL,
              purpose ENUM(\'registration\',\'password_reset\') NOT NULL,
              otp_hash VARCHAR(255) NOT NULL,
              attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
              expires_at DATETIME NOT NULL,
              consumed_at DATETIME NULL DEFAULT NULL,
              reset_token_hash CHAR(64) NULL DEFAULT NULL,
              reset_token_expires_at DATETIME NULL DEFAULT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_auth_email_otps_lookup (email, purpose, consumed_at, expires_at),
              KEY idx_auth_email_otps_reset_token (reset_token_hash, reset_token_expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ';
        (new User())->pdo()->exec($sql);
        $ensured = true;
    }

    private function expireLatestOtp(string $email, string $purpose): void
    {
        $this->ensureOtpTable();
        $stmt = (new User())->pdo()->prepare('
            UPDATE auth_email_otps
            SET consumed_at = CURRENT_TIMESTAMP
            WHERE email = :email
              AND purpose = :purpose
              AND consumed_at IS NULL
            ORDER BY id DESC
            LIMIT 1
        ');
        $stmt->execute(['email' => $email, 'purpose' => $purpose]);
    }

    private function allowDevOtpFallback(): bool
    {
        return Env::get('APP_ENV') !== 'production'
            && Env::get('MAIL_ALLOW_DEV_OTP_FALLBACK', 'true') === 'true';
    }

    private function otpEmailHtml(string $otp, string $intro): string
    {
        return '<p>' . htmlspecialchars($intro, ENT_QUOTES, 'UTF-8') . '</p>'
            . '<p style="font-size:24px;font-weight:700;letter-spacing:4px;">' . htmlspecialchars($otp, ENT_QUOTES, 'UTF-8') . '</p>'
            . '<p>This OTP expires in ' . self::OTP_TTL_MINUTES . ' minutes.</p>';
    }

    private function firebaseClaims(array $data): array
    {
        $token = trim((string) ($data['id_token'] ?? ''));
        if ($token === '') $this->fail('Firebase ID token is required.', 401);
        try { return FirebaseTokenService::verify($token); } catch (\Throwable $e) { $this->fail('Google authentication could not be verified.', 401); }
        return [];
    }

    private function startSession(int $userId): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_set_cookie_params(['lifetime' => 2592000, 'httponly' => true, 'secure' => $this->secureCookie(), 'samesite' => 'Lax', 'path' => '/']);
            session_start();
        }
        $now = time();
        session_regenerate_id(true);
        unset($_SESSION['admin_id']);
        $_SESSION['user_id'] = $userId;
        // A browser can reuse the same PHP session after an admin login.
        // Explicitly switch the session back to the user namespace so /me and
        // protected requests do not keep treating this session as admin.
        $_SESSION['type'] = 'user';
        $_SESSION['role'] = 'user';
        $_SESSION['created_at'] = $now;
        $_SESSION['last_activity'] = $now;
        $_SESSION['expires_at'] = $now + self::SESSION_ABSOLUTE_SECONDS;
        $_SESSION['password_fingerprint'] = hash('sha256', (string) ((new User())->find($userId)['password_hash'] ?? ''));
        $_SESSION['regenerated_at'] = $now;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        setcookie('csrf_token', $_SESSION['csrf_token'], [
            'expires' => $now + 3600,
            'path' => '/',
            'secure' => $this->secureCookie(),
            'httponly' => false,
            'samesite' => 'Lax',
        ]);
    }

    private function authPayload(array $user, string $purpose): array
    {
        $id = (int) ($user['id'] ?? 0);
        $token = JwtService::issue(['sub' => $id, 'role' => 'user', 'username' => $user['username'] ?? '']);
        return ['token' => $token, 'user' => $this->sanitizeUser($this->appendProfileMeta($this->enrichUser($user), $id))];
    }

    public function csrfToken(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_set_cookie_params(['httponly' => true, 'secure' => $this->secureCookie(), 'samesite' => 'Lax', 'path' => '/']);
            session_start();
        }

        $now = time();
        if (($now - (int) ($_SESSION['last_activity'] ?? $now)) > self::SESSION_IDLE_SECONDS || $now >= (int) ($_SESSION['expires_at'] ?? ($now + 1))) {
            session_destroy();
            $this->fail('Session expired', 401);
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['last_activity'] = $now;

        setcookie('csrf_token', $token, [
            'expires' => time() + 3600,
            'path' => '/',
            'domain' => '',
            'secure' => $this->secureCookie(),
            'httponly' => false,
            'samesite' => 'Lax',
        ]);
        header('X-CSRF-Token: ' . $token);

        $this->json(['token' => $token], 'CSRF token generated');
    }

    public function logout(): void
    {
        $token = $this->bearerToken();
        if ($token) {
            JwtService::revoke($token);
        }
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) {
            session_start();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $this->secureCookie(), 'httponly' => true, 'samesite' => 'Lax']);
        $this->json(['logged_out' => true], 'Logout successful');
    }

    private function destroyCurrentSession(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) {
            session_start();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $this->secureCookie(), 'httponly' => true, 'samesite' => 'Lax']);
    }

    public function me(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE && !empty($_COOKIE[session_name()])) {
            session_start();
        }
        $claims = $this->currentUserClaims();
        $isAdmin = ($claims['type'] ?? 'user') === 'admin';
        $userId = $isAdmin ? 0 : (isset($claims['sub']) ? (int) $claims['sub'] : 0);
        $user = null;
        if ($userId > 0) {
            $user = (new User())->find($userId);
            if ($user) {
                $user = $this->sanitizeUser($this->enrichUser($user));
            }
        }
        $this->json([
            'user' => $user ? $this->appendProfileMeta($user, $userId) : null,
        ], 'Current session');
    }

    private function sanitizeUser(array $user): array
    {
        unset($user['password_hash']);
        foreach (['can_create_text_post', 'can_create_poll_post', 'can_create_image_post', 'can_create_image_text_post'] as $field) {
            if (array_key_exists($field, $user)) {
                $user[$field] = (bool) $user[$field];
            }
        }
        return $user;
    }

    private function enrichUser(array $user): array
    {
        if (!isset($user['village']) || trim((string) $user['village']) === '') {
            $stmt = (new User())->pdo()->prepare('
                SELECT villages.name AS village_name
                FROM users
                LEFT JOIN villages ON villages.id = users.village_id
                WHERE users.id = :id
                LIMIT 1
            ');
            $stmt->execute(['id' => (int) ($user['id'] ?? 0)]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
            $user['village'] = $row['village_name'] ?? $user['village'] ?? null;
        }

        return $user;
    }

    private function appendProfileMeta(array $user, int $authUserId): array
    {
        $userId = (int) ($user['id'] ?? 0);
        if ($userId <= 0) {
            return $user;
        }

        $followedColumn = $this->followedColumn();
        $followersStmt = (new User())->pdo()->prepare('
            SELECT COALESCE(u.followers_count_override, COUNT(f.id), 0) AS total
            FROM users u
            LEFT JOIN followers f ON f.' . $followedColumn . ' = u.id
            WHERE u.id = :id
            GROUP BY u.id, u.followers_count_override
            LIMIT 1
        ');
        $followersStmt->execute(['id' => $userId]);
        $followingStmt = (new User())->pdo()->prepare('
            SELECT COALESCE(u.following_count_override, COUNT(f.id), 0) AS total
            FROM users u
            LEFT JOIN followers f ON f.follower_id = u.id
            WHERE u.id = :id
            GROUP BY u.id, u.following_count_override
            LIMIT 1
        ');
        $followingStmt->execute(['id' => $userId]);

        $user['followers_count'] = (int) ($followersStmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
        $user['following_count'] = (int) ($followingStmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
        $user['is_following'] = $authUserId > 0 && $authUserId !== $userId ? $this->isFollowing($authUserId, $userId) : false;
        $user = $this->appendAvatarAliases($user);

        return $user;
    }

    private function followedColumn(): string
    {
        static $cached = null;
        if (is_string($cached)) {
            return $cached;
        }

        foreach (['followed_id', 'following_id'] as $column) {
            $stmt = (new User())->pdo()->prepare('
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = \'followers\'
                  AND column_name = :column_name
                LIMIT 1
            ');
            $stmt->execute(['column_name' => $column]);
            if ($stmt->fetchColumn()) {
                return $cached = $column;
            }
        }

        return $cached = 'followed_id';
    }

    private function isFollowing(int $followerId, int $followedId): bool
    {
        $stmt = (new User())->pdo()->prepare('SELECT 1 FROM followers WHERE follower_id = :follower_id AND ' . $this->followedColumn() . ' = :followed_id LIMIT 1');
        $stmt->execute([
            'follower_id' => $followerId,
            'followed_id' => $followedId,
        ]);
        return (bool) $stmt->fetchColumn();
    }

    private function appendAvatarAliases(array $user): array
    {
        $avatar = trim((string) ($user['profile_image_url'] ?? $user['avatar_url'] ?? $user['profile_image'] ?? ''));
        if ($avatar !== '') {
          $user['profile_image_url'] = $avatar;
          $user['avatar_url'] = $avatar;
          $user['profile_image'] = $avatar;
          $user['avatar'] = $avatar;
          $user['photo'] = $avatar;
          $user['image'] = $avatar;
        }

        return $user;
    }

    private function secureCookie(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }

}
