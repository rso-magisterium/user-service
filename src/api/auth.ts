import { Router } from "express";
import logger from "../logger";
import passport from "passport";
import * as oidc from "openid-client";
import { getGithubConfig } from "../oidcConfig";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

import type { GithubUser } from "../types/github/user";
import type { GithubEmails } from "../types/github/emails";

import prisma from "../prisma";

const router = Router();

if (process.env.JWT_SECRET == null) {
  logger.error("JWT secret is not set");
  process.exit(100);
}

const jwtSecret = process.env.JWT_SECRET;

/**
 * @openapi
 * "/api/auth/login":
 *   post:
 *     summary: "User login"
 *     tags: [Authentication]
 *     requestBody:
 *       description: "User credentials"
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       "200":
 *         description: "Login successful"
 *         headers:
 *           Set-Cookie:
 *             description: "JWT Token"
 *             schema:
 *               type: string
 *               example: Cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       "400":
 *         $ref: "#/components/responses/MissingParameters"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/login", async (req, res) => {
  const email: string = req.body.email;
  const password: string = req.body.password;

  if (!email || !password) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Missing required parameters");
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  // Check if user exists
  if (user == null) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "User doesn't exist");
    res.status(401).json({ message: "Incorrect email or password" });
    return;
  }

  // Check if user has local login
  if (user.password == null) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "User doesn't have local login");
    res.status(401).json({ message: "User does not have local login" });
    return;
  }

  // Verify password
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      logger.error({ request: { path: req.originalUrl, body: req.body }, error: err }, "BCrypt error");
      res.status(500).json({ message: "Server error", error: err });
    }

    if (result) {
      let token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          superAdmin: user.superAdmin,
        },
        jwtSecret,
        { expiresIn: "2 days" }
      );

      logger.info({ request: { path: req.originalUrl }, user: { email } }, "Login successful");
      res
        .cookie("jwt", token, { httpOnly: true, signed: true, sameSite: "strict", maxAge: 48 * 60 * 60 * 1000 })
        .json({ message: "Login successful" });
    } else {
      logger.info({ request: { path: req.originalUrl }, user: { email } }, "Login failed (incorrect password)");
      res.status(401).json({ message: "Incorrect email or password" });
    }
  });
});

/**
 * @openapi
 * "/api/auth/logout":
 *   get:
 *     summary: "User logout"
 *     tags: [Authentication]
 *     responses:
 *       "200":
 *         description: "Logout successful"
 *         headers:
 *           Set-Cookie:
 *             description: "JWT Token Expire"
 *             schema:
 *               type: string
 *               example: Cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       "400":
 *         $ref: "#/components/responses/MissingParameters"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.get("/logout", async (req, res) => {
  logger.info({ request: { path: req.originalUrl }, user: req.user }, "Logout successful");
  res.clearCookie("jwt").json({ message: "Logout successful" });
});

/**
 * @openapi
 * "/api/auth/register":
 *   post:
 *     summary: "User registration"
 *     tags: [Authentication]
 *     requestBody:
 *       description: "User data"
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [name, email, password]
 *     responses:
 *       "200":
 *         description: "User created"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Response"
 *       "400":
 *         $ref: "#/components/responses/MissingParameters"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
router.post("/register", async (req, res) => {
  const name: string = req.body.name;
  const email: string = req.body.email;
  const password: string = req.body.password;

  if (!email || !password || !name) {
    logger.debug(
      { request: { path: req.originalUrl, body: req.body } },
      "Missing required parameters (name, email, password)"
    );
    res.status(400).json({ message: "Name, email and password are required" });
    return;
  }

  // Hash password
  let hashedPassword = await bcrypt.hash(password, 10);

  // Check if there are any users
  const users = await prisma.user.findMany({});

  try {
    // Create user
    await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        superAdmin: users.length === 0,
      },
    });

    logger.info({ request: { path: req.originalUrl }, user: { name, email } }, "User created");
    res.json({ message: "User created" });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info({ request: { path: req.originalUrl }, user: { email } }, "User creation failed: User already exists");
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    logger.error({ request: { path: req.originalUrl }, user: { name, email }, error: err }, "User creation failed");
    res.status(500).json({ message: "User creation failed", error: err });
  }
});

/**
 * @openapi
 * "/api/auth/token":
 *   post:
 *     summary: Get user API token
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       description: Token data
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiration:
 *                 type: integer
 *                 description: Token expiration in days
 *                 minimum: 1
 *                 maximum: 30
 *     responses:
 *       200:
 *         description: JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       "400":
 *         $ref: "#/components/responses/MissingParameters"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.post("/token", passport.authenticate("jwt", { session: false }), async (req, res) => {
  const expiration: number = req.body.expiration || 1;

  if (expiration < 1 || expiration > 30) {
    logger.debug({ request: { path: req.originalUrl, body: req.body } }, "Parameter out of range (expiration)");
    res.status(400).json({ message: "Token expiration is out of range" });
    return;
  }

  let token = jwt.sign(
    {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      superAdmin: req.user?.superAdmin,
    },
    jwtSecret,
    { expiresIn: `${expiration} days` }
  );

  logger.info({ request: { path: req.originalUrl }, user: req.user }, `Token issued (expiration: ${expiration} days)`);
  res.json({ token });
});

/**
 * @openapi
 * "/api/auth/github":
 *   get:
 *     summary: "GitHub OAuth2 authentication"
 *     description: "Redirect user here to begin authentication flow"
 *     tags: [Authentication]
 */
