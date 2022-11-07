import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getTouchedUniquePossibles } from "../duplicates/getTouchedUniquePossibles";
import { getHistoryFocus } from "./getHistoryFocus";
import { getLayeredPlayableHypothetical } from "./layeredPlayableHypothetical";

export const playClue = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntent
): ClueIntent | undefined => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return undefined;

  const { newCard: cardFocus, leadingClue } = historyFocus;
  const currentGame = gameHistory[gameHistory.length - 1];
  const inductionStart = gameHistory[gameHistory.length - 2];
  const { nextPlayables } = getLayeredPlayableHypothetical(inductionStart);
  const restrictedCard = cardFocus.restrictPossibles(nextPlayables);

  return getTouchedUniquePossibles(
    currentGame,
    {
      ...oldClueIntent,
      [cardFocus.cardId]: {
        intent: "play",
        possibles: restrictedCard.possibles,
      },
    },
    leadingClue
  );
};
