import _ from "lodash";
import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export const getPlayableCards = (
  currentGame: ImmutableGameView
): { number: CardNumber; color: CardColor }[] =>
  Object.entries(currentGame.playedCards).flatMap(([color, number]) =>
    number < 5
      ? [{ color: color as CardColor, number: (number + 1) as CardNumber }]
      : []
  );

export const getKnownUselessProperties = (
  currentGame: ImmutableGameView
): {
  largestUselessNumber: CardNumber | 0;
  uselessColors: Set<CardColor>;
  uselessCards: readonly { color: CardColor; number: CardNumber }[];
} => {
  const largestUselessNumber = Object.entries(currentGame.playedCards).reduce<
    CardNumber | 0
  >(
    (minUseless, [_, currentPlayed]) =>
      currentPlayed < minUseless ? currentPlayed : minUseless,
    5
  );

  const uselessColors = new Set(
    Object.entries(currentGame.playedCards)
      .filter(([_, number]) => number === 5)
      .map(([color]) => color as CardColor)
  );

  const uselessCards = Object.entries(currentGame.playedCards).flatMap(
    ([color, number]) =>
      _.range(number).map((x) => ({
        color: color as CardColor,
        number: x as CardNumber,
      }))
  );

  return {
    largestUselessNumber,
    uselessColors,
    uselessCards,
  };
};

export const fallbackMove = (currentGame: ImmutableGameView): MoveQuery => ({
  targetPlayerIndex: currentGame.currentTurnPlayerIndex,
  interaction: {
    play: currentGame.hands[currentGame.currentTurnPlayerIndex][0].cardId,
  },
});

export type PossibleCards = {
  card: ImmutableCardView<CardColor | undefined, CardNumber | undefined>;
  possibles: readonly ImmutableCardView<CardColor, CardNumber>[];
};

export const getPossibleOwnCards = (
  currentGame: ImmutableGameView
): readonly PossibleCards[] => {
  const ownHand = currentGame.hands[currentGame.currentTurnPlayerIndex];
  const playedCards = Object.entries(currentGame.playedCards).flatMap(
    ([color, playedNumber]) =>
      _.range(1, playedNumber + 1).map((number) => ({ color, number }))
  );

  const othersCards = currentGame.hands
    .filter(
      (_hand, handIndex) => handIndex !== currentGame.currentTurnPlayerIndex
    )
    .flat()
    .filter(
      (card): card is ImmutableCardView<CardColor, CardNumber> =>
        Boolean(card.color) && Boolean(card.number)
    );

  const allKnownCards = playedCards
    .concat(currentGame.discarded)
    .concat(othersCards);

  const allKnownCardBuilder = allKnownCards;

  const allUnknownCards = currentGame.fullDeck.filter((possibleUnknownCard) => {
    const foundKnownIndex = allKnownCardBuilder.findIndex(
      (knownCard) =>
        knownCard.color === possibleUnknownCard.color &&
        knownCard.number === possibleUnknownCard.number
    );

    if (foundKnownIndex === -1) return true;

    allKnownCardBuilder.splice(foundKnownIndex, 1);

    return false;
  });

  let nextPossibleCards = _.range(currentGame.hands[0].length).map(
    () => allUnknownCards
  );

  let nextCounts = nextPossibleCards.map((cards) => cards.length);
  let previousCounts = undefined;

  while (!_.isEqual(previousCounts, nextCounts)) {
    previousCounts = nextCounts;

    nextPossibleCards = nextPossibleCards.map((possibleCards, cardIndex) => {
      if (possibleCards.length === 1) return possibleCards;

      const cardView = ownHand[cardIndex];

      const newPossibleCards = possibleCards.filter((oldPossibleCard) => {
        const colorClueIsConsistent =
          !(oldPossibleCard.color in cardView.clues) ||
          cardView.clues[oldPossibleCard.color];

        const numberClueIsConsistent =
          !(oldPossibleCard.number in cardView.clues) ||
          cardView.clues[oldPossibleCard.number];

        if (!colorClueIsConsistent || !numberClueIsConsistent) return false;

        return allUnknownCards.some(
          (unknownCard) =>
            unknownCard.color === oldPossibleCard.color &&
            unknownCard.number === oldPossibleCard.number
        );
      });

      if (newPossibleCards.length === 1) {
        const newKnownCard = newPossibleCards[0];
        const newKnownCardIndex = allUnknownCards.findIndex(
          (card) =>
            card.color === newKnownCard.color &&
            card.number === newKnownCard.number
        );
        if (newKnownCardIndex !== -1) {
          allUnknownCards.splice(newKnownCardIndex, 1);
        }
      }

      return newPossibleCards;
    });

    nextCounts = nextPossibleCards.map((cards) => cards.length);
  }

  return nextPossibleCards.map((possibles, cardIndex) => ({
    card: ownHand[cardIndex],
    possibles,
  }));
};
