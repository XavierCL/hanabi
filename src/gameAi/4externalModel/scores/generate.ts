import { mean, sum, sumBy } from "lodash";
import { CARD_COLORS } from "../../../domain/ImmutableCard";
import { hashCard } from "../../aiUtils";
import { getPlayableHypothetical } from "../conventions/fastPlay/playCard/getPlayableHypothetical";
import { getDangerousCards } from "../conventions/observe/saveClue/getDangerousCards";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";

export const generate = (
  nextTurn: HypotheticalGame,
  endGame: HypotheticalGame
) => {
  const previouslyDangerousValues = new Set(
    getDangerousCards(nextTurn).map(hashCard)
  );

  const previouslyDangerousIds = nextTurn.hands
    .flat()
    .filter((card) =>
      card.possibles.every((possible) =>
        previouslyDangerousValues.has(hashCard(possible))
      )
    )
    .map((card) => card.cardId);

  const nextPlayables = getPlayableHypothetical(endGame);

  return {
    remainingLives: endGame.remainingLives,
    playDiscount: endGame.playIntegral,
    dangerousDiscardDiscount: sumBy(
      previouslyDangerousIds,
      (dangerousId) => endGame.discardTurns[dangerousId] ?? 0
    ),
    misledCount: endGame.discarded.flat().filter((card) => {
      const othersPossible = new Set(card.possibles.map(hashCard));
      const intersectCount = card.ownPossibles.filter((possible) =>
        othersPossible.has(hashCard(possible))
      ).length;

      return intersectCount === 0;
    }).length,
    maxScore: endGame.getMaxScore(),
    totalPlayed: sumBy(
      Object.entries(endGame.playedCards),
      ([_, playeds]) =>
        ((CARD_COLORS.length + 1) * Math.min(...playeds) + mean(playeds)) /
        (CARD_COLORS.length + 2)
    ),
    nextPlayableCount: nextPlayables.length,
    totalPossibleCount: sum(
      endGame.discarded.map((card) => card.ownPossibles.length)
    ),
  };
};

export type Score = ReturnType<typeof generate>;
