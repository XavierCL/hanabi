import ImmutableGameView from "../../domain/ImmutableGameView";

export class SingleModel {
  private readonly playerIndex: number;
  private readonly gameHistory: readonly ImmutableGameView[];

  constructor(playerIndex: number, gameHistory: readonly ImmutableGameView[]) {
    this.playerIndex = playerIndex;
    this.gameHistory = gameHistory;
  }

  private fromNextGameHistory(nextTurn: ImmutableGameView): SingleModel {
    return new SingleModel(this.playerIndex, [...this.gameHistory, nextTurn]);
  }

  public observeTurn(nextTurn: ImmutableGameView): SingleModel {
    return this.fromNextGameHistory(nextTurn);
  }

  public getScore(): {
    maxScore: number;
    remainingLives: number;
    sequencePlayable: number;
    totalPlayable: number;
  } {
    const currentGame = this.gameHistory[this.gameHistory.length - 1];

    return {
      maxScore: currentGame.ma,
    };
  }
}
