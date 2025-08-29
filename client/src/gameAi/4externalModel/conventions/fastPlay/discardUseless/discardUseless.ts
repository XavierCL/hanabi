import { ActionQuery } from "../../../../../domain/ImmutableGameState";
import { hashCard } from "../../../../../domain/utils";
import { reverse } from "../../../../aiUtils";
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
    // It's dangerous to accepts empty possibles as useless
    // As AI will then use fake play clues to save second card touched early
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
