import { sumBy } from "lodash";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { throwT } from "../aiUtils";
import { playClue } from "./conventions/playClue";
import { expectedMaxScore } from "./scores/expectedMaxScore";
import { Score } from "./scores/score";

export type ClueIntent = Partial<Readonly<Record<string, "play" | "save">>>;

export class SingleModel {
  private readonly playerIndex: number;
  private readonly gameHistory: readonly ImmutableGameView[];
  private readonly clueIntent: ClueIntent;

  constructor(
    playerIndex: number,
    gameHistory: readonly ImmutableGameView[],
    clueIntent: ClueIntent = {}
  ) {
    this.playerIndex = playerIndex;
    this.gameHistory = gameHistory;
    this.clueIntent = clueIntent;
  }

  private fromNextGameHistory(
    nextTurn: ImmutableGameView,
    clueIntent: ClueIntent
  ): SingleModel {
    return new SingleModel(
      this.playerIndex,
      [...this.gameHistory, nextTurn],
      clueIntent
    );
  }

  public observeTurn(nextTurn: ImmutableGameView): SingleModel {
    const conventions = [playClue];
    const gameHistory = [...this.gameHistory, nextTurn];

    const updatedIntent = (() => {
      for (const convention of conventions) {
        const maybeIntent = convention(gameHistory, this.clueIntent);

        if (maybeIntent) return maybeIntent;
      }

      return undefined;
    })();

    return this.fromNextGameHistory(nextTurn, updatedIntent ?? this.clueIntent);
  }

  // Play and discard properly using convention class canPlay() and dependentCardCount()
  // Problem: playActionTurn is more direct but less powerful than getScore recursive, and duplicates the own action play behavior
  // It is however required to remove the exponential tree search of getScore - or should I try to code the exponential search anyway? No
  // GetScore and action turn behavior should be duplicated to allow derogations from expected behavior, such as clue giving or sub optimal move chop move
  // Todo add discard priority (older is better) to score
  public playActionTurn(): {
    model: SingleModel;
    state: ImmutableGameView;
    score: Score;
  } {
    return {
      model: this,
      state: this.gameHistory[this.gameHistory.length - 1],
      score: this.getScore(),
    };
  }

  public getScore(): Score {
    const currentGame = this.gameHistory[this.gameHistory.length - 1];
    const cardIdsInHand = new Set(
      currentGame.hands.flatMap((hand) => hand.map((card) => card.cardId))
    );

    return {
      maxScore: expectedMaxScore(currentGame),
      remainingLives: currentGame.remainingLives,
      totalPlayed: sumBy(
        Object.entries(currentGame.playedCards),
        ([_, number]) => number
      ),
      playableCount: Object.keys(this.clueIntent).filter((cardId) =>
        cardIdsInHand.has(cardId)
      ).length,
      leadingMove:
        currentGame.leadingMove ?? throwT("Getting score for root game"),
    };
  }
}
