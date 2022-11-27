import { mapValues } from "lodash";
import { hashCard } from "../../../aiUtils";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";
import { ClueIntents } from "../../ai";

export const observeDuplications = (
  gameHistory: readonly HypotheticalGame[],
  oldClueIntent: ClueIntents
): { intents?: ClueIntents; passThrough: boolean } => {
  const currentGame = gameHistory[gameHistory.length - 1];

  const leadingMove = currentGame.leadingMove;
  const leadingInteraction = leadingMove?.interaction;

  if (!leadingInteraction || !leadingMove) {
    return { passThrough: true };
  }

  // Removing duplicates from touched cards
  const discoveredCards = (() => {
    if ("play" in leadingInteraction) {
      return [leadingInteraction.play];
    }

    if ("discard" in leadingInteraction) {
      return leadingInteraction.discard.isClued()
        ? [leadingInteraction.discard]
        : [];
    }

    return currentGame.hands[leadingMove.targetPlayerIndex].filter((card) =>
      card.isClued()
    );
  })();

  // Simplification only remove known card. Could do color and number calculation instead
  const discoveredKeyValues: Partial<Record<string, string>> =
    Object.fromEntries(
      discoveredCards
        .filter(({ possibles }) => possibles.length === 1)
        .map((card) => [card.cardId, hashCard(card.possibles[0])])
    );

  if (Object.keys(discoveredKeyValues).length === 0) {
    return { passThrough: true };
  }

  const discoveredValues = new Set(Object.values(discoveredKeyValues));

  return {
    passThrough: true,
    intents: mapValues(oldClueIntent, (intent, cardId) => ({
      intent: intent?.intent ?? "save",
      possibles: (() => {
        if (!intent) return [];

        const ownCardSoleValue = discoveredKeyValues[cardId];
        discoveredValues.delete(ownCardSoleValue);

        const newPossibles = intent.possibles.filter(
          (possible) => !discoveredValues.has(hashCard(possible))
        );

        if (ownCardSoleValue) discoveredValues.add(ownCardSoleValue);

        return newPossibles;
      })(),
    })),
  };
};
