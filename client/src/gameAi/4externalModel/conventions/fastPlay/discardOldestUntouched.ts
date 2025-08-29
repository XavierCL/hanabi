import { reverse } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const discardOldestUntouched = (
  currentGame: HypotheticalGame,
  playerIndex: number
) => {
  const ownHand = currentGame.hands[playerIndex];

  const foundUntouched = reverse(ownHand).find((card) => !card.isClued());

  if (!foundUntouched) return undefined;

  return {
    targetPlayerIndex: playerIndex,
    interaction: { discard: foundUntouched.cardId },
  };
};
