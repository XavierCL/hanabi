import { groupBy, mapValues, range } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_NUMBERS,
} from "../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../domain/ImmutableCardValue";
import { hashCard } from "../../../aiUtils";
import HypotheticalCard from "../../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const getLayeredPlayableHypothetical = (
  game: HypotheticalGame
): { nextPlayables: readonly ImmutableCardValue[]; layerCount: number } => {
  const allHandCards = game.hands.flat();

  const nonDiscardedCards = mapValues(
    groupBy(game.fullDeck, hashCard),
    (cards) => cards.length
  );

  game.discarded
    .filter((card): card is HypotheticalCard<CardColor, CardNumber> =>
      Boolean(card.number && card.color)
    )
    .forEach((card) => {
      --nonDiscardedCards[hashCard(card)];
      if (nonDiscardedCards[hashCard(card)] === 0) {
        delete nonDiscardedCards[hashCard(card)];
      }
    });

  let layerCount = 0;

  const nextPlayables = Object.entries(game.playedCards)
    .filter(([_, playeds]) => playeds.length === 1)
    .map(([color, playeds]) => {
      let nextPlayable = (playeds[0] + 1) as CardNumber;

      for (const currentNumber of range(
        nextPlayable,
        CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
      )) {
        const matchingCardIndex = allHandCards.findIndex(
          (card) =>
            card.possibles.length > 0 &&
            card.ownPossibles.every(
              (possible) =>
                possible.color === color && possible.number === currentNumber
            )
        );

        if (matchingCardIndex === -1) {
          break;
        }

        ++layerCount;
        ++nextPlayable;
        allHandCards.splice(matchingCardIndex);
      }

      return nextPlayable < CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
        ? new ImmutableCardValue(color as CardColor, nextPlayable)
        : undefined;
    })
    .filter((card): card is ImmutableCardValue => Boolean(card))
    .filter((card) => nonDiscardedCards[hashCard(card)] > 0);

  return { nextPlayables, layerCount };
};
