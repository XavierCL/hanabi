import { sortBy, sum } from "lodash";
import { CARD_COLORS, CARD_NUMBERS } from "../../../domain/ImmutableCard";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";

export const expectedMaxScore = (currentGame: HypotheticalGame): number => {
  const colorToNumberToRemaining = Object.fromEntries(
    CARD_COLORS.map((color) => [
      color,
      Object.fromEntries(CARD_NUMBERS.map((number) => [number, 0])),
    ])
  );

  currentGame.fullDeck.forEach((card) => {
    colorToNumberToRemaining[card.color][card.number] += 1;
  });

  const max0 = (n: number): number => Math.max(n, 0);
  const min1 = (n: number): number => Math.min(n, 1);

  currentGame.discarded.forEach((card) => {
    card.possibles.forEach(
      (possible) =>
        (colorToNumberToRemaining[possible.color][possible.number] = max0(
          colorToNumberToRemaining[possible.color][possible.number] -
            1 / card.possibles.length
        ))
    );
  });

  return sum(
    CARD_COLORS.map(
      (color) =>
        sortBy(
          Object.entries(colorToNumberToRemaining[color]),
          ([number]) => number
        ).reduce(
          ({ maxScore, likelyhood }, [_, remaining]) => ({
            maxScore: maxScore + likelyhood * min1(remaining),
            likelyhood: likelyhood * min1(remaining),
          }),
          { maxScore: 0, likelyhood: 1 }
        ).maxScore
    )
  );
};
