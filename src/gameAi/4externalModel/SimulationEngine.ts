import { range, shuffle, sum } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { firstIsBest, Score } from "./scores/score";
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
            gameHistory.map((game) => game.asView(playerIndex))
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
        model.observeTurn(currentGame.asView(playerIndex))
      )
    );
  }

  // todo make sure discount initialization works and is only computed from game not from ai
  public playOwnTurn(currentGame: ImmutableGameView): MoveQuery {
    const legalMoves = shuffle(currentGame.getLegalMoves());
    const result = legalMoves.reduce<
      (Score & { moveQuery: MoveQuery }) | undefined
    >((bestResult, currentMove) => {
      let nextState = currentGame.playInteraction(currentMove);

      const observers = this.models.map((model) =>
        model.observeTurn(nextState.asView(currentMove.targetPlayerIndex))
      );

      let discountedScore = 0;
      const cardCount = sum(nextState.hands.map((hand) => hand.length));

      for (const _simulatedTurn of range(cardCount)) {
        const actionTurn =
          observers[nextState.currentTurnPlayerIndex].playActionTurn();

        nextState = actionTurn.state;
        observers[nextState.currentTurnPlayerIndex] = actionTurn.model;
        discountedScore = discountedScore.add(actionTurn.score);
      }

      if (!bestResult) return discountedScore;

      return firstIsBest(bestResult, discountedScore, currentGame)
        ? bestResult
        : discountedScore;
    }, undefined);

    if (!result) throw new Error("Ai had no legal moves");

    return result.moveQuery;
  }
}
