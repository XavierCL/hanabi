import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { AbstractAi } from "../AbstractAi";
import { SimulationEngine } from "./SimulationEngine";

// Todo
// 1. Finnesses
// 1. Outgoing cards should be considered as unique as well
// 1. Score.next nothing to play discard dangerous

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

    return Object.fromEntries(
      this.engine.models.flatMap((model, modelIndex) =>
        model.gameHistory[model.gameHistory.length - 1].hands[modelIndex]
          .filter((card) => card.cardId in model.clueIntent)
          .map((card) => [
            card.cardId,
            JSON.stringify(model.clueIntent[card.cardId], null, 2),
          ])
      )
    );
  }
}
