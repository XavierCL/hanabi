import Card from "./Card";
import { CardColor, CardNumber } from "./domain/ImmutableCard";
import ImmutableCardView from "./domain/ImmutableCardView";

const HandOfCards = ({
  playerName,
  cards,
  isCurrentTurn,
  ownCardStatus,
  onInteraction,
  canInteract,
}: {
  playerName: string;
  cards: readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[];
  isCurrentTurn: boolean;
  ownCardStatus: "discard-and-play" | "play" | "none";
  onInteraction: (
    interaction:
      | { color: CardColor }
      | { number: CardNumber }
      | { play: string }
      | { discard: string }
  ) => void;
  canInteract: boolean;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: "15px",
      position: "relative",
    }}
  >
    <div style={{ position: "absolute", left: "-20px" }}>
      {isCurrentTurn && "▶"}
    </div>
    <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
      {cards.map((card) => (
        <Card
          key={card.cardId}
          card={card}
          ownCardStatus={ownCardStatus}
          onInteraction={onInteraction}
          canInteract={canInteract}
        />
      ))}
    </div>
    <div>{playerName}</div>
  </div>
);

export default HandOfCards;
