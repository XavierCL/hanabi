import { zip } from "lodash";
import { Score } from "./generate";

export const firstIsBest = (first: Score, second: Score): boolean => {
  const prepareScore = (score: Score) => [
    score.remainingLives,
    -score.misplayCount,
    -score.misledCount,
    -score.hasImproperDiscard,
    score.maxScore,
    score.totalPlayed,
    score.sequencePlayableCount,
    score.playableCount,
    score.nextPlayableCount,
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
