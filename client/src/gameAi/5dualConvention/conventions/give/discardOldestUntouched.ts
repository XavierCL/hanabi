import { reverse } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const discardOldestUntouched = (
  gameHistory: readonly HypotheticalGame[]
) => {
  const currentGame = gameHistory[gameHistory.length - 1];
  const playerIndex = currentGame.currentTurnPlayerIndex;
  const ownHand = currentGame.hands[playerIndex];

  const foundUntouched = reverse(ownHand).find((card) => !card.isClued());

  if (!foundUntouched) return undefined;

  return {
    targetPlayerIndex: playerIndex,
    interaction: { discard: foundUntouched.cardId },
  };
};
