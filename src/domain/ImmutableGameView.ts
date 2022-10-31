import _, { isEqual } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
  CARD_NUMBERS,
} from "./ImmutableCard";
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
  readonly fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[];
  readonly discarded: readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[];
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
    fullDeck: readonly ImmutableCardView<CardColor, CardNumber>[],
    discarded: readonly ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >[],
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
    this.getKnownDiscard().forEach(
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

  public getKnownDiscard(): readonly ImmutableCardView<
    CardColor,
    CardNumber
  >[] {
    return this.discarded.filter(
      (card): card is ImmutableCardView<CardColor, CardNumber> =>
        Boolean(card.color && card.number)
    );
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
    let remainingLives = this.remainingLives;
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

      if (
        playedCardView.color &&
        playedCardView.number &&
        newPlayed[playedCardView.color] === playedCardView.number - 1
      ) {
        if (playedCardView.number === 5) ++remainingClues;
        ++newPlayed[playedCardView.color];
      } else {
        discarded.push(playedCardView);
        --remainingLives;
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
      remainingLives,
      move
    );
  }
}
