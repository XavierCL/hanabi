import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import "./Card.css";

const COLOR_MAP: Record<CardColor, { back: string; front: string }> = {
  blue: { back: "rgb(178, 195, 255)", front: "rgb(0, 55, 255)" },
  green: { back: "rgb(179, 249, 178)", front: "rgb(2, 236, 0)" },
  purple: { back: "rgb(209, 178, 240)", front: "rgb(102, 0, 204)" },
  yellow: { back: "rgb(247, 247, 178)", front: "rgb(230, 230, 0)" },
  red: { back: "rgb(247, 178, 178)", front: "rgb(230, 0, 0)" },
};

const Card = ({
  card,
  ownCardStatus,
  onInteraction,
  canInteract,
  shrink,
  textShrink,
  colorStyle,
  showClues,
}: {
  card: ImmutableCardView<CardColor | undefined, number | undefined>;
  ownCardStatus: "discard-and-play" | "play" | "none";
  onInteraction: (
    interaction:
      | { color: CardColor }
      | { number: CardNumber }
      | { play: string }
      | { discard: string }
  ) => void;
  canInteract: boolean;
  shrink?: number;
  textShrink?: number;
  colorStyle?: React.CSSProperties;
  showClues?: boolean;
}) => {
  const { backColor, frontColor } = (() => {
    if (card.color) {
      const { back: backColor, front: frontColor } = COLOR_MAP[card.color];

      return { backColor, frontColor };
    }

    return { backColor: "gray", frontColor: "black" };
  })();

  const interactions = (() => {
    if (!canInteract) return null;

    if (ownCardStatus !== "none") {
      return (
        <>
          <button onClick={() => onInteraction({ play: card.cardId })}>
            Play
          </button>
          {ownCardStatus === "discard-and-play" && (
            <button onClick={() => onInteraction({ discard: card.cardId })}>
              Trash
            </button>
          )}
        </>
      );
    }

    const { color, number } = card;

    if (!color || !number) return null;

    return (
      <>
        <button onClick={() => onInteraction({ color })}>
          <div
            style={{
              backgroundColor: frontColor,
              height: "15px",
              width: "20px",
            }}
          />
        </button>
        <button onClick={() => onInteraction({ number: number as CardNumber })}>
          {number}
        </button>
      </>
    );
  })();

  const clues = (
    <>
      {card.colorClued && (
        <div
          style={{
            backgroundColor: frontColor,
            height: "15px",
            width: "20px",
            boxShadow: "black 0px 0px 1px",
          }}
        />
      )}
      {card.numberClued && (
        <div
          style={{
            textShadow: "black 0px 0px 1px",
            fontSize: (textShrink ?? 1) * 20 * (shrink ?? 0.2) * 5,
          }}
        >
          {card.number}
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        height: `${200 * (shrink ?? 1)}px`,
        width: `${130 * (shrink ?? 1)}px`,
        backgroundColor: backColor,
        display: "inline-block",
        position: "relative",
      }}
    >
      <div
        className="show-on-hover"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "row",
            gap: "5px",
            top: "10%",
          }}
        >
          {interactions}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          width: "100%",
          bottom: "10%",
          gap: "5px",
        }}
      >
        {(showClues ?? true) && clues}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          ...colorStyle,
        }}
      >
        <span
          style={{
            color: frontColor,
            textShadow: "black 0px 0px 1px",
            fontSize: (textShrink ?? 1) * 40 * (shrink ?? 0.2) * 5,
          }}
        >
          {card.number}
        </span>
      </div>
    </div>
  );
};

export default Card;
