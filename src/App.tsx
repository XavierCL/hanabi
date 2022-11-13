import React, { useState } from "react";
import GameBoard from "./gameBoard/GameBoard";
import MenuButtons from "./menu/MenuButtons";

const App = () => {
  const [gameBoardInitialState, setGameBoardInitialState] = useState({
    key: 0,
    numberOfPlayer: 3,
    hasHuman: true,
    isCheating: false,
  });

  const restartGame = (numberOfPlayer: number, hasHuman: boolean) => {
    setGameBoardInitialState(({ key: oldKey }) => ({
      key: oldKey + 1,
      numberOfPlayer,
      hasHuman,
      isCheating: false,
    }));
  };

  const showCheatInfo = () =>
    setGameBoardInitialState((old) => ({ ...old, isCheating: true }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <GameBoard
        key={gameBoardInitialState.key}
        numberOfPlayer={gameBoardInitialState.numberOfPlayer}
        hasHuman={gameBoardInitialState.hasHuman}
        isCheating={gameBoardInitialState.isCheating}
      />
      <MenuButtons
        onStartGame={restartGame}
        numberOfPlayer={gameBoardInitialState.numberOfPlayer}
        hasHuman={gameBoardInitialState.hasHuman}
        isCheating={gameBoardInitialState.isCheating}
        showCheatInfo={showCheatInfo}
      />
    </div>
  );
};

export default App;
