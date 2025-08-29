import { mean, sum, sumBy } from "lodash";
import { CARD_COLORS } from "../../../../domain/ImmutableCard";
import { hashCard } from "../../../../domain/utils";
import { getPlayableHypothetical } from "../../conventions/fastPlay/playCard/getPlayableHypothetical";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { getAllDangerous } from "./getAllDangerous";

export const generate = (
  nextTurn: HypotheticalGame,
  nextTwoTurn: HypotheticalGame,
  roundTable: HypotheticalGame,
  endGame: HypotheticalGame
) => {
  const previouslyDangerousValues = new Set(
    getAllDangerous(nextTurn).map(hashCard)
  );

  const previouslyDangerousIds = new Set(
    nextTurn.hands
      .flat()
      .filter((card) =>
        card.possibles.every((possible) =>
          previouslyDangerousValues.has(hashCard(possible))
        )
      )
      .map((card) => card.cardId)
  );

  const nextPlayables = getPlayableHypothetical(endGame);
  const touchedCards = nextTurn.hands.flat().filter((card) => card.isClued());

  return {
    remainingLives: endGame.remainingLives,
    playDiscount: endGame.playIntegral,
    dangerousNextTwoTurnDiscardCount: nextTwoTurn.discarded.filter(
      (discarded) => previouslyDangerousIds.has(discarded.cardId)
    ).length,
    dangerousDiscardCount: endGame.discarded.filter((discarded) =>
      previouslyDangerousIds.has(discarded.cardId)
    ).length,
    misledCount: touchedCards.filter((card) => {
      const othersPossible = new Set(card.possibles.map(hashCard));
      const intersectCount = card.ownPossibles.filter((possible) =>
        othersPossible.has(hashCard(possible))
      ).length;

      return intersectCount === 0;
    }).length,
    maxScore: endGame.getMaxScore(),
    roundTablePlayed: sumBy(
      Object.entries(roundTable.playedCards),
      ([_, playeds]) =>
        ((CARD_COLORS.length + 1) * Math.min(...playeds) + mean(playeds)) /
        (CARD_COLORS.length + 2)
    ),
    totalPlayed: sumBy(
      Object.entries(endGame.playedCards),
      ([_, playeds]) =>
        ((CARD_COLORS.length + 1) * Math.min(...playeds) + mean(playeds)) /
        (CARD_COLORS.length + 2)
    ),
    nextPlayableCount: nextPlayables.length,
    totalPossibleCount: sum(
      touchedCards.map((card) => card.ownPossibles.length)
    ),
  };
};

export type Score = ReturnType<typeof generate>;
