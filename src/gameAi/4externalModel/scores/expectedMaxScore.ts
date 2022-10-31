import { sortBy, sum } from "lodash";
import { CARD_COLORS, CARD_NUMBERS } from "../../../domain/ImmutableCard";
import ImmutableGameView from "../../../domain/ImmutableGameView";

export const expectedMaxScore = (currentGame: ImmutableGameView): number => {
  const colorToNumberToRemaining = Object.fromEntries(
    CARD_COLORS.map((color) => [
      color,
      Object.fromEntries(CARD_NUMBERS.map((number) => [number, 0])),
    ])
  );

  currentGame.fullDeck.forEach((card) => {
    colorToNumberToRemaining[card.color][card.number] += 1;
  });

  // Can do better using negative clues and remaining count of same property
  currentGame.getKnownDiscard().forEach((card) => {
    colorToNumberToRemaining[card.color][card.number] -= 1;
  });

  const max0 = (n: number): number => Math.max(n, 0);

  currentGame.discarded.forEach((card) => {
    if (card.color) {
      const cardColor = card.color;

      CARD_NUMBERS.forEach(
        (number) =>
          (colorToNumberToRemaining[cardColor][number] = max0(
            colorToNumberToRemaining[cardColor][number] - 1
          ))
      );
    } else if (card.number) {
      const cardNumber = card.number;
      CARD_COLORS.forEach(
        (color) =>
          (colorToNumberToRemaining[color][cardNumber] = max0(
            colorToNumberToRemaining[color][cardNumber] - 1
          ))
      );
    } else {
      CARD_COLORS.forEach((color) =>
        CARD_NUMBERS.forEach(
          (number) =>
            (colorToNumberToRemaining[color][number] = max0(
              colorToNumberToRemaining[color][number] - 1
            ))
        )
      );
    }
  });

  return sum(
    CARD_COLORS.map(
      (color) =>
        ((sortBy(
          Object.entries(colorToNumberToRemaining[color]),
          ([number]) => number
        ).find(([_, remaining]) => !Boolean(remaining))?.[0] as
          | number
          | undefined) ?? 6) - 1
    )
  );
};
