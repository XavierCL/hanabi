import ImmutableCardView from "../../domain/ImmutableCardView";
import ImmutableGameState, {
  MAXIMUM_LIVES,
} from "../../domain/ImmutableGameState";
import Card from "../Card";

const GameNumberInfo = ({
  currentGame,
}: {
  currentGame: ImmutableGameState;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      gap: "20px",
      alignItems: "center",
    }}
  >
    <Card
      canInteract={false}
      card={
        new ImmutableCardView<undefined, number>("", {
          color: undefined,
          number: currentGame.getRemainingDeckLength(),
        })
      }
      onInteraction={() => {}}
      ownCardStatus="none"
      shrink={0.3}
      textShrink={0.5}
    />
    <div
      style={{
        width: "50px",
        height: "50px",
        backgroundColor: "rgb(178, 195, 255)",
        borderRadius: "50px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "30px",
      }}
    >
      {currentGame.remainingClues}
    </div>
    <div
      style={{
        width: "50px",
        height: "50px",
        backgroundColor: "rgb(230, 0, 0)",
        borderRadius: "50px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "30px",
      }}
    >
      {MAXIMUM_LIVES - currentGame.remainingLives}
    </div>
    <div style={{ fontSize: "30px" }}>
      {currentGame.getScore()} / {currentGame.getMaxScore()}
    </div>
  </div>
);

export default GameNumberInfo;
