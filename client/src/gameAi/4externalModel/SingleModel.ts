import { mapValues, pick } from "lodash";
import ImmutableCardValue from "../../domain/ImmutableCardValue";
import { ActionQuery } from "../../domain/ImmutableGameState";
import { discardOldestUntouched } from "./conventions/fastPlay/discardOldestUntouched";
import { discardUseless } from "./conventions/fastPlay/discardUseless/discardUseless";
import { playCard } from "./conventions/fastPlay/playCard/playCard";
import { earlyGame5Save } from "./conventions/observe/earlyGame5Save";
import { observeDuplication as observeDuplications } from "./conventions/observe/observeDuplication";
import { playClue } from "./conventions/observe/playClue/playClue";
import { saveClue } from "./conventions/observe/saveClue/saveClue";
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
  public readonly gameHistory: readonly HypotheticalGame[];
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
    const conventions = [
      observeDuplications,
      earlyGame5Save,
      saveClue,
      playClue,
    ];
    const restrictedNextTurn = nextTurn.restrictPossibles(
      this.restrictedPossibles(false)
    );
    const gameHistory = [...this.gameHistory, restrictedNextTurn];

    let updatedIntent = this.clueIntent;
    for (const convention of conventions) {
      const conventionResult = convention(gameHistory, this.clueIntent);
      updatedIntent = conventionResult.intents ?? updatedIntent;

      if (!conventionResult.passThrough) break;
    }

    return this.fromNextGameHistory(nextTurn, updatedIntent);
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

  fastPlay(currentGame: HypotheticalGame): ActionQuery | undefined {
    const ownHand = currentGame.hands[this.playerIndex];

    if (ownHand.length === 0) return undefined;

    const conventions = [playCard, discardUseless, discardOldestUntouched];

    for (const convention of conventions) {
      const move = convention(currentGame, this.playerIndex);

      if (move) return move;
    }

    // fall back discard oldest
    return undefined;
  }
}
