import { CardColor, CardNumber } from "./ImmutableCard";

export default class ImmutableCardValue {
  readonly color: CardColor;
  readonly number: CardNumber;

  constructor(color: CardColor, number: CardNumber) {
    this.color = color;
    this.number = number;
  }
}
