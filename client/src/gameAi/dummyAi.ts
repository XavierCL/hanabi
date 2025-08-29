import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export default class GameAi {
  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): void {}

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    return gameHistory[gameHistory.length - 1].getLegalMoves()[0];
  }
}
