import { zip } from "lodash";
import { Score } from "./generates/generate";

export const firstIsBest = (first: Score, second: Score): boolean => {
  const prepareScore = (score: Score) => [
    score.remainingLives,
    -score.misledCount,
    -score.dangerousNextTwoTurnDiscardCount,
    score.roundTablePlayed,
    score.maxScore,
    -score.playDiscount,
    score.totalPlayed,
    score.nextPlayableCount,
    score.totalPossibleCount,
    -score.dangerousDiscardCount,
  ];

  for (const [firstQuantity, secondQuantity] of zip(
    prepareScore(first),
    prepareScore(second)
  )) {
    if (firstQuantity === undefined || secondQuantity === undefined) continue;

    if (firstQuantity > secondQuantity) return true;
    if (firstQuantity < secondQuantity) return false;
  }

  return true;
};
