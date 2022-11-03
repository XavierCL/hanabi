import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { SimulationEngine } from "./SimulationEngine";

export default class GameAi {
  readonly engine: SimulationEngine | undefined;

  constructor(engine?: SimulationEngine) {
    this.engine = engine;
  }

  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): GameAi {
    return new GameAi(
      this.self(
        gameHistory.slice(0, -1),
        gameHistory[gameHistory.length - 1].hands.length
      ).observeOthersTurn(gameHistory[gameHistory.length - 1])
    );
  }

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    return this.self(
      gameHistory,
      gameHistory[gameHistory.length - 1].hands.length
    ).playOwnTurn(gameHistory[gameHistory.length - 1]);
  }

  private self(gameHistory: readonly ImmutableGameView[], playerCount: number) {
    return this.engine ?? SimulationEngine.from(gameHistory, playerCount);
  }
}
