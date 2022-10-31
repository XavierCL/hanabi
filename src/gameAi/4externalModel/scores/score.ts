import { zip } from "lodash";
import ImmutableGameView, { MoveView } from "../../../domain/ImmutableGameView";

export type Score = {
  maxScore: number;
  remainingLives: number;
  totalPlayed: number;
  playableCount: number;
  leadingMove: MoveView;
};

// Create class and properly discount
export const firstIsBest = (
  first: Score,
  second: Score,
  currentGame: ImmutableGameView
): boolean => {
  const prepareScore = (score: Score) => [
    score.remainingLives,
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
    if (!firstQuantity || !secondQuantity) return true;

    if (firstQuantity > secondQuantity) return true;
    if (firstQuantity < secondQuantity) return false;
  }

  return true;
};
