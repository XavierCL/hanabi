import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import ImmutableGameState, {
  Move,
  MoveQuery,
} from "../domain/ImmutableGameState";
import DiscardAndNumbers from "./discardAndNumbers/DiscardAndNumbers";
import HandOfCard from "./HandOfCard";
import MoveList from "./moveList/MoveList";
import PlayedCards from "./PlayedCards";
import useGameAi from "./useGameAi";

const HUMAN_PLAYER_INDEX = 0;

const GameBoard = ({
  numberOfPlayer,
  hasHuman,
}: {
  numberOfPlayer: number;
  hasHuman: boolean;
}) => {
  const [gameHistory, setGameHistory] = useState({
    history: [ImmutableGameState.from(numberOfPlayer)],
    seenIndex: -1,
  });

  const lastHistoryIndex = gameHistory.history.length - 1;
  const isHistoryMode = gameHistory.seenIndex !== -1;
  const currentGame = gameHistory.history[lastHistoryIndex];

  const seenGame =
    gameHistory.history[
      gameHistory.seenIndex === -1 ? lastHistoryIndex : gameHistory.seenIndex
    ];

  const firstEffect = useRef(true);

  // Reset game history when number of ai changes
  useEffect(() => {
    if (firstEffect.current) {
      firstEffect.current = false;
      return;
    }

    setGameHistory({
      history: [ImmutableGameState.from(numberOfPlayer)],
      seenIndex: -1,
    });
  }, [hasHuman, numberOfPlayer]);

  const onInteraction = (move: MoveQuery) => {
    setGameHistory(({ seenIndex, history }) => ({
      history: [...history, history[history.length - 1].playInteraction(move)],
      seenIndex,
    }));
  };

  const playerNames = [
    ...(hasHuman ? ["Human"] : []),
    ..._.range(numberOfPlayer - Number(hasHuman)).map(
      (aiIndex) => `AI ${aiIndex}`
    ),
  ];

  const isHumanTurn =
    hasHuman && currentGame.currentTurnPlayerIndex === HUMAN_PLAYER_INDEX;

  const { simulateMove } = useGameAi(
    gameHistory.history,
    hasHuman,
    onInteraction
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "30px",
        minWidth: "1300px",
      }}
    >
      <MoveList
        moves={gameHistory.history
          .map((gameState) => gameState.leadingMove)
          .filter((move): move is Move => Boolean(move))}
        playerNames={playerNames}
        startingPlayerIndex={gameHistory.history[0].currentTurnPlayerIndex}
        seenIndex={gameHistory.seenIndex}
        setSeenIndex={(seenIndex) =>
          setGameHistory(({ history }) => ({ history, seenIndex }))
        }
        simulateMove={() => {
          const { leadingMove: knownLeadingMove } =
            gameHistory.history[
              gameHistory.seenIndex === -1
                ? gameHistory.history.length - 1
                : gameHistory.seenIndex
            ];

          if (!knownLeadingMove) return;

          const interaction = knownLeadingMove.interaction;

          const knownLeadingMoveQuery = {
            ...knownLeadingMove,
            interaction:
              "play" in interaction
                ? { play: interaction.play.asOthers().cardId }
                : "discard" in interaction
                ? { discard: interaction.discard.asOthers().cardId }
                : interaction,
          };

          simulateMove(
            gameHistory.history.slice(0, gameHistory.seenIndex),
            knownLeadingMoveQuery
          );
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {seenGame.hands.map((hand, playerIndex) => {
          const isHuman = hasHuman && playerIndex === HUMAN_PLAYER_INDEX;

          const playerName = playerNames[playerIndex];
          const cards = isHuman ? hand.asOwn() : hand.asOthers();
          const isCurrentTurn =
            seenGame.currentTurnPlayerIndex === playerIndex &&
            !seenGame.isGameOver();

          return (
            <HandOfCard
              key={playerName}
              playerName={playerName}
              cards={cards}
              isCurrentTurn={isCurrentTurn}
              ownCardStatus={(() => {
                if (!isHuman) return "none";

                if (seenGame.canDiscard()) return "discard-and-play";

                return "play";
              })()}
              onInteraction={(interaction) =>
                onInteraction({ targetPlayerIndex: playerIndex, interaction })
              }
              canInteract={
                isHumanTurn &&
                (isCurrentTurn || seenGame.canGiveClue()) &&
                !seenGame.isGameOver() &&
                !isHistoryMode
              }
              isHistoryMode={isHistoryMode}
            />
          );
        })}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "30px",
            marginTop: "30px",
          }}
        >
          <PlayedCards currentGame={seenGame} />
          <DiscardAndNumbers currentGame={seenGame} />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
