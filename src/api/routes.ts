import { Router } from "express";
import auth from "./auth";
import user from "./user";
import tenant from "./tenant";

const router = Router();

router.use("/auth", auth);
router.use("/user", user);
router.use("/tenant", tenant);

export default router;
