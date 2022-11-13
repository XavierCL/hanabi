import { mapValues } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { AbstractAi } from "../AbstractAi";
import { SimulationEngine } from "./SimulationEngine";

export default class GameAi implements AbstractAi {
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

  getInternalInfo(): Record<string, string> | undefined {
    if (!this.engine) return undefined;

    return mapValues(this.engine?.models[0].clueIntent, (intent) =>
      JSON.stringify(intent, null, 2)
    );
  }
}
