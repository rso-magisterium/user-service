import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

import logger from "./logger";

const app: Express = express();
const port = process.env.PORT;

app.get("/", (req: Request, res: Response) => {
	res.send("Hello World!");
});

app.listen(port, () => {
	logger.info(`Server is running at http://localhost:${port}`);
});
