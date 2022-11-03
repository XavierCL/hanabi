import { mean, sumBy } from "lodash";
import { CARD_COLORS } from "../../../domain/ImmutableCard";
import { MoveView } from "../../../domain/ImmutableGameView";
import { hashCard, throwT } from "../../aiUtils";
import { getLayeredPlayableHypothetical } from "../conventions/playClue/layeredPlayableHypothetical";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";
import { expectedMaxScore } from "./expectedMaxScore";

export const generate = (currentGame: HypotheticalGame) => {
  const { layerCount } = getLayeredPlayableHypothetical(currentGame);

  return {
    maxScore: expectedMaxScore(currentGame),
    remainingLives: currentGame.remainingLives,
    totalPlayed: sumBy(
      Object.entries(currentGame.playedCards),
      ([_, playeds]) =>
        ((CARD_COLORS.length + 1) * Math.min(...playeds) + mean(playeds)) /
        (CARD_COLORS.length + 2)
    ),
    leadingMove:
      currentGame.leadingMove ??
      throwT<MoveView>("Getting score for root game"),
    playableCount: layerCount,
    misledCount: currentGame.hands.flat().filter((card) => {
      const othersPossible = new Set(card.possibles.map(hashCard));
      const intersectCount = card.ownPossibles.filter((possible) =>
        othersPossible.has(hashCard(possible))
      ).length;

      return intersectCount === 0;
    }).length,
    misplayCount: currentGame.hands.flat().filter((card) => {
      const othersPossible = new Set(card.possibles.map(hashCard));
      const intersectCount = card.ownPossibles.filter((possible) =>
        othersPossible.has(hashCard(possible))
      ).length;

      return intersectCount === 0 && card.ownPossibles.length > 0;
    }).length,
  };
};

export type Score = ReturnType<typeof generate>;
