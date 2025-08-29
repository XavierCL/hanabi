import { CARD_COLORS, CARD_NUMBERS } from "../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../domain/ImmutableCardValue";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const getAllDangerous = (
  currentGame: HypotheticalGame
): readonly ImmutableCardValue[] => {
  const colorToNumberToRemaining = Object.fromEntries(
    CARD_COLORS.map((color) => [
      color,
      Object.fromEntries(CARD_NUMBERS.map((number) => [number, 0])),
    ])
  );

  currentGame.fullDeck.forEach((card) => {
    colorToNumberToRemaining[card.color][card.number] += 1;
  });

  currentGame
    .getKnownDiscard()
    .forEach(
      (card) => (colorToNumberToRemaining[card.color][card.number] -= 1)
    );

  return CARD_COLORS.flatMap((color) =>
    CARD_NUMBERS.filter(
      (number) => colorToNumberToRemaining[color][number] === 1
    ).map((number) => new ImmutableCardValue(color, number))
  );
};
