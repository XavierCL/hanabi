import { range, uniqBy } from "lodash";
import { CardColor, CardNumber } from "../../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../../domain/ImmutableCardValue";
import { hashCard } from "../../../../aiUtils";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";

export const getKnownCards = (
  game: HypotheticalGame,
  ignoredCardIds: readonly string[]
): readonly ImmutableCardValue[] => {
  const ignoredCardIdSet = new Set(ignoredCardIds);

  const handTouched = game.hands
    .flat()
    .filter((card) => card.isClued())
    .filter((card) => !ignoredCardIdSet.has(card.cardId))
    .filter((card) => card.possibles.length === 1)
    .map((card) => card.possibles[0]);

  const playedTouched = Object.entries(game.playedCards).flatMap(
    ([color, numbers]) =>
      range(1, Math.max(...numbers) + 1).map(
        (n) => new ImmutableCardValue(color as CardColor, n as CardNumber)
      )
  );

  return uniqBy([...handTouched, ...playedTouched], hashCard);
};
