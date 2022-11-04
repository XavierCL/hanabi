import { uniqBy } from "lodash";
import ImmutableCardValue from "../../../../domain/ImmutableCardValue";
import { hashCard } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntent } from "../../SingleModel";
import { getHistoryFocus } from "../playClue/getHistoryFocus";
import { getLayeredPlayableHypothetical } from "../playClue/layeredPlayableHypothetical";
import { getDangerousCards } from "./getDangerousCards";

export const saveClue = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntent
): ClueIntent | undefined => {
  const historyFocus = getHistoryFocus(gameHistory);

  if (!historyFocus) return undefined;

  const {
    newCard: cardFocus,
    oldCard: oldCardFocus,
    targetPlayedIndex,
    isChop,
    leadingClue,
  } = historyFocus;

  if (!isChop) return undefined;

  const inductionStart = gameHistory[gameHistory.length - 2];
  const targetViewOldCardFocus = oldCardFocus.asOwn();
  const { nextPlayables } = getLayeredPlayableHypothetical(inductionStart);

  const nextDangerousWith5s = getDangerousCards(
    inductionStart.asView(targetPlayedIndex),
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
    ...oldClueIntent,
    [cardFocus.cardId]: {
      intent: "save",
      possibles: restrictedCard.possibles,
    },
  };
};
