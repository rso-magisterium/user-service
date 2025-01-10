import dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import cors from "cors";
import { json } from "body-parser";
import cookies from "cookie-parser";
import passport from "passport";
import prisma from "./prisma";

import logger from "./logger";
import api from "./api/routes";

const app: Express = express();
const port = process.env.PORT;

app.use(cors({ origin: "*" }));
app.use(json());
app.use(cookies(process.env.COOKIE_SECRET));
// app.use(express.static(__dirname + "/public"));

app.use("/api", api);

app.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ request: { path: req.originalUrl }, error: err }, "Prisma healthcheck failed");
    res.status(500).json({ message: "Prisma error", error: err });
    return;
  }

  res.status(200).json({ message: "OK", uptime: process.uptime() });
});

app.listen(port, () => {
  logger.info(`User service is running at http://localhost:${port}`);
});
