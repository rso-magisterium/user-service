import { Router } from "express";
import logger from "../logger";
import passport from "passport";
import prisma from "../prisma";

const router = Router();

/**
 * @openapi
 * "/api/user/all":
 *   get:
 *     summary: Get all users details
 *     description: Restricted administrator access (requires Super Admin)
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/User"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get("/all", passport.authenticate("jwt", { session: false }), async (req, res) => {
  if (req.user?.superAdmin === false) {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, "Unauthorized user info request for all users");
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      superAdmin: true,
      name: true,
      password: false,
      tenants: {
        select: { id: true, name: true },
      },
    },
  });

  logger.info({ request: { path: req.originalUrl }, user: req.user }, "All users requested");
  res.json(users);
});

/**
 * @openapi
 * "/api/user":
 *   get:
 *     summary: Get user details
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
  logger.debug({ request: { path: req.originalUrl }, user: req.user }, "User info requested");
  res.json(req.user);
});

/**
 * @openapi
 * "/api/user/tenant":
 *   get:
 *     summary: Get user tenants
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User tenants
 *         content:
 *           application/json:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                    type: string
 *                   name:
 *                    type: string
 *                 required: ["id", "name"]
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 */
router.get("/tenants", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    where: { users: { some: { id: req.user?.id } } },
    select: { id: true, name: true },
  });

  logger.debug({ request: { path: req.originalUrl }, user: req.user }, "User tenant info requested");
  res.json(tenants);
});

/**
 * @openapi
 * "/api/user/{userId}":
 *   get:
 *     summary: Get user details
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get("/:userId", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const userId = req.params.userId;

  if (req.user?.superAdmin === false && req.user?.id !== userId) {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `Unauthorized user info request for ${userId}`);
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  // Return user and tenant details without password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      superAdmin: true,
      name: true,
      password: false,
    },
  });

  if (user) {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `User info requested for ${userId}`);
    res.json(user);
  } else {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `User not found (${userId})`);
    res.status(404).json({ message: "User not found" });
  }
});

/**
 * @openapi
 * "/api/user/{userId}/tenants":
 *   get:
 *     summary: Get user tenants
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *     responses:
 *       200:
 *         description: User tenants
 *         content:
 *           application/json:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                    type: string
 *                   name:
 *                    type: string
 *                 required: ["id", "name"]
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get("/:userId/tenants", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const userId = req.params.userId;

  if (req.user?.superAdmin === false && req.user?.id !== userId) {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `Unauthorized user info request for ${userId}`);
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  const user = await prisma.tenant.findMany({
    where: { users: { some: { id: userId } } },
    select: { id: true, name: true },
  });

  if (user) {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `User info requested for ${userId}`);
    res.json(user);
  } else {
    logger.info({ request: { path: req.originalUrl }, user: req.user }, `User not found (${userId})`);
    res.status(404).json({ message: "User not found" });
  }
});

export default router;
