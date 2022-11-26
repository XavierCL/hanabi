import _, { isEqual, mapValues, range } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
  CARD_NUMBERS,
} from "../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../domain/ImmutableCardValue";
import ImmutableCardView from "../../../domain/ImmutableCardView";
import { MoveQuery, RemainingClues } from "../../../domain/ImmutableGameState";
import ImmutableGameView from "../../../domain/ImmutableGameView";
import { getPossibleOwnCards } from "../../aiUtils";
import HypotheticalCard from "./HypotheticalCard";

export type HypotheticalMove = {
  targetPlayerIndex: number;
  interaction:
    | { color: CardColor }
    | { number: CardNumber }
    | { play: HypotheticalCard<CardColor | undefined, CardNumber | undefined> }
    | {
        discard: HypotheticalCard<
          CardColor | undefined,
          CardNumber | undefined
        >;
      };
};

export class HypotheticalGame {
  readonly remainingClues: RemainingClues;
  readonly hands: readonly (readonly HypotheticalCard<
    CardColor | undefined,
    CardNumber | undefined
  >[])[];
  readonly currentTurn: number;
  readonly currentTurnPlayerIndex: number;
  readonly playedCards: Readonly<Record<CardColor, (CardNumber | 0)[]>>;
  readonly fullDeck: readonly ImmutableCardValue[];
  readonly discarded: readonly HypotheticalCard<
    CardColor | undefined,
    CardNumber | undefined
  >[];
  readonly remainingLives: number;
  readonly leadingMove: HypotheticalMove | undefined;
  readonly playIntegral: number;
  readonly discardTurns: Record<string, number>;

  public static fromGameView(gameView: ImmutableGameView) {
    const possibles = Object.fromEntries(
      range(gameView.hands.length)
        .flatMap((playerIndex) => getPossibleOwnCards(gameView, playerIndex))
        .map((possible) => [possible.card.cardId, possible.possibles])
    );

    const ownPossibles = Object.fromEntries(
      range(gameView.hands.length)
        .flatMap((playerIndex) =>
          getPossibleOwnCards(gameView.asView(playerIndex), playerIndex)
        )
        .map((possible) => [possible.card.cardId, possible.possibles])
    );

    const makeYourCardComeTrue = (
      card: ImmutableCardView<CardColor | undefined, CardNumber | undefined>
    ): HypotheticalCard<CardColor | undefined, CardNumber | undefined> => {
      return HypotheticalCard.fromCardView(
        card,
        possibles[card.cardId],
        ownPossibles[card.cardId]
      );
    };

    const knownCardToHypothetical = (
      card: ImmutableCardView<CardColor, CardNumber>
    ) =>
      HypotheticalCard.fromCardView(
        card,
        [new ImmutableCardValue(card.color, card.number)],
        [new ImmutableCardValue(card.color, card.number)]
      );

    const leadingMoveInteraction = gameView.leadingMove?.interaction;

    return new HypotheticalGame(
      gameView.remainingClues,
      gameView.hands.map((hand) => hand.map(makeYourCardComeTrue)),
      gameView.currentTurn,
      gameView.currentTurnPlayerIndex,
      mapValues(gameView.playedCards, (number) => [number]),
      gameView.fullDeck,
      gameView.discarded.map(knownCardToHypothetical),
      gameView.remainingLives,
      gameView.leadingMove && leadingMoveInteraction
        ? {
            targetPlayerIndex: gameView.leadingMove.targetPlayerIndex,
            interaction:
              "number" in leadingMoveInteraction ||
              "color" in leadingMoveInteraction
                ? leadingMoveInteraction
                : "discard" in leadingMoveInteraction
                ? {
                    discard: knownCardToHypothetical(
                      leadingMoveInteraction.discard
                    ),
                  }
                : {
                    play: knownCardToHypothetical(leadingMoveInteraction.play),
                  },
          }
        : undefined,
      0,
      {}
    );
  }

