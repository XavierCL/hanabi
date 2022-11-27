import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getTouchedUniquePossibles } from "./duplicates/getTouchedUniquePossibles";
import { getHistoryFocus } from "./playClue/getHistoryFocus";

export const earlyGame5Save = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntent
): { intents?: ClueIntent; passThrough: boolean } => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return { passThrough: true };

  const { leadingClue, wasUntouched } = historyFocus;

  if (
    !("number" in leadingClue.interaction) ||
    leadingClue.interaction.number !== 5
  ) {
    return { passThrough: true };
  }

  const currentGame = gameHistory[gameHistory.length - 1];

  if (currentGame.discarded.length) return { passThrough: true };

  if (!wasUntouched) return { passThrough: true };

  return {
    passThrough: false,
    intents: getTouchedUniquePossibles(currentGame, oldClueIntent, leadingClue),
  };
};
