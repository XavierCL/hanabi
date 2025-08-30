import ImmutableGameState from "../../domain/ImmutableGameState";
import DiscardedCards from "./DiscardedCards";
import GameNumberInfo from "./GameNumberInfo";

const DiscardAndNumbers = ({
  currentGame,
}: {
  currentGame: ImmutableGameState;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      backgroundColor: "rgb(220, 220, 220)",
      width: "min(300px, 25vw)",
      minWidth: "250px",
      padding: "10px",
      flexShrink: 0,
    }}
  >
    <DiscardedCards discarded={currentGame.discarded} />
    <GameNumberInfo currentGame={currentGame} />
  </div>
);

export default DiscardAndNumbers;
