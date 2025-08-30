import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import Card from "./cards/Card";

const HandOfCards = ({
  playerName,
  cards,
  isCurrentTurn,
  ownCardStatus,
  onInteraction,
  canInteract,
  isHistoryMode,
  showDebugInfo,
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
  isHistoryMode: boolean;
  showDebugInfo?: Record<string, Record<string, string>>;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "5px",
    }}
  >
    {/* Direction arrow above the cards */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "12px",
        color: "#666",
        marginLeft: "15px", // Align with the cards below
      }}
    >
      <span>New cards</span>
      <span style={{ fontSize: "16px" }}>→</span>
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "8px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "-20px",
          color: isHistoryMode ? "beige" : "black",
          textShadow: "black 0px 0px 1px",
        }}
      >
        {isCurrentTurn && "▶"}
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
        {cards.map((card) => (
          <Card
            key={card.cardId}
            card={card}
            ownCardStatus={ownCardStatus}
            onInteraction={onInteraction}
            canInteract={canInteract}
            showDebugInfo={
              showDebugInfo ? showDebugInfo[card.cardId] ?? {} : undefined
            }
          />
        ))}
      </div>
      <div>{playerName}</div>
    </div>
  </div>
);

export default HandOfCards;
