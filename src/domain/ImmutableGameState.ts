import ImmutableCard, {
  CardColor,
  CardNumber,
  CARD_COLORS,
} from "./ImmutableCard";
import ImmutableHand from "./ImmutableHand";
import _ from "lodash";
import ImmutableGameView from "./ImmutableGameView";

export const MAXIMUM_LIVES = 3;
type RemainingLives = 3 | 2 | 1 | 0;
export type RemainingClues = 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0;

export type MoveQuery = {
  targetPlayerIndex: number;
  interaction:
    | { color: CardColor }
    | { number: CardNumber }
    | { play: string }
    | { discard: string };
};

export type Move = {
  targetPlayerIndex: number;
  interaction:
    | { color: CardColor }
    | { number: CardNumber }
    | { play: ImmutableCard }
    | { discard: ImmutableCard };
};

export default class ImmutableGameState {
  readonly hands: readonly ImmutableHand[];
  readonly currentTurnPlayerIndex: number;
  readonly playedCards: Readonly<Record<CardColor, CardNumber | 0>>;
  readonly discarded: readonly ImmutableCard[];
  readonly remainingLives: RemainingLives;
  readonly remainingClues: RemainingClues;
  readonly leadingMove: Move | undefined;
  readonly lastCardPlayerIndex: number | undefined;

  private readonly remainingDeck: readonly ImmutableCard[];
  private readonly fullDeck: readonly ImmutableCard[];

  static from(numberOfPlayers: number): ImmutableGameState {
    const allNumbersAndQuantities = [
      { number: 1, quantity: 3 },
      { number: 2, quantity: 2 },
      { number: 3, quantity: 2 },
      { number: 4, quantity: 2 },
      { number: 5, quantity: 1 },
    ] as const;

    const fullDeck = _.shuffle(
      CARD_COLORS.flatMap((color) =>
        allNumbersAndQuantities.flatMap(({ number, quantity }) =>
          Array.from({ length: quantity }, (_) =>
            ImmutableCard.from(color, number)
          )
        )
      )
    );

    const startingDeck = fullDeck.slice();

    const emptyHands = Array.from(
      { length: numberOfPlayers },
      (_) => new ImmutableHand([])
    );

    const startingCardsPerHand = (() => {
      if (numberOfPlayers < 4) return 5;

      if (numberOfPlayers < 6) return 4;

      return 3;
    })();

    const hands = _.range(startingCardsPerHand).reduce(
      (oldHands, _) =>
        oldHands.map((oldHand) => {
          const card = startingDeck.pop();

          if (!card) {
            throw new Error(
              "Not enough cards in the deck for the number of players and variant"
            );
          }

          return oldHand.draw(card);
        }),
      emptyHands
    );

    return new ImmutableGameState(
      hands,
      startingDeck,
      fullDeck,
      _.random(0, numberOfPlayers - 1),
      { blue: 0, green: 0, purple: 0, red: 0, yellow: 0 },
      [],
      3,
      8,
      undefined,
      undefined
    );
  }

  private constructor(
    hands: readonly ImmutableHand[],
    remainingDeck: readonly ImmutableCard[],
    fullDeck: readonly ImmutableCard[],
    currentTurnPlayerIndex: number,
    playedCards: Readonly<Record<CardColor, CardNumber | 0>>,
    discarded: readonly ImmutableCard[],
    remainingLives: RemainingLives,
    remainingClues: RemainingClues,
    leadingMove: Move | undefined,
    lastCardPlayerIndex: number | undefined
  ) {
    this.hands = hands;
    this.remainingDeck = remainingDeck;
    this.fullDeck = fullDeck;
    this.currentTurnPlayerIndex = currentTurnPlayerIndex;
    this.playedCards = playedCards;
    this.discarded = discarded;
    this.remainingLives = remainingLives;
    this.remainingClues = remainingClues;
    this.leadingMove = leadingMove;
    this.lastCardPlayerIndex = lastCardPlayerIndex;
  }

  getRemainingDeckLength() {
    return this.remainingDeck.length;
  }

  canDiscard(): boolean {
    return this.remainingClues < 8;
  }

  canGiveClue(): boolean {
    return this.remainingClues > 0;
  }

  isGameOver(): boolean {
    return (
      this.currentTurnPlayerIndex === this.lastCardPlayerIndex ||
      this.remainingLives === 0
    );
  }

