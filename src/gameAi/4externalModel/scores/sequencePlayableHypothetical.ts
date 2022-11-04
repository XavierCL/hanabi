import { clone, groupBy, isEqual, mapValues, range } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_NUMBERS,
} from "../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../domain/ImmutableCardValue";
import { hashCard } from "../../aiUtils";
import HypotheticalCard from "../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";

export const getSequencePlayableHypothetical = (
  game: HypotheticalGame
): { nextPlayables: readonly ImmutableCardValue[]; sequenceCount: number } => {
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

  // Must go card by card, not color by color, because some cards we don't know the color but are still playable on two colors
  const layeredPlayedCards = clone(game.playedCards) as Record<
    CardColor,
    (CardNumber | 0)[]
  >;
  let lastMaybePlayableCardIndices: number[][] = [];
  let nextPlayerToPlay = game.currentTurnPlayerIndex;
  const currentMaybePlayableCardIndices = game.hands.map((hand) =>
    range(hand.length).filter(
      (cardIndex) => hand[cardIndex].possibles.length > 0
    )
  );

  while (
    !isEqual(lastMaybePlayableCardIndices, currentMaybePlayableCardIndices)
  ) {
    lastMaybePlayableCardIndices = clone(currentMaybePlayableCardIndices);
    const iteratedMaybePlayable = clone(currentMaybePlayableCardIndices);
    let currentPlayerPlayed = false;

    for (const maybePlayableCardIndex of iteratedMaybePlayable[
      nextPlayerToPlay
    ]) {
      const maybePlayableCard =
        game.hands[nextPlayerToPlay][maybePlayableCardIndex];

      if (
        maybePlayableCard.ownPossibles.every(
          (possible) =>
            layeredPlayedCards[possible.color].length === 1 &&
            layeredPlayedCards[possible.color][0] + 1 === possible.number
        )
      ) {
        currentPlayerPlayed = true;
        totalLayerCount = (1 + 1 / maybePlayableCard.ownPossibles.length) / 2;
        currentMaybePlayableCardIndices[nextPlayerToPlay].splice(
          currentMaybePlayableCardIndices[nextPlayerToPlay].indexOf(
            maybePlayableCardIndex
          ),
          1
        );

        if (maybePlayableCard.ownPossibles.length === 1) {
          const possible = maybePlayableCard.ownPossibles[0];
          layeredPlayedCards[possible.color] = [possible.number];
        } else {
          maybePlayableCard.ownPossibles.forEach(
            (possible) =>
              (layeredPlayedCards[possible.color] = [
                ...layeredPlayedCards[possible.color],
                possible.number,
              ])
          );
        }

        break;
      }
    }

    if (!currentPlayerPlayed) break;

    nextPlayerToPlay = (nextPlayerToPlay + 1) % game.hands.length;
  }

  const nextPlayables = Object.entries(layeredPlayedCards)
    .filter(([_, playeds]) => playeds.length === 1)
    .map(([color, playeds]) => {
      let nextPlayable = (playeds[0] + 1) as CardNumber;

      return nextPlayable < CARD_NUMBERS[CARD_NUMBERS.length - 1] + 1
        ? new ImmutableCardValue(color as CardColor, nextPlayable)
        : undefined;
    })
    .filter((card): card is ImmutableCardValue => Boolean(card))
    .filter((card) => nonDiscardedCards[hashCard(card)] > 0);

  return { nextPlayables, sequenceCount: totalLayerCount };
};
