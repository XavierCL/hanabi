import _ from "lodash";
import { CardColor, CardNumber } from "../../domain/ImmutableCard";
import ImmutableCardView from "../../domain/ImmutableCardView";
import { MoveQuery, ClueQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView, { OthersHand } from "../../domain/ImmutableGameView";
import {
  fallbackMove,
  getCardUsefulness,
  getChop,
  getFocus,
  getOrderedOtherPlayerIndices,
  getPlayableCards,
  getPossibleClues,
  getPossibleOwnCards,
  getSingletonCards,
  hashCard,
  PossibleCards,
} from "../aiUtils";
import getTempoClue from "./tempoMove";

/*
Ideas:
5.5. Default move other than play finess
0.5 Check all cards to save, prioritize play clue on their hand, then save on their hand, then any play clue
1. No duplication rule
5. 5 saves with number only
4. Chop move 5
3. finess
2. Fix clues and acceptable duplication
9. trash clue in early game
10. Clue scoring, ranking, ordering
6. Sub optimal move chop move
6.5 prioritize next person's clue
8. bluff
7. Play ones reverse
8. End game management
*/

// Addition of more tempo moves

type ClueIntent = {
  intent: "play" | "save";
  possibles: readonly ImmutableCardView<CardColor, CardNumber>[];
};

export default class GameAi {
  private readonly clueIntent: Readonly<Record<string, ClueIntent>>;

  public constructor(clueIntent: Readonly<Record<string, ClueIntent>> = {}) {
    this.clueIntent = clueIntent;
  }

  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): GameAi {
    const currentGame = gameHistory[gameHistory.length - 1];

    if (!currentGame.leadingMove) return this;

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

    if (!leadingClue) return this;

    const cluedPlayerIndex = currentGame.leadingMove.targetPlayerIndex;

    const chopInfo = getChop(inductionStart.hands[cluedPlayerIndex]);

    // Based on the targetted point of view of course
    const targetPovGame = currentGame.asView(cluedPlayerIndex);

    // todo account for no duplicate convention
    const possibleCards = getPossibleOwnCards(targetPovGame, cluedPlayerIndex);

    // if there's a chop, does it touch it?
    if (chopInfo) {
      const chopCard = currentGame.hands[cluedPlayerIndex][chopInfo.index];
      const inductionChopCard =
        inductionStart.hands[cluedPlayerIndex][chopInfo.index];

      const clueTouchesChop =
        !inductionChopCard.isClued() && chopCard.isClued();

      if (clueTouchesChop) {
        // Clue touches chop, is this a dangerous card?

        const possibleChopCards = possibleCards[chopInfo.index].possibles;
        const dangerousCards = new Set(
          getSingletonCards(targetPovGame).map(hashCard)
        );

        const possibleDangerousCards = possibleChopCards.filter(
          (possibleCard) => dangerousCards.has(hashCard(possibleCard))
        );

        const playableCards = new Set(
          getPlayableCards(targetPovGame).map(hashCard)
        );

        const possibleDangerousNonPlayableCards = possibleDangerousCards.filter(
          (card) => !playableCards.has(hashCard(card))
        );

        const possiblePlayableCards = possibleChopCards.filter((possible) =>
          playableCards.has(hashCard(possible))
        );

        if (possibleDangerousNonPlayableCards.length) {
          // Clue touches chop and some possible are dangerous and non playable. Safe clue

          return new GameAi({
            ...this.clueIntent,
            [chopInfo.chop.cardId]: {
              intent: "save",
              possibles: possibleDangerousNonPlayableCards.concat(
                possiblePlayableCards
              ),
            },
          });
        }

        // Clue touches chop but no possible are dangerous and non playable. Play clue on chop.
        return new GameAi({
          ...this.clueIntent,
          [chopInfo.chop.cardId]: {
            intent: "play",
            possibles: possiblePlayableCards,
          },
        });
      }
    }

    // Clue does not touch chop, play clue on most recent
    const mostRecentTouched = _.zip(
      inductionStart.hands[cluedPlayerIndex],
      currentGame.hands[cluedPlayerIndex]
    ).findIndex(
      ([inductionCard, currentCard]) =>
        !inductionCard?.isClued() && currentCard?.isClued()
    );

    if (mostRecentTouched !== -1) {
      return new GameAi({
        ...this.clueIntent,
        [currentGame.hands[cluedPlayerIndex][mostRecentTouched].cardId]: {
          intent: "play",
          possibles: possibleCards[mostRecentTouched].possibles,
        },
      });
    }

    return this;

    // todo refactor this function
  }

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    const currentGame = gameHistory[gameHistory.length - 1];
    const ownCards = currentGame.hands[currentGame.currentTurnPlayerIndex];
    const ownPossibleCards = getPossibleOwnCards(currentGame);

    const playSureOwnCardQuery = playSureOwnPlayableCard(
      currentGame,
      ownPossibleCards
    );
    if (playSureOwnCardQuery) {
      return playSureOwnCardQuery;
    }

    const playIntentOwnCardQuery = playIntentOwnPlayableCard(
      currentGame,
      ownPossibleCards,
      this.clueIntent
    );
    if (playIntentOwnCardQuery) {
      return playIntentOwnCardQuery;
    }

    if (currentGame.canGiveClue()) {
      const bestPlayClue = getPlayClue(currentGame);
      if (bestPlayClue) {
        return bestPlayClue;
      }

      const bestSaveClue = getSaveClue(currentGame);
      if (bestSaveClue) {
        return bestSaveClue;
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

    if (currentGame.canGiveClue()) {
      const bestTempoClue = getTempoClue(currentGame);
      if (bestTempoClue) {
        return bestTempoClue;
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

const playSureOwnPlayableCard = (
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

const playIntentOwnPlayableCard = (
  currentGame: ImmutableGameView,
  ownCards: readonly PossibleCards[],
  clueIntents: Record<string, ClueIntent>
): MoveQuery | undefined => {
  const allPlayableCards = getPlayableCards(currentGame);
  const playableHashes = new Set(allPlayableCards.map(hashCard));

  const playableOwnCard = currentGame.hands[
    currentGame.currentTurnPlayerIndex
  ].find(
    (card, cardIndex) =>
      card.cardId in clueIntents &&
      clueIntents[card.cardId].intent === "play" &&
      ownCards[cardIndex].possibles.some((possibleCard) =>
        playableHashes.has(hashCard(possibleCard))
      )
  );

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
  const playableHashes = new Set(
    getPlayableCards(currentGame, true).map(hashCard)
  );

  const isGoodPlayClue = (clue: ClueQuery, hand: OthersHand) => {
    const cluedHand = hand.map((card) => card.receiveClue(clue.interaction));
    const focusCard = hand[getFocus(hand, cluedHand, clue.interaction).index];
    return playableHashes.has(hashCard(focusCard));
  };

  const getPlayClues = () =>
    currentGame.hands.flatMap((hand, playerIndex) => {
      if (playerIndex === currentGame.currentTurnPlayerIndex) return [];
      const othersHand = hand as OthersHand;

      const possibleClues = getPossibleClues(playerIndex, hand as OthersHand);

      return possibleClues.filter((clue) => isGoodPlayClue(clue, othersHand));
    });

  const playClues = getPlayClues();

  // Todo sort by lowest then most occurrences of color out
  const shuffledPlayClues = _.shuffle(playClues);

  if (shuffledPlayClues.length) {
    return shuffledPlayClues[0];
  }

  return undefined;
};

const getSaveClue = (currentGame: ImmutableGameView): MoveQuery | undefined => {
  const dangerousCardHashes = new Set(
    getSingletonCards(currentGame).map(hashCard)
  );

  const getSaveClueForPlayer = (playerIndex: number) => {
    const chop = getChop(currentGame.hands[playerIndex]);

    if (!chop) return undefined;

    const hand = currentGame.hands[playerIndex] as readonly ImmutableCardView<
      CardColor,
      CardNumber
    >[];

    if (!dangerousCardHashes.has(hashCard(hand[chop.index]))) {
      return undefined;
    }

    return _.shuffle<MoveQuery>([
      {
        interaction: { color: hand[chop.index].color },
        targetPlayerIndex: playerIndex,
      },
      {
        interaction: { number: hand[chop.index].number },
        targetPlayerIndex: playerIndex,
      },
    ])[0];
  };

  return getOrderedOtherPlayerIndices(currentGame)
    .map((playerIndex) => getSaveClueForPlayer(playerIndex))
    .find((clue) => clue);
};

const getOwnKnownUselessCard = (
  currentGame: ImmutableGameView,
  ownCards: readonly PossibleCards[]
): MoveQuery | undefined => {
  const { uselessColors, uselessNumbers, uselessCards } =
    getCardUsefulness(currentGame);

  const discardableOwnCard = ownCards.find(({ card, possibles }) => {
    if (
      possibles.every(
        (possibleCard) =>
          uselessColors.has(possibleCard.color) ||
          uselessNumbers.has(possibleCard.number) ||
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
