import {
  CardColor,
  CardNumber,
  isCardColor,
  isCardNumber,
} from "../../../domain/ImmutableCard";
import ImmutableCardValue from "../../../domain/ImmutableCardValue";
import ImmutableCardView from "../../../domain/ImmutableCardView";
import { MoveQuery } from "../../../domain/ImmutableGameState";
import { hashCard } from "../../aiUtils";

export default class HypotheticalCard<
  Color extends CardColor | undefined,
  Digit extends number | undefined
> {
  readonly cardId: string;
  readonly color: Color;
  readonly number: Digit;
  readonly colorClued: boolean;
  readonly numberClued: boolean;
  readonly clues: Partial<Readonly<Record<CardNumber | CardColor, boolean>>>;
  readonly possibles: readonly ImmutableCardValue[];

  public static fromCardView = <
    Color extends CardColor | undefined,
    Digit extends number | undefined
  >(
    card: ImmutableCardView<Color, Digit>,
    possibles: readonly ImmutableCardValue[]
  ) => {
    return new HypotheticalCard(
      card.cardId,
      { color: card.color, number: card.number },
      possibles,
      card.clues
    );
  };

  constructor(
    cardId: string,
    { color, number }: { color: Color; number: Digit },
    possibles: readonly ImmutableCardValue[],
    clues?: Partial<Readonly<Record<CardNumber | CardColor, boolean>>>
  ) {
    this.cardId = cardId;
    this.clues = clues ?? {};
    this.possibles = possibles.filter(
      (card) =>
        (!(card.color in this.clues) || this.clues[card.color]) &&
        (!(card.number in this.clues) || this.clues[card.number]) &&
        (color === undefined || card.color === color) &&
        (number === undefined || card.number === number)
    );

    const positiveClues = Object.entries(this.clues).filter(
      ([_, arity]) => arity
    );

    this.colorClued = positiveClues.some(([clue]) => isCardColor(clue));
    this.numberClued = positiveClues.some(([clue]) =>
      isCardNumber(Number(clue))
    );

    this.color = ((): Color => {
      if (color) return color;

      if (new Set(possibles.map((possible) => possible.color)).size === 1) {
        return possibles[0].color as Color;
      }

      return undefined as Color;
    })();

    this.number = ((): Digit => {
      if (color) return number;

      if (new Set(possibles.map((possible) => possible.number)).size === 1) {
        return possibles[0].number as Digit;
      }

      return undefined as Digit;
    })();
  }

  asOwn(): HypotheticalCard<CardColor | undefined, CardNumber | undefined> {
    return new HypotheticalCard(
      this.cardId,
      {
        color: this.colorClued ? this.color : undefined,
        number: this.numberClued
          ? (this.number as CardNumber | undefined)
          : undefined,
      },
      this.possibles,
      this.clues
    );
  }

  asOthers(): HypotheticalCard<CardColor, CardNumber> {
    return this as HypotheticalCard<CardColor, CardNumber>;
  }

  asView(): ImmutableCardView<Color, Digit> {
    return new ImmutableCardView(
      this.cardId,
      {
        color: this.color,
        number: this.number,
      },
      this.clues
    );
  }

  isClued(): boolean {
    return this.colorClued || this.numberClued;
  }

  addsInformation(possibleClue: MoveQuery): boolean {
    return (
      ("color" in possibleClue.interaction &&
        this.color === possibleClue.interaction.color &&
        !this.colorClued) ||
      ("number" in possibleClue.interaction &&
        this.number === possibleClue.interaction.number &&
        !this.numberClued)
    );
  }

  receiveClue(
    clue: { color: CardColor } | { number: CardNumber }
  ): HypotheticalCard<Color, Digit> {
    const receivedColorClue = "color" in clue && this.color;
    const receivedNumberClue = "number" in clue && this.number;

    return new HypotheticalCard(
      this.cardId,
      { color: this.color, number: this.number },
      this.possibles,
      {
        ...this.clues,
        ...(receivedColorClue && { [clue.color]: clue.color === this.color }),
        ...(receivedNumberClue && {
          [clue.number]: clue.number === this.number,
        }),
      }
    );
  }

  restrictPossibles(
    newPossibles: readonly ImmutableCardValue[]
  ): HypotheticalCard<Color, Digit> {
    const newPossibleSet = new Set(newPossibles.map(hashCard));

    return new HypotheticalCard(
      this.cardId,
      { color: this.color, number: this.number },
      this.possibles.filter((oldPossible) =>
        newPossibleSet.has(hashCard(oldPossible))
      ),
      this.clues
    );
  }
}
