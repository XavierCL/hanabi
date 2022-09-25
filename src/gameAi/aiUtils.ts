import _ from "lodash";
import { CardColor, CardNumber, CARD_COLORS } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export const hashCard = (card: { color: CardColor; number: CardNumber }) =>
  JSON.stringify({ color: card.color, number: card.number });

export const hashCard2 = (color: CardColor, number: CardNumber) =>
  JSON.stringify({ color, number });

export const getPlayableCards = (
  currentGame: ImmutableGameView,
  _noDuplicate: boolean = false
): { number: CardNumber; color: CardColor }[] =>
  Object.entries(currentGame.playedCards).flatMap(([color, number]) =>
    number < 5
      ? [{ color: color as CardColor, number: (number + 1) as CardNumber }]
      : []
  );

export const getCardUsefulness = (
  currentGame: ImmutableGameView
): {
  uselessNumbers: Set<CardNumber>;
  uselessColors: Set<CardColor>;
  uselessCards: readonly { color: CardColor; number: CardNumber }[];
  usefulCards: readonly { color: CardColor; number: CardNumber }[];
} => {
  const hashToCount = Object.fromEntries(
    CARD_COLORS.flatMap((color) =>
      _.range(1, 6).map<[string, number]>((n) => [
        hashCard2(color, n as CardNumber),
        0,
      ])
    )
  );

  currentGame.fullDeck.forEach((card) => (hashToCount[hashCard(card)] += 1));
  currentGame.discarded.forEach((card) => (hashToCount[hashCard(card)] -= 1));

  const uselessCards = CARD_COLORS.flatMap((color) => {
    const firstMissing = _.range(1, 6).find(
      (number) => hashToCount[hashCard2(color, number as CardNumber)] <= 0
    );

    if (!firstMissing) return [];

    return _.range(firstMissing, 6).map((missingNumber) => ({
      color: color as CardColor,
      number: missingNumber as CardNumber,
    }));
  }).concat(
    Object.entries(currentGame.playedCards).flatMap(([color, number]) =>
      _.range(1, number + 1).map((x) => ({
        color: color as CardColor,
        number: x as CardNumber,
      }))
    )
  );

  const uselessHashes = new Set(uselessCards.map(hashCard));
  const usefulHashToCard: Record<
    string,
    ImmutableCardView<CardColor, CardNumber>
  > = {};

  currentGame.fullDeck.forEach((card) =>
    uselessHashes.has(hashCard(card))
      ? undefined
      : (usefulHashToCard[hashCard(card)] = card)
  );
  const usefulCards = Object.values(usefulHashToCard);

  const isNumberUseful = Object.fromEntries(
    _.range(1, 6).map((number) => [number, false])
  );
  usefulCards.forEach((card) => (isNumberUseful[card.number] = true));
  const uselessNumbers = new Set(
    Object.entries(isNumberUseful)
      .filter(([_number, isUseful]) => !isUseful)
      .map(([number]) => Number(number) as CardNumber)
  );

  const isColorUseful = Object.fromEntries(
    CARD_COLORS.map((color) => [color, false])
  );
  usefulCards.forEach((card) => (isColorUseful[card.color] = true));
  const uselessColors = new Set(
    Object.entries(isColorUseful)
      .filter(([_color, isUseful]) => !isUseful)
      .map(([color]) => color as CardColor)
  );

  return {
    uselessNumbers,
    uselessColors,
    uselessCards,
    usefulCards,
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

// todo should iterate other's possible cards too since this might be a derived pov
export const getPossibleOwnCards = (
  currentGame: ImmutableGameView,
  targetPlayerIndex?: number
): readonly PossibleCards[] => {
  targetPlayerIndex = targetPlayerIndex ?? currentGame.currentTurnPlayerIndex;
  const ownHand = currentGame.hands[targetPlayerIndex];
  const playedCards = Object.entries(currentGame.playedCards).flatMap(
    ([color, playedNumber]) =>
      _.range(1, playedNumber + 1).map((number) => ({ color, number }))
  );

  const othersCards = currentGame.hands
    .filter((_hand, handIndex) => handIndex !== targetPlayerIndex)
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

  let nextPossibleCards = _.range(
    currentGame.hands[targetPlayerIndex].length
  ).map(() => allUnknownCards);

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

export const getChop = (
  currentGame: ImmutableGameView,
  targetPlayerIndex: number
) => {
  const chopIndex =
    currentGame.hands[targetPlayerIndex].length -
    currentGame.hands[targetPlayerIndex]
      .slice()
      .reverse()
      .findIndex((card) => !card.colorClued && !card.numberClued) -
    1;

  if (chopIndex === currentGame.hands[targetPlayerIndex].length) {
    return undefined;
  }

  return {
    index: chopIndex,
    chop: currentGame.hands[targetPlayerIndex][chopIndex],
  };
};

// Return useful cards that only remain in one occurence. Only takes in account the discard.
export const getSingletonCards = (currentGame: ImmutableGameView) => {
  const { usefulCards } = getCardUsefulness(currentGame);

  const hashToCount = Object.fromEntries(
    CARD_COLORS.flatMap((color) =>
      _.range(1, 6).map<[string, number]>((n) => [
        hashCard2(color, n as CardNumber),
        0,
      ])
    )
  );

  currentGame.fullDeck.forEach((card) => (hashToCount[hashCard(card)] += 1));
  currentGame.discarded.forEach((card) => (hashToCount[hashCard(card)] -= 1));

  return usefulCards.filter((card) => hashToCount[hashCard(card)] === 1);
};
