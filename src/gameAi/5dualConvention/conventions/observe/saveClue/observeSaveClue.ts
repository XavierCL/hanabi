import { uniqBy } from "lodash";
import ImmutableCardValue from "../../../../../domain/ImmutableCardValue";
import { HypotheticalGame } from "../../../hypothetical/HypotheticalGame";
import { ClueIntents } from "../../../ai";
import { getTouchedUniquePossibles } from "../duplicates/getTouchedUniquePossibles";
import { getHistoryFocus } from "../playClue/getHistoryFocus";
import { getLayeredPlayableHypothetical } from "../playClue/layeredPlayableHypothetical";
import { getDangerousCards } from "./getDangerousCards";
import { hashCard } from "../../../../../domain/utils";

export const observeSaveClue = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntents
): { intents?: ClueIntents; passThrough: boolean } => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return { passThrough: true };

  const {
    newCard: cardFocus,
    oldCard: oldCardFocus,
    targetPlayedIndex,
    isChop,
    leadingClue,
  } = historyFocus;

  if (!isChop) return { passThrough: true };

  const currentGame = gameHistory[gameHistory.length - 1];
  const targetInductionStart =
    gameHistory[gameHistory.length - 2].asView(targetPlayedIndex);
  const targetViewOldCardFocus = oldCardFocus.asOwn();
  const { nextPlayables } =
    getLayeredPlayableHypothetical(targetInductionStart);

  const nextDangerousWith5s = getDangerousCards(
    targetInductionStart,
    // All cards in hand are removed from dangerous, except target card if target player already knew it
    targetViewOldCardFocus.color && targetViewOldCardFocus.number
      ? new ImmutableCardValue(
          targetViewOldCardFocus.color,
          targetViewOldCardFocus.number
        )
      : undefined
  );

  // 5s can't be saved with color
  const nextDangerous =
    "color" in leadingClue.interaction
      ? nextDangerousWith5s.filter((card) => card.number !== 5)
      : nextDangerousWith5s;

  const restrictedCard = cardFocus.restrictPossibles(
    uniqBy([...nextPlayables, ...nextDangerous], hashCard)
  );

  return {
    passThrough: false,
    intents: getTouchedUniquePossibles(
      currentGame,
      {
        ...oldClueIntent,
        [cardFocus.cardId]: {
          intent: "save",
          possibles: restrictedCard.ownPossibles,
        },
      },
      leadingClue
    ),
  };
};
