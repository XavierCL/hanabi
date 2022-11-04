import { mean, sumBy } from "lodash";
import { CARD_COLORS } from "../../../domain/ImmutableCard";
import { MoveView } from "../../../domain/ImmutableGameView";
import { getChop, hashCard, throwT } from "../../aiUtils";
import { getLayeredPlayableHypothetical } from "../conventions/playClue/layeredPlayableHypothetical";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";
import { expectedMaxScore } from "./expectedMaxScore";
import { getSequencePlayableHypothetical } from "./sequencePlayableHypothetical";

export const generate = (history: readonly HypotheticalGame[]) => {
  const inductionStep = history[history.length - 2];
  const currentGame = history[history.length - 1];
  const { layerCount, nextPlayables } =
    getLayeredPlayableHypothetical(currentGame);
  const { sequenceCount } = getSequencePlayableHypothetical(currentGame);

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
    sequencePlayableCount: sequenceCount,
    nextPlayableCount: nextPlayables.length,
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
    hasImproperDiscard: (() => {
      if (!currentGame.leadingMove) return 0;

      if (!("discard" in currentGame.leadingMove.interaction)) return 0;

      const chopInfo = getChop(
        inductionStep.hands[currentGame.leadingMove.targetPlayerIndex]
      );

      if (!chopInfo) return 0;

      return chopInfo.chop.cardId ===
        currentGame.leadingMove.interaction.discard.cardId
        ? 0
        : 1;
    })(),
  };
};

export type Score = ReturnType<typeof generate>;
