import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import { json } from "body-parser";
import cookies from "cookie-parser";
import passport from "passport";
import { PrismaClient } from "@prisma/client";

import logger from "./logger";
import api from "./api/routes";

const app: Express = express();
const port = process.env.PORT;

app.use(cors({ origin: "*" }));
app.use(json());
app.use(cookies(process.env.COOKIE_SECRET));
// app.use(express.static(__dirname + "/public"));

app.use("/api", api);

app.get("/", (req: Request, res: Response) => {
  res.send(req.headers.host);
});

app.listen(port, () => {
  logger.info(`User service is running at http://localhost:${port}`);
});
