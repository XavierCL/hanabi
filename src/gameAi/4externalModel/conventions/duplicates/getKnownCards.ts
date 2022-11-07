import { range, uniqBy } from "lodash";
import { CardColor, CardNumber } from "../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../domain/ImmutableCardValue";
import { hashCard } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const getKnownCards = (
  game: HypotheticalGame,
  ignoredCardIds: readonly string[]
): readonly ImmutableCardValue[] => {
  const ignoredCardIdSet = new Set(ignoredCardIds);

  const handTouched = game.hands
    .flat()
    .filter((card) => card.isClued())
    .filter((card) => !ignoredCardIdSet.has(card.cardId))
    .flatMap((card) => card.ownPossibles);

  const playedTouched = Object.entries(game.playedCards).flatMap(
    ([color, numbers]) =>
      numbers.flatMap((number) =>
        range(1, number + 1).map(
          (n) => new ImmutableCardValue(color as CardColor, n as CardNumber)
        )
      )
  );

  return uniqBy([...handTouched, ...playedTouched], hashCard);
};
