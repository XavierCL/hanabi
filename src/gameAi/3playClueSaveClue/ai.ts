import _ from "lodash";
import { CardColor, CardNumber } from "../../domain/ImmutableCard";
import ImmutableCardView from "../../domain/ImmutableCardView";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView, { OthersHand } from "../../domain/ImmutableGameView";
import {
  ClueIntent,
  fallbackMove,
  getCardUsefulness,
  getChop,
  getFocus,
  getLayeredPlayableCards,
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

// Addition of layered play clues

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

    // Based on the targetted point of view of course
    const oldTargetPovGame = inductionStart.asView(cluedPlayerIndex);
    const oldTargetPovHand = oldTargetPovGame.hands[cluedPlayerIndex];
    const newTargetPovGame = currentGame.asView(cluedPlayerIndex);

    // todo account for no duplicate convention
    const possibleCards = getPossibleOwnCards(
      newTargetPovGame,
      cluedPlayerIndex
    );

    const {
      index: focusIndex,
      isChop: isChopFocus,
      wasUntouched: focusWasUntouched,
    } = getFocus(oldTargetPovHand, leadingClue);

    const maybePlayableCards = new Set(
      getLayeredPlayableCards(oldTargetPovGame, this.clueIntent, false).map(
        hashCard
      )
    );

    const focusPossibleCards = possibleCards[focusIndex].possibles;

    const possiblePlayableCards = focusPossibleCards.filter((possible) =>
      maybePlayableCards.has(hashCard(possible))
    );

    // Clue touches chop, is this a dangerous card?
    if (isChopFocus) {
      const dangerousCards = new Set(
        getSingletonCards(newTargetPovGame).map(hashCard)
      );

      const possibleDangerousCards = focusPossibleCards.filter((possibleCard) =>
        dangerousCards.has(hashCard(possibleCard))
      );

      const certainPlayableCards = new Set(
        getLayeredPlayableCards(oldTargetPovGame, this.clueIntent, true).map(
          hashCard
        )
      );

      const possibleDangerousNonPlayableCards = possibleDangerousCards.filter(
        (card) => !certainPlayableCards.has(hashCard(card))
      );

      if (possibleDangerousNonPlayableCards.length) {
        // Clue touches chop and some possible are dangerous and non playable. Safe clue

        return new GameAi({
          ...this.clueIntent,
          [oldTargetPovHand[focusIndex].cardId]: {
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
        [oldTargetPovHand[focusIndex].cardId]: {
          intent: "play",
          possibles: possiblePlayableCards,
        },
      });
    }

    if (focusWasUntouched) {
      return new GameAi({
        ...this.clueIntent,
        [currentGame.hands[cluedPlayerIndex][focusIndex].cardId]: {
          intent: "play",
          possibles: possiblePlayableCards,
        },
      });
    }

    return this;
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
      const bestPlayClue = getPlayClue(currentGame, this.clueIntent);
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
  ].find((card, cardIndex) => {
    const possibleHashes = new Set(ownCards[cardIndex].possibles.map(hashCard));

    return (
      card.cardId in clueIntents &&
      clueIntents[card.cardId].intent === "play" &&
      // todo every instead of some, and update intent possible with other intent possible in observer
      clueIntents[card.cardId].possibles.some(
        (card) =>
          possibleHashes.has(hashCard(card)) &&
          playableHashes.has(hashCard(card))
      )
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

const getPlayClue = (
  currentGame: ImmutableGameView,
  clueIntent: Readonly<Record<string, ClueIntent>>
): MoveQuery | undefined => {
  const playableHashes = new Set(
    getLayeredPlayableCards(currentGame, clueIntent, true).map(hashCard)
  );

  const isGoodPlayClue = (clue: MoveQuery, targetPlayerIndex: number) => {
    const hand = currentGame.hands[targetPlayerIndex] as OthersHand;
    const focusCard = hand[getFocus(hand, clue.interaction).index];
    return playableHashes.has(hashCard(focusCard));
  };

  const getPlayClues = () =>
    currentGame.hands.flatMap((hand, playerIndex) => {
      if (playerIndex === currentGame.currentTurnPlayerIndex) return [];

      const possibleClues = getPossibleClues(playerIndex, hand as OthersHand);

      return possibleClues.filter((clue) => isGoodPlayClue(clue, playerIndex));
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
