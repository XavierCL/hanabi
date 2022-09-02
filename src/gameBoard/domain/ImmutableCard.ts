export type CardColor = "red" | "white" | "blue" | "green" | "yellow";
export type CardNumber = 1 | 2 | 3 | 4 | 5

export default class ImmutableCard {
  readonly color: string;
  readonly number: number;
  
  constructor (color: CardColor, number: CardNumber) {
    this.color = color;
    this.number = number;
  }
}