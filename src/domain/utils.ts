import { CardColor, CardNumber } from "./ImmutableCard";

export const hashCard = (card: { color: CardColor; number: CardNumber }) =>
  JSON.stringify({ color: card.color, number: card.number });

export const hashCard2 = (color: CardColor, number: CardNumber) =>
  JSON.stringify({ color, number });
