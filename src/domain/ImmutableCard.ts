import _ from "lodash";
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

export default class ImmutableCard {
  private readonly id: string;
  private readonly color: CardColor;
  private readonly number: CardNumber;
  private readonly clues: { color: boolean; number: boolean };

  static from(color: CardColor, number: CardNumber): ImmutableCard {
    return new ImmutableCard(_.uniqueId(), color, number, {});
  }

  private constructor(
    id: string,
    color: CardColor,
    number: CardNumber,
    clues?: { color?: boolean; number?: boolean }
  ) {
    this.id = id;
    this.color = color;
    this.number = number;
    this.clues = {
      color: clues?.color ?? false,
      number: clues?.number ?? false,
    };
  }

  asOwn(): ImmutableCardView<CardColor | undefined, CardNumber | undefined> {
    return new ImmutableCardView(
      this.id,
      {
        color: this.clues.color ? this.color : undefined,
        number: this.clues.number ? this.number : undefined,
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

  receiveClue(
    clue: { color: CardColor } | { number: CardNumber }
  ): ImmutableCard {
    return new ImmutableCard(this.id, this.color, this.number, {
      color: this.clues.color || ("color" in clue && clue.color === this.color),
      number:
        this.clues.number || ("number" in clue && clue.number === this.number),
    });
  }
}
