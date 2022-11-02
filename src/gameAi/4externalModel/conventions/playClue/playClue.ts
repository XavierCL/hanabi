import { getFocus } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getLayeredPlayableHypothetical } from "./layeredPlayableHypothetical";

export const playClue = (
  gameHistory: readonly HypotheticalGame[],
  playerIndex: number,
  oldClueIntent: ClueIntent
): ClueIntent | undefined => {
  const currentGame = gameHistory[gameHistory.length - 1];

  if (!currentGame.leadingMove) return undefined;

  const inductionStart = gameHistory[gameHistory.length - 2];

  const leadingMoveInteraction = currentGame.leadingMove.interaction;

  const leadingClue = (() => {
    if ("color" in leadingMoveInteraction) {
      return { color: leadingMoveInteraction.color };
    }

    if ("number" in leadingMoveInteraction) {
      return { number: leadingMoveInteraction.number };
    }

    return undefined;
  })();

  if (!leadingClue) return undefined;

  const cluedPlayerIndex = currentGame.leadingMove.targetPlayerIndex;

  // Based on the targetted point of view of course
  const oldTargetPovGame = inductionStart.asView(cluedPlayerIndex);
  const oldTargetPovHand = oldTargetPovGame.hands[cluedPlayerIndex];
  const newTargetPovGame = currentGame.asView(cluedPlayerIndex);
  const newTargetPovHand = newTargetPovGame.hands[cluedPlayerIndex];

  const { index: focusIndex } = getFocus(
    oldTargetPovHand,
    newTargetPovHand,
    leadingClue
  );

  const { nextPlayables } = getLayeredPlayableHypothetical(currentGame);

  const restrictedCard =
    currentGame.hands[currentGame.leadingMove.targetPlayerIndex][
      focusIndex
    ].restrictPossibles(nextPlayables);

  return {
    ...oldClueIntent,
    [newTargetPovHand[focusIndex].cardId]: {
      intent: "play",
      possibles: restrictedCard.possibles,
    },
  };
};
