import { mean, sumBy } from "lodash";
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
      ([_, playeds]) => mean(playeds)
    ),
    leadingMove:
      currentGame.leadingMove ?? throwT("Getting score for root game"),
    playableCount: layerCount,
  };
};
