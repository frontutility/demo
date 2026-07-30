<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class PollPercentage
{
    /**
     * Sanitize a vote count — never allow negative values.
     */
    public static function sanitizeVoteCount(int|float|string|null $value): int
    {
        if (!is_numeric($value)) {
            return 0;
        }

        return max(0, (int) $value);
    }

    /**
     * Calculate display percentages from option vote counts.
     *
     * @param array<int|string, int> $optionVotes optionId => vote count
     * @return array{
     *     totalVotes: int,
     *     percentages: array<int, float>,
     *     optionVotes: array<int, int>
     * }
     */
    public static function calculate(array $optionVotes, ?int $pollId = null): array
    {
        $sanitized = [];
        foreach ($optionVotes as $optionId => $votes) {
            $sanitized[(int) $optionId] = self::sanitizeVoteCount($votes);
        }

        $totalVotes = array_sum($sanitized);

        self::logCounts($pollId, $sanitized, $totalVotes);

        $percentages = [];
        foreach (array_keys($sanitized) as $optionId) {
            $percentages[$optionId] = 0.0;
        }

        if ($totalVotes > 0) {
            $rounded = [];
            $highestOptionId = null;
            $highestPercent = -1.0;

            foreach ($sanitized as $optionId => $votes) {
                $rawPercent = ($votes / $totalVotes) * 100;
                $roundedPercent = round($rawPercent, 1);
                // Ensure individual percentages are kept between 0.0 and 100.0
                $roundedPercent = max(0.0, min(100.0, $roundedPercent));
                $rounded[$optionId] = $roundedPercent;

                if ($roundedPercent > $highestPercent) {
                    $highestPercent = $roundedPercent;
                    $highestOptionId = $optionId;
                }
            }

            $sumPercentages = array_sum($rounded);
            $adjustment = round(100.0 - $sumPercentages, 1);

            if ($adjustment !== 0.0 && $highestOptionId !== null) {
                $adjusted = round($rounded[$highestOptionId] + $adjustment, 1);
                $rounded[$highestOptionId] = max(0.0, min(100.0, $adjusted));
            }

            foreach ($rounded as $optionId => $percent) {
                $percentages[$optionId] = max(0.0, min(100.0, $percent));
            }
        }

        return [
            'totalVotes' => $totalVotes,
            'percentages' => $percentages,
            'optionVotes' => $sanitized,
        ];
    }

    /**
     * Verify stored total matches the sum of option votes and log mismatches.
     *
     * @param array<int|string, int> $optionVotes
     */
    public static function verifyTotal(array $optionVotes, int $storedTotal, ?int $pollId = null): int
    {
        $computedTotal = 0;
        foreach ($optionVotes as $votes) {
            $computedTotal += self::sanitizeVoteCount($votes);
        }

        if ($pollId !== null) {
            error_log(sprintf(
                '[PollPercentage] verifyTotal poll_id=%d stored_total_votes=%d computed_total_votes=%d',
                $pollId,
                self::sanitizeVoteCount($storedTotal),
                $computedTotal
            ));
            foreach ($optionVotes as $optionId => $votes) {
                error_log(sprintf(
                    '[PollPercentage] verifyTotal poll_id=%d option_id=%d option_votes=%d',
                    $pollId,
                    $optionId,
                    self::sanitizeVoteCount($votes)
                ));
            }
        }

        if ($pollId !== null && $computedTotal !== self::sanitizeVoteCount($storedTotal)) {
            error_log(sprintf(
                '[PollPercentage] poll_id=%d total_votes mismatch stored=%d sum_option_votes=%d',
                $pollId,
                self::sanitizeVoteCount($storedTotal),
                $computedTotal
            ));
        }

        return $computedTotal;
    }

    /**
     * @param array<int, int> $optionVotes
     */
    private static function logCounts(?int $pollId, array $optionVotes, int $totalVotes): void
    {
        if ($pollId === null) {
            return;
        }

        error_log(sprintf('[PollPercentage] poll_id=%d total_votes=%d', $pollId, $totalVotes));
        foreach ($optionVotes as $optionId => $votes) {
            error_log(sprintf(
                '[PollPercentage] poll_id=%d option_id=%d option_votes=%d',
                $pollId,
                $optionId,
                $votes
            ));
        }
    }
}
