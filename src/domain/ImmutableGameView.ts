import _ from "lodash";
import { CardColor, CardNumber } from "./ImmutableCard";
import ImmutableCardView from "./ImmutableCardView";
import { MoveQuery, RemainingClues } from "./ImmutableGameState";

export default class ImmutableGameView {
  readonly remainingClues: RemainingClues;
  readonly hands: readonly (readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[])[];
  readonly currentTurnPlayerIndex: number;
  readonly playedCards: Readonly<Record<CardColor, CardNumber | 0>>;
  readonly fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[];
  readonly discarded: readonly ImmutableCardView<CardColor, CardNumber>[];

  constructor(
    remainingClues: RemainingClues,
    hands: readonly (readonly ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >[])[],
    currentTurnPlayerIndex: number,
    playedCards: Readonly<Record<CardColor, CardNumber | 0>>,
    fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[],
    discarded: readonly ImmutableCardView<CardColor, CardNumber>[]
  ) {
    this.remainingClues = remainingClues;
    this.hands = hands;
    this.currentTurnPlayerIndex = currentTurnPlayerIndex;
    this.playedCards = playedCards;
    this.fullDeck = fullDeck;
    this.discarded = discarded;
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
}
