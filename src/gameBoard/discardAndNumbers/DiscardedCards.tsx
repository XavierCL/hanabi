import _ from "lodash";
import ImmutableCard, { CARD_COLORS } from "../../domain/ImmutableCard";
import Card from "../Card";

const DiscardedCards = ({
  discarded,
}: {
  discarded: readonly ImmutableCard[];
}) => {
  const visibleDiscarded = discarded.map((card) => card.asOthers());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {CARD_COLORS.map((color) => (
        <div
          key={color}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "8px",
            height: "20px",
          }}
        >
          {Object.values(
            _.groupBy(
              visibleDiscarded
                .filter((card) => card.color === color)
                .sort((card1, card2) => card1.number - card2.number),
              (card) => card.number
            )
          ).map((sameNumberCards) => (
            <div
              key={sameNumberCards[0].number}
              style={{ display: "flex", flexDirection: "row", gap: "1px" }}
            >
              {sameNumberCards.map((card) => (
                <Card
                  key={card.cardId}
                  canInteract={false}
                  card={card}
                  onInteraction={() => {}}
                  ownCardStatus="none"
                  shrink={0.1}
                  showClues={false}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DiscardedCards;
