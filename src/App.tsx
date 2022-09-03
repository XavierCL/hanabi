import React, { useState } from "react";
import GameBoard from "./gameBoard/GameBoard";
import MenuButtons from "./menu/MenuButtons";

const App = () => {
  const [gameBoardInitialState, setGameBoardInitialState] = useState({
    key: 0,
    numberOfAi: 2,
  });

  const restartGame = (numberOfAi: number) => {
    setGameBoardInitialState(({ key: oldKey }) => ({
      key: oldKey + 1,
      numberOfAi,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <GameBoard
        key={gameBoardInitialState.key}
        numberOfAi={gameBoardInitialState.numberOfAi}
      />
      <MenuButtons onStartGame={restartGame} />
    </div>
  );
};

export default App;
