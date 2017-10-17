'use strict';

const MAX_MATCH_LENGTH = 15;
const MAX_MATCH_SCORE = (MAX_MATCH_LENGTH + MAX_MATCH_LENGTH * MAX_MATCH_LENGTH) * 0.5;

function computeMatchScore(text, query_lower) {
  const text_lower = text.toLowerCase();
  let fuzzyScore = 0;
  let pattern_i = 0;
  let add = 1;

  for (let i = 0; i < text_lower.length; i++) {
    const textChrCode = text_lower.charCodeAt(i);
    const queryCharCode = query_lower.charCodeAt(pattern_i);
    if (textChrCode !== queryCharCode) {
      add *= 0.5;
      continue;
    }
    pattern_i++;
    add += 1;
    fuzzyScore += add;

    const noMoreMatches = (pattern_i >= query_lower.length || pattern_i >= MAX_MATCH_LENGTH);
    if (noMoreMatches)
      break;
  }

  // Normalize Score
  fuzzyScore = Math.min(MAX_MATCH_SCORE, fuzzyScore);
  fuzzyScore /= MAX_MATCH_SCORE;

  return {
    score: fuzzyScore
  };
}

module.exports = {
  computeMatchScore
};
