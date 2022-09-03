import Card from "./Card";
import { CardColor, CardNumber } from "./domain/ImmutableCard";
import ImmutableCardView from "./domain/ImmutableCardView";

const PlayedCards = ({
  playedCards,
}: {
  playedCards: Readonly<Record<CardColor, CardNumber | 0>>;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "center",
    }}
  >
    <span>Played cards</span>
    <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
      {(["red", "yellow", "green", "blue", "purple"] as const).map((color) => {
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
