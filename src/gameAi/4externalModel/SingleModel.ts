import { mapValues } from "lodash";
import ImmutableCardValue from "../../domain/ImmutableCardValue";
import { playClue } from "./conventions/playClue/playClue";
import { HypotheticalGame } from "./hypothetical/HypotheticalGame";

export type ClueIntent = Partial<
  Readonly<
    Record<
      string,
      {
        intent: "play" | "save";
        possibles: readonly ImmutableCardValue[];
      }
    >
  >
>;

export class SingleModel {
  private readonly playerIndex: number;
  private readonly gameHistory: readonly HypotheticalGame[];
  private readonly clueIntent: ClueIntent;

  constructor(
    playerIndex: number,
    gameHistory: readonly HypotheticalGame[],
    clueIntent: ClueIntent = {}
  ) {
    this.playerIndex = playerIndex;
    this.gameHistory = gameHistory;
    this.clueIntent = clueIntent;
  }

  private fromNextGameHistory(
    nextTurn: HypotheticalGame,
    clueIntent: ClueIntent
  ): SingleModel {
    return new SingleModel(
      this.playerIndex,
      [...this.gameHistory, nextTurn],
      clueIntent
    );
  }

  public observeTurn(nextTurn: HypotheticalGame): SingleModel {
    const conventions = [playClue];
    const gameHistory = [
      ...this.gameHistory,
      nextTurn.restrictPossibles(this.ownRestrictedPossibles()),
    ];

    const updatedIntent = (() => {
      for (const convention of conventions) {
        const maybeIntent = convention(
          gameHistory,
          this.playerIndex,
          this.clueIntent
        );

        if (maybeIntent) return maybeIntent;
      }

      return undefined;
    })();

    return this.fromNextGameHistory(nextTurn, updatedIntent ?? this.clueIntent);
  }

  public ownRestrictedPossibles(): Partial<
    Record<string, readonly ImmutableCardValue[]>
  > {
    return mapValues(this.clueIntent, (intent) => intent?.possibles);
  }
}
