import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import DiscardedCards from "./DiscardedCards";
import ImmutableGameState, {
  Move,
  MoveQuery,
} from "./domain/ImmutableGameState";
import gameAi from "./gameAi/dummyAi";
import HandOfCard from "./HandOfCard";
import MoveList from "./MoveList";
import PlayedCards from "./PlayedCards";

const HUMAN_PLAYER_INDEX = 0;

const GameBoard = ({ numberOfAi }: { numberOfAi: number }) => {
  const [gameHistory, setGameHistory] = useState([
    ImmutableGameState.from(numberOfAi + 1),
  ]);
  const lastAiThink = useRef(0);

  // Reset game history when number of ai changes
  useEffect(() => {
    setGameHistory([ImmutableGameState.from(numberOfAi + 1)]);
  }, [numberOfAi]);

  const currentGame = gameHistory[gameHistory.length - 1];

  const onInteraction = (move: MoveQuery) => {
    setGameHistory([...gameHistory, currentGame.playInteraction(move)]);
  };

  const playerNames = [
    "Human",
    ..._.range(numberOfAi).map((aiIndex) => `AI ${aiIndex}`),
  ];

  const isHumanTurn = currentGame.currentTurnPlayerIndex === HUMAN_PLAYER_INDEX;

  // AI
  useEffect(() => {
    if (isHumanTurn || lastAiThink.current >= gameHistory.length) return;

    lastAiThink.current = gameHistory.length;

    setTimeout(() => {
      const startTime = performance.now();
      const moveQuery = gameAi(gameHistory);
      const endTime = performance.now();

      setTimeout(() => {
        onInteraction(moveQuery);
      }, _.max([1000 - (endTime - startTime), 0]));
    }, 0);
  });

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "30px" }}>
      <MoveList
        moves={gameHistory
          .map((gameState) => gameState.leadingMove)
          .filter((move): move is Move => Boolean(move))}
        playerNames={playerNames}
        startingPlayerIndex={gameHistory[0].currentTurnPlayerIndex}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {currentGame.hands.map((hand, playerIndex) => {
          const isHuman = playerIndex === HUMAN_PLAYER_INDEX;

          const playerName = playerNames[playerIndex];
          const cards = isHuman ? hand.asOwn() : hand.asOthers();
          const isCurrentTurn =
            currentGame.currentTurnPlayerIndex === playerIndex;

          return (
            <HandOfCard
              key={playerName}
              playerName={playerName}
              cards={cards}
              isCurrentTurn={currentGame.currentTurnPlayerIndex === playerIndex}
              ownCardStatus={(() => {
                if (!isHuman) return "none";

                if (currentGame.canDiscard()) return "discard-and-play";

                return "play";
              })()}
              onInteraction={(interaction) =>
                onInteraction({ targetPlayerIndex: playerIndex, interaction })
              }
              canInteract={
                isHumanTurn && (isCurrentTurn || currentGame.canGiveClue())
              }
            />
          );
        })}
        <div style={{ display: "flex", flexDirection: "row", gap: "30px" }}>
          <PlayedCards playedCards={currentGame.playedCards} />
          <DiscardedCards discarded={currentGame.discarded} />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
