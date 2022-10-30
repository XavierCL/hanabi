import _, { isEqual } from "lodash";
import { CardColor, CardNumber, CARD_COLORS } from "./ImmutableCard";
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
    | { play: ImmutableCardView<CardColor | undefined, CardNumber | undefined> }
    | {
        discard: ImmutableCardView<
          CardColor | undefined,
          CardNumber | undefined
        >;
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
  readonly fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[];
  readonly discarded: readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[];
  readonly leadingMove: MoveView | undefined;

  constructor(
    remainingClues: RemainingClues,
    hands: readonly (readonly ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >[])[],
    currentTurnPlayerIndex: number,
    playedCards: Readonly<Record<CardColor, CardNumber | 0>>,
    fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[],
    discarded: readonly ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >[],
    leadingMove: MoveView | undefined
  ) {
    this.remainingClues = remainingClues;
    this.hands = hands;
    this.currentTurnPlayerIndex = currentTurnPlayerIndex;
    this.playedCards = playedCards;
    this.fullDeck = fullDeck;
    this.discarded = discarded;
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

  playInteraction(moveQuery: MoveQuery): ImmutableGameView {
    if (
      this.getLegalMoves().every((legalMove) => !isEqual(legalMove, moveQuery))
    ) {
      throw new Error("Simulated non legal move");
    }

    const { targetPlayerIndex, interaction } = moveQuery;

    const newPlayed = { ...this.playedCards };
    const discarded = this.discarded.slice();
    let remainingClues = this.remainingClues;
    let interactionCard:
      | ImmutableCardView<CardColor | undefined, CardNumber | undefined>
      | undefined = undefined;

    const giveClue = (
      hand: readonly ImmutableCardView<
        CardColor | undefined,
        CardNumber | undefined
      >[],
      clue: { color: CardColor } | { number: CardNumber }
    ) => {
      --remainingClues;
      return hand.map((card) => card.receiveClue(clue));
    };

    const discardCard = (
      hand: readonly ImmutableCardView<
        CardColor | undefined,
        CardNumber | undefined
      >[],
      cardId: string
    ) => {
      ++remainingClues;
      const discardedIndex = hand.findIndex((card) => card.cardId === cardId);

      if (discardedIndex === -1) {
        throw new Error(`Could not discard non existing card ${cardId}`);
      }

      const discardedCard = hand[discardedIndex];
      interactionCard = discardedCard;
      discarded.push(discardedCard);
      return hand.slice().splice(discardedIndex);
    };

    const playCard = (
      hand: readonly ImmutableCardView<
        CardColor | undefined,
        CardNumber | undefined
      >[],
      cardId: string
    ) => {
      const playedIndex = hand.findIndex((card) => card.cardId === cardId);

      if (playedIndex === -1) {
        throw new Error(`Could not discard non existing card ${cardId}`);
      }

      const playedCardView = hand[playedIndex];
      interactionCard = playedCardView;
      const newHand = hand.slice().splice(playedIndex);

      // Play success if card is possibly playable
      const getSuccessColors = (): CardColor[] => {
        if (playedCardView.color && playedCardView.number) {
          if (newPlayed[playedCardView.color] === playedCardView.number - 1) {
            return [playedCardView.color];
          }

          return [];
        }

        if (playedCardView.color) {
          if (
            newPlayed[playedCardView.color] !== 5 &&
            // If received negative clue this is not playable
            // Clue can't be true and number missing, assuming presence means negative clue
            !(newPlayed[playedCardView.color] + 1 in playedCardView.clues)
          ) {
            return [playedCardView.color];
          }

          return [];
        }

        if (playedCardView.number) {
          const playedCardViewNumber = playedCardView.number;
          return CARD_COLORS.filter(
            (color) =>
              // Clue can't be true and color missing, assuming presence means negative clue.
              !(color in playedCardView.clues) &&
              newPlayed[color] === playedCardViewNumber - 1
          );
        }

        return CARD_COLORS.filter(
          (color) =>
            newPlayed[color] !== 5 &&
            !(color in playedCardView.clues) &&
            !(newPlayed[color] + 1 in playedCardView.clues)
        );
      };

      const successColors = getSuccessColors();

      if (successColors.length === 0) {
        discarded.push(playedCardView);
        return newHand;
      }

      if (successColors.every((color) => newPlayed[color] === 4)) {
        ++remainingClues;
      }

      if (successColors.length === 1) {
        ++newPlayed[successColors[0]];
      }

      return newHand;
    };

    const newHands = this.hands.map((hand, playerIndex) => {
      if (playerIndex !== targetPlayerIndex) return hand;

      if ("color" in interaction || "number" in interaction) {
        return giveClue(hand, interaction);
      }

      if ("discard" in interaction) {
        return discardCard(hand, interaction.discard);
      }

      return playCard(hand, interaction.play);
    });

    const move = ((): MoveView => {
      const moveQueryInteraction = moveQuery.interaction;

      if ("color" in moveQueryInteraction || "number" in moveQueryInteraction) {
        return {
          ...moveQuery,
          interaction: moveQueryInteraction,
        };
      }

      if ("play" in moveQueryInteraction) {
        if (!interactionCard) {
          throw new Error(
            `Could not find card ${moveQueryInteraction.play} within deck`
          );
        }

        return {
          ...moveQuery,
          interaction: {
            play: interactionCard,
          },
        };
      }

      if (!interactionCard) {
        throw new Error(
          `Could not find card ${moveQueryInteraction.discard} within deck`
        );
      }

      return {
        ...moveQuery,
        interaction: {
          discard: interactionCard,
        },
      };
    })();

    return new ImmutableGameView(
      remainingClues,
      newHands,
      (this.currentTurnPlayerIndex + 1) % this.hands.length,
      newPlayed,
      this.fullDeck,
      discarded,
      move
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
      this.leadingMove
    );
  }
}
