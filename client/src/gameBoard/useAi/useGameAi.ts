import _ from "lodash";
import { useCallback, useEffect, useRef } from "react";
import ImmutableGameState, { MoveQuery } from "../../domain/ImmutableGameState";
import GameAi from "../../gameAi/4externalModel/ai";
import { getInternalInfo } from "./getInternalInfo";

const HUMAN_PLAYER_INDEX = 0;

const useGameAi = (
  gameHistory: readonly ImmutableGameState[],
  hasHuman: boolean,
  onInteraction: (move: MoveQuery) => void,
  infoHistoryIndex: number | undefined,
  aiNames: string[]
): {
  simulateMove: (
    currentGame: readonly ImmutableGameState[],
    knownLeadingMove: MoveQuery
  ) => void;
  internalInfo?: Record<string, Record<string, string>>;
} => {
  const currentGame = gameHistory[gameHistory.length - 1];

  const lastAiThink = useRef(0);
  const lastAiObserved = useRef(1);

  const numberOfAi = currentGame.hands.length - Number(hasHuman);

  const gameAis = useRef(
    _.range(numberOfAi).map((_) => [new GameAi()])
  ).current;

  const isHumanTurn =
    hasHuman && currentGame.currentTurnPlayerIndex === HUMAN_PLAYER_INDEX;

  const observeLastMove = useCallback(
    (simHistory: readonly ImmutableGameState[]): GameAi[] => {
      return gameAis.map((gameAi, aiIndex) => {
        const playerIndex = aiIndex + Number(hasHuman);

        const aiGameHistoryView = simHistory.map((gameState) =>
          gameState.asView(playerIndex)
        );

        return gameAi[simHistory.length - 2].observeOthersTurn(
          aiGameHistoryView
        );
      });
    },
    [gameAis, hasHuman]
  );

  const computeMove = (
    simHistory: readonly ImmutableGameState[],
    knownLeadingMove?: MoveQuery
  ): MoveQuery => {
    const game = simHistory[simHistory.length - 1];
    const isHuman =
      hasHuman && game.currentTurnPlayerIndex === HUMAN_PLAYER_INDEX;

    const nextMove = (() => {
      if (isHuman) return knownLeadingMove!;

      const currentAiHistoryView = simHistory.map((gameState) =>
        gameState.asView(game.currentTurnPlayerIndex)
      );

      const currentGameAi =
        gameAis[game.currentTurnPlayerIndex - Number(hasHuman)][
          simHistory.length - 1
        ];

      return currentGameAi.playOwnTurn(
        currentAiHistoryView,
        Boolean(knownLeadingMove)
      );
    })();

    // This is a fake simulation, fake observation as well
    if (knownLeadingMove) {
      const nextHistory = [...simHistory, game.playInteraction(nextMove)];
      observeLastMove(nextHistory);
    }

    return nextMove;
  };

  useEffect(() => {
    if (lastAiObserved.current >= gameHistory.length) return;

    lastAiObserved.current = gameHistory.length;

    observeLastMove(gameHistory).forEach((nextGameAi, aiIndex) =>
      gameAis[aiIndex].push(nextGameAi)
    );
  }, [gameAis, gameHistory, observeLastMove]);

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

      const moveQuery = computeMove(gameHistory);

      const endTime = performance.now();

      setTimeout(
        () => {
          onInteraction(moveQuery);
        },
        hasHuman ? _.max([1000 - (endTime - startTime), 0]) : 0
      );
    }, 0);
  });

  return {
    simulateMove: computeMove,
    internalInfo:
      infoHistoryIndex === undefined
        ? undefined
        : getInternalInfo(
            gameAis.map(
              (aiHistory) =>
                aiHistory[
                  infoHistoryIndex === -1
                    ? aiHistory.length - 1
                    : infoHistoryIndex
                ]
            ),
            aiNames
          ),
  };
};

export default useGameAi;
