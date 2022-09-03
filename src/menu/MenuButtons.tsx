import { useState } from "react";

const MenuButtons = ({
  onStartGame,
}: {
  onStartGame: (numberOfAi: number) => void;
}) => {
  const [numberOfAiString, setNumberOfAiString] = useState("2");

  const getValidNumberOfAi = (): number | undefined => {
    const numberOfAi = Number.parseInt(numberOfAiString);

    if (Number.isNaN(numberOfAi) || numberOfAi < 1 || numberOfAi > 6) {
      return undefined;
    }

    return numberOfAi;
  };

  const validNumberOfAi = getValidNumberOfAi();

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div>
        <span>Number of AI</span>
        <input
          value={numberOfAiString}
          onChange={(event) => {
            const newValue: string = event.target.value;
            setNumberOfAiString(newValue);
          }}
        />
      </div>
      <button
        onClick={() => {
          if (validNumberOfAi === undefined) return;

          onStartGame(validNumberOfAi);
        }}
        disabled={validNumberOfAi === undefined}
      >
        Start game
      </button>
    </div>
  );
};

export default MenuButtons;
