import _ from "lodash";
import { CardColor, CardNumber } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";
import {
  fallbackMove,
  getKnownUselessProperties,
  getPlayableCards,
  getPossibleOwnCards,
  PossibleCards,
} from "./aiUtils";

/*
Ideas:
1. Play clue vs Save clue
1. No duplication rule
*/

type ClueIntent = "play" | "safe";

export default class GameAi {
  private clueIntent: Record<string, ClueIntent> = {};

  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): void {
    const currentGame = gameHistory[gameHistory.length - 1];

    if (!currentGame.leadingMove) return;

    const inductionStart = gameHistory[gameHistory.length - 2];

    const leadingMoveInteraction = currentGame.leadingMove.interaction;

    const leadingClue = (() => {
      if ("color" in leadingMoveInteraction) {
        return { color: leadingMoveInteraction.color, number: undefined };
      }

      if ("number" in leadingMoveInteraction) {
        return { number: leadingMoveInteraction.number, color: undefined };
      }

      return undefined;
    })();

    if (!leadingClue) return undefined;

    const chopPosition =
      inductionStart.hands.length -
      inductionStart.hands[currentGame.leadingMove.targetPlayerIndex]
        .slice()
        .reverse()
        .findIndex((card) => !card.colorClued && !card.numberClued) -
      1;

    // if there's a chop, does it touch it?
    if (chopPosition !== inductionStart.hands.length) {
      const chopCard =
        inductionStart.hands[currentGame.leadingMove.targetPlayerIndex][
          chopPosition
        ];

      const clueTouchesChop =
        chopCard.color === leadingClue.color ||
        chopCard.number === leadingClue.number;

      if (clueTouchesChop) {
      }
    }
  }

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    const currentGame = gameHistory[gameHistory.length - 1];
    const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];
    const ownPossibleCards = getPossibleOwnCards(currentGame);

    const playOwnCardQuery = playOwnPlayableCard(currentGame, ownPossibleCards);
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
      const knownUselessCard = getOwnKnownUselessCard(
        currentGame,
        ownPossibleCards
      );
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
  currentGame: ImmutableGameView,
  ownCards: readonly PossibleCards[]
): MoveQuery | undefined => {
  const allPlayableCards = getPlayableCards(currentGame);

  const playableOwnCard = ownCards.find(({ card, possibles }) => {
    if (
      possibles.some((possibleCard) =>
        allPlayableCards.every(
          (playableCard) =>
            possibleCard.color !== playableCard.color ||
            possibleCard.number !== playableCard.number
        )
      )
    ) {
      return false;
    }

    return true;
  });

  if (playableOwnCard) {
    return {
      targetPlayerIndex: currentGame.currentTurnPlayerIndex,
      interaction: {
        play: playableOwnCard.card.cardId,
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
  currentGame: ImmutableGameView,
  ownCards: readonly PossibleCards[]
): MoveQuery | undefined => {
  const { uselessColors, largestUselessNumber, uselessCards } =
    getKnownUselessProperties(currentGame);

  const discardableOwnCard = ownCards.find(({ card, possibles }) => {
    if (
      possibles.every(
        (possibleCard) =>
          uselessColors.has(possibleCard.color) ||
          possibleCard.number <= largestUselessNumber ||
          uselessCards.some(
            (uselessCard) =>
              uselessCard.color === possibleCard.color &&
              uselessCard.number === possibleCard.number
          )
      )
    ) {
      return true;
    }

    return false;
  });

  if (discardableOwnCard) {
    return {
      targetPlayerIndex: currentGame.currentTurnPlayerIndex,
      interaction: {
        discard: discardableOwnCard.card.cardId,
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
