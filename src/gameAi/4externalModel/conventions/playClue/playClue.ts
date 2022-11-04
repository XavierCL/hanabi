import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getHistoryFocus } from "./getHistoryFocus";
import { getLayeredPlayableHypothetical } from "./layeredPlayableHypothetical";

export const playClue = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntent
): ClueIntent | undefined => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return undefined;

  const { newCard: cardFocus } = historyFocus;
  const inductionStart = gameHistory[gameHistory.length - 2];
  const { nextPlayables } = getLayeredPlayableHypothetical(inductionStart);
  const restrictedCard = cardFocus.restrictPossibles(nextPlayables);

  return {
    ...oldClueIntent,
    [cardFocus.cardId]: {
      intent: "play",
      possibles: restrictedCard.possibles,
    },
  };
};
