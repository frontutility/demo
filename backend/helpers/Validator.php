<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class Validator
{
    private array $data;
    private array $rules;
    private array $validationErrors = [];

    public function __construct(array $data = [], array $rules = [])
    {
        $this->data = $data;
        $this->rules = $rules;
    }

    public function passes(): bool
    {
        $this->validationErrors = [];
        foreach ($this->rules as $field => $ruleString) {
            $value = $this->data[$field] ?? null;
            foreach (explode('|', (string) $ruleString) as $rule) {
                [$name, $argument] = array_pad(explode(':', $rule, 2), 2, null);
                $empty = $value === null || trim((string) $value) === '';
                if ($name === 'required' && $empty) {
                    $this->validationErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
                    break;
                }
                if ($empty) continue;
                if ($name === 'max' && mb_strlen((string) $value) > (int) $argument) {
                    $this->validationErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . " must be {$argument} characters or fewer.";
                    break;
                }
                if ($name === 'date' && strtotime((string) $value) === false) {
                    $this->validationErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' must be a valid date.';
                    break;
                }
            }
        }
        return $this->validationErrors === [];
    }

    public function errors(): array
    {
        return $this->validationErrors;
    }
    public static function required(array $data, array $fields): array
    {
        $errors = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }
        return $errors;
    }

    public static function email(?string $value): bool
    {
        return $value !== null && filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function minWords(string $text, int $maxWords): bool
    {
        return str_word_count(trim($text)) <= $maxWords;
    }
}
