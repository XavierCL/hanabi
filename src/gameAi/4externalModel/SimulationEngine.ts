import ImmutableGameView from "../../domain/ImmutableGameView";

export class SimulationEngine {
  public static from(
    gameHistory: readonly ImmutableGameView[]
  ): Simulationengine {
    const playerCount = gameHistory[0].hands.length;
    return new SimulationEngine(gameHistory[0].hands.length);
  }
}
