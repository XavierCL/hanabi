import { hashCard } from "../../../../../domain/utils";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";
import { getPlayableHypothetical } from "./getPlayableHypothetical";

export const playCard = (gameHistory: readonly HypotheticalGame[]) => {
  const currentGame = gameHistory[gameHistory.length - 1];
  const playerIndex = currentGame.currentTurnPlayerIndex;
  const playables = new Set(getPlayableHypothetical(currentGame).map(hashCard));

  const playableFound = currentGame.hands[playerIndex].find(
    (card) =>
      card.possibles.length > 0 &&
      card.possibles.every((possible) => playables.has(hashCard(possible)))
  );

  if (!playableFound) return undefined;

  return {
    targetPlayerIndex: playerIndex,
    interaction: { play: playableFound.cardId },
  };
};
