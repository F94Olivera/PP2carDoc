import type { RequestHandler } from "express";
import pino from "pino";
import type { toUserResponse } from "../mappers/auth-mapper.js";
import { bearerTokenSchema } from "../schemas/auth.js";
import { getCurrentUser } from "../services/auth-service.js";

import type { AuthorizationContext } from "../schemas/authorization.js";

type AuthenticatedLocals = {
  authorization: AuthorizationContext;
  user: ReturnType<typeof toUserResponse>;
  accessToken: string;
};

export type AuthenticatedHandler = RequestHandler<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, unknown>,
  AuthenticatedLocals
>;

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const requireAuth: AuthenticatedHandler = async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = bearerTokenSchema.safeParse(req.get("Authorization"));
  if (!parsed.success) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "A valid Bearer access token is required." });
    return;
  }

  try {
    const result = await getCurrentUser(parsed.data);
    switch (result.outcome) {
      case "success":
        res.locals.user = result.response.user;
        res.locals.authorization = result.authorization;
        res.locals.accessToken = parsed.data;
        break;
      case "unauthorized":
        res.setHeader("WWW-Authenticate", "Bearer");
        res.status(401).json({ error: "Invalid or expired access token." });
        return;
      case "rate_limited":
        res.status(429).json({ error: "Too many authentication attempts. Try again later." });
        return;
      case "unavailable":
        res.status(503).json({ error: "Authentication service unavailable." });
        return;
    }
  } catch {
    logger.error("Request authentication failed because authentication is unavailable");
    res.status(503).json({ error: "Authentication service unavailable." });
    return;
  }

  next();
};

export const restrictCustomerAccess: AuthenticatedHandler = (req, res, next) => {
  if (res.locals.authorization.role !== "USER") {
    next();
    return;
  }
  const readable =
    req.method === "GET" &&
    (/^\/vehicles\/[1-9]\d*(?:\/work-orders)?$/.test(req.path) ||
      /^\/work-orders\/[1-9]\d*$/.test(req.path) ||
      req.path === "/myvehicles" ||
      req.path === "/auth/me");
  if (!readable && !(req.method === "POST" && req.path === "/logout")) {
    res.status(403).json({ error: "Read-only customer access." });
    return;
  }
  next();
};
