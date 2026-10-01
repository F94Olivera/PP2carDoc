import type { RequestHandler } from "express";
import pino from "pino";
import { bearerTokenSchema, loginSchema } from "../schemas/auth.js";
import { getCurrentUser, login, logout } from "../services/auth-service.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const meController: RequestHandler = async (req, res) => {
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
        res.json(result.response);
        return;
      case "unauthorized":
        res.setHeader("WWW-Authenticate", "Bearer");
        res.status(401).json({ error: "Invalid or expired access token." });
        return;
      case "rate_limited":
        res.status(429).json({ error: "Too many authentication attempts. Try again later." });
        return;
      case "unavailable":
        res.status(503).json({ error: "Authentication service unavailable." });
    }
  } catch {
    logger.error("Current user lookup failed because authentication is unavailable");
    res.status(503).json({ error: "Authentication service unavailable." });
  }
};

export const logoutController: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = bearerTokenSchema.safeParse(req.get("Authorization"));
  if (!parsed.success) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "A valid Bearer access token is required." });
    return;
  }
  try {
    const result = await logout(parsed.data);
    switch (result.outcome) {
      case "success":
        res.status(204).end();
        return;
      case "unauthorized":
        res.setHeader("WWW-Authenticate", "Bearer");
        res.status(401).json({ error: "Invalid or expired access token." });
        return;
      case "rate_limited":
        res.status(429).json({ error: "Too many logout attempts. Try again later." });
        return;
      case "unavailable":
        res.status(503).json({ error: "Authentication service unavailable." });
    }
  } catch {
    logger.error("Logout failed because authentication is unavailable");
    res.status(503).json({ error: "Authentication service unavailable." });
  }
};

export const loginController: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Expected only a valid email and a nonempty password." });
    return;
  }
  try {
    const result = await login(parsed.data);
    switch (result.outcome) {
      case "success":
        res.json(result.response);
        return;
      case "unauthorized":
        res.status(401).json({ error: "Invalid credentials or account unavailable." });
        return;
      case "rate_limited":
        res.status(429).json({ error: "Too many login attempts. Try again later." });
        return;
      case "unavailable":
        res.status(503).json({ error: "Authentication service unavailable." });
    }
  } catch {
    logger.error("Login failed because authentication is unavailable");
    res.status(503).json({ error: "Authentication service unavailable." });
  }
};
