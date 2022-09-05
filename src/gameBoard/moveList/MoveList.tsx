import "./MoveList.css";
import Card from "../Card";
import { CardColor } from "../../domain/ImmutableCard";
import ImmutableCardView from "../../domain/ImmutableCardView";
import { Move } from "../../domain/ImmutableGameState";
import { useEffect, useRef } from "react";

const MoveList = ({
  moves,
  startingPlayerIndex,
  playerNames,
  seenIndex,
  setSeenIndex,
}: {
  moves: readonly Move[];
  startingPlayerIndex: number;
  playerNames: readonly string[];
  seenIndex: number;
  setSeenIndex: (seenIndex: number) => void;
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seenIndex !== -1) return;

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const highlightedMoveIndex =
    seenIndex === -1 ? moves.length - 1 : seenIndex - 1;

  return (
    <ol
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        width: "250px",
        height: "90vh",
        overflowY: "auto",
      }}
    >
      {moves.map((move, moveIndex) => {
        const playerName =
          playerNames[(moveIndex + startingPlayerIndex) % playerNames.length];

        const template = (() => {
          if ("play" in move.interaction) {
            return (
              <span
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "5px",
                }}
              >
                {playerName} played{" "}
                <Card
                  canInteract={false}
                  card={move.interaction.play.asOthers()}
                  onInteraction={() => {}}
                  ownCardStatus="none"
                  shrink={0.1}
                />
              </span>
            );
          }

          if ("discard" in move.interaction) {
            return (
              <span
                style={{ display: "flex", flexDirection: "row", gap: "5px" }}
              >
                {playerName} discarded{" "}
                <Card
                  canInteract={false}
                  card={move.interaction.discard.asOthers()}
                  onInteraction={() => {}}
                  ownCardStatus="none"
                  shrink={0.1}
                />
              </span>
            );
          }

          if ("color" in move.interaction) {
            return (
              <span>
                {playerName} clued {playerNames[move.targetPlayerIndex]} about
                their{" "}
                <Card
                  colorStyle={{ marginTop: "7px" }}
                  canInteract={false}
                  card={
                    new ImmutableCardView<CardColor, undefined>("", {
                      color: move.interaction.color,
                      number: undefined,
                    })
                  }
                  onInteraction={() => {}}
                  ownCardStatus="none"
                  shrink={0.1}
                />
              </span>
            );
          }

          return (
            <span>
              {playerName} clued {playerNames[move.targetPlayerIndex]} about
              their{" "}
              <span style={{ fontWeight: "bold" }}>
                {move.interaction.number}
              </span>
            </span>
          );
        })();

        return (
          <li
            key={moveIndex}
            className="move-item"
            style={{
              backgroundColor:
                highlightedMoveIndex === moveIndex ? "rgb(214, 214, 214)" : "",
              cursor: "pointer",
            }}
            onClick={() => {
              setSeenIndex(moveIndex === moves.length - 1 ? -1 : moveIndex + 1);
            }}
          >
            {template}
          </li>
        );
      })}
      <div ref={bottomRef} />
    </ol>
  );
};

export default MoveList;
