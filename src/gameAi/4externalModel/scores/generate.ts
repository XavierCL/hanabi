import { max, mean, range, sumBy } from "lodash";
import {
  CardColor,
  CardNumber,
  CARD_COLORS,
} from "../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../domain/ImmutableCardValue";
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
    // todo only count as misled if card is still useful
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
    duplicatedCount: (() => {
      const countByTouched: Record<string, number> = {};

      currentGame.hands
        .flat()
        .filter((card) => card.isClued())
        // Using possibles instead of own possibles
        // Since this uses maximum information to prevent duplications
        // In case of own cards, don't clue other's card that could be the same
        // In case of other's card, allow clues that they don't know is not a duplication
        .flatMap((card) => card.possibles)
        .forEach((card) => {
          if (!(hashCard(card) in countByTouched)) {
            countByTouched[hashCard(card)] = 0;
          }

          ++countByTouched[hashCard(card)];
        });

      Object.entries(currentGame.playedCards)
        .flatMap(([color, numbers]) =>
          range(1, Math.max(...numbers) + 1).map(
            (n) => new ImmutableCardValue(color as CardColor, n as CardNumber)
          )
        )
        .forEach((card) => {
          if (!(hashCard(card) in countByTouched)) {
            countByTouched[hashCard(card)] = 0;
          }

          ++countByTouched[hashCard(card)];
        });

      return Object.values(countByTouched).filter((count) => count > 1).length;
    })(),
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
