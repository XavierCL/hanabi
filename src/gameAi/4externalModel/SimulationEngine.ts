import { range, shuffle } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { SingleModel } from "./SingleModel";

type Estimation = ReturnType<SingleModel["getScore"]> & { move: MoveQuery };

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

  public playOwnTurn(currentGame: ImmutableGameView): MoveQuery {
    const legalMoves = shuffle(currentGame.getLegalMoves());
    const result = legalMoves.reduce<Estimation | undefined>(
      (bestResult, currentMove) => {
        const estimation = {
          ...this.models[currentMove.targetPlayerIndex]
            .observeTurn(
              currentGame
                .playInteraction(currentMove)
                .asView(currentMove.targetPlayerIndex)
            )
            .getScore(),
          move: currentMove,
        };

        if (!bestResult) return estimation;

        return this.firstIsBest(bestResult, estimation, currentGame)
          ? bestResult
          : estimation;
      },
      undefined
    );

    if (!result) throw new Error("Ai had no legal moves");

    return result.move;
  }

  private firstIsBest(
    first: Estimation,
    second: Estimation,
    currentGame: ImmutableGameView
  ): boolean {
    if (first.remainingLives > second.remainingLives) return true;
    if (first.remainingLives < second.remainingLives) return false;

    if (first.maxScore > second.maxScore) return true;
    if (first.maxScore < second.maxScore) return false;

    if (first.totalPlayable > second.totalPlayable) return true;
    if (first.totalPlayable < second.totalPlayable) return false;

    if (
      (first.move.targetPlayerIndex +
        this.models.length -
        currentGame.currentTurnPlayerIndex) %
        this.models.length <
      (second.move.targetPlayerIndex +
        this.models.length -
        currentGame.currentTurnPlayerIndex) %
        this.models.length
    ) {
      return true;
    }

    if (
      (first.move.targetPlayerIndex +
        this.models.length -
        currentGame.currentTurnPlayerIndex) %
        this.models.length >
      (second.move.targetPlayerIndex +
        this.models.length -
        currentGame.currentTurnPlayerIndex) %
        this.models.length
    ) {
      return false;
    }

    return true;
  }
}
