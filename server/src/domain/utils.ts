import { CardColor, CardNumber } from "./ImmutableCard";

export const hashCard = (card: { color: CardColor; number: CardNumber }) =>
  JSON.stringify({ color: card.color, number: card.number });

export const hashCard2 = (color: CardColor, number: CardNumber) =>
  JSON.stringify({ color, number });

export const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};