router.get("/github", async (req, res) => {
  // TODO: Replace req.headers.host with req.hostname
  let redirect_uri = `${req.protocol}://${req.headers.host}${req.baseUrl}/github/callback`;

  let config = getGithubConfig();

  let code_verifier = oidc.randomPKCECodeVerifier();
  let code_challenge = await oidc.calculatePKCECodeChallenge(code_verifier);
  // let state = oidc.randomState();

  let parameters: Record<string, string> = {
    redirectUrl: redirect_uri,
    scope: "read:user,user:email",
    code_challenge,
    code_challenge_method: "S256",
    // state,
  };

  let redirect = oidc.buildAuthorizationUrl(config, parameters).toString();

  logger.debug({ request: { path: req.originalUrl } }, `Redirecting to ${redirect}`);
  res.redirect(redirect);
});

router.get("/github/callback", async (req, res) => {
  let config = getGithubConfig();

  try {
    // let { code_verifier, state } = ...;

    // TODO: Replace req.headers.host with req.hostname
    let currentUrl = new URL(`${req.protocol}s://${req.headers.host}${req.originalUrl}`);
    logger.debug({ request: { path: req.originalUrl } }, `Current URL: ${currentUrl}`);
    let tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      // pkceCodeVerifier: code_verifier,
      // expectedState: state,
    });

    // Fetch user data
    let resUser = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    let resEmail = await fetch("https://api.github.com/user/emails", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (resUser.status != 200 || !resUser.body || resEmail.status != 200 || !resEmail.body) {
      logger.debug({ request: { path: req.originalUrl }, tokens: tokens }, "User authentication failed");
      res.status(401).json({ message: "Authentication failed" });
      return;
    }

    // Extract user data
    let ghUser: GithubUser = await resUser.json();
    let ghEmails: GithubEmails = await resEmail.json();

    logger.debug({ request: { path: req.originalUrl }, user: ghUser, emails: ghEmails }, "User authenticated");
    let ghEmail = ghEmails.filter((mail) => mail.primary && mail.verified)[0].email;

    // Get user
    let user = await prisma.user.findFirst({ where: { email: ghEmail } });
    if (user) {
      let curProvider = await prisma.userProvider.findFirst({
        where: { provider: "github", providerId: ghUser.id.toString() },
      });
      if (curProvider) {
        // Update provider
        await prisma.userProvider.update({
          where: { id: curProvider.id },
          data: {
            accessToken: tokens.access_token,
          },
        });
      } else {
        // Add provider
        await prisma.userProvider.create({
          data: {
            provider: "github",
            providerId: ghUser.id.toString(),
            userId: user.id,
            accessToken: tokens.access_token,
          },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: ghEmail,
          name: ghUser.login,
          providers: {
            create: {
              provider: "github",
              providerId: ghUser.id.toString(),
              accessToken: tokens.access_token,
            },
          },
        },
      });
    }

    let token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        superAdmin: user.superAdmin,
      },
      jwtSecret,
      { expiresIn: "2 days" }
    );

    logger.info({ request: { path: req.originalUrl }, user: { email: user.email } }, "User authorized via GitHub");
    res
      .cookie("jwt", token, { httpOnly: true, signed: true, sameSite: "strict", maxAge: 48 * 60 * 60 * 1000 })
      .redirect("/");
  } catch (err: any) {
    if (err.code && err.code === "OAUTH_INVALID_RESPONSE") {
      logger.warn({ request: { path: req.originalUrl }, error: err }, "GitHub: Invalid response");
      res.redirect("/login");
      return;
    }

    logger.info({ request: { path: req.originalUrl }, error: err }, "GitHub: Authentication failed");
    res.redirect("/login");
    return;
  }
});

export default router;
