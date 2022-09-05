import _ from "lodash";
import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export default class GameAi {
  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): void {}

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    const currentGame = gameHistory[gameHistory.length - 1];
    const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];

    const allPlayableCards = Object.entries(currentGame.playedCards).flatMap(
      ([color, number]) => (number < 5 ? [{ color, number: number + 1 }] : [])
    );

    const playableOwnCard = ownCards.find((card) => {
      if (!card.color || !card.number) return false;

      return allPlayableCards.some(
        (playableCard) =>
          playableCard.color === card.color &&
          playableCard.number === card.number
      );
    });

    if (playableOwnCard) {
      return {
        targetPlayerIndex: currentGame.currentTurnPlayerIndex,
        interaction: {
          play: playableOwnCard.cardId,
        },
      };
    }

    if (currentGame.canDiscard()) {
      const largestUselessNumber = Object.entries(
        currentGame.playedCards
      ).reduce(
        (minUseless, [_, currentPlayed]) =>
          currentPlayed < minUseless ? currentPlayed : minUseless,
        5
      );

      const uselessColors = new Set(
        Object.entries(currentGame.playedCards)
          .filter(([_, number]) => number === 5)
          .map(([color]) => color)
      );

      const uselessCards = Object.entries(currentGame.playedCards).flatMap(
        ([color, number]) => _.range(number).map((x) => ({ color, number: x }))
      );

      const discardableOwnCard = ownCards.find((card) => {
        if (!card.color && !card.number) return false;

        if (card.color) {
          if (uselessColors.has(card.color)) return true;
        }

        if (card.number) {
          if (card.number <= largestUselessNumber) return true;
        }

        if (card.color && card.number) {
          if (
            uselessCards.some(
              (uselessCard) =>
                uselessCard.color === card.color &&
                uselessCard.number === card.number
            )
          ) {
            return true;
          }
        }

        return false;
      });

      if (discardableOwnCard) {
        return {
          targetPlayerIndex: currentGame.currentTurnPlayerIndex,
          interaction: {
            discard: discardableOwnCard.cardId,
          },
        };
      }
    }

    if (currentGame.canGiveClue()) {
      const cardsCanReceiveColorClue = _.shuffle(
        currentGame.hands.flatMap((hand, playerIndex) =>
          playerIndex === currentGame.currentTurnPlayerIndex
            ? []
            : hand
                .filter(
                  (
                    card
                  ): card is ImmutableCardView<
                    CardColor,
                    CardNumber | undefined
                  > => !card.colorClued && Boolean(card.color)
                )
                .map<MoveQuery>((card) => ({
                  targetPlayerIndex: playerIndex,
                  interaction: { color: card.color },
                }))
        )
      );

      if (cardsCanReceiveColorClue.length) {
        return cardsCanReceiveColorClue[0];
      }

      const cardsCanReceiveNumberClue = _.shuffle(
        currentGame.hands.flatMap((hand, playerIndex) =>
          playerIndex === currentGame.currentTurnPlayerIndex
            ? []
            : hand
                .filter(
                  (
                    card
                  ): card is ImmutableCardView<
                    CardColor | undefined,
                    CardNumber
                  > => !card.numberClued && Boolean(card.number)
                )
                .map<MoveQuery>((card) => ({
                  targetPlayerIndex: playerIndex,
                  interaction: { number: card.number },
                }))
        )
      );

      if (cardsCanReceiveNumberClue.length) {
        return cardsCanReceiveNumberClue[0];
      }
    }

    if (currentGame.canDiscard()) {
      const discardCandidate = ownCards.slice().reverse();

      return {
        targetPlayerIndex: currentGame.currentTurnPlayerIndex,
        interaction: {
          discard: (
            discardCandidate.find(
              (card) => !card.colorClued && !card.numberClued
            ) ?? discardCandidate[0]
          ).cardId,
        },
      };
    }

    // Fallback, should never happen really
    return {
      targetPlayerIndex: currentGame.currentTurnPlayerIndex,
      interaction: {
        play: ownCards[0].cardId,
      },
    };
  }
}
