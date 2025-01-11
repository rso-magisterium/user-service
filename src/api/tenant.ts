import { Router } from "express";
import logger from "../logger";
import passport from "passport";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";

const router = Router();

/**
 * @openapi
 * "/api/tenant":
 *   post:
 *     summary: Create tenant
 *     tags: [Tenant]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       description: "Tenant information"
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               adminId:
 *                 type: string
 *             required: [name, adminId]
 *     responses:
 *       200:
 *         description: Tenant created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       400:
 *         $ref: "#/components/responses/MissingParameters"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: Admin user doesn't exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
  if (req.user?.superAdmin === false) {
    logger.debug({ request: { path: req.originalUrl } }, "User is not Super Admin");
    res.status(403).json({ message: "Unauthorized: User must be Super Admin" });
    return;
  }

  let tenantName: string = req.body.name;
  let adminEmail: string = req.body.adminEmail;

  if (!tenantName || !adminEmail) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Missing required parameters");
    res.status(400).json({ message: "Name and admin email are required" });
    return;
  }

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Admin user doesn't exist");
    res.status(404).json({ message: "Admin user doesn't exist" });
    return;
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        adminId: admin.id,
        users: {
          connect: { id: admin.id },
        },
      },
    });

    logger.info({ request: { path: req.originalUrl }, tenant: tenant }, "Tenant created");
    res.status(200).json({ message: "Tenant created", tenant: tenant });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info(
        { request: { path: req.originalUrl }, tenant: { name: tenantName, adminEmail: adminEmail } },
        "Tenant creation failed: Tenant already exists"
      );
      res.status(400).json({ message: "Tenant with this name already exists" });
      return;
    }

    logger.error(
      { request: { path: req.originalUrl }, tenant: { name: tenantName, adminEmail: adminEmail }, error: err },
      "Tenant creation failed"
    );
    res.status(500).json({ message: "Tenant creation failed", error: err });
  }
});

/**
 * @openapi
 * "/api/tenant/{tenantId}/users":
 *   get:
 *     summary: Get tenant users
 *     tags: [Tenant]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *     responses:
 *       200:
 *         description: Users
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
 *         description: Tenant doesn't exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/:tenantId/users", passport.authenticate("jwt", { session: false }), async (req, res) => {
  let tenantId: string = req.params.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Tenant doesn't exist");
    res.status(404).json({ message: "Tenant doesn't exist" });
    return;
  }

  if (req.user?.superAdmin === false && tenant.adminId !== req.user?.id) {
    logger.debug({ request: { path: req.originalUrl }, user: req.user }, "User is not Super Admin or Tenant Admin");
    res.status(403).json({ message: "You must be the tenant administrator" });
    return;
  }

  const users = await prisma.user.findMany({
    where: { tenants: { some: { id: tenant.id } } },
    select: {
      id: true,
      email: true,
      superAdmin: true,
      name: true,
      password: false,
    },
  });

  logger.info({ request: { path: req.originalUrl }, tenant: tenant }, "Tenant users requested");
  res.json(users);
});

/**
 * @openapi
 * "/api/tenant/{tenantId}/user":
 *   post:
 *     summary: Add user to tenant
 *     tags: [Tenant]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *     requestBody:
 *       description: User information
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *             required: [email]
 *     responses:
 *       200:
 *         description: User added to tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       400:
 *         $ref: "#/components/responses/MissingParameters"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: User or tenant doesn't exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/:tenantId/user", passport.authenticate("jwt", { session: false }), async (req, res) => {
  let tenantId: string = req.params.tenantId;
  let email: string = req.body.email;

  if (!email) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Missing required parameters");
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "User doesn't exist");
    res.status(404).json({ message: "User doesn't exist" });
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Tenant doesn't exist");
    res.status(404).json({ message: "Tenant doesn't exist" });
    return;
  }

  if (req.user?.superAdmin === false && tenant.adminId !== req.user?.id) {
    logger.debug({ request: { path: req.originalUrl }, user: req.user }, "User is not Super Admin or Tenant Admin");
    res.status(403).json({ message: "You must be the tenant administrator" });
    return;
  }

  try {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        users: {
          connect: { id: user.id },
        },
      },
    });

    logger.info({ request: { path: req.originalUrl }, user: user }, "User added to tenant");
    res.status(200).json({ message: "User added to tenant" });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info(
        { request: { path: req.originalUrl }, tenant: tenant, user: user },
        "User addition failed: User is already part of tenant"
      );
      res.status(400).json({ message: "User is already part of tenant" });
      return;
    }

    logger.error(
      { request: { path: req.originalUrl }, tenant: tenant, user: user, error: err },
      "User addition failed"
    );
    res.status(500).json({ message: "User addition failed", error: err });
  }
});

/**
 * @openapi
 * "/api/tenant/{tenantId}/user":
 *   delete:
 *     summary: Remove user from tenant
 *     tags: [Tenant]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *     requestBody:
 *       description: User information
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *             required: [email]
 *     responses:
 *       200:
 *         description: User removed from tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       400:
 *         $ref: "#/components/responses/MissingParameters"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         description: User or tenant doesn't exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       500:
 *         $ref: "#/components/responses/ServerError"
 */
router.delete("/:tenantId/user", passport.authenticate("jwt", { session: false }), async (req, res) => {
  let tenantId: string = req.params.tenantId;
  let email: string = req.body.email;

  if (!email) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Missing required parameters");
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "User doesn't exist");
    res.status(404).json({ message: "User doesn't exist" });
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Tenant doesn't exist");
    res.status(404).json({ message: "Tenant doesn't exist" });
    return;
  }

  if (req.user?.superAdmin === false && tenant.adminId !== req.user?.id) {
    logger.debug({ request: { path: req.originalUrl }, user: req.user }, "User is not Super Admin or Tenant Admin");
    res.status(403).json({ message: "You must be the tenant administrator" });
    return;
  }

  try {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        users: {
          disconnect: { id: user.id },
        },
      },
    });

    logger.info({ request: { path: req.originalUrl }, user: user }, "User removed from tenant");
    res.status(200).json({ message: "User removed from tenant" });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      logger.info(
        { request: { path: req.originalUrl }, tenant: tenant, user: user },
        "User addition failed: User is not part of tenant"
      );
      res.status(400).json({ message: "User is not part of tenant" });
      return;
    }

    logger.error({ request: { path: req.originalUrl }, tenant: tenant, user: user, error: err }, "User removal failed");
    res.status(500).json({ message: "User removal failed", error: err });
  }
});

export default router;
