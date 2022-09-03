import { CardColor, CardNumber } from "./ImmutableCard";

export default class ImmutableCardView<
  Color extends CardColor | undefined,
  Digit extends CardNumber | undefined
> {
  readonly cardId: string;
  readonly color: Color;
  readonly number: Digit;

  constructor(
    cardId: string,
    { color, number }: { color: Color; number: Digit }
  ) {
    this.cardId = cardId;
    this.color = color;
    this.number = number;
  }
}
