import express from "express";
import cookieParser from "cookie-parser";
import { registerGameControllers } from "./controllers/gameController";
const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("POST /games");
});

registerGameControllers(app);

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
