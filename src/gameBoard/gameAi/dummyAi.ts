import ImmutableGameState, { MoveQuery } from "../domain/ImmutableGameState";

const gameAi = (gameHistory: readonly ImmutableGameState[]): MoveQuery =>
  gameHistory[gameHistory.length - 1].getLegalMoves()[0];

export default gameAi;
