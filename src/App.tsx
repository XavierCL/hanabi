import React, { useState } from "react";
import GameBoard from "./gameBoard/GameBoard";
import MenuButtons from "./menu/MenuButtons";

const App = () => {
  const [gameBoardInitialState, setGameBoardInitialState] = useState({
    key: 0,
    numberOfAi: 2,
    hasHuman: true,
  });

  const restartGame = (numberOfAi: number, hasHuman: boolean) => {
    setGameBoardInitialState(({ key: oldKey }) => ({
      key: oldKey + 1,
      numberOfAi,
      hasHuman,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <GameBoard
        key={gameBoardInitialState.key}
        numberOfAi={gameBoardInitialState.numberOfAi}
        hasHuman={gameBoardInitialState.hasHuman}
      />
      <MenuButtons onStartGame={restartGame} />
    </div>
  );
};

export default App;
