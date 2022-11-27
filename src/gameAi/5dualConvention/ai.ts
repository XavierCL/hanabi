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
