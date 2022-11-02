import { mean, sumBy } from "lodash";
import { CARD_COLORS } from "../../../domain/ImmutableCard";
import { throwT } from "../../aiUtils";
import { getLayeredPlayableHypothetical } from "../conventions/playClue/layeredPlayableHypothetical";
import { HypotheticalGame } from "../hypothetical/HypotheticalGame";
import { Score } from "./compare";
import { expectedMaxScore } from "./expectedMaxScore";

export const generate = (currentGame: HypotheticalGame): Score => {
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
      currentGame.leadingMove ?? throwT("Getting score for root game"),
    playableCount: layerCount,
  };
};
