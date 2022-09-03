import ImmutableCard, { CardColor, CardNumber } from "./ImmutableCard";
import ImmutableCardView from "./ImmutableCardView";

export default class ImmutableHand {
  private cards: readonly ImmutableCard[];

  constructor(cards: readonly ImmutableCard[]) {
    this.cards = cards;
  }

  draw(card: ImmutableCard | undefined): ImmutableHand {
    if (!card) return this;

    return new ImmutableHand([card, ...this.cards]);
  }

  asOwn(): readonly ImmutableCardView<
    CardColor | undefined,
    CardNumber | undefined
  >[] {
    return this.cards.map((card) => card.asOwn());
  }

  asOthers(): readonly ImmutableCardView<CardColor, CardNumber>[] {
    return this.cards.map((card) => card.asOthers());
  }

  receiveClue(
    clue: { color: CardColor } | { number: CardNumber }
  ): ImmutableHand {
    return new ImmutableHand(this.cards.map((card) => card.receiveClue(clue)));
  }

  useCard(cardId: string): { card: ImmutableCard; hand: ImmutableHand } {
    const cards = this.cards.slice();
    const cardIndex = cards.findIndex((card) => card.asOwn().cardId === cardId);

    if (cardIndex === -1) {
      throw new Error(`Cannot use card ${cardId}: Not in current hand`);
    }

    const [card] = cards.splice(cardIndex, 1);

    return { card, hand: new ImmutableHand(cards) };
  }
}
