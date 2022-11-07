import { mapValues, pick } from "lodash";
import ImmutableCardValue from "../../domain/ImmutableCardValue";
import { playClue } from "./conventions/playClue/playClue";
import { saveClue } from "./conventions/saveClue/saveClue";
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
  private readonly gameHistory: readonly HypotheticalGame[];
  public readonly playerIndex: number;
  public readonly clueIntent: ClueIntent;

  constructor(
    playerIndex: number,
    gameHistory: readonly HypotheticalGame[],
    clueIntent: ClueIntent = {}
  ) {
    this.playerIndex = playerIndex;
    this.clueIntent = clueIntent;

    this.gameHistory = gameHistory.length
      ? [
          ...gameHistory,
          gameHistory[gameHistory.length - 1].restrictPossibles(
            this.restrictedPossibles(false)
          ),
        ]
      : [];
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
    const conventions = [saveClue, playClue];
    const restrictedNextTurn = nextTurn.restrictPossibles(
      this.restrictedPossibles(false)
    );
    const gameHistory = [...this.gameHistory, restrictedNextTurn];

    const updatedIntent = (() => {
      for (const convention of conventions) {
        const maybeIntent = convention(gameHistory, this.clueIntent);

        if (maybeIntent) return maybeIntent;
      }

      return undefined;
    })();

    return this.fromNextGameHistory(nextTurn, updatedIntent ?? this.clueIntent);
  }

  public restrictedPossibles(
    ownOnly: boolean
  ): Partial<Record<string, readonly ImmutableCardValue[]>> {
    const shownClues = ownOnly
      ? pick(
          this.clueIntent,
          this.gameHistory[this.gameHistory.length - 1].hands[
            this.playerIndex
          ].map((card) => card.cardId)
        )
      : this.clueIntent;

    return mapValues(shownClues, (intent) => intent?.possibles);
  }
}
