import { ActionQuery } from "../../../../../domain/ImmutableGameState";
import { hashCard, reverse } from "../../../../aiUtils";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";
import { getCardUsefulness } from "./getCardUsefulness";

export const discardUseless = (
  currentGame: HypotheticalGame,
  playerIndex: number
): ActionQuery | undefined => {
  const ownHand = currentGame.hands[playerIndex];

  const { uselessCards, uselessColors, uselessNumbers } =
    getCardUsefulness(currentGame);

  const uselessCardSet = new Set(uselessCards.map(hashCard));

  const knownUselessOwnCard = reverse(ownHand).find((card) =>
    // Accepts empty possibles as useless
    card.possibles.every(
      (possible) =>
        uselessCardSet.has(hashCard(possible)) ||
        uselessColors.has(possible.color) ||
        uselessNumbers.has(possible.number)
    )
  );

  if (!knownUselessOwnCard) return undefined;

  return {
    targetPlayerIndex: playerIndex,
    interaction: {
      discard: knownUselessOwnCard.cardId,
    },
  };
};
