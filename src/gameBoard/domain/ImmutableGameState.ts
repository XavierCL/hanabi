import ImmutableCard from "./ImmutableCard";
import ImmutableHand from "./ImmutableHand";
import _ from "lodash";

export default class ImmutableGameState {
  readonly numberOfPlayers: number;
  readonly hands: readonly ImmutableHand[];
  readonly deck: readonly ImmutableCard[];

  constructor(numberOfPlayers: number) {
    this.numberOfPlayers = numberOfPlayers;

    const allColors = ["red", "blue", "white", "green", "yellow"] as const;
    const allNumbersAndQuantities = [
      { number: 1, quantity: 3 },
      { number: 2, quantity: 2 },
      { number: 3, quantity: 2 },
      { number: 4, quantity: 2 },
      { number: 5, quantity: 1 },
    ] as const;

    const startingDeck = _.shuffle(
      allColors.flatMap((color) =>
        allNumbersAndQuantities.flatMap(({ number, quantity }) =>
          Array.from(
            { length: quantity },
            (_) => new ImmutableCard(color, number)
          )
        )
      )
    );

    const startingHands = Array.from(
      { length: numberOfPlayers },
      (_) => new ImmutableHand()
    );

    const startingCardsPerHand = (() => {})();
  }
}
