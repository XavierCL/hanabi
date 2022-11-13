import { MoveQuery } from "../domain/ImmutableGameState";
import ImmutableGameView from "../domain/ImmutableGameView";

export type AbstractAi = {
  observeOthersTurn: (gameHistory: readonly ImmutableGameView[]) => AbstractAi;
  playOwnTurn: (gameHistory: readonly ImmutableGameView[]) => MoveQuery;
  getInternalInfo?: () => Record<string, string> | undefined;
};
