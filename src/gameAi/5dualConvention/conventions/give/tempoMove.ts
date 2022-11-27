import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const tempoMove = (gameHistory: readonly HypotheticalGame[]) => {
  const currentGame = gameHistory[gameHistory.length - 1];
  const currentHand = currentGame.hands[currentGame.currentTurnPlayerIndex];

  return {
    targetPlayerIndex: currentGame.currentTurnPlayerIndex,
    interaction: {
      play: currentHand[0].cardId,
    },
  };
};
