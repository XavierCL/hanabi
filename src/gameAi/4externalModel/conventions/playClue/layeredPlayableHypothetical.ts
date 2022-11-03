import { clone, groupBy, isEqual, mapValues, range } from "lodash";
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

  let totalLayerCount = 0;

  // Should go card by card, not color by color, because some cards we don't know the color but are still playable on two colors
  const layedPlayedCards = clone(game.playedCards) as Record<
    CardColor,
    (CardNumber | 0)[]
  >;
  let lastMaybePlayableCardIndices: number[] = [];
  const currentMaybePlayableCardIndices = range(allHandCards.length).filter(
    (cardIndex) => allHandCards[cardIndex].possibles.length > 0
  );

  while (
    !isEqual(lastMaybePlayableCardIndices, currentMaybePlayableCardIndices)
  ) {
    lastMaybePlayableCardIndices = currentMaybePlayableCardIndices.slice();
    const iteratedMaybePlayable = currentMaybePlayableCardIndices.slice();

    for (const maybePlayableCardIndex of iteratedMaybePlayable) {
      const maybePlayableCard = allHandCards[maybePlayableCardIndex];

      if (
        maybePlayableCard.ownPossibles.every(
          (possible) =>
            layedPlayedCards[possible.color].length === 1 &&
            layedPlayedCards[possible.color][0] + 1 === possible.number
        )
      ) {
        totalLayerCount = (1 + 1 / maybePlayableCard.ownPossibles.length) / 2;
        currentMaybePlayableCardIndices.splice(
          currentMaybePlayableCardIndices.indexOf(maybePlayableCardIndex),
          1
        );

        if (maybePlayableCard.ownPossibles.length === 1) {
          const possible = maybePlayableCard.ownPossibles[0];
          layedPlayedCards[possible.color] = [possible.number];
        } else {
          maybePlayableCard.ownPossibles.forEach(
            (possible) =>
              (layedPlayedCards[possible.color] = [
                ...layedPlayedCards[possible.color],
                possible.number,
              ])
          );
        }
      }
    }
  }

  const nextPlayables = Object.entries(layedPlayedCards)
    .filter(([_, playeds]) => playeds.length === 1)
    .map(([color, playeds]) => {
      let nextPlayable = (playeds[0] + 1) as CardNumber;

      return nextPlayable < CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
        ? new ImmutableCardValue(color as CardColor, nextPlayable)
        : undefined;
    })
    .filter((card): card is ImmutableCardValue => Boolean(card))
    .filter((card) => nonDiscardedCards[hashCard(card)] > 0);

  return { nextPlayables, layerCount: totalLayerCount };
};