  private constructor(
    remainingClues: RemainingClues,
    hands: readonly (readonly HypotheticalCard<
      CardColor | undefined,
      CardNumber | undefined
    >[])[],
    currentTurn: number,
    currentTurnPlayerIndex: number,
    playedCards: Readonly<Record<CardColor, (CardNumber | 0)[]>>,
    fullDeck: readonly ImmutableCardValue[],
    discarded: readonly HypotheticalCard<
      CardColor | undefined,
      CardNumber | undefined
    >[],
    remainingLives: number,
    leadingMove: HypotheticalMove | undefined,
    playIntegral: number,
    discardTurns: Record<string, number>
  ) {
    this.remainingClues = remainingClues;
    this.hands = hands;
    this.currentTurn = currentTurn;
    this.currentTurnPlayerIndex = currentTurnPlayerIndex;
    this.playedCards = playedCards;
    this.fullDeck = fullDeck;
    this.discarded = discarded;
    this.remainingLives = remainingLives;
    this.leadingMove = leadingMove;
    this.playIntegral = playIntegral;
    this.discardTurns = discardTurns;
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
      const allNumbers: CardNumber[] = _.uniq(
        hand.map((card) => card.number)
      ).filter((number): number is CardNumber => number !== undefined);

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

  asView(playerIndex: number): HypotheticalGame {
    return new HypotheticalGame(
      this.remainingClues,
      this.hands.map((hand, handIndex) =>
        handIndex === playerIndex
          ? hand.map((card) => card.asOwn())
          : hand.map((card) => card.asOthers())
      ),
      this.currentTurn,
      this.currentTurnPlayerIndex,
      this.playedCards,
      this.fullDeck,
      this.discarded,
      this.remainingLives,
      this.leadingMove,
      this.playIntegral,
      this.discardTurns
    );
  }

  public getKnownDiscard(): readonly ImmutableCardView<
    CardColor,
    CardNumber
  >[] {
    return this.discarded
      .map((card) => card.asView())
      .filter((card): card is ImmutableCardView<CardColor, CardNumber> =>
        Boolean(card.color && card.number)
      );
  }

  public restrictPossibles(
    possibles: Partial<Record<string, readonly ImmutableCardValue[]>>
  ): HypotheticalGame {
    const restrictCard = (
      card: HypotheticalCard<CardColor | undefined, CardNumber | undefined>
    ): HypotheticalCard<CardColor | undefined, CardNumber | undefined> =>
      possibles[card.cardId]
        ? card.restrictPossibles(possibles[card.cardId]!)
        : card;

    return new HypotheticalGame(
      this.remainingClues,
      this.hands.map((hand) => hand.map(restrictCard)),
      this.currentTurn,
      this.currentTurnPlayerIndex,
      this.playedCards,
      this.fullDeck,
      this.discarded.map(restrictCard),
      this.remainingLives,
      this.leadingMove,
      this.playIntegral,
      this.discardTurns
    );
  }

  skipTurn(): HypotheticalGame {
    return new HypotheticalGame(
      this.remainingClues,
      this.hands,
      this.currentTurn + 1,
      (this.currentTurnPlayerIndex + 1) % this.hands.length,
      this.playedCards,
      this.fullDeck,
      this.discarded,
      this.remainingLives,
      this.leadingMove,
      this.playIntegral,
      this.discardTurns
    );
  }

  playInteraction(
    moveQuery: MoveQuery,
    ignoreIllegal: boolean = false
  ): HypotheticalGame {
    if (
      !ignoreIllegal &&
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
      | HypotheticalCard<CardColor | undefined, CardNumber | undefined>
      | undefined = undefined;

    const giveClue = (
      hand: readonly HypotheticalCard<
        CardColor | undefined,
        CardNumber | undefined
      >[],
      clue: { color: CardColor } | { number: CardNumber }
    ) => {
      --remainingClues;
      return hand.map((card) => card.receiveClue(clue));
    };

    const discardCard = (
      hand: readonly HypotheticalCard<
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

      const newHand = hand.slice();
      const [discardedCard] = newHand.splice(discardedIndex, 1);
      interactionCard = discardedCard;
      discarded.push(discardedCard);
      return newHand;
    };

    const playCard = (
      hand: readonly HypotheticalCard<
        CardColor | undefined,
        CardNumber | undefined
      >[],
      cardId: string
    ) => {
      const playedIndex = hand.findIndex((card) => card.cardId === cardId);

      if (playedIndex === -1) {
        throw new Error(`Could not discard non existing card ${cardId}`);
      }

      const newHand = hand.slice();
      const [playedCardView] = newHand.splice(playedIndex, 1);
      interactionCard = playedCardView;

      // Pessimistic view, if all possibles are playable, then its good
      if (
        playedCardView.possibles.length === 0 ||
        playedCardView.possibles.some(
          (possibleCard) =>
            newPlayed[possibleCard.color].length > 1 ||
            newPlayed[possibleCard.color][0] + 1 !== possibleCard.number
        )
      ) {
        discarded.push(playedCardView);
        --remainingLives;
      } else {
        if (
          playedCardView.possibles.every(
            (possibleCard) => possibleCard.number === 5
          )
        ) {
          ++remainingClues;
        }

        if (playedCardView.possibles.length === 1) {
          const newPlayedColor = playedCardView.possibles[0].color;

          newPlayed[newPlayedColor] = [
            (newPlayed[newPlayedColor][0] + 1) as CardNumber,
          ];
        } else {
          playedCardView.possibles.forEach((possibleCard) => {
            newPlayed[possibleCard.color] = [
              newPlayed[possibleCard.color][0],
              (newPlayed[possibleCard.color][0] + 1) as CardNumber,
            ];
          });
        }
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

    const move = ((): HypotheticalMove => {
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

    return new HypotheticalGame(
      remainingClues,
      newHands,
      this.currentTurn + 1,
      (this.currentTurnPlayerIndex + 1) % this.hands.length,
      newPlayed,
      this.fullDeck,
      discarded,
      remainingLives,
      move,
      this.playIntegral +
        Number("play" in moveQuery.interaction) * this.currentTurn,
      {
        ...this.discardTurns,
        ...("discard" in move.interaction && {
          [move.interaction.discard.cardId]: this.currentTurn,
        }),
      }
    );
  }
}
