import { CardColor, CardNumber } from "../../../../domain/ImmutableCard";
import { ClueQuery } from "../../../../domain/ImmutableGameState";
import HypotheticalCard from "../../hypothetical/HypotheticalCard";
import { HypotheticalGame } from "../../hypothetical/HypotheticalGame";

export const getTouched = (
  newGame: HypotheticalGame,
  clue: ClueQuery
): readonly HypotheticalCard<
  CardColor | undefined,
  CardNumber | undefined
>[] => {
  return newGame.hands[clue.targetPlayerIndex].filter(
    (newCard) =>
      ("color" in clue.interaction &&
        clue.interaction.color === newCard.color) ||
      ("number" in clue.interaction &&
        clue.interaction.number === newCard.number)
  );
};
