import { mapValues, groupBy } from "lodash";
import {
  CardNumber,
  CARD_NUMBERS,
  CardColor,
} from "../../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../../domain/ImmutableCardValue";
import { hashCard } from "../../../../aiUtils";
import HypotheticalCard from "../../../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";

export const getPlayableHypothetical = (
  game: HypotheticalGame
): readonly ImmutableCardValue[] => {
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

  return Object.entries(game.playedCards)
    .filter(([_, playeds]) => playeds.length === 1)
    .map(([color, playeds]) => {
      let nextPlayable = (playeds[0] + 1) as CardNumber;

      return nextPlayable < CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
        ? new ImmutableCardValue(color as CardColor, nextPlayable)
        : undefined;
    })
    .filter((card): card is ImmutableCardValue => Boolean(card))
    .filter((card) => nonDiscardedCards[hashCard(card)] > 0);
};
