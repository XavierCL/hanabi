import _ from "lodash";
import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";
import { fallbackMove, getCardUsefulness, getPlayableCards } from "./aiUtils";

/*
Ideas:
1. Card elimination process
1. No duplication rule
1. Play clue vs Save clue
*/

export default class GameAi {
  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): void {}

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    const currentGame = gameHistory[gameHistory.length - 1];
    const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];

    const playOwnCardQuery = playOwnPlayableCard(currentGame);
    if (playOwnCardQuery) {
      return playOwnCardQuery;
    }

    if (currentGame.canGiveClue()) {
      const bestClue = getPlayClue(currentGame);
      if (bestClue) {
        return bestClue;
      }
    }

    if (currentGame.canDiscard()) {
      const knownUselessCard = getOwnKnownUselessCard(currentGame);
      if (knownUselessCard) {
        return knownUselessCard;
      }
    }

    if (currentGame.canDiscard()) {
      const ownUntouched = getOwnUntouched(currentGame);
      if (ownUntouched) {
        return ownUntouched;
      }
    }

    if (currentGame.canDiscard()) {
      return {
        targetPlayerIndex: currentGame.currentTurnPlayerIndex,
        interaction: {
          discard: ownCards[ownCards.length - 1].cardId,
        },
      };
    }

    return fallbackMove(currentGame);
  }
}

const playOwnPlayableCard = (
  currentGame: ImmutableGameView
): MoveQuery | undefined => {
  const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];
  const allPlayableCards = getPlayableCards(currentGame);

  const playableOwnCard = ownCards.find((card) => {
    if (!card.color || !card.number) return false;

    return allPlayableCards.some(
      (playableCard) =>
        playableCard.color === card.color && playableCard.number === card.number
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

  return undefined;
};

const getPlayClue = (currentGame: ImmutableGameView): MoveQuery | undefined => {
  const allPlayableCards = getPlayableCards(currentGame);
  const cardsCanReceiveColorClue = currentGame.hands.flatMap(
    (hand, playerIndex) =>
      playerIndex === currentGame.currentTurnPlayerIndex
        ? []
        : hand
            .filter(
              (
                card
              ): card is ImmutableCardView<CardColor, CardNumber | undefined> =>
                !card.colorClued && Boolean(card.color)
            )
            .filter((card) =>
              allPlayableCards.some(
                (playableCard) =>
                  card.color === playableCard.color &&
                  playableCard.number === card.number
              )
            )
            .map<MoveQuery>((card) => ({
              targetPlayerIndex: playerIndex,
              interaction: { color: card.color },
            }))
  );

  const cardsCanReceiveNumberClue = currentGame.hands.flatMap(
    (hand, playerIndex) =>
      playerIndex === currentGame.currentTurnPlayerIndex
        ? []
        : hand
            .filter(
              (
                card
              ): card is ImmutableCardView<CardColor | undefined, CardNumber> =>
                !card.numberClued && Boolean(card.number)
            )
            .filter((card) =>
              allPlayableCards.some(
                (playableCard) =>
                  card.color === playableCard.color &&
                  playableCard.number === card.number
              )
            )
            .map<MoveQuery>((card) => ({
              targetPlayerIndex: playerIndex,
              interaction: { number: card.number },
            }))
  );

  const cardsAndClues = _.shuffle(
    cardsCanReceiveColorClue.concat(cardsCanReceiveNumberClue)
  );

  if (cardsAndClues.length) {
    return cardsAndClues[0];
  }
};

const getOwnKnownUselessCard = (
  currentGame: ImmutableGameView
): MoveQuery | undefined => {
  const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];

  const { uselessColors, uselessNumbers, uselessCards } =
    getCardUsefulness(currentGame);

  const discardableOwnCard = ownCards.find((card) => {
    if (!card.color && !card.number) return false;

    if (card.color) {
      if (uselessColors.has(card.color)) return true;
    }

    if (card.number) {
      if (uselessNumbers.has(card.number)) return true;
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

  return undefined;
};

const getOwnUntouched = (
  currentGame: ImmutableGameView
): MoveQuery | undefined => {
  const discardCandidate = currentGame.hands[currentGame.currentTurnPlayerIndex]
    .slice()
    .reverse();

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
};
