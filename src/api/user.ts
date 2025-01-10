import { Router } from "express";
import logger from "../logger";
import passport from "passport";
import prisma from "../prisma";

const router = Router();

router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
  res.json(req.user);
});

export default router;
