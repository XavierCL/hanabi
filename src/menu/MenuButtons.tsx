import { useState } from "react";

const MenuButtons = ({
  numberOfPlayer: initialNumberOfPlayer,
  hasHuman: initialHasHuman,
  onStartGame,
}: {
  onStartGame: (numberOfPlayer: number, hasHuman: boolean) => void;
  numberOfPlayer: number;
  hasHuman: boolean;
}) => {
  const [numberOfPlayerString, setNumberOfPlayerString] = useState(
    String(initialNumberOfPlayer)
  );
  const [hasHuman, setHasHuman] = useState(initialHasHuman);

  const getValidNumberOfPlayer = (): number | undefined => {
    const numberOfPlayer = Number.parseInt(numberOfPlayerString);

    if (
      Number.isNaN(numberOfPlayer) ||
      numberOfPlayer < 2 ||
      numberOfPlayer > 6
    ) {
      return undefined;
    }

    return numberOfPlayer;
  };

  const validNumberOfPlayer = getValidNumberOfPlayer();

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div>
        <span>Number of Player</span>
        <input
          value={numberOfPlayerString}
          onChange={(event) => {
            const newValue: string = event.target.value;
            setNumberOfPlayerString(newValue);
          }}
        />
      </div>
      <div>
        <span>Has human</span>
        <input
          type="checkbox"
          checked={hasHuman}
          onChange={() => {
            setHasHuman((value) => !value);
          }}
        />
      </div>
      <button
        onClick={() => {
          if (validNumberOfPlayer === undefined) return;

          onStartGame(validNumberOfPlayer, hasHuman);
        }}
        disabled={validNumberOfPlayer === undefined}
      >
        Start game
      </button>
    </div>
  );
};

export default MenuButtons;
