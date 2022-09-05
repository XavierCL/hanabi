import _ from "lodash";
import { CardColor, CardNumber } from "../domain/ImmutableCard";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export const getPlayableCards = (
  currentGame: ImmutableGameView
): { number: CardNumber; color: CardColor }[] =>
  Object.entries(currentGame.playedCards).flatMap(([color, number]) =>
    number < 5
      ? [{ color: color as CardColor, number: (number + 1) as CardNumber }]
      : []
  );

export const getKnownUselessProperties = (
  currentGame: ImmutableGameView
): {
  largestUselessNumber: CardNumber | 0;
  uselessColors: Set<CardColor>;
  uselessCards: readonly { color: CardColor; number: CardNumber }[];
} => {
  const largestUselessNumber = Object.entries(currentGame.playedCards).reduce<
    CardNumber | 0
  >(
    (minUseless, [_, currentPlayed]) =>
      currentPlayed < minUseless ? currentPlayed : minUseless,
    5
  );

  const uselessColors = new Set(
    Object.entries(currentGame.playedCards)
      .filter(([_, number]) => number === 5)
      .map(([color]) => color as CardColor)
  );

  const uselessCards = Object.entries(currentGame.playedCards).flatMap(
    ([color, number]) =>
      _.range(number).map((x) => ({
        color: color as CardColor,
        number: x as CardNumber,
      }))
  );

  return {
    largestUselessNumber,
    uselessColors,
    uselessCards,
  };
};

export const fallbackMove = (currentGame: ImmutableGameView): MoveQuery => ({
  targetPlayerIndex: currentGame.currentTurnPlayerIndex,
  interaction: {
    play: currentGame.hands[currentGame.currentTurnPlayerIndex][0].cardId,
  },
});
