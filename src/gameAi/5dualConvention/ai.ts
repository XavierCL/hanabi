import { mapValues } from "lodash";
import ImmutableCardValue from "../../domain/ImmutableCardValue";
import { MoveQuery } from "../../domain/ImmutableGameState";
import ImmutableGameView from "../../domain/ImmutableGameView";
import { AbstractAi } from "../AbstractAi";
import { discardOldestUntouched } from "./conventions/give/discardOldestUntouched";
import { discardUseless } from "./conventions/give/discardUseless/discardUseless";
import { givePlayClue } from "./conventions/give/givePlayClue";
import { playCard } from "./conventions/give/playCard/playCard";
import { tempoMove } from "./conventions/give/tempoMove";
import { observeDuplications } from "./conventions/observe/observeDuplications";
import { observePlayClue } from "./conventions/observe/playClue/observePlayClue";
import { observeSaveClue } from "./conventions/observe/saveClue/observeSaveClue";
import { HypotheticalGame } from "./hypothetical/HypotheticalGame";

// this AI is in construction, the plan is to duplicate play and observe conventions

export type ClueIntents = Partial<
  Readonly<
    Record<
      string,
      {
        intent: "play" | "save";
        possibles: readonly ImmutableCardValue[];
      }
    >
  >
>;

export default class GameAi implements AbstractAi {
  private readonly gameHistory: readonly HypotheticalGame[];
  private readonly clueIntent: ClueIntents;

  public constructor(
    gameHistory?: readonly HypotheticalGame[],
    clueIntent?: ClueIntents
  ) {
    this.gameHistory = gameHistory ?? [];
    this.clueIntent = clueIntent ?? {};
  }

  observeOthersTurn(gameHistoryView: readonly ImmutableGameView[]): GameAi {
    const conventions = [observeDuplications, observeSaveClue, observePlayClue];

    let { lastGame: currentHypothetical, gameHistory } =
      this.updatedHistory(gameHistoryView);

    let updatedIntent = this.clueIntent;
    for (const convention of conventions) {
      const conventionResult = convention(gameHistory, this.clueIntent);

      if (conventionResult.intents) {
        updatedIntent = conventionResult.intents;
        currentHypothetical.restrictPossibles(
          mapValues(updatedIntent, (intent) => intent?.possibles)
        );
        gameHistory = [...this.gameHistory, currentHypothetical];
      }

      if (!conventionResult.passThrough) break;
    }

    return new GameAi(gameHistory, updatedIntent);
  }

  playOwnTurn(
    gameHistoryView: readonly ImmutableGameView[],
    isReplay?: boolean
  ): MoveQuery {
    const { gameHistory } = this.updatedHistory(gameHistoryView);

    const conventions = [
      playCard,
      givePlayClue,
      discardUseless,
      discardOldestUntouched,
    ];

    for (const convention of conventions) {
      const move = convention(gameHistory);

      if (move) return move;
    }

    return tempoMove(gameHistory);
  }

  updatedHistory(gameHistoryView: readonly ImmutableGameView[]): {
    gameHistory: readonly HypotheticalGame[];
    lastGame: HypotheticalGame;
  } {
    const lastGame = HypotheticalGame.fromGameView(
      gameHistoryView[gameHistoryView.length - 1]
    ).restrictPossibles(
      mapValues(this.clueIntent, (intent) => intent?.possibles)
    );

    return { gameHistory: [...this.gameHistory, lastGame], lastGame };
  }

  getInternalInfo(): Record<string, string> | undefined {
    return Object.fromEntries(
      this.gameHistory[this.gameHistory.length - 1].hands
        .flat()
        .filter((card) => card.cardId in this.clueIntent)
        .map((card) => [
          card.cardId,
          JSON.stringify(this.clueIntent[card.cardId], null, 2),
        ])
    );
  }
}
