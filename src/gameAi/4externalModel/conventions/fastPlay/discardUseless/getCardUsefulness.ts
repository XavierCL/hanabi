import _ from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
  CARD_NUMBERS,
} from "../../../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../../../domain/ImmutableCardValue";
import { hashCard2, hashCard } from "../../../../../domain/utils";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";

export const getCardUsefulness = (
  currentGame: HypotheticalGame
): {
  uselessNumbers: Set<CardNumber>;
  uselessColors: Set<CardColor>;
  uselessCards: readonly ImmutableCardValue[];
  usefulCards: readonly ImmutableCardValue[];
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
  currentGame
    .getKnownDiscard()
    .forEach((card) => (hashToCount[hashCard(card)] -= 1));

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
      _.range(1, Math.min(...number) + 1).map((x) => ({
        color: color as CardColor,
        number: x as CardNumber,
      }))
    )
  );

  const uselessHashes = new Set(uselessCards.map(hashCard));
  const usefulHashToCard: Record<string, ImmutableCardValue> = {};

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
