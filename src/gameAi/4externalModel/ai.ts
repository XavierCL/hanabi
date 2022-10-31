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
      this.self(gameHistory).observeOthersTurn(
        gameHistory[gameHistory.length - 1]
      )
    );
  }

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {
    return this.self(gameHistory).playOwnTurn(
      gameHistory[gameHistory.length - 1]
    );
  }

  private self(gameHistory: readonly ImmutableGameView[]) {
    return this.engine ?? SimulationEngine.from(gameHistory);
  }
}
