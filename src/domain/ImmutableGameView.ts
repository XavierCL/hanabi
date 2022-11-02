import _ from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
  CARD_NUMBERS,
} from "./ImmutableCard";
import ImmutableCardValue from "./ImmutableCardValue";
import ImmutableCardView from "./ImmutableCardView";
import { MoveQuery, RemainingClues } from "./ImmutableGameState";

export type OwnHand = readonly ImmutableCardView<
  CardColor | undefined,
  CardNumber | undefined
>[];

export type OthersHand = readonly ImmutableCardView<CardColor, CardNumber>[];

export type MoveView = {
  targetPlayerIndex: number;
  interaction:
    | { color: CardColor }
    | { number: CardNumber }
    | { play: ImmutableCardView<CardColor, CardNumber> }
    | {
        discard: ImmutableCardView<CardColor, CardNumber>;
      };
};

export default class ImmutableGameView {
  readonly remainingClues: RemainingClues;
  readonly hands: readonly (readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[])[];
  readonly currentTurnPlayerIndex: number;
  readonly playedCards: Readonly<Record<CardColor, CardNumber | 0>>;
  readonly fullDeck: readonly ImmutableCardValue[];
  readonly discarded: readonly ImmutableCardView<CardColor, CardNumber>[];
  readonly remainingLives: number;
  readonly leadingMove: MoveView | undefined;

  constructor(
    remainingClues: RemainingClues,
    hands: readonly (readonly ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >[])[],
    currentTurnPlayerIndex: number,
    playedCards: Readonly<Record<CardColor, CardNumber | 0>>,
    fullDeck: readonly ImmutableCardValue[],
    discarded: readonly ImmutableCardView<CardColor, CardNumber>[],
    remainingLives: number,
    leadingMove: MoveView | undefined
  ) {
    this.remainingClues = remainingClues;
    this.hands = hands;
    this.currentTurnPlayerIndex = currentTurnPlayerIndex;
    this.playedCards = playedCards;
    this.fullDeck = fullDeck;
    this.discarded = discarded;
    this.remainingLives = remainingLives;
    this.leadingMove = leadingMove;
  }

  canDiscard(): boolean {
    return this.remainingClues < 8;
  }

  canGiveClue(): boolean {
    return this.remainingClues > 0;
  }

  getLegalMoves(): readonly MoveQuery[] {
    const canDiscard = this.canDiscard();
    const canGiveClue = this.canGiveClue();

    return this.hands.flatMap((hand, playerIndex) => {
      if (playerIndex === this.currentTurnPlayerIndex) {
        return hand
          .flatMap((card) => {
            const interactions: MoveQuery["interaction"][] = [
              { play: card.cardId },
            ];

            if (canDiscard) {
              interactions.push({ discard: card.cardId });
            }

            return interactions;
          })
          .map((interaction) => ({
            targetPlayerIndex: playerIndex,
            interaction,
          }));
      }

      if (!canGiveClue) return [];

      const allColors = _.uniq(hand.map((card) => card.color)).filter(
        (color): color is CardColor => color !== undefined
      );
      const allNumbers = _.uniq(hand.map((card) => card.number)).filter(
        (number): number is CardNumber => number !== undefined
      );

      return [
        ...allColors.map((color) => ({ color })),
        ...allNumbers.map((number) => ({ number })),
      ].map((interaction) => ({ targetPlayerIndex: playerIndex, interaction }));
    });
  }

  getMaxScore(): number {
    const colorToNumberToRemaining = Object.fromEntries(
      CARD_COLORS.map((color) => [
        color,
        Object.fromEntries(CARD_NUMBERS.map((number) => [number, 0])),
      ])
    );

    this.fullDeck.forEach((card) => {
      colorToNumberToRemaining[card.color][card.number] += 1;
    });

    // Can do better using negative clues and remaining count of same property
    this.discarded.forEach(
      (card) => (colorToNumberToRemaining[card.color][card.number] -= 1)
    );

    return _.sum(
      CARD_COLORS.map(
        (color) =>
          ((_.sortBy(
            Object.entries(colorToNumberToRemaining[color]),
            ([number]) => number
          ).find(([_, remaining]) => !Boolean(remaining))?.[0] as
            | number
            | undefined) ?? 6) - 1
      )
    );
  }

  asView(playerIndex: number): ImmutableGameView {
    return new ImmutableGameView(
      this.remainingClues,
      this.hands.map((hand, handIndex) =>
        handIndex === playerIndex
          ? hand.map((card) => card.asOwn())
          : hand.map((card) => card.asOthers())
      ),
      this.currentTurnPlayerIndex,
      this.playedCards,
      this.fullDeck,
      this.discarded,
      this.remainingLives,
      this.leadingMove
    );
  }
}
