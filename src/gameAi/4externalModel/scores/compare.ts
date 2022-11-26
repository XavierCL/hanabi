import { zip } from "lodash";
import { Score } from "./generate";

export const firstIsBest = (first: Score, second: Score): boolean => {
  const prepareScore = (score: Score) => [
    score.remainingLives,
    -score.misledCount,
    score.maxScore,
    score.totalPlayed,
    -score.playDiscount,
    score.dangerousDiscardDiscount,
    score.nextPlayableCount,
    score.totalPossibleCount,
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
