import Card from "./Card";
import { CardColor, CardNumber, CARD_COLORS } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import ImmutableGameState from "../domain/ImmutableGameState";

const PlayedCards = ({
  currentGame,
  playedCards,
}: {
  currentGame: ImmutableGameState;
  playedCards: Readonly<Record<CardColor, CardNumber | 0>>;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "center",
      position: "relative",
    }}
  >
    <span style={{ position: "absolute", top: "-25px" }}>
      {currentGame.isGameOver() ? "Game is done!" : "Played cards"}
    </span>
    <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
      {CARD_COLORS.map((color) => {
        const playedCardNumber = playedCards[color];
        const shownNumber =
          playedCardNumber === 0 ? undefined : playedCardNumber;

        return (
          <Card
            key={color}
            canInteract={false}
            onInteraction={() => {}}
            ownCardStatus="none"
            card={
              new ImmutableCardView<CardColor, CardNumber | undefined>("", {
                color,
                number: shownNumber,
              })
            }
          />
        );
      })}
    </div>
  </div>
);

export default PlayedCards;