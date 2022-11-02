import { groupBy, mapValues, range } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_NUMBERS,
} from "../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../domain/ImmutableCardValue";
import { hashCard, hashCard2 } from "../../../aiUtils";
import HypotheticalCard from "../../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const getLayeredPlayableHypothetical = (
  game: HypotheticalGame
): { nextPlayables: readonly ImmutableCardValue[]; layerCount: number } => {
  const allKnownCardSet = new Set(
    game.hands
      .flat()
      .filter((card): card is HypotheticalCard<CardColor, CardNumber> =>
        Boolean(card.number && card.color)
      )
      .map(hashCard)
  );

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
      const nextLayeredPlayable = range(
        nextPlayable,
        CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
      ).find((currentNumber) => {
        const isLayered = allKnownCardSet.has(
          hashCard2(color as CardColor, currentNumber as CardNumber)
        );

        if (isLayered) {
          ++layerCount;
        }

        return isLayered;
      });

      return nextLayeredPlayable
        ? new ImmutableCardValue(color as CardColor, nextPlayable)
        : undefined;
    })
    .filter((card): card is ImmutableCardValue => Boolean(card))
    .filter((card) => nonDiscardedCards[hashCard(card)] > 0);

  return { nextPlayables, layerCount };
};
