import _ from "lodash";
import { useEffect, useMemo, useRef } from "react";
import ImmutableGameState, { MoveQuery } from "../domain/ImmutableGameState";
import GameAi from "../gameAi/playMineCardElemination";

const HUMAN_PLAYER_INDEX = 0;

const useGameAi = (
  gameHistory: readonly ImmutableGameState[],
  hasHuman: boolean,
  onInteraction: (move: MoveQuery) => void
) => {
  const currentGame = gameHistory[gameHistory.length - 1];

  const lastAiThink = useRef(0);

  const numberOfAi = currentGame.hands.length - Number(hasHuman);

  const gameAis = useMemo(
    () => _.range(numberOfAi).map((_) => new GameAi()),
    [numberOfAi]
  );

  const isHumanTurn =
    hasHuman && currentGame.currentTurnPlayerIndex === HUMAN_PLAYER_INDEX;

  useEffect(() => {
    if (
      isHumanTurn ||
      lastAiThink.current >= gameHistory.length ||
      currentGame.isGameOver()
    ) {
      return;
    }

    lastAiThink.current = gameHistory.length;

    setTimeout(() => {
      const startTime = performance.now();

      const currentAiHistoryView = gameHistory.map((gameState) =>
        gameState.asView(currentGame.currentTurnPlayerIndex)
      );

      const currentGameAi =
        gameAis[currentGame.currentTurnPlayerIndex - Number(hasHuman)];
      const moveQuery = currentGameAi.playOwnTurn(currentAiHistoryView);

      gameAis.forEach((gameAi, aiIndex) => {
        const aiGameHistoryView = gameHistory.map((gameState) =>
          gameState.asView(currentGame.currentTurnPlayerIndex)
        );

        if (aiIndex + Number(hasHuman) !== currentGame.currentTurnPlayerIndex) {
          gameAi.observeOthersTurn(aiGameHistoryView);
        }
      });

      const endTime = performance.now();

      setTimeout(
        () => {
          onInteraction(moveQuery);
        },
        hasHuman ? _.max([1000 - (endTime - startTime), 0]) : 0
      );
    }, 0);
  });
};

export default useGameAi;
