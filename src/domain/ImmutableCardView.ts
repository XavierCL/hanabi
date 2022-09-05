import {
  CardColor,
  CardNumber,
  isCardColor,
  isCardNumber,
} from "./ImmutableCard";

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
}
