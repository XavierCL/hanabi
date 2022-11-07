import { mapValues } from "lodash";
import { ClueQuery } from "../../../../domain/ImmutableGameState";
import { hashCard } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getKnownCards } from "./getKnownCards";
import { getTouched } from "./getTouched";

export const getTouchedUniquePossibles = (
  newGame: HypotheticalGame,
  newIntent: ClueIntent,
  clue: ClueQuery
): ClueIntent => {
  const game = newGame.restrictPossibles(
    mapValues(newIntent, (intent) => intent!.possibles)
  );
  const touched = getTouched(game, clue);

  // Ignored touched cards since otherwise already clued cards will self restrict themselves out of them
  const knownCards = new Set(
    getKnownCards(
      game,
      touched.map((card) => card.cardId)
    ).map(hashCard)
  );

  const noDuplicates = Object.fromEntries(
    touched.map((card) => {
      const otherTouched = new Set(
        touched
          .filter((t) => t.cardId !== card.cardId)
          // Only taking certain own cards, since otherwise this is exponential mess sudoku
          .filter((t) => t.ownPossibles.length === 1)
          .map((t) => t.ownPossibles[0])
          .map(hashCard)
      );

      return [
        card.cardId,
        card.ownPossibles
          .filter((possible) => !knownCards.has(hashCard(possible)))
          .filter((possible) => !otherTouched.has(hashCard(possible))),
      ];
    })
  );

  // todo remove duplicate from score
  // todo add third card set to hypothetical card, being conventionless ownPossibles
  // Allow duplicates if conventionless points to useless card
  // E.g. pointing to 1s if that is the last one to play

  return {
    ...newIntent,
    ...mapValues(
      noDuplicates,
      (possibles, cardId) =>
        ({ intent: newIntent[cardId]?.intent ?? "save", possibles } as const)
    ),
  };
};
