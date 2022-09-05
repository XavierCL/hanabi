import { CardColor } from "./ImmutableCard";

export default class ImmutableCardView<
  Color extends CardColor | undefined,
  Digit extends number | undefined
> {
  readonly cardId: string;
  readonly color: Color;
  readonly number: Digit;
  readonly colorClued: boolean;
  readonly numberClued: boolean;

  constructor(
    cardId: string,
    { color, number }: { color: Color; number: Digit },
    clues?: { color: boolean; number: boolean }
  ) {
    this.cardId = cardId;
    this.color = color;
    this.number = number;
    this.colorClued = clues?.color ?? false;
    this.numberClued = clues?.number ?? false;
  }
}
