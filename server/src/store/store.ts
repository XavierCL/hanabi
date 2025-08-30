import { OnlineGameState } from "../domain/Game";
import { shuffle } from "../domain/utils";

const storeImplementation: {
  games: Record<string, OnlineGameState>;
} = { games: {} };

export const store = {
  createGame: (game: OnlineGameState) => {
    const gameId = crypto.randomUUID();
    storeImplementation.games[gameId] = game;
    return gameId;
  },
  getGamePlayer: (gameId: string, playerId: string) => {
    const game = storeImplementation.games[gameId];
    if (!game) return undefined;
    const player = game.connectedPlayers[playerId];
    if (!player) return undefined;
    return player;
  },
  createGamePlayer: (gameId: string) => {
    const game = storeImplementation.games[gameId];
    if (!game) return undefined;
    if (Object.keys(game.connectedPlayers).length === game.state.hands.length)
      return undefined;
    let remainingSeats = Array.from({ length: game.state.hands.length }).map(
      (_, i) => i
    );
    remainingSeats = remainingSeats.filter(
      (i) =>
        Object.values(game.connectedPlayers)
          .map((p) => p.playerIndex)
          .indexOf(i) != -1
    );

    if (remainingSeats.length === 0) return undefined;

    shuffle(remainingSeats);
    const selectedSeat = remainingSeats[0];
    const playerId = crypto.randomUUID();
    game.connectedPlayers[playerId] = {
      playerType: "human",
      playerIndex: selectedSeat,
    };
    return playerId;
  },
};
