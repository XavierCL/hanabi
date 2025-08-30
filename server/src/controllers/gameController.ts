import express from "express";
import path from "path";
import { store } from "../store/store";
import { NewGame, newGameToOnlineGameState } from "../domain/Game";

const playerCookieName = "player";
const gameCookieName = "game";

export const registerGameControllers = (app: express.Express) => {
  app.post("/api/games", (req, res) => {
    const newGame: NewGame = req.body;
    const gameId = store.createGame(newGameToOnlineGameState(newGame));
    res.redirect(201, `/games/${gameId}`);
  });

  app.get("/games/:gameId", (req, res) => {
    const sendFile = () => {
      res.sendFile(path.resolve(__dirname + "/../../public/index.html"));
    };

    const joinGame = () => {
      const playerId = store.createGamePlayer(req.params.gameId);
      if (!playerId) {
        res.send("Game is full");
        res.status(400);
        return;
      }
      res.cookie(gameCookieName, req.params.gameId, { httpOnly: true });
      res.cookie(playerCookieName, playerId, { httpOnly: true });
      sendFile();
    };

    const gameCookie: string | undefined = req.cookies[gameCookieName];

    if (gameCookie !== req.params.gameId) {
      joinGame();
      return;
    }

    const playerCookie: string | undefined = req.cookies[playerCookieName];
    const gamePlayer = store.getGamePlayer(req.params.gameId, playerCookie);

    if (!gamePlayer) {
      joinGame();
      return;
    }

    sendFile();
  });

  app.use(express.static(path.resolve(__dirname + "/../../public")));
};
