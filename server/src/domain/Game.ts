import ImmutableGameState from "./ImmutableGameState";
import { shuffle } from "./utils";

export type NewGame = {
  players: NewGamePlayer[];
  password?: string;
  variant?: string;
};

export type NewGamePlayer = {
  playerType: "ai" | "human";
};

export type OnlineGameState = {
  state: ImmutableGameState;
  password?: string;
  connectedPlayers: Record<string, ConnectedPlayer>;
};

export type ConnectedPlayer = {
  playerType: "ai" | "human";
  playerIndex: number;
};

export const newGameToOnlineGameState = (game: NewGame): OnlineGameState => {
  const randomSeats = Array.from({ length: game.players.length }, (_, i) => i);
  shuffle(randomSeats);
  const aiCount = game.players.reduce(
    (acc, player) => acc + (player.playerType === "ai" ? 1 : 0),
    0
  );

  const aiConnectedPlayerArray: ConnectedPlayer[] = Array.from(
    { length: aiCount },
    (_, i) => ({ playerIndex: randomSeats[i], playerType: "ai" })
  );

  const aiConnectedPlayers: Record<string, ConnectedPlayer> = {};
  aiConnectedPlayerArray.forEach((element) => {
    aiConnectedPlayers[crypto.randomUUID()] = element;
  });

  return {
    state: ImmutableGameState.from(game.players.length),
    password: game.password,
    connectedPlayers: aiConnectedPlayers,
  };
};