  getScore(): number {
    return _.sum(Object.values(this.playedCards));
  }

  getMaxScore(): number {
    const colorToNumberToExists = Object.fromEntries(
      CARD_COLORS.map((color) => [
        color,
        Object.fromEntries(_.range(1, 6).map((number) => [number, false])),
      ])
    );

    this.remainingDeck.forEach(
      (card) =>
        (colorToNumberToExists[card.asOthers().color][card.asOthers().number] =
          true)
    );

    this.hands
      .flatMap((hand) => hand.asOthers())
      .forEach(
        (card) => (colorToNumberToExists[card.color][card.number] = true)
      );

    Object.entries(this.playedCards).forEach(([color, colorStack]) =>
      _.range(1, colorStack + 1).forEach(
        (number) => (colorToNumberToExists[color][number] = true)
      )
    );

    return _.sum(
      CARD_COLORS.map(
        (color) =>
          ((_.sortBy(
            Object.entries(colorToNumberToExists[color]),
            ([number]) => number
          ).find(([_, exists]) => !exists)?.[0] as number | undefined) ?? 6) - 1
      )
    );
  }

  playInteraction(moveQuery: MoveQuery): ImmutableGameState {
    const { targetPlayerIndex, interaction } = moveQuery;

    const newDeck = this.remainingDeck.slice();
    const newPlayed = { ...this.playedCards };
    const discarded = this.discarded.slice();
    let remainingLives = this.remainingLives;
    let remainingClues = this.remainingClues;

    const giveClue = (
      hand: ImmutableHand,
      clue: { color: CardColor } | { number: CardNumber }
    ) => {
      --remainingClues;
      return hand.receiveClue(clue);
    };

    const discardCard = (hand: ImmutableHand, cardId: string) => {
      ++remainingClues;
      let { card: discardedCard, hand: newHand } = hand.useCard(cardId);

      newHand = newHand.draw(newDeck.pop());
      discarded.push(discardedCard);

      return newHand;
    };

    const playCard = (hand: ImmutableHand, cardId: string) => {
      let { card: playedCard, hand: newHand } = hand.useCard(cardId);

      newHand = newHand.draw(newDeck.pop());
      const playedCardView = playedCard.asOthers();

      // Play success
      if (newPlayed[playedCardView.color] === playedCardView.number - 1) {
        if (playedCardView.number === 5) ++remainingClues;

        ++newPlayed[playedCardView.color];

        return newHand;
      }

      // Play failure
      --remainingLives;
      discarded.push(playedCard);

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

    const move = ((): Move => {
      const moveQueryInteraction = moveQuery.interaction;

      if ("color" in moveQueryInteraction || "number" in moveQueryInteraction) {
        return {
          ...moveQuery,
          interaction: moveQueryInteraction,
        };
      }

      if ("play" in moveQueryInteraction) {
        const playedCard = this.fullDeck.find(
          (card) => card.asOthers().cardId === moveQueryInteraction.play
        );

        if (!playedCard) {
          throw new Error(
            `Could not find card ${moveQueryInteraction.play} within deck`
          );
        }

        return {
          ...moveQuery,
          interaction: {
            play: playedCard,
          },
        };
      }

      const discardedCard = this.fullDeck.find(
        (card) => card.asOthers().cardId === moveQueryInteraction.discard
      );

      if (!discardedCard) {
        throw new Error(
          `Could not find card ${moveQueryInteraction.discard} within deck`
        );
      }

      return {
        ...moveQuery,
        interaction: {
          discard: discardedCard,
        },
      };
    })();

    return new ImmutableGameState(
      newHands,
      newDeck,
      this.fullDeck,
      (this.currentTurnPlayerIndex + 1) % this.hands.length,
      newPlayed,
      discarded,
      remainingLives,
      remainingClues,
      move,
      this.lastCardPlayerIndex ?? newDeck.length === 0
        ? this.currentTurnPlayerIndex
        : undefined
    );
  }

  asView(playerIndex: number): ImmutableGameView {
    return new ImmutableGameView(
      this.remainingClues,
      this.hands.map((hand, handIndex) =>
        handIndex === playerIndex ? hand.asOwn() : hand.asOthers()
      ),
      this.currentTurnPlayerIndex,
      this.playedCards
    );
  }
}