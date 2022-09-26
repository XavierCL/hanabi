import _ from "lodash";
import { CardColor, CardNumber } from "../../domain/ImmutableCard";
import ImmutableCardView from "../../domain/ImmutableCardView";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import {
  getPlayableCards,
  hashCard,
  getOrderedOtherHands,
  getPossibleClues,
  getCardUsefulness,
  getTouchedIndices,
} from "../aiUtils";

const getTempoClue = (
  currentGame: ImmutableGameView
): MoveQuery | undefined => {
  const playableCards = new Set(getPlayableCards(currentGame).map(hashCard));
  const otherHands: readonly {
    playerIndex: number;
    cards: readonly ImmutableCardView<CardColor, CardNumber>[];
  }[] = getOrderedOtherHands(currentGame);
  const handsPossibleClues: readonly (readonly MoveQuery[])[] = otherHands.map(
    (hand) => getPossibleClues(hand.playerIndex, hand.cards)
  );
  const { uselessCards, uselessColors, uselessNumbers } =
    getCardUsefulness(currentGame);
  const uselessCardSet = new Set(uselessCards.map(hashCard));

  const resolveSemiKnownClues = handsPossibleClues.map(
    (possibleClues, handIndex) =>
      possibleClues.filter((possibleClue) => {
        const previouslyUntouchedIndices = new Set(
          otherHands[handIndex].cards
            .map((card, cardIndex) => ({
              isUntouched: !card.isClued(),
              cardIndex,
            }))
            .filter(({ isUntouched }) => isUntouched)
            .map(({ cardIndex }) => cardIndex)
        );

        const touchedIndices: readonly number[] = getTouchedIndices(
          otherHands[handIndex].cards,
          possibleClue
        );

        return !touchedIndices.some((touchedIndex) =>
          previouslyUntouchedIndices.has(touchedIndex)
        );
      })
  );

  const getTempoSemiKnownPlayClue = () => {
    const foundClues = resolveSemiKnownClues
      .map((possibleClues, handIndex) =>
        possibleClues.filter((possibleClue) => {
          const touchedIndices: readonly number[] = getTouchedIndices(
            otherHands[handIndex].cards,
            possibleClue
          );

          return touchedIndices.some(
            (touchedIndex) =>
              playableCards.has(
                hashCard(otherHands[handIndex].cards[touchedIndex])
              ) &&
              otherHands[handIndex].cards[touchedIndex].addsInformation(
                possibleClue
              )
          );
        })
      )
      .find((semiKnownPlayClues) => semiKnownPlayClues.length > 0);

    if (!foundClues) return undefined;

    return _.shuffle(foundClues)[0];
  };

  const getTempoSemiKnownTrash = () => {
    const foundClues = resolveSemiKnownClues
      .map((possibleClues, handIndex) =>
        possibleClues.filter((possibleClue) => {
          const touchedIndices: readonly number[] = getTouchedIndices(
            otherHands[handIndex].cards,
            possibleClue
          );

          return touchedIndices.some(
            (touchedIndex) =>
              uselessCardSet.has(
                hashCard(otherHands[handIndex].cards[touchedIndex])
              ) &&
              otherHands[handIndex].cards[touchedIndex].addsInformation(
                possibleClue
              )
          );
        })
      )
      .find((semiKnownPlayClues) => semiKnownPlayClues.length > 0);

    if (!foundClues) return undefined;

    return _.shuffle(foundClues)[0];
  };

  const getTempoSemiKnownUseful = () => {
    const foundClues = resolveSemiKnownClues
      .map((possibleClues, handIndex) =>
        possibleClues.filter((possibleClue) => {
          const touchedIndices: readonly number[] = getTouchedIndices(
            otherHands[handIndex].cards,
            possibleClue
          );

          return touchedIndices.some((touchedIndex) =>
            otherHands[handIndex].cards[touchedIndex].addsInformation(
              possibleClue
            )
          );
        })
      )
      .find((semiKnownPlayClues) => semiKnownPlayClues.length > 0);

    if (!foundClues) return undefined;

    return _.shuffle(foundClues)[0];
  };

  const getTempoUnknownTrash = () => {
    const foundClues = handsPossibleClues
      .map((possibleClues) =>
        possibleClues.filter(
          (possibleClue) =>
            ("color" in possibleClue.interaction &&
              uselessColors.has(possibleClue.interaction.color)) ||
            ("number" in possibleClue.interaction &&
              uselessNumbers.has(possibleClue.interaction.number))
        )
      )
      .find((unknownTrash) => unknownTrash.length > 0);

    if (!foundClues) return undefined;

    return _.shuffle(foundClues)[0];
  };

  const getTempoKnownOnly = () => {
    const foundClues = handsPossibleClues
      .map((possibleClues, handIndex) =>
        possibleClues.filter((possibleClue) => {
          const touchedIndices: readonly number[] = getTouchedIndices(
            otherHands[handIndex].cards,
            possibleClue
          );

          return !touchedIndices.some((touchedIndex) =>
            otherHands[handIndex].cards[touchedIndex].addsInformation(
              possibleClue
            )
          );
        })
      )
      .find((knownOnly) => knownOnly.length > 0);

    if (!foundClues) return undefined;

    return _.shuffle(foundClues)[0];
  };

  const tempoPlayClue = getTempoSemiKnownPlayClue();
  if (tempoPlayClue) {
    return tempoPlayClue;
  }

  const tempoSemiKnownTrash = getTempoSemiKnownTrash();
  if (tempoSemiKnownTrash) {
    return tempoSemiKnownTrash;
  }

  const tempoSemiKnownUseful = getTempoSemiKnownUseful();
  if (tempoSemiKnownUseful) {
    return tempoSemiKnownUseful;
  }

  const tempoUnknownTrash = getTempoUnknownTrash();
  if (tempoUnknownTrash) {
    return tempoUnknownTrash;
  }

  const tempoKnownOnly = getTempoKnownOnly();
  if (tempoKnownOnly) {
    return tempoKnownOnly;
  }

  return undefined;
};

export default getTempoClue;
