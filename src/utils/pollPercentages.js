export function sanitizeVoteCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

/**
 * Calculate poll option percentages from vote counts.
 * Rounds to 1 decimal place and adjusts the highest option so the total is exactly 100%.
 */
export function computePollPercentages(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return { options: [], totalVotes: 0 };
  }

  const updatedOptions = options.map((opt) => {
    let votes = Number(opt.votesCount ?? opt.votes_count ?? opt.votes ?? 0);
    if (!Number.isFinite(votes) || votes < 0) {
      votes = 0;
    }
    votes = Math.floor(votes);
    return {
      ...opt,
      votesCount: votes,
      votes_count: votes,
    };
  });

  const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votesCount, 0);

  if (totalVotes === 0) {
    updatedOptions.forEach((opt) => {
      opt.percentage = 0;
      opt.percent = 0;
    });
    return { options: updatedOptions, totalVotes: 0 };
  }

  const rounded = updatedOptions.map((opt) => {
    const rawPercent = (opt.votesCount / totalVotes) * 100;
    const roundedPercent = Math.round(rawPercent * 10) / 10;
    return Math.max(0, Math.min(100, roundedPercent));
  });

  let highestIndex = 0;
  let highestPercent = rounded[0] ?? 0;
  rounded.forEach((percent, index) => {
    if (percent > highestPercent) {
      highestPercent = percent;
      highestIndex = index;
    }
  });

  const sumPercentages = rounded.reduce((sum, percent) => sum + percent, 0);
  const adjustment = Math.round((100 - sumPercentages) * 10) / 10;

  if (adjustment !== 0) {
    const adjusted = Math.round((rounded[highestIndex] + adjustment) * 10) / 10;
    rounded[highestIndex] = Math.max(0, Math.min(100, adjusted));
  }

  updatedOptions.forEach((opt, index) => {
    const percent = Math.max(0, Math.min(100, rounded[index] ?? 0));
    opt.percentage = percent;
    opt.percent = percent;
  });

  return { options: updatedOptions, totalVotes };
}

export function applyServerPollPercentages(options, totalVotesOverride = null) {
  if (!Array.isArray(options) || options.length === 0) {
    return { options: [], totalVotes: 0 };
  }

  const normalizedOptions = options.map((opt) => {
    let votes = Number(opt.votesCount ?? opt.votes_count ?? opt.votes ?? 0);
    if (!Number.isFinite(votes) || votes < 0) {
      votes = 0;
    }
    votes = Math.floor(votes);
    const hasServerPercent = opt.percentage !== undefined || opt.percent !== undefined;
    const percentage = hasServerPercent
      ? Math.max(0, Math.min(100, Number(opt.percentage ?? opt.percent ?? 0) || 0))
      : null;

    return {
      ...opt,
      votesCount: votes,
      votes_count: votes,
      percentage,
      percent: percentage,
    };
  });

  const summedVotes = normalizedOptions.reduce((sum, opt) => sum + opt.votesCount, 0);
  const totalVotes = Math.max(0, Math.floor(Number(totalVotesOverride ?? summedVotes) || 0));

  if (normalizedOptions.every((opt) => opt.percentage !== null)) {
    normalizedOptions.forEach((opt) => {
      opt.percent = opt.percentage;
    });
    return { options: normalizedOptions, totalVotes };
  }

  return computePollPercentages(normalizedOptions);
}
