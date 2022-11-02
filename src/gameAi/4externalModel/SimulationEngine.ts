import { range, shuffle } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { HypotheticalGame } from "./hypothetical/HypotheticalGame";
import { firstIsBest, Score } from "./scores/compare";
import { generate } from "./scores/generate";
import { SingleModel } from "./SingleModel";

export class SimulationEngine {
  private readonly models: readonly SingleModel[];

  public static from(
    gameHistory: readonly ImmutableGameView[]
  ): SimulationEngine {
    const playerCount = gameHistory[0].hands.length;
    return new SimulationEngine(
      range(playerCount).map(
        (playerIndex) =>
          new SingleModel(
            playerIndex,
            gameHistory.map((game) =>
              HypotheticalGame.fromGameView(game.asView(playerIndex))
            )
          )
      )
    );
  }

  private constructor(models: readonly SingleModel[]) {
    this.models = models;
  }

  public observeOthersTurn(currentGame: ImmutableGameView): SimulationEngine {
    return new SimulationEngine(
      this.models.map((model, playerIndex) =>
        model.observeTurn(
          HypotheticalGame.fromGameView(currentGame.asView(playerIndex))
        )
      )
    );
  }

  // todo make sure discount initialization works and is only computed from game not from ai
  public playOwnTurn(currentGame: ImmutableGameView): MoveQuery {
    const legalMoves = shuffle(currentGame.getLegalMoves());

    const hypothetical = this.models.reduce(
      (currentHypothetical, model) =>
        currentHypothetical.restrictPossibles(model.ownRestrictedPossibles()),
      HypotheticalGame.fromGameView(currentGame)
    );

    const result = legalMoves.reduce<
      (Score & { moveQuery: MoveQuery }) | undefined
    >((bestResult, currentMove) => {
      const nextTurn = hypothetical.playInteraction(currentMove);

      const finalHypothetical = this.models.reduce(
        (currentHypothetical, model, playerIndex) =>
          currentHypothetical.restrictPossibles(
            model
              .observeTurn(nextTurn.asView(playerIndex))
              .ownRestrictedPossibles()
          ),
        nextTurn
      );

      const currentResult = {
        ...generate(finalHypothetical),
        moveQuery: currentMove,
      };

      if (!bestResult) return currentResult;

      return firstIsBest(bestResult, currentResult, currentGame)
        ? bestResult
        : currentResult;
    }, undefined);

    if (!result) throw new Error("Ai had no legal moves");

    return result.moveQuery;
  }
}
