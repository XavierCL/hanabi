import { useEffect, useState } from "react";
import ImmutableGameState from "./domain/ImmutableGameState";

const HUMAN_PLAYER_INDEX = 0;

const GameBoard = ({ numberOfAi }: { numberOfAi: number }) => {
  const [gameHistory, setGameHistory] = useState([
    new ImmutableGameState(numberOfAi + 1),
  ]);

  // Reset game history when number of ai changes
  useEffect(() => {
    setGameHistory([new ImmutableGameState(numberOfAi + 1)]);
  }, [numberOfAi]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {gameHistory[gameHistory.length - 1].hands.map((hand, playerIndex) => {
        const isHuman = playerIndex === HUMAN_PLAYER_INDEX;

        const playerName = isHuman ? `Human` : `AI ${playerIndex}`;
        const cards = isHuman ? hand.asOwn() : hand.asOthers();

        return (
          <HandOfCard key={playerName} playerName={playerName} cards={cards} />
        );
      })}
    </div>
  );
};

export default GameBoard;
