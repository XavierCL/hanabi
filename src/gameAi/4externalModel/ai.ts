import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { ClueIntent } from "../aiUtils";

export default class GameAi {
  readonly;

  observeOthersTurn(gameHistory: readonly ImmutableGameView[]): GameAi {}

  playOwnTurn(gameHistory: readonly ImmutableGameView[]): MoveQuery {}
}
