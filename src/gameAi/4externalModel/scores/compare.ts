import { zip } from "lodash";
import ImmutableGameView from "../../../domain/ImmutableGameView";
import { Score } from "./generate";

export const firstIsBest = (
  first: Score,
  second: Score,
  currentGame: ImmutableGameView
): boolean => {
  const prepareScore = (score: Score) => [
    score.remainingLives,
    -score.misledCount,
    score.maxScore,
    score.totalPlayed,
    -(
      (score.leadingMove.targetPlayerIndex +
        currentGame.hands.length -
        currentGame.currentTurnPlayerIndex) %
      currentGame.hands.length
    ),
    score.playableCount,
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
