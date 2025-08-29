import _ from "lodash";
import ImmutableCardValue from "./ImmutableCardValue";
import ImmutableCardView from "./ImmutableCardView";

export const CARD_COLORS = [
  "red",
  "yellow",
  "blue",
  "green",
  "purple",
] as const;
export type CardColor = "red" | "yellow" | "blue" | "green" | "purple";
export type CardNumber = 1 | 2 | 3 | 4 | 5;
export const CARD_NUMBERS: CardNumber[] = [1, 2, 3, 4, 5];
const CARD_COLOR_SET = new Set(CARD_COLORS);

export const isCardColor = (color: any): color is CardColor =>
  CARD_COLOR_SET.has(color);

export const isCardNumber = (cardNumber: any): cardNumber is CardNumber =>
  typeof cardNumber === "number" && cardNumber > 0 && cardNumber < 6;

export default class ImmutableCard {
  private readonly id: string;
  private readonly color: CardColor;
  private readonly number: CardNumber;
  private readonly clues: Partial<
    Readonly<Record<CardNumber | CardColor, boolean>>
  >;

  static from(color: CardColor, number: CardNumber): ImmutableCard {
    return new ImmutableCard(_.uniqueId(), color, number, {});
  }

  private constructor(
    id: string,
    color: CardColor,
    number: CardNumber,
    clues?: Partial<Readonly<Record<CardNumber | CardColor, boolean>>>
  ) {
    this.id = id;
    this.color = color;
    this.number = number;
    this.clues = clues ?? {};
  }

  asOwn(): ImmutableCardView<CardColor | undefined, CardNumber | undefined> {
    return new ImmutableCardView(
      this.id,
      {
        color: this.color in this.clues ? this.color : undefined,
        number: this.number in this.clues ? this.number : undefined,
      },
      this.clues
    );
  }

  asOthers(): ImmutableCardView<CardColor, CardNumber> {
    return new ImmutableCardView(
      this.id,
      {
        color: this.color,
        number: this.number,
      },
      this.clues
    );
  }

  // Players know the full deck, but not which card id has which color or number, since they know the card id of even face down cards
  asFullDeck(): ImmutableCardValue {
    return new ImmutableCardValue(this.color, this.number);
  }

  receiveClue(
    clue: { color: CardColor } | { number: CardNumber }
  ): ImmutableCard {
    return new ImmutableCard(this.id, this.color, this.number, {
      ...this.clues,
      ...("color" in clue &&
        (clue.color === this.color
          ? Object.fromEntries(
              CARD_COLORS.map((color) =>
                this.color === color ? [color, true] : [color, false]
              )
            )
          : { [clue.color]: false })),
      ...("number" in clue &&
        (clue.number === this.number
          ? Object.fromEntries(
              CARD_NUMBERS.map((number) =>
                this.number === number ? [number, true] : [number, false]
              )
            )
          : { [clue.number]: false })),
    });
  }
}
