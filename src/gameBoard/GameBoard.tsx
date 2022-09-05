import _ from "lodash";
import { useEffect, useState } from "react";
import ImmutableGameState, {
  Move,
  MoveQuery,
} from "../domain/ImmutableGameState";
import DiscardAndNumbers from "./discardAndNumbers/DiscardAndNumbers";
import HandOfCard from "./HandOfCard";
import MoveList from "./MoveList";
import PlayedCards from "./PlayedCards";
import useGameAi from "./useGameAi";

const HUMAN_PLAYER_INDEX = 0;

const GameBoard = ({ numberOfAi }: { numberOfAi: number }) => {
  const [gameHistory, setGameHistory] = useState([
    ImmutableGameState.from(numberOfAi + 1),
  ]);

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

  useGameAi(gameHistory, onInteraction);

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
                isHumanTurn &&
                (isCurrentTurn || currentGame.canGiveClue()) &&
                !currentGame.isGameOver()
              }
            />
          );
        })}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "30px",
            marginTop: "30px",
          }}
        >
          <PlayedCards
            currentGame={currentGame}
            playedCards={currentGame.playedCards}
          />
          <DiscardAndNumbers
            currentGame={currentGame}
            discarded={currentGame.discarded}
          />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
