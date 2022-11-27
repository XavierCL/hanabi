import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { AbstractAi } from "../AbstractAi";
import { SimulationEngine } from "./SimulationEngine";

// Todo
// If I give my own clue, I must take into consideration that my own clued cards are possibly already what I'm going to clue
// However if I observe another's clue, I must take into consideration they know what they're doing ang so allow the clued cards to be of my own's value
// However the core principle of this ai is to observe the game through reciprocal means.
// Me predicting the impact of my clue on the target vs me predicting what information a bystander will observer from my clue have different handling
// Thus this AI has a few flaws

// E.g. AI 0 has 1b untouched, it's AI 1's turn and AI 2 has 1g number play clued.
// AI 1 must give the play clue to AI0, and AI2 must observe that both 1s are playable

// Follow up example
// AI 0 has 1b untouched, it's AI 2's turn and they have 1g number play clued.
// AI2 giving the play clue to AI1 must result in AI2 being confused what the AI1 1 possible values are.

// 1. Finnesses

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

  playOwnTurn(
    gameHistory: readonly ImmutableGameView[],
    isReplay?: boolean
  ): MoveQuery {
    return this.self(
      gameHistory,
      gameHistory[gameHistory.length - 1].hands.length
    ).playOwnTurn(gameHistory[gameHistory.length - 1], isReplay ?? false);
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
