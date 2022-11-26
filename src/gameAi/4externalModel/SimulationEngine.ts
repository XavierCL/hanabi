import { isEqual, range, shuffle } from "lodash";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { HypotheticalGame } from "./hypothetical/HypotheticalGame";
import { firstIsBest } from "./scores/compare";
import { generate, Score } from "./scores/generate";
import { SingleModel } from "./SingleModel";

export class SimulationEngine {
  readonly models: readonly SingleModel[];

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
      this.models.map((model, playerIndex) =>
        model.observeTurn(
          HypotheticalGame.fromGameView(currentGame.asView(playerIndex))
        )
      )
    );
  }

  public playOwnTurn(
    currentGame: ImmutableGameView,
    isReplay: boolean
  ): MoveQuery {
    const hypothetical = this.models.reduce(
      (currentHypothetical, model) =>
        currentHypothetical.restrictPossibles(model.restrictedPossibles(true)),
      HypotheticalGame.fromGameView(currentGame)
    );

    const originalLegalMoves = currentGame.getLegalMoves();

    const actionMove =
      this.models[hypothetical.currentTurnPlayerIndex].fastPlay(hypothetical);

    const legalMoves = shuffle([
      ...originalLegalMoves.filter(
        (move) =>
          !("play" in move.interaction) && !("discard" in move.interaction)
      ),
      ...(actionMove &&
      originalLegalMoves.some((move) => isEqual(move, actionMove))
        ? [actionMove]
        : []),
    ]);

    const observeGame = (
      globalTurn: HypotheticalGame,
      models: readonly SingleModel[]
    ): {
      globalTurn: HypotheticalGame;
      models: readonly SingleModel[];
    } => {
      const outModels = models.map((model, playerIndex) =>
        model.observeTurn(globalTurn.asView(playerIndex))
      );

      const outNextTurn = outModels.reduce(
        (restrictedGlobalTurn, model) =>
          restrictedGlobalTurn.restrictPossibles(
            model.restrictedPossibles(true)
          ),
        globalTurn
      );

      return { globalTurn: outNextTurn, models: outModels };
    };

    const generateMoveArtifacts = (
      currentMove: MoveQuery
    ): Score & { moveQuery: MoveQuery } => {
      const { globalTurn: nextTurn, models: nextModels } = observeGame(
        hypothetical.playInteraction(currentMove),
        this.models
      );

      let models = nextModels;
      let globalTurn = nextTurn;

      while (globalTurn.hands.flat().length > 0) {
        let fixedReferenceGlobalTurn = globalTurn;

        const fastPlayMove = models[
          fixedReferenceGlobalTurn.currentTurnPlayerIndex
        ].fastPlay(
          fixedReferenceGlobalTurn.asView(
            fixedReferenceGlobalTurn.currentTurnPlayerIndex
          )
        );

        if (fastPlayMove) {
          fixedReferenceGlobalTurn = fixedReferenceGlobalTurn.playInteraction(
            fastPlayMove,
            true
          );

          ({ models, globalTurn } = observeGame(
            fixedReferenceGlobalTurn,
            models
          ));
        } else {
          globalTurn = fixedReferenceGlobalTurn.skipTurn();
        }
      }

      const currentResult = {
        ...generate(nextTurn, globalTurn),
        moveQuery: currentMove,
      };

      return currentResult;
    };

    const result = legalMoves.reduce<
      (Score & { moveQuery: MoveQuery }) | undefined
    >((bestResult, currentMove) => {
      const currentResult = generateMoveArtifacts(currentMove);

      if (!bestResult) return currentResult;

      return firstIsBest(bestResult, currentResult)
        ? bestResult
        : currentResult;
    }, undefined);

    if (!result) throw new Error("Ai had no legal moves");

    if (isReplay) {
      // Debug winning move generation
      generateMoveArtifacts(result.moveQuery);
    }

    return result.moveQuery;
  }
}
