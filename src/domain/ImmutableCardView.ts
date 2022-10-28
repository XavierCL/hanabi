import {
  CardColor,
  CardNumber,
  isCardColor,
  isCardNumber,
} from "./ImmutableCard";
import { MoveQuery } from "./ImmutableGameState";

export default class ImmutableCardView<
  Color extends CardColor | undefined,
  Digit extends number | undefined
> {
  readonly cardId: string;
  readonly color: Color;
  readonly number: Digit;
  readonly colorClued: boolean;
  readonly numberClued: boolean;
  readonly clues: Partial<Readonly<Record<CardNumber | CardColor, boolean>>>;

  constructor(
    cardId: string,
    { color, number }: { color: Color; number: Digit },
    clues?: Partial<Readonly<Record<CardNumber | CardColor, boolean>>>
  ) {
    this.cardId = cardId;
    this.color = color;
    this.number = number;
    this.clues = clues ?? {};

    const positiveClues = Object.entries(this.clues).filter(
      ([_, arity]) => arity
    );

    this.colorClued = positiveClues.some(([clue]) => isCardColor(clue));
    this.numberClued = positiveClues.some(([clue]) =>
      isCardNumber(Number(clue))
    );
  }

  asOwn(): ImmutableCardView<CardColor | undefined, CardNumber | undefined> {
    return new ImmutableCardView(
      this.cardId,
      {
        color: this.colorClued ? this.color : undefined,
        number: this.numberClued
          ? (this.number as CardNumber | undefined)
          : undefined,
      },
      this.clues
    );
  }

  asOthers(): ImmutableCardView<CardColor | undefined, CardNumber | undefined> {
    return this as ImmutableCardView<
      CardColor | undefined,
      CardNumber | undefined
    >;
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
  ): ImmutableCardView<Color, Digit> {
    const receivedColorClue =
      "color" in clue && this.color && clue.color === this.color;
    const receivedNumberClue =
      "number" in clue && this.number && clue.number === this.number;

    return new ImmutableCardView(
      this.cardId,
      { color: this.color, number: this.number },
      {
        ...this.clues,
        ...(receivedColorClue && { color: true }),
        ...(receivedNumberClue && { number: true }),
      }
    );
  }
}
