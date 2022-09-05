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
      width: "300px",
      padding: "10px",
    }}
  >
    <DiscardedCards discarded={currentGame.discarded} />
    <GameNumberInfo currentGame={currentGame} />
  </div>
);

export default DiscardAndNumbers;
