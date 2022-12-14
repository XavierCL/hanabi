import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";
import { ClueIntents } from "../../../ai";
import { getTouchedUniquePossibles } from "../duplicates/getTouchedUniquePossibles";
import { getHistoryFocus } from "./getHistoryFocus";
import { getLayeredPlayableHypothetical } from "./layeredPlayableHypothetical";

export const observePlayClue = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntents
): { intents?: ClueIntents; passThrough: boolean } => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return { passThrough: true };

  const { newCard: cardFocus, leadingClue } = historyFocus;
  const currentGame = gameHistory[gameHistory.length - 1];

  const targetInductionStart = gameHistory[gameHistory.length - 2].asView(
    leadingClue.targetPlayerIndex
  );

  const { nextPlayables } =
    getLayeredPlayableHypothetical(targetInductionStart);

  const restrictedCard = cardFocus.restrictPossibles(nextPlayables);

  return {
    passThrough: false,
    intents: getTouchedUniquePossibles(
      currentGame,
      {
        ...oldClueIntent,
        [cardFocus.cardId]: {
          intent: "play",
          possibles: restrictedCard.possibles,
        },
      },
      leadingClue
    ),
  };
};
