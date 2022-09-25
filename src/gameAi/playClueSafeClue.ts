import _ from "lodash";
import { CardColor, CardNumber, CARD_COLORS } from "../domain/ImmutableCard";
import ImmutableCardView from "../domain/ImmutableCardView";
import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";
import {
  fallbackMove,
  getChop,
  getCardUsefulness,
  getPlayableCards,
  getPossibleOwnCards,
  PossibleCards,
  getSingletonCards,
  hashCard,
} from "./aiUtils";

/*
Ideas:
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
*/

type ClueIntent = {
  intent: "play" | "safe";
  possibles: readonly ImmutableCardView<CardColor, CardNumber>[];
};

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

    const cluedPlayerIndex = currentGame.leadingMove.targetPlayerIndex;

    const chopInfo = getChop(inductionStart, cluedPlayerIndex);

    // Based on the targetted point of view of course
    const targetPovGame = currentGame.asView(cluedPlayerIndex);

    // todo account for no duplicate convention
    const possibleCards = getPossibleOwnCards(targetPovGame, cluedPlayerIndex);

    // if there's a chop, does it touch it?
    if (chopInfo) {
      const chopCard = currentGame.hands[cluedPlayerIndex][chopInfo.index];

      const clueTouchesChop =
        chopCard.color === leadingClue.color ||
        chopCard.number === leadingClue.number;

      if (clueTouchesChop) {
        // Clue touches chop, is this a dangerous card?

        const possibleChopCards = possibleCards[chopInfo.index].possibles;
        const dangerousCards: { color: CardColor; number: CardNumber }[] =
          getSingletonCards(targetPovGame);

        const possibleDangerousCards = possibleChopCards.filter(
          (possibleCard) =>
            dangerousCards.some(
              (dangerousCard) =>
                possibleCard.color === dangerousCard.color &&
                possibleCard.number === dangerousCard.number
            )
        );

        const playableCards = getPlayableCards(targetPovGame);
        const possibleDangerousNonPlayableCards = possibleDangerousCards.filter(
          (card) =>
            !playableCards.some(
              (playableCard) =>
                card.color === playableCard.color &&
                card.number === playableCard.number
            )
        );

        const possiblePlayableCards = possibleChopCards.filter((possible) =>
          playableCards.some(
            (playableCard) =>
              possible.color === playableCard.color &&
              possible.number === playableCard.number
          )
        );

        if (possibleDangerousNonPlayableCards.length) {
          // Clue touches chop and some possible are dangerous and non playable. Safe clue
          this.clueIntent[chopInfo.chop.cardId] = {
            intent: "safe",
            possibles: possibleDangerousNonPlayableCards.concat(
              possiblePlayableCards
            ),
          };

          return;
        }

        // Clue touches chop but no possible are dangerous and non playable. Play clue on chop.
        this.clueIntent[chopInfo.chop.cardId] = {
          intent: "play",
          possibles: possiblePlayableCards,
        };
      }
    }

    // Clue does not touch chop, play clue on most recent
    const mostRecentTouched = inductionStart.hands[cluedPlayerIndex].findIndex(
      (card) =>
        !card.isClued() ??
        (card.color === leadingClue.color || card.number === leadingClue.number)
    );

    if (mostRecentTouched !== -1) {
      this.clueIntent[
        currentGame.hands[cluedPlayerIndex][mostRecentTouched].cardId
      ] = {
        intent: "play",
        possibles: possibleCards[mostRecentTouched].possibles,
      };
    }

    // todo refactor this function
  }

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    // todo make this function
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

    if (currentGame.canDiscard()) {
      return {
        targetPlayerIndex: currentGame.currentTurnPlayerIndex,
        interaction: {
          discard: ownCards[ownCards.length - 1].cardId,
        },
      };
    }

    if (currentGame.canGiveClue()) {
      const bestSaveClue = getSaveClue(currentGame, true);
      if (bestSaveClue) {
        return bestSaveClue;
      }
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

  const isGoodPlayClue = (
    clue: { color: CardColor } | { number: CardNumber },
    targetPlayerIndex: number,
    chopIndex: number | undefined
  ) => {
    const hand = currentGame.hands[targetPlayerIndex];

    if (chopIndex) {
      const chop = hand[chopIndex];
      if (
        ("color" in clue && chop.color === clue.color) ||
        ("number" in clue && chop.number === clue.number)
      ) {
        return false;
      }
    }

    const firstTouched = hand.find(
      (card): card is ImmutableCardView<CardColor, CardNumber> =>
        !card.isClued() &&
        (("color" in clue && clue.color === card.color) ||
          ("number" in clue && clue.number === card.number))
    );

    // todo if other touched are duplicated, this is a bad move

    if (!firstTouched) return false;

    return playableHashes.has(hashCard(firstTouched));
  };

  const getPlayClues = () =>
    currentGame.hands.flatMap((hand, playerIndex) => {
      if (playerIndex === currentGame.currentTurnPlayerIndex) return [];

      const possibleClues = CARD_COLORS.map<
        { color: CardColor } | { number: CardNumber }
      >((color) => ({ color })).concat(
        _.range(1, 6).map((number) => ({ number: number as CardNumber }))
      );

      const chopInfo = getChop(currentGame, playerIndex);

      return possibleClues
        .filter((clue) => isGoodPlayClue(clue, playerIndex, chopInfo?.index))
        .map((clue) => ({ interaction: clue, targetPlayerIndex: playerIndex }));
    });

  const playClues = getPlayClues();

  // Todo sort by lowest then most occurrences of color out
  const shuffledPlayClues = _.shuffle(playClues);

  if (shuffledPlayClues.length) {
    return shuffledPlayClues[0];
  }

  return undefined;
};

