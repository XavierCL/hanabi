import _, { zip } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
  CARD_NUMBERS,
} from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery, PlayQuery } from "../domain/ImmutableGameState";
import ImmutableGameView, {
  OthersHand,
  OwnHand,
} from "../domain/ImmutableGameView";

export const hashCard = (card: { color: CardColor; number: CardNumber }) =>
  JSON.stringify({ color: card.color, number: card.number });

export const hashCard2 = (color: CardColor, number: CardNumber) =>
  JSON.stringify({ color, number });

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
      CARD_NUMBERS.map<[string, number]>((n) => [
        hashCard2(color, n as CardNumber),
        0,
      ])
    )
  );

  currentGame.fullDeck.forEach((card) => (hashToCount[hashCard(card)] += 1));
  currentGame.discarded.forEach((card) => (hashToCount[hashCard(card)] -= 1));

  const uselessCards = CARD_COLORS.flatMap((color) => {
    const firstMissing = CARD_NUMBERS.find(
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
    CARD_NUMBERS.map((number) => [number, false])
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

export const getPlayableCards = (
  currentGame: ImmutableGameView,
  _noDuplicate: boolean = false
): { number: CardNumber; color: CardColor }[] => {
  const { uselessColors } = getCardUsefulness(currentGame);
  const usefulColors = CARD_COLORS.filter((color) => !uselessColors.has(color));
  return usefulColors.map((color) => ({
    color,
    number: (currentGame.playedCards[color] + 1) as CardNumber,
  }));
};

export type ClueIntent = {
  intent: "play" | "save";
  possibles: readonly ImmutableCardView<CardColor, CardNumber>[];
};

export const getLayeredPlayableCards = (
  currentGame: ImmutableGameView,
  clueIntent: Readonly<Partial<Record<string, ClueIntent>>>,
  certain = false
) => {
  const immediatePlayableCards = getPlayableCards(currentGame);

  const colorNextPlayable = Object.fromEntries(
    immediatePlayableCards.map(({ color, number }) => [color, number])
  );
  let nextPlayableChanged = true;
  const incrementNextPlayable = (color: CardColor) => {
    if (!(color in colorNextPlayable)) return;

    const nextPlayable = (colorNextPlayable[color] + 1) as CardNumber | 6;
    nextPlayableChanged = true;

    if (nextPlayable === 6) {
      delete colorNextPlayable[color];
      return;
    }

    colorNextPlayable[color] = nextPlayable;
  };

  const deleteNextPlayable = (color: CardColor) => {
    if (!(color in colorNextPlayable)) return;

    delete colorNextPlayable[color];
    nextPlayableChanged = true;
  };

  while (nextPlayableChanged) {
    nextPlayableChanged = false;

    currentGame.hands.flat().forEach((card) => {
      if (
        card.colorClued &&
        card.color &&
        card.numberClued &&
        card.color in colorNextPlayable &&
        colorNextPlayable[card.color] === card.number
      ) {
        incrementNextPlayable(card.color);
        return;
      }

      const cardClueIntent = clueIntent[card.cardId];

      if (cardClueIntent?.intent === "play") {
        const nextPossiblePlayableColors = new Set<CardColor>();
        cardClueIntent.possibles.forEach((card) => {
          if (colorNextPlayable[card.color] === card.number) {
            nextPossiblePlayableColors.add(card.color);
          }
        });

        if (nextPossiblePlayableColors.size === 1) {
          incrementNextPlayable([...nextPossiblePlayableColors][0]);
        } else if (certain) {
          // When getting certain next playable only, and you're not sure about a card, then make all possible color fuzzy
          nextPossiblePlayableColors.forEach((color) =>
            deleteNextPlayable(color)
          );
        } else {
          nextPossiblePlayableColors.forEach((color) =>
            incrementNextPlayable(color)
          );
        }
      }
    });
  }

  return Object.entries(colorNextPlayable).map(([color, number]) => ({
    color: color as CardColor,
    number,
  }));
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

export const getChop = (hand: OwnHand) => {
  const chopIndex =
    hand.length -
    hand
      .slice()
      .reverse()
      .findIndex((card) => !card.colorClued && !card.numberClued) -
    1;

  if (chopIndex === hand.length) {
    return undefined;
  }

  return {
    index: chopIndex,
    chop: hand[chopIndex],
  };
};

// Return useful cards that only remain in one occurence. Only takes in account the discard.
export const getSingletonCards = (currentGame: ImmutableGameView) => {
  const { usefulCards } = getCardUsefulness(currentGame);

  const hashToCount = Object.fromEntries(
    CARD_COLORS.flatMap((color) =>
      CARD_NUMBERS.map<[string, number]>((n) => [
        hashCard2(color, n as CardNumber),
        0,
      ])
    )
  );

  currentGame.fullDeck.forEach((card) => (hashToCount[hashCard(card)] += 1));
  currentGame.discarded.forEach((card) => (hashToCount[hashCard(card)] -= 1));

  return usefulCards.filter((card) => hashToCount[hashCard(card)] === 1);
};

export const getOrderedOtherPlayerIndices = (
  currentGame: ImmutableGameView
): readonly number[] => {
  let checkingPlayerIndex =
    (currentGame.currentTurnPlayerIndex + 1) % currentGame.hands.length;
  const otherIndices = [];

  while (checkingPlayerIndex !== currentGame.currentTurnPlayerIndex) {
    otherIndices.push(checkingPlayerIndex);
    checkingPlayerIndex = (checkingPlayerIndex + 1) % currentGame.hands.length;
  }

  return otherIndices;
};

type OrderedOtherHands = readonly {
  playerIndex: number;
  cards: readonly ImmutableCardView<CardColor, CardNumber>[];
}[];

export const getOrderedOtherHands = (
  currentGame: ImmutableGameView
): OrderedOtherHands =>
  getOrderedOtherPlayerIndices(currentGame).map((playerIndex) => ({
    playerIndex,
    cards: currentGame.hands[playerIndex] as readonly ImmutableCardView<
      CardColor,
      CardNumber
    >[],
  }));

export const getTouchedIndices = (
  hand: OwnHand,
  clue: MoveQuery
): readonly number[] =>
  hand
    .map((card, cardIndex) => ({ card, cardIndex }))
    .filter(
      ({ card }) =>
        ("color" in clue.interaction &&
          card.color === clue.interaction.color) ||
        ("number" in clue.interaction &&
          card.number === clue.interaction.number)
    )
    .map(({ cardIndex }) => cardIndex);

export const getPossibleClues = (
  targetPlayerIndex: number,
  hand: OthersHand
): readonly PlayQuery[] => {
  const allClues = CARD_COLORS.map<PlayQuery>((color) => ({
    targetPlayerIndex,
    interaction: { color },
  })).concat(
    CARD_NUMBERS.map((number) => ({
      targetPlayerIndex,
      interaction: { number: number as CardNumber },
    }))
  );

  return allClues.filter((clue) => getTouchedIndices(hand, clue).length > 0);
};

export const getFocus = (
  oldHand: OwnHand,
  newHand: OwnHand,
  clue: MoveQuery["interaction"]
): { index: number; isChop: boolean; wasUntouched: boolean } => {
  const chopFocus = (() => {
    const oldChop = getChop(oldHand);

    if (!oldChop) return undefined;

    return newHand[oldChop.index].isClued() ? oldChop.index : undefined;
  })();

  if (chopFocus !== undefined) {
    return { index: chopFocus, isChop: true, wasUntouched: true };
  }

  const mostRecentUntouched = zip(oldHand, newHand).findIndex(
    ([oldCard, newCard]) =>
      oldCard && newCard && !oldCard.isClued() && newCard.isClued()
  );

  if (mostRecentUntouched !== -1) {
    return { index: mostRecentUntouched, isChop: false, wasUntouched: true };
  }

  const mostRecent = newHand.findIndex(
    (card) =>
      ("color" in clue && card.color === clue.color) ||
      ("number" in clue && card.number === clue.number)
  );

  return {
    index: mostRecent === -1 ? 0 : mostRecent,
    isChop: false,
    wasUntouched: false,
  };
};
