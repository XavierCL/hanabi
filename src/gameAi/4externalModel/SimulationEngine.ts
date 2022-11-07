import { range, shuffle } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { HypotheticalGame } from "./hypothetical/HypotheticalGame";
import { firstIsBest } from "./scores/compare";
import { generate, Score } from "./scores/generate";
import { SingleModel } from "./SingleModel";

export class SimulationEngine {
  private readonly models: readonly SingleModel[];

  public static from(
    gameHistory: readonly ImmutableGameView[],
    playerCount: number
  ): SimulationEngine {
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
      this.models.map((model, playerIndex) => {
        const newModel = model.observeTurn(
          HypotheticalGame.fromGameView(currentGame.asView(playerIndex))
        );

        if (
          newModel.playerIndex === currentGame.leadingMove?.targetPlayerIndex
        ) {
          console.log(
            currentGame.hands[newModel.playerIndex].map((card) => [
              card,
              newModel.clueIntent[card.cardId],
            ])
          );
        }

        return newModel;
      })
    );
  }

  // todo make sure discount initialization works and is only computed from game not from ai
  public playOwnTurn(currentGame: ImmutableGameView): MoveQuery {
    const legalMoves = shuffle(currentGame.getLegalMoves());

    const hypothetical = this.models.reduce(
      (currentHypothetical, model) =>
        currentHypothetical.restrictPossibles(model.restrictedPossibles(true)),
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
              .restrictedPossibles(true)
          ),
        nextTurn
      );

      const currentResult = {
        ...generate([hypothetical, finalHypothetical]),
        moveQuery: currentMove,
      };

      if (!bestResult) return currentResult;

      return firstIsBest(bestResult, currentResult)
        ? bestResult
        : currentResult;
    }, undefined);

    if (!result) throw new Error("Ai had no legal moves");

    return result.moveQuery;
  }
}