const getSaveClue = (
  currentGame: ImmutableGameView,
  desperate: boolean = false
): MoveQuery | undefined => {
  // todo this is currently a play clue
  const playableHashes = new Set(
    getPlayableCards(currentGame, true).map(hashCard)
  );

  const isGoodPlayClue = (
    clue: { color: CardColor } | { number: CardNumber },
    targetPlayerIndex: number,
    chopIndex: number | undefined
  ) => {
    const hand = currentGame.hands[targetPlayerIndex];

    if (chopIndex) {
      const chop = hand[chopIndex];
      if (
        ("color" in clue && chop.color === clue.color) ||
        ("number" in clue && chop.number === clue.number)
      ) {
        return false;
      }
    }

    const firstTouched = hand.find(
      (card): card is ImmutableCardView<CardColor, CardNumber> =>
        !card.isClued() &&
        (("color" in clue && clue.color === card.color) ||
          ("number" in clue && clue.number === card.number))
    );

    // todo if other touched are duplicated, this is a bad move

    if (!firstTouched) return false;

    return playableHashes.has(hashCard(firstTouched));
  };

  const getPlayClues = () =>
    currentGame.hands.flatMap((hand, playerIndex) => {
      if (playerIndex === currentGame.currentTurnPlayerIndex) return [];

      const possibleClues = CARD_COLORS.map<
        { color: CardColor } | { number: CardNumber }
      >((color) => ({ color })).concat(
        _.range(1, 6).map((number) => ({ number: number as CardNumber }))
      );

      const chopInfo = getChop(currentGame, playerIndex);

      return possibleClues
        .filter((clue) => isGoodPlayClue(clue, playerIndex, chopInfo?.index))
        .map((clue) => ({ interaction: clue, targetPlayerIndex: playerIndex }));
    });

  const playClues = getPlayClues();

  // Todo sort by lowest then most occurrences of color out
  const shuffledPlayClues = _.shuffle(playClues);

  if (shuffledPlayClues.length) {
    return shuffledPlayClues[0];
  }

  return undefined;
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
