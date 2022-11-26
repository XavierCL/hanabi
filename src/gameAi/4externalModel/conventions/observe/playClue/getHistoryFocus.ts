import { CardColor, CardNumber } from "../../../../../domain/ImmutableCard";
import { ClueQuery } from "../../../../../domain/ImmutableGameState";
import { getFocus } from "../../../../aiUtils";
import HypotheticalCard from "../../../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";

export const getHistoryFocus = (
  gameHistory: readonly HypotheticalGame[]
):
  | {
      targetPlayedIndex: number;
      cardIndex: number;
      oldCard: HypotheticalCard<CardColor | undefined, CardNumber | undefined>;
      newCard: HypotheticalCard<CardColor | undefined, CardNumber | undefined>;
      leadingClue: ClueQuery;
      isChop: boolean;
      wasUntouched: boolean;
    }
  | undefined => {
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

  const focusInfo = getFocus(oldTargetPovHand, newTargetPovHand, leadingClue);

  if (!focusInfo) return undefined;

  return {
    ...focusInfo,
    cardIndex: focusInfo.index,
    newCard: currentGame.hands[cluedPlayerIndex][focusInfo.index],
    oldCard: inductionStart.hands[cluedPlayerIndex][focusInfo.index],
    targetPlayedIndex: currentGame.leadingMove.targetPlayerIndex,
    leadingClue: { ...currentGame.leadingMove, interaction: leadingClue },
  };
};
