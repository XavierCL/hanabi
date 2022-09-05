import React, { useState } from "react";
import GameBoard from "./gameBoard/GameBoard";
import MenuButtons from "./menu/MenuButtons";

const App = () => {
  const [gameBoardInitialState, setGameBoardInitialState] = useState({
    key: 0,
    numberOfPlayer: 3,
    hasHuman: true,
  });

  const restartGame = (numberOfPlayer: number, hasHuman: boolean) => {
    setGameBoardInitialState(({ key: oldKey }) => ({
      key: oldKey + 1,
      numberOfPlayer,
      hasHuman,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <GameBoard
        key={gameBoardInitialState.key}
        numberOfPlayer={gameBoardInitialState.numberOfPlayer}
        hasHuman={gameBoardInitialState.hasHuman}
      />
      <MenuButtons
        onStartGame={restartGame}
        numberOfPlayer={gameBoardInitialState.numberOfPlayer}
        hasHuman={gameBoardInitialState.hasHuman}
      />
    </div>
  );
};

export default App;
